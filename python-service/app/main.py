"""
jobSayer Python Microservice
=============================
FastAPI service for ML/NLP-heavy operations that are better done in Python.
Next.js routes proxy to this service when PYTHON_SERVICE_URL env var is set.

Endpoints:
  POST /parse-resume       — NLP entity extraction from resume text
  POST /score-ats          — ML-based ATS keyword scoring
  POST /match-jobs         — Semantic similarity job matching
  POST /salary-predict     — Salary prediction from skills + location
  GET  /health             — Health check (used by Next.js to probe availability)

Security:
  - API key auth via X-Service-Key header (PYTHON_SERVICE_SECRET env var)
  - Rate limiting via slowapi (10 req/s per IP)
  - Input size limits
  - CORS restricted to NEXT_PUBLIC_APP_URL
"""

import os
import re
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ── Rate limiter ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── App lifecycle (load ML models once at startup) ──────────
_nlp = None
_embedder = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _nlp, _embedder
    try:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
        print("[startup] spaCy model loaded")
    except Exception as e:
        print(f"[startup] spaCy not available: {e} — NLP features degraded")

    try:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        print("[startup] Sentence transformer loaded")
    except Exception as e:
        print(f"[startup] sentence-transformers not available: {e} — semantic matching degraded")

    yield  # service is running

    # Cleanup on shutdown
    _nlp = None
    _embedder = None


# ── FastAPI app ──────────────────────────────────────────────
app = FastAPI(
    title="jobSayer Python Service",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENV") != "production" else None,  # hide in prod
    redoc_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    "https://jobsayer.com",
    "https://www.jobsayer.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Service-Key"],
)

# ── Auth ─────────────────────────────────────────────────────
SERVICE_SECRET = os.getenv("PYTHON_SERVICE_SECRET", "")

async def verify_service_key(request: Request):
    """Verify the shared service key from Next.js."""
    if not SERVICE_SECRET:
        return  # Dev mode — no key required
    key = request.headers.get("X-Service-Key", "")
    if key != SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid service key")


# ── Models ───────────────────────────────────────────────────
class ResumeParseRequest(BaseModel):
    text: str = Field(..., max_length=50_000)

class ATSScoreRequest(BaseModel):
    resume_text: str  = Field(..., max_length=50_000)
    jd_text:     str  = Field(..., max_length=20_000)

class JobMatchRequest(BaseModel):
    resume_text: str       = Field(..., max_length=50_000)
    jobs:        list[dict] = Field(..., max_length=100)

class SalaryPredictRequest(BaseModel):
    title:       str = Field(..., max_length=100)
    skills:      list[str] = Field(default_factory=list, max_length=30)
    location:    str = Field(default="India", max_length=80)
    experience:  int = Field(default=3, ge=0, le=40)
    currency:    str = Field(default="USD", max_length=5)


# ── Endpoints ────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "nlp": _nlp is not None,
        "embedder": _embedder is not None,
    }


@app.post("/parse-resume", dependencies=[Depends(verify_service_key)])
@limiter.limit("30/minute")
async def parse_resume(request: Request, body: ResumeParseRequest):
    """
    Extract structured entities from resume text using spaCy NLP.
    Returns: skills, titles, companies, education, emails, phones.
    """
    text = body.text

    # Regex-based extractors (fast, no model needed)
    emails  = re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    phones  = re.findall(r"(?:\+?91[\-\s]?)?[6-9]\d{9}", text)
    urls    = re.findall(r"https?://[^\s]+", text)

    # spaCy entities
    entities: dict[str, list[str]] = {"ORG": [], "PERSON": [], "GPE": []}
    if _nlp:
        doc = _nlp(text[:10_000])  # limit to 10k chars for speed
        for ent in doc.ents:
            if ent.label_ in entities:
                entities[ent.label_].append(ent.text)

    # Skill keyword extraction (simple but effective)
    TECH_SKILLS = [
        "python","javascript","typescript","java","go","rust","c++","c#","kotlin","swift",
        "react","next.js","vue","angular","node.js","django","fastapi","spring","express",
        "aws","gcp","azure","docker","kubernetes","terraform","ci/cd","jenkins","github actions",
        "postgresql","mysql","mongodb","redis","kafka","elasticsearch","bigquery","spark",
        "machine learning","deep learning","nlp","pytorch","tensorflow","scikit-learn","pandas",
        "sql","graphql","rest","microservices","system design","data structures","algorithms",
        "agile","scrum","jira","figma","product management",
    ]
    found_skills = [s for s in TECH_SKILLS if s.lower() in text.lower()]

    return {
        "emails":    emails[:3],
        "phones":    phones[:2],
        "urls":      urls[:5],
        "orgs":      list(set(entities["ORG"]))[:10],
        "locations": list(set(entities["GPE"]))[:5],
        "skills":    found_skills,
        "word_count": len(text.split()),
    }


