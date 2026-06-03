"use client";
/**
 * /interview — AI Interview Prep (v2)
 * Fully interactive: company + role + type + difficulty → timer → STAR guide →
 * voice/text answer → animated AI feedback → results dashboard
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Mic, MicOff, ChevronRight, ChevronLeft,
  CheckCircle2, AlertTriangle, Lightbulb, RotateCcw, Star,
  Timer, Zap, BookOpen, Volume2,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import type { ResumeData } from "@/lib/types";

/* ── Types ──────────────────────────────────────────────────── */
type Stage      = "setup" | "questions" | "done";
type InterviewType = "mixed" | "behavioral" | "technical" | "hr";
type Difficulty    = "fresher" | "mid" | "senior";

interface Feedback {
  score:        number;
  verdict:      "Excellent" | "Good" | "Needs Work" | "Poor";
  strengths:    string[];
  improvements: string[];
  betterAnswer: string;
}
interface AnswerState {
  text:      string;
  feedback:  Feedback | null;
  loading:   boolean;
  submitted: boolean;
  timeUsed:  number; // seconds
}

/* ── Constants ──────────────────────────────────────────────── */
const COMPANIES = [
  "Razorpay","Flipkart","Swiggy","Zomato","PhonePe","CRED",
  "Meesho","Zepto","Groww","Ola","Paytm","Infosys","TCS",
  "Google India","Microsoft India","Amazon India","Startup","Other",
];
const ROLES = [
  "Software Engineer (SDE-1)","Software Engineer (SDE-2)",
  "Senior Software Engineer","Full Stack Developer",
  "Frontend Engineer","Backend Engineer","DevOps Engineer",
  "Data Engineer","ML Engineer","Product Manager",
  "Data Scientist","Engineering Manager",
];
const INTERVIEW_TYPES: { key: InterviewType; label: string; icon: string; desc: string }[] = [
  { key: "mixed",      label: "Mixed",      icon: "🔀", desc: "Behavioral + Technical" },
  { key: "behavioral", label: "Behavioral", icon: "💬", desc: "Situation, Action, Result" },
  { key: "technical",  label: "Technical",  icon: "💻", desc: "Coding & system design" },
  { key: "hr",         label: "HR Round",   icon: "🤝", desc: "Culture & motivation fit" },
];
const DIFFICULTIES: { key: Difficulty; label: string; icon: string }[] = [
  { key: "fresher", label: "Fresher",    icon: "🌱" },
  { key: "mid",     label: "Mid-level",  icon: "🚀" },
  { key: "senior",  label: "Senior",     icon: "⭐" },
];
const TIME_LIMITS: Record<Difficulty, number> = { fresher: 180, mid: 150, senior: 120 };

const STAR_GUIDE = [
  { letter: "S", word: "Situation",  color: "var(--accent)",  tip: "Set the scene — what was the context?" },
  { letter: "T", word: "Task",       color: "#a78bfa",        tip: "What was your specific responsibility?" },
  { letter: "A", word: "Action",     color: "var(--warn)",    tip: "What did YOU do? Use 'I', not 'we'." },
  { letter: "R", word: "Result",     color: "var(--success)", tip: "Quantify the outcome if possible." },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function scoreColor(n: number) {
  return n >= 8 ? "var(--success)" : n >= 6 ? "var(--warn)" : "var(--danger)";
}

/* ── Sub-components ──────────────────────────────────────────── */

function ScoreBadge({ score }: { score: number }) {
  const c = scoreColor(score);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
      background: `${c}18`, border: `2px solid ${c}`,
      fontSize: 17, fontWeight: 800, color: c,
    }}>{score}</div>
  );
}

function ProgressBar({ answers, total, current }: { answers: AnswerState[]; total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => {
        const done = answers[i]?.submitted;
        const active = i === current;
        const score  = answers[i]?.feedback?.score ?? 0;
        const bg = done ? scoreColor(score) : active ? "var(--accent)" : "rgba(255,255,255,.15)";
        return (
          <div key={i} style={{
            width: active ? 20 : 10, height: 6, borderRadius: 3,
            background: bg, transition: "all .3s",
          }} />
        );
      })}
    </div>
  );
}

