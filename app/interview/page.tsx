"use client";
import { useWindowWidth } from "@/lib/useWindowWidth";
/**
 * /interview — Interview Prep & Career Path Builder
 *
 * Flow:
 *   1. Profile   — current role + skills (auto-loaded from resume) + target role + company
 *   2. Gap       — readiness score, critical gaps ordered by priority, strengths
 *   3. Practice  — 5 questions targeted at ONE chosen gap skill
 *   4. Results   — score for that skill set, next recommended gap
 */
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronRight, ChevronLeft, Mic, MicOff, Zap,
  CheckCircle2, AlertTriangle, Lightbulb, RotateCcw, BookOpen,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import CourseCard from "@/components/CourseCard";
import { getCoursesForSkill } from "@/lib/courseRecommendations";
import type { ResumeData } from "@/lib/types";
import { trackAction } from "@/lib/activityTracker";

/* ── Types ───────────────────────────────────────────────── */
type Stage = "profile" | "analyzing" | "gaps" | "loading_q" | "practice" | "results";
type Difficulty = "fresher" | "mid" | "senior";

interface GapItem {
  skill:     string;
  why:       string;
  studyTime: string;
  priority:  number;
  resources: string[];
}
interface GapAnalysis {
  readinessScore:   number;
  verdict:          string;
  currentStrengths: string[];
  criticalGaps:     GapItem[];
  niceToHaves:      string[];
}
interface Feedback {
  score:            number;
  verdict:          string;
  strengths:        string[];
  improvements:     string[];
  betterAnswer:     string;
  keyConceptMissed: string | null;
}
interface AnswerState {
  text:      string;
  feedback:  Feedback | null;
  loading:   boolean;
  submitted: boolean;
}

/* ── Programming languages ──────────────────────────────── */
export const PROG_LANGUAGES = [
  { key: "any",        label: "Any / General",  icon: "ti-brain",              color: "#6366f1" },
  { key: "javascript", label: "JavaScript",      icon: "ti-brand-javascript",   color: "#f7df1e" },
  { key: "typescript", label: "TypeScript",      icon: "ti-brand-typescript",   color: "#3178c6" },
  { key: "python",     label: "Python",          icon: "ti-brand-python",       color: "#3776ab" },
  { key: "java",       label: "Java",            icon: "ti-coffee",             color: "#ed8b00" },
  { key: "go",         label: "Go",              icon: "ti-brand-golang",       color: "#00add8" },
  { key: "rust",       label: "Rust",            icon: "ti-brand-rust",         color: "#ce422b" },
  { key: "cpp",        label: "C++",             icon: "ti-settings",           color: "#00599c" },
  { key: "csharp",     label: "C#",              icon: "ti-brand-c",            color: "#9b4f96" },
  { key: "kotlin",     label: "Kotlin",          icon: "ti-brand-kotlin",       color: "#7f52ff" },
  { key: "swift",      label: "Swift",           icon: "ti-brand-apple",        color: "#fa7343" },
  { key: "sql",        label: "SQL / DB",        icon: "ti-database",           color: "#00758f" },
  { key: "ruby",       label: "Ruby",            icon: "ti-diamond",            color: "#cc342d" },
  { key: "php",        label: "PHP",             icon: "ti-brand-php",          color: "#777bb4" },
  { key: "scala",      label: "Scala",           icon: "ti-circle",             color: "#dc322f" },
  { key: "r",          label: "R (Data)",        icon: "ti-chart-bar",          color: "#276dc3" },
] as const;

export type ProgLanguageKey = typeof PROG_LANGUAGES[number]["key"];

/* ── Constants ───────────────────────────────────────────── */
const TARGET_ROLES = [
  "Software Engineer (SDE-1)", "Software Engineer (SDE-2)", "Senior Software Engineer",
  "Staff Engineer", "Engineering Manager", "Full Stack Developer",
  "Frontend Engineer", "Backend Engineer", "DevOps / SRE Engineer",
  "Data Engineer", "ML Engineer", "Data Scientist",
  "Product Manager", "Senior Product Manager", "Product Director",
  "Other (type below)",
];
const COMPANIES = [
  "Any top company", "Razorpay", "Flipkart", "Swiggy", "Zomato", "PhonePe", "CRED",
  "Meesho", "Zepto", "Groww", "Paytm", "Google India", "Microsoft India",
  "Amazon India", "Atlassian", "Startup",
];
const DIFFICULTIES: { key: Difficulty; label: string; desc: string }[] = [
  { key: "fresher", label: "Fresher",   desc: "0–2 yrs" },
  { key: "mid",     label: "Mid-level", desc: "2–5 yrs" },
  { key: "senior",  label: "Senior",    desc: "5+ yrs"  },
];