@app.post("/score-ats", dependencies=[Depends(verify_service_key)])
@limiter.limit("20/minute")
async def score_ats(request: Request, body: ATSScoreRequest):
    """
    ML-powered ATS scoring: TF-IDF keyword overlap + semantic similarity.
    Falls back to pure keyword scoring if sentence-transformers not loaded.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    resume = body.resume_text.lower()
    jd     = body.jd_text.lower()

    # TF-IDF keyword overlap
    try:
        vec = TfidfVectorizer(ngram_range=(1, 2), max_features=200, stop_words="english")
        mat = vec.fit_transform([resume, jd])
        tfidf_score = float(cosine_similarity(mat[0], mat[1])[0][0])
    except Exception:
        tfidf_score = 0.5

    # Semantic similarity (if model available)
    semantic_score = tfidf_score  # fallback
    if _embedder:
        try:
            embeddings = _embedder.encode([resume[:2000], jd[:2000]])
            semantic_score = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
        except Exception:
            pass

    # Combined score
    combined = round((tfidf_score * 0.4 + semantic_score * 0.6) * 100)
    combined = max(0, min(100, combined))

    # Find missing keywords
    jd_words = set(re.findall(r"\b[a-z]{3,}\b", jd)) - {"the","and","for","are","you","with","this","that","have","from","will"}
    resume_words = set(re.findall(r"\b[a-z]{3,}\b", resume))
    missing = sorted(jd_words - resume_words, key=lambda w: jd.count(w), reverse=True)[:15]

    return {
        "score":          combined,
        "tfidf_score":    round(tfidf_score * 100),
        "semantic_score": round(semantic_score * 100),
        "missing_keywords": missing,
        "method": "ml+semantic" if _embedder else "tfidf",
    }


@app.post("/match-jobs", dependencies=[Depends(verify_service_key)])
@limiter.limit("10/minute")
async def match_jobs(request: Request, body: JobMatchRequest):
    """
    Rank job listings by semantic similarity to the resume.
    Returns jobs sorted by match_score descending.
    """
    if not _embedder:
        # Fallback: return jobs unchanged with equal scores
        return {"jobs": [{"id": j.get("id",""), "match_score": 70} for j in body.jobs]}

    from sklearn.metrics.pairwise import cosine_similarity

    resume_emb = _embedder.encode([body.resume_text[:2000]])[0]
    results = []
    for job in body.jobs[:50]:
        jd_text = f"{job.get('title','')} {job.get('description','')} {' '.join(job.get('skills', []))}"
        jd_emb  = _embedder.encode([jd_text[:1000]])[0]
        score   = float(cosine_similarity([resume_emb], [jd_emb])[0][0])
        results.append({"id": job.get("id", ""), "match_score": round(score * 100)})

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"jobs": results}


@app.post("/salary-predict", dependencies=[Depends(verify_service_key)])
@limiter.limit("20/minute")
async def salary_predict(request: Request, body: SalaryPredictRequest):
    """
    Heuristic salary prediction. Returns a range in USD/year.
    TODO: Replace with trained model on Glassdoor/AmbitionBox data.
    """
    BASE_SALARIES: dict[str, tuple[int, int]] = {
        "software engineer":   (60000, 160000),
        "senior engineer":     (100000, 220000),
        "staff engineer":      (150000, 300000),
        "engineering manager": (140000, 260000),
        "data scientist":      (80000, 180000),
        "ml engineer":         (90000, 200000),
        "product manager":     (90000, 200000),
        "devops engineer":      (70000, 160000),
        "frontend engineer":   (60000, 150000),
        "backend engineer":    (65000, 160000),
        "full stack":          (65000, 160000),
    }

    title_lower = body.title.lower()
    base = (70000, 140000)  # default
    for key, rng in BASE_SALARIES.items():
        if key in title_lower:
            base = rng
            break

    # Experience multiplier
    exp = body.experience
    if exp < 2:   multiplier = 0.6
    elif exp < 5: multiplier = 0.8
    elif exp < 8: multiplier = 1.0
    elif exp < 12: multiplier = 1.2
    else:         multiplier = 1.4

    # Premium skills bump
    PREMIUM = {"rust","go","kubernetes","aws","gcp","azure","machine learning","pytorch","tensorflow","spark"}
    premium_count = sum(1 for s in body.skills if s.lower() in PREMIUM)
    skill_bump = 1 + min(premium_count * 0.04, 0.2)

    low  = int(base[0] * multiplier * skill_bump)
    high = int(base[1] * multiplier * skill_bump)

    # Currency conversion
    RATES = {"INR": 83.5, "GBP": 0.79, "AUD": 1.53, "EUR": 0.92, "SGD": 1.34}
    rate = RATES.get(body.currency.upper(), 1.0)

    return {
        "currency":   body.currency.upper(),
        "range_low":  round(low * rate),
        "range_high": round(high * rate),
        "range_low_usd":  low,
        "range_high_usd": high,
        "confidence": "medium",
        "method":     "heuristic",
        "note":       "For precise figures, refer to /salary page with Glassdoor/AmbitionBox data.",
    }