function CountdownTimer({
  limit, onExpire,
}: { limit: number; onExpire: () => void }) {
  const [left, setLeft] = useState(limit);
  const expired = useRef(false);

  useEffect(() => {
    expired.current = false;
    setLeft(limit);
  }, [limit]);

  useEffect(() => {
    if (left <= 0) {
      if (!expired.current) { expired.current = true; onExpire(); }
      return;
    }
    const id = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onExpire]);

  const pct = (left / limit) * 100;
  const col = left > limit * 0.5 ? "var(--success)" : left > limit * 0.2 ? "var(--warn)" : "var(--danger)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Timer size={13} style={{ color: col }} />
      <div style={{ width: 60, height: 5, background: "rgba(255,255,255,.1)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 3, transition: "width 1s linear" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 34 }}>{fmtTime(left)}</span>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function InterviewPage() {
  const [stage,         setStage]         = useState<Stage>("setup");
  const [company,       setCompany]       = useState("Razorpay");
  const [customCompany, setCustomCompany] = useState("");
  const [role,          setRole]          = useState(ROLES[0]);
  const [customRole,    setCustomRole]    = useState("");
  const [intType,       setIntType]       = useState<InterviewType>("mixed");
  const [difficulty,    setDifficulty]    = useState<Difficulty>("mid");
  const [questions,     setQuestions]     = useState<string[]>([]);
  const [currentQ,      setCurrentQ]      = useState(0);
  const [answers,       setAnswers]       = useState<AnswerState[]>([]);
  const [generating,    setGenerating]    = useState(false);
  const [resumeSkills,  setResumeSkills]  = useState("");
  const [showStar,      setShowStar]      = useState(false);
  const [listening,     setListening]     = useState(false);
  const [timerKey,      setTimerKey]      = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionStart = useRef<number>(0);

  // Load resume skills
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        const data: ResumeData = parsed.data ?? parsed;
        if (data.skills) setResumeSkills(data.skills.slice(0, 200));
      }
    } catch { /* ignore */ }
  }, []);

  const effectiveCompany = company === "Other" ? customCompany : company;
  const effectiveRole    = role === "Other" ? customRole : role;
  const timeLimit        = TIME_LIMITS[difficulty];

  /* ── Voice input ── */
  function toggleVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice input not supported in this browser. Try Chrome."); return; }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-IN";
    recognitionRef.current = r;

    r.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((res: any) => res[0].transcript).join("");
      setAnswerText(currentQ, transcript);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    setListening(true);
  }

  /* ── Generate questions ── */
  async function handleGenerate() {
    if (!effectiveRole.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_questions",
          company: effectiveCompany,
          role:    effectiveRole,
          skills:  resumeSkills,
          type:    intType,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ({ text: "", feedback: null, loading: false, submitted: false, timeUsed: 0 })));
      setCurrentQ(0);
      setTimerKey(k => k + 1);
      sessionStart.current = Date.now();
      setStage("questions");
    } catch (err: unknown) {
      alert(`Failed to generate: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setGenerating(false);
    }
  }

  /* ── Evaluate ── */
  async function handleEvaluate(idx: number) {
    const answer = answers[idx];
    if (!answer || answer.text.trim().length < 15) return;
    recognitionRef.current?.stop(); setListening(false);

    setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, loading: true } : a));
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:   "evaluate_answer",
          question: questions[idx],
          answer:   answers[idx].text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnswers(prev => prev.map((a, i) =>
        i === idx ? { ...a, feedback: data.feedback, loading: false, submitted: true } : a
      ));
    } catch (err: unknown) {
      alert(`Evaluation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, loading: false } : a));
    }
  }

  function setAnswerText(idx: number, text: string) {
    setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, text } : a));
  }

  const handleTimerExpire = useCallback(() => {
    const a = answers[currentQ];
    if (a && !a.submitted && a.text.trim().length >= 15) {
      handleEvaluate(currentQ);
    }
  }, [currentQ, answers]);

  function goToQuestion(n: number) {
    recognitionRef.current?.stop(); setListening(false);
    setCurrentQ(n);
    setTimerKey(k => k + 1);
    setShowStar(false);
    textareaRef.current?.focus();
  }

  function resetSession() {
    setStage("setup"); setQuestions([]); setAnswers([]);
    setShowStar(false); setListening(false);
    recognitionRef.current?.stop();
  }

  const allDone  = answers.length > 0 && answers.every(a => a.submitted);
  const avgScore = allDone
    ? Math.round(answers.reduce((s, a) => s + (a.feedback?.score ?? 0), 0) / answers.length * 10) / 10
    : 0;

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px",
  };
  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 9,
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text1)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };

  /* ══════════════════════════════════════════════════════════
     SETUP SCREEN
  ══════════════════════════════════════════════════════════ */
  if (stage === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <AppNav />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 20px 80px" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎤</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>AI Interview Prep</h1>
            <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
              Realistic questions for your target role. Answer by typing or speaking — get instant AI feedback on each response.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Company */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>🏢 Target Company</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {COMPANIES.map(c => (
                  <button key={c} onClick={() => setCompany(c)} style={{
                    padding: "6px 13px", borderRadius: 99, border: "1px solid",
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                    background: company === c ? "var(--accent)" : "var(--surface2)",
                    borderColor: company === c ? "var(--accent)" : "var(--border)",
                    color: company === c ? "#fff" : "var(--text2)",
                    fontWeight: company === c ? 600 : 400,
                  }}>{c}</button>
                ))}
              </div>
              {company === "Other" && (
                <input value={customCompany} onChange={e => setCustomCompany(e.target.value)}
                  placeholder="Company name…" style={{ ...inp, marginTop: 12 }} />
              )}
            </div>

            {/* Role */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>💼 Role / Position</div>
              <select value={role} onChange={e => setRole(e.target.value)}
                style={{ ...inp, appearance: "none" as React.CSSProperties["appearance"], cursor: "pointer" }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="Other">Other (specify)</option>
              </select>
              {role === "Other" && (
                <input value={customRole} onChange={e => setCustomRole(e.target.value)}
                  placeholder="Your target role…" style={{ ...inp, marginTop: 12 }} />
              )}
            </div>

            {/* Interview type + difficulty */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Type */}
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>📋 Interview Type</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {INTERVIEW_TYPES.map(t => (
                    <button key={t.key} onClick={() => setIntType(t.key)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      borderRadius: 9, border: `1px solid ${intType === t.key ? "var(--accborder)" : "var(--border)"}`,
                      background: intType === t.key ? "var(--accdim)" : "none",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}>
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: intType === t.key ? "var(--accent)" : "var(--text1)" }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>📊 Difficulty</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {DIFFICULTIES.map(d => (
                    <button key={d.key} onClick={() => setDifficulty(d.key)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      borderRadius: 9, border: `1px solid ${difficulty === d.key ? "var(--accborder)" : "var(--border)"}`,
                      background: difficulty === d.key ? "var(--accdim)" : "none",
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <span style={{ fontSize: 18 }}>{d.icon}</span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: difficulty === d.key ? "var(--accent)" : "var(--text1)" }}>{d.label}</div>
                    </button>
                  ))}
                  <div style={{ marginTop: 4, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.03)", fontSize: 11, color: "var(--text3)" }}>
                    ⏱ {fmtTime(TIME_LIMITS[difficulty])} per question
                  </div>
                </div>
              </div>
            </div>

            {/* Resume skills indicator */}
            {resumeSkills && (
              <div style={{ padding: "10px 16px", borderRadius: 9, background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.2)", fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={13} /> Questions will be tailored to your resume skills
              </div>
            )}

            {/* Start button */}
            <button onClick={handleGenerate} disabled={generating || !effectiveRole.trim()} style={{
              padding: "16px", borderRadius: 12,
              background: generating || !effectiveRole.trim() ? "var(--surface2)" : "var(--accent)",
              color: generating || !effectiveRole.trim() ? "var(--text3)" : "#fff",
              border: "none", fontSize: 16, fontWeight: 700, cursor: generating || !effectiveRole.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "all .2s",
            }}>
              {generating ? (
                <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> Generating questions…</>
              ) : (
                <><Mic size={18} /> Start Interview — {INTERVIEW_TYPES.find(t => t.key === intType)?.label} · {DIFFICULTIES.find(d => d.key === difficulty)?.label}</>
              )}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     RESULTS SCREEN
  ══════════════════════════════════════════════════════════ */
  if (stage === "done" || allDone) {
    const verdict = avgScore >= 8 ? "Excellent" : avgScore >= 6 ? "Good" : avgScore >= 4 ? "Needs Work" : "Keep Practising";
    const verdictColor = scoreColor(avgScore);

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <AppNav actions={
          <button onClick={resetSession} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <RotateCcw size={12} /> New Session
          </button>
        } />

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
          {/* Score hero */}
          <div style={{ ...card, textAlign: "center", marginBottom: 24, background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(99,102,241,.03))", borderColor: "var(--accborder)" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>
              {avgScore >= 8 ? "🏆" : avgScore >= 6 ? "👍" : "💪"}
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color: verdictColor, lineHeight: 1, letterSpacing: "-.03em" }}>{avgScore}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>out of 10</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: verdictColor, marginTop: 8, marginBottom: 4 }}>{verdict}</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
              {effectiveRole} at {effectiveCompany} · {INTERVIEW_TYPES.find(t => t.key === intType)?.label}
            </div>
            {/* Star rating */}
            <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <Star key={i} size={14}
                  fill={i < Math.round(avgScore) ? verdictColor : "none"}
                  color={i < Math.round(avgScore) ? verdictColor : "var(--border)"}
                  style={{ transition: "all .3s", transitionDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
            {/* Per-question scores */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {answers.map((a, i) => {
                const s = a.feedback?.score ?? 0;
                const c = scoreColor(s);
                return (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${c}18`, border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c }}>
                      {s}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 3 }}>Q{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Q&A detail */}
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Answer breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((q, i) => {
              const a  = answers[i];
              const fb = a?.feedback;
              const c  = fb ? scoreColor(fb.score) : "var(--text3)";
              return (
                <div key={i} style={{ ...card, borderLeft: `3px solid ${c}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: fb ? 14 : 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${c}18`, border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: c, flexShrink: 0 }}>
                      {fb?.score ?? "—"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", lineHeight: 1.5 }}>Q{i + 1}: {q}</div>
                      {fb && <div style={{ fontSize: 11, color: c, fontWeight: 700, marginTop: 3 }}>{fb.verdict}</div>}
                    </div>
                  </div>
                  {fb && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {fb.strengths.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--success)", marginBottom: 5 }}>✓ Strengths</div>
                          {fb.strengths.map((s, j) => <div key={j} style={{ fontSize: 12, color: "var(--text2)", paddingLeft: 8, marginBottom: 2 }}>• {s}</div>)}
                        </div>
                      )}
                      {fb.improvements.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--warn)", marginBottom: 5 }}>→ Improve</div>
                          {fb.improvements.map((s, j) => <div key={j} style={{ fontSize: 12, color: "var(--text2)", paddingLeft: 8, marginBottom: 2 }}>• {s}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
            <button onClick={resetSession} style={{ padding: "12px 28px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <RotateCcw size={14} /> Try Again
            </button>
            <button onClick={() => { setStage("questions"); setCurrentQ(0); setAnswers(answers.map(a => ({ ...a, submitted: false, feedback: null, text: "" }))); setTimerKey(k => k + 1); }}
              style={{ padding: "12px 28px", borderRadius: 10, background: "var(--surface)", color: "var(--text1)", border: "1px solid var(--border)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Redo same questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     QUESTION STAGE
  ══════════════════════════════════════════════════════════ */
  const current  = answers[currentQ];
  const q        = questions[currentQ];
  const canSubmit = current && current.text.trim().length >= 15 && !current.submitted && !current.loading;
  const fb       = current?.feedback;
  const wordCount = (current?.text ?? "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav actions={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { if (confirm("Exit this session?")) resetSession(); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <ArrowLeft size={12} /> Exit
          </button>
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{INTERVIEW_TYPES.find(t => t.key === intType)?.icon}</span>
            {effectiveCompany}
          </span>
          <ProgressBar answers={answers} total={questions.length} current={currentQ} />
        </div>
      } />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 80px" }}>

        {/* Question header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", background: "var(--accdim)", color: "var(--accent)", padding: "4px 12px", borderRadius: 99, border: "1px solid var(--accborder)" }}>
              Q{currentQ + 1} / {questions.length}
            </span>
            <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 99 }}>
              {answers.filter(a => a.submitted).length} answered
            </span>
          </div>
          {!current?.submitted && (
            <CountdownTimer key={`${timerKey}-${currentQ}`} limit={timeLimit} onExpire={handleTimerExpire} />
          )}
          {current?.submitted && fb && <ScoreBadge score={fb.score} />}
        </div>

        {/* Question card */}
        <div style={{ ...card, marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.55, color: "var(--text1)", margin: 0 }}>{q}</p>
        </div>

        {/* STAR guide toggle */}
        {!current?.submitted && intType !== "technical" && (
          <button onClick={() => setShowStar(s => !s)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
            background: showStar ? "var(--accdim)" : "none",
            border: `1px solid ${showStar ? "var(--accborder)" : "var(--border)"}`,
            borderRadius: 8, fontSize: 12, fontWeight: 600, color: showStar ? "var(--accent)" : "var(--text3)",
            cursor: "pointer", fontFamily: "inherit", marginBottom: 12, transition: "all .15s",
          }}>
            <BookOpen size={12} /> {showStar ? "Hide" : "Show"} STAR Method Guide
          </button>
        )}

        {showStar && !current?.submitted && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {STAR_GUIDE.map(s => (
              <div key={s.letter} style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${s.color}18`, border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 14, fontWeight: 800, color: s.color }}>{s.letter}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.word}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.4 }}>{s.tip}</div>
              </div>
            ))}
          </div>
        )}

        {/* Answer / Feedback area */}
        {!current?.submitted ? (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Your Answer</label>
              <div style={{ display: "flex", gap: 6 }}>
                {/* Voice input */}
                <button onClick={toggleVoice} title={listening ? "Stop recording" : "Speak your answer"} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                  borderRadius: 7, border: `1px solid ${listening ? "var(--danger)" : "var(--border)"}`,
                  background: listening ? "rgba(239,68,68,.1)" : "var(--surface2)",
                  color: listening ? "var(--danger)" : "var(--text3)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {listening ? <><MicOff size={11} /> Stop</> : <><Mic size={11} /> Speak</>}
                </button>
              </div>
            </div>
            {listening && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--danger)" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--danger)", animation: "pulse 1s infinite" }} />
                Recording… speak clearly
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={current?.text ?? ""}
              onChange={e => setAnswerText(currentQ, e.target.value)}
              placeholder={`Structure your answer using the STAR method — Situation → Task → Action → Result.\n\nAim for 3–5 sentences with a specific example from your experience.`}
              rows={7}
              style={{
                width: "100%", padding: "12px 14px",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 10, color: "var(--text1)", fontSize: 14,
                resize: "vertical", lineHeight: 1.65, boxSizing: "border-box",
                fontFamily: "inherit", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />

            {/* Word count + hints */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: wordCount >= 40 ? "var(--success)" : wordCount >= 15 ? "var(--warn)" : "var(--text3)" }}>
                  {wordCount} words
                  {wordCount < 40 && " · aim for 40+"}
                  {wordCount >= 40 && " ✓"}
                </span>
              </div>
              <button
                onClick={() => handleEvaluate(currentQ)}
                disabled={!canSubmit}
                style={{
                  padding: "10px 24px", borderRadius: 9,
                  background: canSubmit ? "var(--accent)" : "var(--surface2)",
                  color: canSubmit ? "#fff" : "var(--text3)",
                  border: "none", fontSize: 14, fontWeight: 700,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all .2s",
                }}
              >
                {current?.loading
                  ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Evaluating…</>
                  : <><Zap size={14} /> Get AI Feedback</>}
              </button>
            </div>
          </div>
        ) : (
          /* ── Feedback ── */
          fb && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Score banner */}
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, background: `${scoreColor(fb.score)}08`, borderColor: `${scoreColor(fb.score)}30` }}>
                <ScoreBadge score={fb.score} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(fb.score) }}>{fb.verdict}</div>
                  <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <Star key={i} size={11} fill={i < fb.score ? scoreColor(fb.score) : "none"} color={i < fb.score ? scoreColor(fb.score) : "var(--border)"} />
                    ))}
                  </div>
                </div>
              </div>

              {fb.strengths.length > 0 && (
                <div style={{ ...card, borderLeft: "3px solid var(--success)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <CheckCircle2 size={15} color="var(--success)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>What worked well</span>
                  </div>
                  {fb.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", paddingLeft: 4, marginBottom: 6, lineHeight: 1.55, display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--success)", flexShrink: 0 }}>✓</span>{s}
                    </div>
                  ))}
                </div>
              )}

              {fb.improvements.length > 0 && (
                <div style={{ ...card, borderLeft: "3px solid var(--warn)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <AlertTriangle size={15} color="var(--warn)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--warn)" }}>Areas to strengthen</span>
                  </div>
                  {fb.improvements.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", paddingLeft: 4, marginBottom: 6, lineHeight: 1.55, display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--warn)", flexShrink: 0 }}>→</span>{s}
                    </div>
                  ))}
                </div>
              )}

              {fb.betterAnswer && (
                <div style={{ ...card, borderLeft: "3px solid var(--accent)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Lightbulb size={15} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>Stronger answer example</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text2)", margin: 0, lineHeight: 1.7, fontStyle: "italic", borderLeft: "2px solid var(--accborder)", paddingLeft: 12 }}>
                    "{fb.betterAnswer}"
                  </p>
                </div>
              )}

              <details style={{ ...card, cursor: "pointer" }}>
                <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  📝 Your answer
                </summary>
                <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 10, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {current.text}
                </p>
              </details>
            </div>
          )
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
          <button onClick={() => goToQuestion(Math.max(0, currentQ - 1))} disabled={currentQ === 0} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8,
            background: currentQ === 0 ? "transparent" : "var(--surface)", border: currentQ === 0 ? "none" : "1px solid var(--border)",
            color: currentQ === 0 ? "var(--text3)" : "var(--text1)", fontSize: 13, fontWeight: 600, cursor: currentQ === 0 ? "not-allowed" : "pointer",
          }}>
            <ChevronLeft size={14} /> Prev
          </button>

          {/* Question dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {questions.map((_, i) => {
              const done   = answers[i]?.submitted;
              const active = i === currentQ;
              const s      = answers[i]?.feedback?.score ?? 0;
              return (
                <button key={i} onClick={() => goToQuestion(i)} style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: active ? "var(--accent)" : done ? `${scoreColor(s)}18` : "var(--surface2)",
                  color: active ? "#fff" : done ? scoreColor(s) : "var(--text3)",
                  transition: "all .2s",
                }}>
                  {done ? answers[i].feedback?.score : i + 1}
                </button>
              );
            })}
          </div>

          {currentQ < questions.length - 1 ? (
            <button onClick={() => goToQuestion(currentQ + 1)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8,
              background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Next <ChevronRight size={14} />
            </button>
          ) : allDone ? (
            <button onClick={() => setStage("done")} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8,
              background: "var(--success)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              Results 🏆
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text3)", padding: "10px 0" }}>Answer to continue</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  );
}