/* ── Utils ───────────────────────────────────────────────── */
function scoreColor(n: number) {
  return n >= 75 ? "var(--success)" : n >= 50 ? "var(--warn)" : "var(--danger)";
}
function qScoreColor(n: number) {
  return n >= 8 ? "var(--success)" : n >= 6 ? "var(--warn)" : "var(--danger)";
}

/* ── Score Ring (SVG circular progress) ─────────────────── */
function ScoreRing({
  score, max = 100, size = 140, color, children,
}: {
  score: number; max?: number; size?: number; color: string; children?: React.ReactNode;
}) {
  const r    = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / max, 1);
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${pct * circ} ${(1 - pct) * circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div style={{ position: "relative", textAlign: "center", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ── Animated loading screen ─────────────────────────────── */
function LoadingScreen({ messages }: { messages: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div style={{ padding: "100px 24px 60px", textAlign: "center" }}>
      <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 28px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 1s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-brain" style={{ fontSize: 22, color: "var(--accent)" }} />
        </div>
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)", marginBottom: 8, minHeight: 26 }}>
        {messages[idx]}
      </p>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
        {messages.map((_, i) => (
          <div key={i} style={{
            height: 6, borderRadius: 3,
            width: i === idx ? 20 : 6,
            background: i === idx ? "var(--accent)" : "var(--border)",
            transition: "all .4s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── Step progress indicator ─────────────────────────────── */
function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Profile" },
    { n: 2, label: "Gaps" },
    { n: 3, label: "Practice" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: s.n < current ? "var(--success)" : s.n === current ? "var(--accent)" : "var(--surface2)",
              border: `2px solid ${s.n < current ? "var(--success)" : s.n === current ? "var(--accent)" : "var(--border)"}`,
              color: s.n <= current ? "#fff" : "var(--text3)",
            }}>
              {s.n < current ? "✓" : s.n}
            </div>
            <span style={{ fontSize: 10, fontWeight: s.n === current ? 700 : 400, color: s.n === current ? "var(--accent)" : "var(--text3)" }}>
              {s.label}
            </span>
          </div>
          {i < 2 && (
            <div style={{
              width: 40, height: 2, borderRadius: 1, margin: "0 4px", marginTop: -10,
              background: s.n < current ? "var(--success)" : "var(--border)",
              transition: "background .4s",
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function InterviewPage() {
  const w      = useWindowWidth();
  const mobile = w < 640;

  const [stage,         setStage]         = useState<Stage>("profile");
  const [currentRole,   setCurrentRole]   = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [targetRole,    setTargetRole]    = useState(TARGET_ROLES[1]);
  const [customRole,    setCustomRole]    = useState("");
  const [company,       setCompany]       = useState(COMPANIES[0]);
  const [difficulty,    setDifficulty]    = useState<Difficulty>("mid");
  const [progLang,      setProgLang]      = useState<ProgLanguageKey>("any");
  const [gaps,          setGaps]          = useState<GapAnalysis | null>(null);
  const [practicedGaps, setPracticedGaps] = useState<Set<string>>(new Set());

  // Practice state
  const [focusSkill,  setFocusSkill]  = useState("");
  const [questions,   setQuestions]   = useState<string[]>([]);
  const [answers,     setAnswers]     = useState<AnswerState[]>([]);
  const [currentQ,    setCurrentQ]    = useState(0);
  const [listening,   setListening]   = useState(false);
  const [showGuide,   setShowGuide]   = useState(false);
  const [expandedQ,   setExpandedQ]   = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const effectiveRole = targetRole === "Other (type below)" ? customRole : targetRole;

  /* ── Load skills from resume draft ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const data: ResumeData = parsed.data ?? parsed;
      if (data.skills) setCurrentSkills(data.skills.slice(0, 300));
      if (data.title)  setCurrentRole(data.title.slice(0, 80));
    } catch { /* ignore */ }
  }, []);

  /* ── Analyze gaps ── */
  async function handleAnalyze() {
    if (!effectiveRole.trim()) return;
    setStage("analyzing");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_gaps", currentRole, currentSkills, targetRole: effectiveRole, company, progLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGaps(data.gaps);
      setPracticedGaps(new Set());
      setStage("gaps");
    } catch (err: unknown) {
      alert(`Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStage("profile");
    }
  }

  /* ── Start practice for a specific gap ── */
  async function startPractice(skill: string) {
    setFocusSkill(skill);
    setStage("loading_q");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_questions", targetRole: effectiveRole, company, focusSkill: skill, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ({ text: "", feedback: null, loading: false, submitted: false })));
      setCurrentQ(0);
      setShowGuide(false);
      setStage("practice");
    } catch (err: unknown) {
      alert(`Failed to generate questions: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStage("gaps");
    }
  }

  /* ── Evaluate answer ── */
  async function handleEvaluate(idx: number) {
    const a = answers[idx];
    if (!a || a.text.trim().length < 15 || a.submitted || a.loading) return;
    recognitionRef.current?.stop(); setListening(false);
    setAnswers(p => p.map((x, i) => i === idx ? { ...x, loading: true } : x));
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate_answer", question: questions[idx], answer: answers[idx].text, focusSkill }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnswers(p => p.map((x, i) => i === idx ? { ...x, feedback: data.feedback, loading: false, submitted: true } : x));
    } catch (err: unknown) {
      alert(`Evaluation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setAnswers(p => p.map((x, i) => i === idx ? { ...x, loading: false } : x));
    }
  }

  /* ── Voice ── */
  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input needs Chrome."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-IN";
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      setAnswers(p => p.map((x, i) => i === currentQ ? { ...x, text: t } : x));
    };
    r.onend = () => setListening(false);
    r.start(); recognitionRef.current = r; setListening(true);
  }

  /* ── Finish practice ── */
  function finishPractice() {
    setPracticedGaps(p => new Set([...p, focusSkill]));
    trackAction("interview_practiced");
    setExpandedQ(null);
    setStage("results");
  }

  const allAnswered = answers.length > 0 && answers.every(a => a.submitted);
  const avgScore    = allAnswered
    ? Math.round(answers.reduce((s, a) => s + (a.feedback?.score ?? 0), 0) / answers.length * 10) / 10
    : 0;

  /* ── Shared styles ── */
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20,
  };
  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 9,
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text1)", fontSize: 13, fontFamily: "inherit",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)",
    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6,
  };

  /* ══════════════════════════════════════════════════════════
     STAGE: profile
  ══════════════════════════════════════════════════════════ */
  if (stage === "profile") return (
    <AppShell>
      <div style={{ padding: mobile ? "16px 12px 64px" : "24px 24px 64px", maxWidth: 680, margin: "0 auto" }}>

        <StepProgress current={1} />

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: "var(--accdim)",
            border: "1px solid var(--accborder)", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 14px", fontSize: 28,
          }}>
            <i className="ti ti-brain" style={{ color: "var(--accent)" }} />
          </div>
          <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 8 }}>
            Interview Prep
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>
            Tell us where you are and where you want to go — we'll map the skill gaps and generate targeted practice questions.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Current state */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-map-pin" style={{ fontSize: 14, color: "var(--accent)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>Where you are now</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbl}>Current role / title</label>
                <input style={inp} placeholder="e.g. Junior Software Engineer, Fresher, Student"
                  value={currentRole} onChange={e => setCurrentRole(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>
                  Current skills
                  {currentSkills && <span style={{ color: "var(--success)", marginLeft: 6, textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>· auto-loaded ✓</span>}
                </label>
                <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }}
                  placeholder="e.g. React, Node.js, MySQL, 2 years full-stack experience…"
                  value={currentSkills} onChange={e => setCurrentSkills(e.target.value.slice(0, 400))} />
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, textAlign: "right" }}>{currentSkills.length}/400</div>
              </div>
            </div>
          </div>

          {/* Target */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(34,197,94,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-target" style={{ fontSize: 14, color: "var(--success)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>Where you want to go</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Target role</label>
                <select style={{ ...inp, cursor: "pointer" }} value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                  {TARGET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {targetRole === "Other (type below)" && (
                  <input style={{ ...inp, marginTop: 8 }} placeholder="Your target role…"
                    value={customRole} onChange={e => setCustomRole(e.target.value)} />
                )}
              </div>
              <div>
                <label style={lbl}>Target company <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <div style={{ display: "flex", overflowX: "auto", gap: 7, paddingBottom: 4, scrollbarWidth: "none" }}>
                  {COMPANIES.map(c => (
                    <button key={c} onClick={() => setCompany(c)} style={{
                      padding: "5px 13px", borderRadius: 99, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                      border: `1px solid ${company === c ? "var(--accent)" : "var(--border)"}`,
                      background: company === c ? "var(--accdim)" : "var(--surface2)",
                      color: company === c ? "var(--accent)" : "var(--text2)",
                      fontWeight: company === c ? 700 : 400,
                    }}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-chart-bar" style={{ fontSize: 14, color: "var(--warn)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>Question difficulty</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {DIFFICULTIES.map(d => (
                <button key={d.key} onClick={() => setDifficulty(d.key)} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center" as const,
                  border: `1.5px solid ${difficulty === d.key ? "var(--accent)" : "var(--border)"}`,
                  background: difficulty === d.key ? "var(--accdim)" : "var(--surface2)",
                  transition: "all .15s",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: difficulty === d.key ? "var(--accent)" : "var(--text1)" }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Programming language */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-device-laptop" style={{ fontSize: 14, color: "var(--accent)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>Coding language</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(3,1fr)" : "repeat(4,1fr)", gap: 6 }}>
              {PROG_LANGUAGES.map(l => {
                const active = progLang === l.key;
                return (
                  <button key={l.key} onClick={() => setProgLang(l.key as ProgLanguageKey)} style={{
                    padding: "9px 6px", borderRadius: 9, cursor: "pointer", textAlign: "center" as const,
                    border: `1.5px solid ${active ? l.color : "var(--border)"}`,
                    background: active ? `${l.color}18` : "var(--surface2)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    transition: "all .15s",
                  }}>
                    <i className={`ti ${l.icon}`} style={{ fontSize: 17, color: l.color }} />
                    <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? l.color : "var(--text2)", lineHeight: 1.2 }}>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button onClick={handleAnalyze} disabled={!effectiveRole.trim()} style={{
            padding: "15px 24px", borderRadius: 12, border: "none", marginTop: 4,
            background: effectiveRole.trim() ? "var(--accent)" : "var(--surface2)",
            color: effectiveRole.trim() ? "#fff" : "var(--text3)",
            fontSize: 15, fontWeight: 700, cursor: effectiveRole.trim() ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <i className="ti ti-sparkles" /> Analyse My Skill Gaps <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <style>{`input:focus,textarea:focus,select:focus{outline:2px solid var(--accent);outline-offset:1px}`}</style>
    </AppShell>
  );

  /* ══════════════════════════════════════════════════════════
     STAGE: analyzing / loading_q
  ══════════════════════════════════════════════════════════ */
  if (stage === "analyzing" || stage === "loading_q") {
    const msgs = stage === "analyzing"
      ? ["Reviewing your profile…", "Mapping role requirements…", "Calculating readiness score…", "Identifying priority gaps…"]
      : [`Crafting ${focusSkill} questions…`, "Calibrating difficulty level…", "Finalising your practice set…"];
    return (
      <AppShell>
        <LoadingScreen messages={msgs} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </AppShell>
    );
  }

  /* ══════════════════════════════════════════════════════════
     STAGE: gaps
  ══════════════════════════════════════════════════════════ */
  if (stage === "gaps" && gaps) {
    const sc      = gaps.readinessScore;
    const scColor = scoreColor(sc);
    const nextGap = gaps.criticalGaps.find(g => !practicedGaps.has(g.skill));

    return (
      <AppShell actions={
        <button onClick={() => setStage("profile")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" /> Re-analyse
        </button>
      }>
        <div style={{ padding: mobile ? "16px 12px 64px" : "24px 24px 64px", maxWidth: 680, margin: "0 auto" }}>

          <StepProgress current={2} />

          {/* Readiness score ring */}
          <div style={{ ...card, marginBottom: 20, background: `${scColor}06`, borderColor: `${scColor}22`, textAlign: "center", padding: "32px 24px" }}>
            <ScoreRing score={sc} color={scColor} size={mobile ? 130 : 150}>
              <div style={{ fontSize: mobile ? 34 : 40, fontWeight: 900, color: scColor, lineHeight: 1, letterSpacing: "-.04em" }}>{sc}</div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>/ 100</div>
            </ScoreRing>
            <div style={{ fontSize: 11, color: "var(--text3)", margin: "10px 0 10px" }}>readiness score</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text1)", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>{gaps.verdict}</div>
            <div style={{ marginTop: 14, display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
              {[effectiveRole, company, DIFFICULTIES.find(d => d.key === difficulty)?.label ?? ""].map(t => (
                <span key={t} style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{t}</span>
              ))}
            </div>
            {practicedGaps.size > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--success)", fontWeight: 600 }}>
                <i className="ti ti-check" /> {practicedGaps.size} gap{practicedGaps.size > 1 ? "s" : ""} practiced
              </div>
            )}
          </div>

          {/* Strengths + nice-to-haves */}
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 22 }}>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} /> Already strong
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {gaps.currentStrengths.map(s => (
                  <span key={s} style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)", color: "var(--success)" }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Lightbulb size={14} /> Nice-to-haves
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {gaps.niceToHaves.map(s => (
                  <span key={s} style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Critical gaps */}
          <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={15} color="var(--danger)" /> Critical gaps — practice in order
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gaps.criticalGaps.map((g, i) => {
              const done   = practicedGaps.has(g.skill);
              const isNext = g.skill === nextGap?.skill;
              return (
                <div key={g.skill} style={{
                  ...card, padding: "16px 18px",
                  borderLeft: `4px solid ${done ? "var(--success)" : isNext ? "var(--accent)" : "var(--border)"}`,
                  opacity: done ? 0.72 : 1,
                }}>
                  {/* Top row: badge + content */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                      background: done ? "rgba(34,197,94,.1)" : isNext ? "var(--accdim)" : "var(--surface2)",
                      border: `2px solid ${done ? "var(--success)" : isNext ? "var(--accent)" : "var(--border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800,
                      color: done ? "var(--success)" : isNext ? "var(--accent)" : "var(--text3)",
                    }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>{g.skill}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>⏱ {g.studyTime}</span>
                        {done && <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>Practiced ✓</span>}
                        {isNext && !done && <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>← Start here</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.55, marginBottom: g.resources?.length > 0 ? 8 : 0 }}>{g.why}</div>
                      {g.resources?.length > 0 && (
                        <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600 }}>Resources:</span>
                          {g.resources.map((r, j) => (
                            <span key={j} style={{ background: "var(--surface2)", padding: "2px 7px", borderRadius: 5, border: "1px solid var(--border)" }}>{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Practice button — full-width row below on all sizes */}
                  <button onClick={() => startPractice(g.skill)} style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
                    background: done ? "var(--surface2)" : isNext ? "var(--accent)" : "rgba(99,102,241,.12)",
                    color: done ? "var(--text2)" : isNext ? "#fff" : "var(--accent)",
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {done ? "↺ Re-practice" : `Practice ${g.skill} →`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div style={{ marginTop: 20 }}>
            {nextGap ? (
              <button onClick={() => startPractice(nextGap.skill)} style={{
                width: "100%", padding: 16, borderRadius: 12, border: "none",
                background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                Start with "{nextGap.skill}" <ChevronRight size={18} />
              </button>
            ) : (
              <div style={{ padding: 20, borderRadius: 12, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}><i className="ti ti-confetti" /></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success)", marginBottom: 6 }}>All critical gaps practiced!</div>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>You've worked through every skill gap. Apply with confidence.</div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  /* ══════════════════════════════════════════════════════════
     STAGE: practice
  ══════════════════════════════════════════════════════════ */
  if (stage === "practice") {
    const cur       = answers[currentQ];
    const q         = questions[currentQ];
    const canSubmit = cur && cur.text.trim().length >= 15 && !cur.submitted && !cur.loading;
    const fb        = cur?.feedback;
    const wordCount = (cur?.text ?? "").trim().split(/\s+/).filter(Boolean).length;
    const answeredCount = answers.filter(a => a.submitted).length;

    return (
      <AppShell actions={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setStage("gaps")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-arrow-left" /> Gap Plan
          </button>
          <span style={{ padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            {focusSkill}
          </span>
        </div>
      }>
        <div style={{ padding: mobile ? "16px 12px 64px" : "24px 24px 64px", maxWidth: 680, margin: "0 auto" }}>

          {/* Progress bar */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                Question {currentQ + 1} of {questions.length}
              </span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                {answeredCount} / {questions.length} answered
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: "var(--accent)", borderRadius: 2,
                width: `${(answeredCount / questions.length) * 100}%`,
                transition: "width .4s ease",
              }} />
            </div>
            {/* Question dot nav */}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {questions.map((_, i) => {
                const done   = answers[i]?.submitted;
                const active = i === currentQ;
                const s      = answers[i]?.feedback?.score ?? 0;
                return (
                  <button key={i} onClick={() => { setCurrentQ(i); setShowGuide(false); }} style={{
                    width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: active ? "var(--accent)" : done ? `${qScoreColor(s)}18` : "var(--surface2)",
                    color: active ? "#fff" : done ? qScoreColor(s) : "var(--text3)",
                    fontSize: 11, fontWeight: 700,
                    outline: active ? "2px solid var(--accent)" : "none",
                    outlineOffset: 2,
                  }}>
                    {done ? answers[i].feedback?.score : i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question card */}
          <div style={{ ...card, marginBottom: 14, borderLeft: "3px solid var(--accent)", padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>
              Q{currentQ + 1} · {focusSkill}
            </div>
            <p style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, lineHeight: 1.6, margin: 0, color: "var(--text1)" }}>{q}</p>
          </div>

          {/* STAR guide toggle */}
          <button onClick={() => setShowGuide(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "6px 13px", marginBottom: 12,
            background: showGuide ? "var(--accdim)" : "none",
            border: `1px solid ${showGuide ? "var(--accborder)" : "var(--border)"}`,
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            color: showGuide ? "var(--accent)" : "var(--text3)", cursor: "pointer",
          }}>
            <BookOpen size={12} /> {showGuide ? "Hide" : "Show"} STAR Method
          </button>

          {showGuide && (
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
              {[
                { l: "S", w: "Situation", c: "var(--accent)",  t: "Set the scene — what was the context?" },
                { l: "T", w: "Task",      c: "#a78bfa",        t: "What was your responsibility?" },
                { l: "A", w: "Action",    c: "var(--warn)",    t: "What did YOU do? Use 'I', not 'we'." },
                { l: "R", w: "Result",    c: "var(--success)", t: "Quantify the outcome." },
              ].map(s => (
                <div key={s.l} style={{ padding: "12px 10px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${s.c}18`, border: `2px solid ${s.c}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 7px", fontSize: 13, fontWeight: 800, color: s.c }}>{s.l}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.c }}>{s.w}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, lineHeight: 1.4 }}>{s.t}</div>
                </div>
              ))}
            </div>
          )}

          {/* Answer box or feedback */}
          {!cur?.submitted ? (
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Your Answer</label>
                <button onClick={toggleVoice} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 11px",
                  borderRadius: 7, border: `1px solid ${listening ? "var(--danger)" : "var(--border)"}`,
                  background: listening ? "rgba(239,68,68,.1)" : "var(--surface2)",
                  color: listening ? "var(--danger)" : "var(--text3)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>
                  {listening ? <><MicOff size={11} /> Stop</> : <><Mic size={11} /> Speak</>}
                </button>
              </div>
              {listening && (
                <div style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--danger)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)", display: "inline-block", animation: "pulse 1s infinite" }} />
                  Recording…
                </div>
              )}
              <textarea ref={textareaRef}
                value={cur?.text ?? ""}
                onChange={e => setAnswers(p => p.map((x, i) => i === currentQ ? { ...x, text: e.target.value } : x))}
                placeholder="Use the STAR method: describe the Situation, Task, your Actions, and the Result…"
                rows={8}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10,
                  color: "var(--text1)", fontSize: 14, resize: "vertical", lineHeight: 1.65,
                  boxSizing: "border-box" as const, fontFamily: "inherit", outline: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ fontSize: 12, color: wordCount >= 40 ? "var(--success)" : "var(--text3)" }}>
                  {wordCount} words {wordCount < 40 ? "· aim for 40+" : "✓"}
                </span>
                <button onClick={() => handleEvaluate(currentQ)} disabled={!canSubmit} style={{
                  padding: "10px 22px", borderRadius: 9, border: "none",
                  background: canSubmit ? "var(--accent)" : "var(--surface2)",
                  color: canSubmit ? "#fff" : "var(--text3)",
                  fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {cur?.loading ? "Evaluating…" : <><Zap size={13} /> Get Feedback</>}
                </button>
              </div>
            </div>
          ) : fb && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Score badge */}
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, background: `${qScoreColor(fb.score)}08`, borderColor: `${qScoreColor(fb.score)}28` }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                  background: `${qScoreColor(fb.score)}18`, border: `2.5px solid ${qScoreColor(fb.score)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 900, color: qScoreColor(fb.score),
                }}>
                  {fb.score}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: qScoreColor(fb.score) }}>{fb.verdict}</div>
                  {fb.keyConceptMissed && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>Key concept missed: <strong>{fb.keyConceptMissed}</strong></div>}
                </div>
              </div>
              {fb.strengths.length > 0 && (
                <div style={{ ...card, borderLeft: "3px solid var(--success)", padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", marginBottom: 8 }}>✓ What worked</div>
                  {fb.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", marginBottom: 5, display: "flex", gap: 8, lineHeight: 1.5 }}>
                      <span style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }}>✓</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {fb.improvements.length > 0 && (
                <div style={{ ...card, borderLeft: "3px solid var(--warn)", padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn)", marginBottom: 8 }}>⚡ Improve</div>
                  {fb.improvements.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", marginBottom: 5, display: "flex", gap: 8, lineHeight: 1.5 }}>
                      <span style={{ color: "var(--warn)", flexShrink: 0, marginTop: 1 }}>→</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {fb.betterAnswer && (
                <div style={{ ...card, borderLeft: "3px solid var(--accent)", padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>
                    <i className="ti ti-bulb" /> Stronger answer
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text2)", margin: 0, lineHeight: 1.7, fontStyle: "italic", borderLeft: "2px solid var(--accborder)", paddingLeft: 12 }}>
                    "{fb.betterAnswer}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, gap: 10 }}>
            <button
              onClick={() => { setCurrentQ(Math.max(0, currentQ - 1)); setShowGuide(false); }}
              disabled={currentQ === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 9,
                background: currentQ === 0 ? "transparent" : "var(--surface)",
                border: currentQ === 0 ? "none" : "1px solid var(--border)",
                color: currentQ === 0 ? "var(--text3)" : "var(--text1)",
                fontSize: 13, fontWeight: 600, cursor: currentQ === 0 ? "not-allowed" : "pointer",
              }}>
              <ChevronLeft size={14} /> Prev
            </button>

            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => { setCurrentQ(currentQ + 1); setShowGuide(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Next <ChevronRight size={14} />
              </button>
            ) : allAnswered ? (
              <button
                onClick={finishPractice}
                style={{ padding: "10px 22px", borderRadius: 9, background: "var(--success)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                See Results <i className="ti ti-trophy" />
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>Answer to continue</span>
            )}
          </div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </AppShell>
    );
  }

  /* ══════════════════════════════════════════════════════════
     STAGE: results
  ══════════════════════════════════════════════════════════ */
  if (stage === "results") {
    const sc      = avgScore;
    const c       = qScoreColor(sc);
    const verdict = sc >= 8 ? "Excellent!" : sc >= 6 ? "Good work" : sc >= 4 ? "Keep Practising" : "Keep Going";
    const nextGap = gaps?.criticalGaps.find(g => !practicedGaps.has(g.skill));

    return (
      <AppShell actions={
        <button onClick={() => setStage("gaps")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" /> Gap Plan
        </button>
      }>
        <div style={{ padding: mobile ? "16px 12px 64px" : "24px 24px 64px", maxWidth: 680, margin: "0 auto" }}>

          {/* Score hero with ring */}
          <div style={{ ...card, textAlign: "center", marginBottom: 22, background: `${c}06`, borderColor: `${c}22`, padding: "32px 24px" }}>
            <div style={{ fontSize: 20, marginBottom: 14 }}><i className="ti ti-trophy" style={{ color: c }} /></div>
            <ScoreRing score={sc} max={10} size={mobile ? 130 : 150} color={c}>
              <div style={{ fontSize: mobile ? 32 : 38, fontWeight: 900, color: c, lineHeight: 1, letterSpacing: "-.04em" }}>{sc}</div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>/ 10</div>
            </ScoreRing>
            <div style={{ fontSize: 11, color: "var(--text3)", margin: "10px 0 6px" }}>avg score</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{verdict}</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>
              {focusSkill} · {effectiveRole}
            </div>
          </div>

          {/* Per-question breakdown — expandable */}
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text2)" }}>Question breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
            {questions.map((q, i) => {
              const a   = answers[i];
              const f   = a?.feedback;
              const qc  = f ? qScoreColor(f.score) : "var(--text3)";
              const exp = expandedQ === i;
              return (
                <div key={i} style={{ ...card, borderLeft: `3px solid ${qc}`, padding: 0, overflow: "hidden" }}>
                  {/* Header row — always visible */}
                  <button
                    onClick={() => setExpandedQ(exp ? null : i)}
                    style={{
                      width: "100%", padding: "13px 16px",
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12, textAlign: "left" as const,
                    }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: `${qc}18`, border: `2px solid ${qc}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: qc,
                    }}>
                      {f?.score ?? "—"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Q{i + 1}: {q}</div>
                      {f?.keyConceptMissed && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Key missed: {f.keyConceptMissed}</div>}
                    </div>
                    <i className={`ti ti-chevron-${exp ? "up" : "down"}`} style={{ fontSize: 14, color: "var(--text3)", flexShrink: 0 }} />
                  </button>
                  {/* Expanded detail */}
                  {exp && f && (
                    <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
                      {f.strengths.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", marginBottom: 6 }}>✓ What worked</div>
                          {f.strengths.map((s, j) => <div key={j} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 3 }}>· {s}</div>)}
                        </div>
                      )}
                      {f.improvements.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--warn)", marginBottom: 6 }}>⚡ Improve</div>
                          {f.improvements.map((s, j) => <div key={j} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 3 }}>· {s}</div>)}
                        </div>
                      )}
                      {f.betterAnswer && (
                        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "var(--surface2)", borderLeft: "2px solid var(--accborder)", fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic" }}>
                          "{f.betterAnswer}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Course recommendations */}
          {(() => {
            const courses = getCoursesForSkill(focusSkill, 2);
            if (!courses.length) return null;
            return (
              <div style={{ ...card, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  <i className="ti ti-books" style={{ marginRight: 5 }} />Deepen your {focusSkill} skills
                </div>
                <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>
                  Practice builds muscle — structured learning accelerates it.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {courses.map(c => <CourseCard key={c.affiliateUrl} course={c} />)}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {nextGap ? (
              <button onClick={() => startPractice(nextGap.skill)} style={{
                padding: 15, borderRadius: 12, border: "none",
                background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                Next gap: "{nextGap.skill}" <ChevronRight size={16} />
              </button>
            ) : (
              <div style={{ padding: 18, borderRadius: 12, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}><i className="ti ti-confetti" /></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>All critical gaps practiced!</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => startPractice(focusSkill)} style={{
                flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid var(--border)",
                background: "var(--surface2)", color: "var(--text2)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <RotateCcw size={13} /> Retry {focusSkill}
              </button>
              <button onClick={() => setStage("gaps")} style={{
                flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid var(--border)",
                background: "var(--surface2)", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Back to Gaps
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return null;
}
