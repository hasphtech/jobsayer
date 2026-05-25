/**
 * Client-side Job Description ↔ Resume keyword matcher.
 * No API calls — pure text analysis.
 */

/* ── Keyword dictionary by category ─────────────────────────── */
const KEYWORD_DICT: Record<string, string[]> = {
  "Languages": [
    "python","javascript","typescript","java","go","golang","rust","kotlin","swift","ruby",
    "php","c++","c#","scala","r","matlab","perl","bash","shell","elixir","haskell",
  ],
  "Frontend": [
    "react","vue","angular","next.js","nuxt","svelte","html","css","tailwind","sass","scss",
    "webpack","vite","redux","graphql","rest","api","axios","fetch","pwa","spa",
  ],
  "Backend": [
    "node.js","express","fastapi","django","flask","spring","rails","laravel","nestjs",
    "grpc","websocket","microservices","rest api","graphql api","oauth","jwt",
  ],
  "Cloud / DevOps": [
    "aws","gcp","azure","docker","kubernetes","terraform","ansible","ci/cd","devops","jenkins",
    "github actions","gitlab ci","cloudformation","lambda","s3","ec2","ecs","eks","cloud run",
    "vercel","netlify","heroku","firebase",
  ],
  "Data / ML": [
    "sql","postgresql","mysql","mongodb","redis","elasticsearch","kafka","spark","hadoop",
    "pandas","numpy","scikit-learn","pytorch","tensorflow","keras","hugging face",
    "machine learning","deep learning","nlp","llm","langchain","langgraph","vector database",
    "rag","fine-tuning","transformers","computer vision","data pipeline","etl",
    "tableau","power bi","dbt","airflow","mlflow",
  ],
  "Tools & Practices": [
    "git","github","gitlab","jira","confluence","figma","postman","linux","agile","scrum",
    "tdd","bdd","unit test","integration test","code review","system design",
    "microservices","serverless","event-driven","ci/cd","sre","observability",
  ],
  "Soft Skills": [
    "leadership","communication","collaboration","problem solving","analytical","mentoring",
    "cross-functional","stakeholder","ownership","initiative","agile","scrum",
  ],
};

// Flatten to sorted list (longest first so multi-word matches win)
const ALL_KEYWORDS: string[] = Object.values(KEYWORD_DICT)
  .flat()
  .sort((a, b) => b.length - a.length);

/* ── Helpers ─────────────────────────────────────────────────── */

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9#+.\-/ ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract candidate keywords from any text block */
function extractKeywords(text: string): Set<string> {
  const norm = normalise(text);
  const found = new Set<string>();

  // 1. Match from dictionary
  for (const kw of ALL_KEYWORDS) {
    const re = new RegExp(`(?<![a-z0-9])${escapeRe(kw)}(?![a-z0-9])`, "i");
    if (re.test(norm)) found.add(kw.toLowerCase());
  }

  // 2. Catch CamelCase / PascalCase tokens not in dictionary (e.g. FastAPI, LangGraph)
  for (const m of text.matchAll(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g)) {
    found.add(m[1].toLowerCase());
  }

  // 3. Catch ALL_CAPS tokens ≥3 chars (e.g. AWS, GCP, REST, SQL)
  for (const m of text.matchAll(/\b([A-Z]{2,})\b/g)) {
    found.add(m[1].toLowerCase());
  }

  return found;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function categoryOf(kw: string): string {
  for (const [cat, list] of Object.entries(KEYWORD_DICT)) {
    if (list.includes(kw)) return cat;
  }
  return "Other";
}

/* ── Public API ───────────────────────────────────────────────── */

export interface KeywordGroup {
  category: string;
  found:   string[];
  missing: string[];
}

export interface JdMatchResult {
  score:    number;         // 0–100
  found:    string[];       // keywords present in resume
  missing:  string[];       // keywords in JD but absent from resume
  groups:   KeywordGroup[]; // broken down by category
}

/**
 * Compare a resume (all text fields concatenated) against a job description.
 * Returns a match result with score, found/missing lists, and category groups.
 */
export function matchJd(resumeText: string, jdText: string): JdMatchResult {
  if (!jdText.trim()) return { score: 0, found: [], missing: [], groups: [] };

  const jdKeywords    = extractKeywords(jdText);
  const resumeKeywords = extractKeywords(resumeText);

  const found:   string[] = [];
  const missing: string[] = [];

  for (const kw of jdKeywords) {
    if (resumeKeywords.has(kw)) found.push(kw);
    else missing.push(kw);
  }

  const total = found.length + missing.length;
  const score = total === 0 ? 0 : Math.round((found.length / total) * 100);

  // Group by category (only categories that appear in JD)
  const catMap = new Map<string, KeywordGroup>();
  for (const kw of found) {
    const cat = categoryOf(kw);
    if (!catMap.has(cat)) catMap.set(cat, { category: cat, found: [], missing: [] });
    catMap.get(cat)!.found.push(kw);
  }
  for (const kw of missing) {
    const cat = categoryOf(kw);
    if (!catMap.has(cat)) catMap.set(cat, { category: cat, found: [], missing: [] });
    catMap.get(cat)!.missing.push(kw);
  }

  // Sort groups: most missing first
  const groups = [...catMap.values()].sort(
    (a, b) => b.missing.length - a.missing.length
  );

  return { score, found, missing, groups };
}

/** Flatten all resume fields to a single searchable string */
export function resumeToText(data: {
  name?: string; title?: string; summary?: string; skills?: string;
  work?: { role?: string; company?: string; desc?: string }[];
  edu?:  { degree?: string; school?: string }[];
  certifications?: { name?: string }[];
  projects?: { name?: string; desc?: string }[];
}): string {
  const parts: string[] = [
    data.name ?? "", data.title ?? "", data.summary ?? "", data.skills ?? "",
    ...(data.work ?? []).flatMap(w => [w.role ?? "", w.company ?? "", w.desc ?? ""]),
    ...(data.edu  ?? []).flatMap(e => [e.degree ?? "", e.school ?? ""]),
    ...(data.certifications ?? []).map(c => c.name ?? ""),
    ...(data.projects ?? []).flatMap(p => [p.name ?? "", p.desc ?? ""]),
  ];
  return parts.join(" ");
}
