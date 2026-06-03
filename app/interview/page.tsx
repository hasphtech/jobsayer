"use client";
/**
 * /interview — AI Interview Prep
 * Company + role selector → AI generates questions → user answers → AI feedback
 */
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mic, ChevronRight, ChevronLeft,
  CheckCircle2, AlertTriangle, Lightbulb, RotateCcw, Star,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import type { ResumeData } from "@/lib/types";

/* ── Constants ── */
const COMPANIES = [
  "Razorpay", "Flipkart", "Swiggy", "Zomato", "PhonePe",
  "CRED", "Meesho", "Zepto", "Groww", "Ola", "Paytm",
  "Infosys", "TCS", "Wipro", "Google India", "Microsoft India",
  "Amazon India", "Other",
];

const ROLES = [
  "Software Engineer (SDE-1)",
  "Software Engineer (SDE-2)",
  "Senior Software Engineer",
  "Full Stack Developer",
  "Frontend Engineer",
  "Backend Engineer",
  "DevOps Engineer",
  "Data Engineer",
  "Mobile Developer (Android/iOS)",
  "Engineering Manager",
  "Product Manager",
  "Data Scientist",
];

type Stage = "setup" | "questions" | "done";

interface Feedback {
  score: number;
  verdict: "Excellent" | "Good" | "Needs Work" | "Poor";
  strengths: string[];
  improvements: string[];
  betterAnswer: string;
}

interface AnswerState {
  text: string;
  feedback: Feedback | null;
  loading: boolean;
  submitted: boolean;
}

/* ── Score badge ── */
function ScoreBadge({ score, verdict }: { score: number; verdict: string }) {
  const color =
    score >= 8 ? "var(--success)" :
    score >= 6 ? "var(--warn)" : "var(--danger)";
  const bg =
    score >= 8 ? "rgba(34,197,94,.12)" :
    score >= 6 ? "rgba(234,179,8,.12)" : "rgba(239,68,68,.12)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: bg, border: `2px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 800, color,
      }}>{score}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{verdict}</div>
        <div style={{ fontSize: 11, color: "var(--text3)" }}>out of 10</div>
      </div>
    </div>
  );
}

/* ── Progress dots ── */
function ProgressDots({ total, current, answers }: { total: number; current: number; answers: AnswerState[] }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => {
        const done = answers[i]?.submitted;
        const active = i === current;
        return (
          <div key={i} style={{
            width: active ? 24 : 8, height: 8, borderRadius: 4,
            background: done ? "var(--success)" : active ? "var(--accent)" : "rgba(255,255,255,.12)",
            transition: "all .3s ease",
          }} />
        );
      })}
    </div>
  );
}

/* ── Main page ── */
export default function InterviewPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [company, setCompany] = useState("Razorpay");
  const [customCompany, setCustomCompany] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [customRole, setCustomRole] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [generating, setGenerating] = useState(false);
  const [resumeSkills, setResumeSkills] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load resume skills from localStorage
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
  const effectiveRole = role === "Other" ? customRole : role;

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
          role: effectiveRole,
          skills: resumeSkills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ({ text: "", feedback: null, loading: false, submitted: false })));
      setCurrentQ(0);
      setStage("questions");
    } catch (err: unknown) {
      alert(`Failed to generate questions: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setGenerating(false);
    }
  }

  /* ── Evaluate answer ── */
  async function handleEvaluate(idx: number) {
    const answer = answers[idx];
    if (!answer || answer.text.trim().length < 15) return;

    setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, loading: true } : a));
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate_answer",
          question: questions[idx],
          answer: answers[idx].text,
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

  /* ── Update answer text ── */
  function setAnswerText(idx: number, text: string) {
    setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, text } : a));
  }

  const allDone = answers.length > 0 && answers.every(a => a.submitted);
  const avgScore = allDone
    ? Math.round(answers.reduce((s, a) => s + (a.feedback?.score ?? 0), 0) / answers.length * 10) / 10
    : 0;

  const card: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "24px",
  };

  /* ── Setup screen ── */
  if (stage === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <AppNav />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>AI Interview Prep</h1>
            <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6 }}>
              Get realistic interview questions for your target company & role.
              Answer each question and receive AI-powered feedback instantly.
            </p>
          </div>

          <div style={card}>
            {/* Company */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>
                Target Company
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {COMPANIES.map(c => (
                  <button key={c} onClick={() => setCompany(c)} style={{
                    padding: "6px 14px", borderRadius: 20, border: "1px solid",
                    fontSize: 13, cursor: "pointer", transition: "all .15s",
                    background: company === c ? "var(--accent)" : "var(--surface2)",
                    borderColor: company === c ? "var(--accent)" : "var(--border)",
                    color: company === c ? "#fff" : "var(--text2)",
                    fontWeight: company === c ? 600 : 400,
                  }}>{c}</button>
                ))}
              </div>
              {company === "Other" && (
                <input
                  value={customCompany}
                  onChange={e => setCustomCompany(e.target.value)}
                  placeholder="Enter company name…"
                  style={{
                    marginTop: 10, width: "100%", padding: "10px 14px",
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text1)", fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>

            {/* Role */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>
                Role / Position
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text1)", fontSize: 14,
                  appearance: "none", cursor: "pointer",
                }}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="Other">Other (specify)</option>
              </select>
              {role === "Other" && (
                <input
                  value={customRole}
                  onChange={e => setCustomRole(e.target.value)}
                  placeholder="Enter your target role…"
                  style={{
                    marginTop: 10, width: "100%", padding: "10px 14px",
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text1)", fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>

            {/* Resume skills pill */}
            {resumeSkills && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 20,
                background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)",
                fontSize: 12, color: "var(--text3)",
              }}>
                ✅ Using skills from your resume for tailored questions
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !effectiveRole.trim()}
              style={{
                width: "100%", padding: "14px", borderRadius: 10,
                background: generating || !effectiveRole.trim() ? "var(--surface2)" : "var(--accent)",
                color: generating || !effectiveRole.trim() ? "var(--text3)" : "#fff",
                border: "none", fontSize: 15, fontWeight: 700,
                cursor: generating || !effectiveRole.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all .2s",
              }}
            >
              {generating ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                  Generating questions…
                </>
              ) : (
                <><Mic size={16} /> Start Mock Interview</>
              )}
            </button>
          </div>

          {/* Tips */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { icon: "📝", text: "6 real-world questions" },
              { icon: "🤖", text: "Instant AI feedback" },
              { icon: "🎯", text: "Role & company specific" },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                ...card, padding: "14px 16px", textAlign: "center",
                fontSize: 12, color: "var(--text3)",
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Done screen ── */
  if (stage === "done" || allDone) {
    const verdictColor =
      avgScore >= 8 ? "var(--success)" : avgScore >= 6 ? "var(--warn)" : "var(--danger)";

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <AppNav actions={
          <button onClick={() => { setStage("setup"); setQuestions([]); setAnswers([]); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <RotateCcw size={12} /> New Session
          </button>
        } />

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px" }}>
          {/* Overall score card */}
          <div style={{ ...card, textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {avgScore >= 8 ? "🏆" : avgScore >= 6 ? "👍" : "💪"}
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, color: verdictColor, lineHeight: 1 }}>{avgScore}</div>
            <div style={{ fontSize: 14, color: "var(--text3)", marginTop: 4, marginBottom: 16 }}>Average score across {questions.length} questions</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <Star key={i} size={16} fill={i < Math.round(avgScore) ? verdictColor : "none"} color={i < Math.round(avgScore) ? verdictColor : "var(--border)"} />
              ))}
            </div>
            <div style={{ marginTop: 20, fontSize: 13, color: "var(--text2)" }}>
              {effectiveRole} at {effectiveCompany}
            </div>
          </div>

          {/* Q&A summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {questions.map((q, i) => {
              const a = answers[i];
              const fb = a?.feedback;
              const sColor = fb ? (fb.score >= 8 ? "var(--success)" : fb.score >= 6 ? "var(--warn)" : "var(--danger)") : "var(--text3)";
              return (
                <div key={i} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", flex: 1, paddingRight: 12 }}>
                      Q{i + 1}: {q}
                    </div>
                    {fb && <div style={{ fontSize: 20, fontWeight: 800, color: sColor, flexShrink: 0 }}>{fb.score}/10</div>}
                  </div>
                  {fb && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--success)", marginBottom: 4 }}>Strengths</div>
                      {fb.strengths.map((s, j) => (
                        <div key={j} style={{ fontSize: 12, color: "var(--text2)", paddingLeft: 12, marginBottom: 2 }}>✓ {s}</div>
                      ))}
                      {fb.improvements.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--warn)", marginTop: 8, marginBottom: 4 }}>Improve</div>
                          {fb.improvements.map((s, j) => (
                            <div key={j} style={{ fontSize: 12, color: "var(--text2)", paddingLeft: 12, marginBottom: 2 }}>→ {s}</div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => { setStage("setup"); setQuestions([]); setAnswers([]); }}
              style={{
                padding: "12px 28px", borderRadius: 10, background: "var(--accent)",
                color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}>
              <RotateCcw size={14} /> Retry with same role
            </button>
            <Link href="/builder" style={{
              padding: "12px 28px", borderRadius: 10, background: "var(--surface)",
              color: "var(--text1)", border: "1px solid var(--border)", fontSize: 14,
              fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center",
            }}>
              Fix Resume
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Question stage ── */
  const current = answers[currentQ];
  const q = questions[currentQ];
  const canSubmit = current && current.text.trim().length >= 15 && !current.submitted && !current.loading;
  const fb = current?.feedback;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav actions={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setStage("setup")}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <ArrowLeft size={12} /> Exit session
          </button>
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 500 }}>🎤 {effectiveCompany} · {effectiveRole}</span>
          <ProgressDots total={questions.length} current={currentQ} answers={answers} />
        </div>
      } />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
        {/* Question card */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em",
              background: "var(--accdim)", color: "var(--accent)", padding: "3px 10px", borderRadius: 20,
              border: "1px solid var(--accborder)",
            }}>
              Question {currentQ + 1} of {questions.length}
            </span>
            {current?.submitted && fb && <ScoreBadge score={fb.score} verdict={fb.verdict} />}
          </div>
          <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, color: "var(--text1)", margin: 0 }}>{q}</p>
        </div>

        {/* Answer area */}
        {!current?.submitted ? (
          <div style={card}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>
              Your Answer
            </label>
            <textarea
              ref={textareaRef}
              value={current?.text ?? ""}
              onChange={e => setAnswerText(currentQ, e.target.value)}
              placeholder="Type your answer here… Aim for 3–5 sentences with specific examples from your experience."
              rows={6}
              style={{
                width: "100%", padding: "12px 14px",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text1)", fontSize: 14,
                resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                {(current?.text ?? "").trim().split(/\s+/).filter(Boolean).length} words
                {(current?.text ?? "").trim().length < 15 && " · minimum 15 characters"}
              </span>
              <button
                onClick={() => handleEvaluate(currentQ)}
                disabled={!canSubmit}
                style={{
                  padding: "10px 24px", borderRadius: 8,
                  background: canSubmit ? "var(--accent)" : "var(--surface2)",
                  color: canSubmit ? "#fff" : "var(--text3)",
                  border: "none", fontSize: 14, fontWeight: 600,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {current?.loading ? (
                  <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Evaluating…</>
                ) : (
                  <>Get AI Feedback <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Feedback card */
          fb && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Strengths */}
              {fb.strengths.length > 0 && (
                <div style={{ ...card, borderLeft: "3px solid var(--success)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <CheckCircle2 size={15} color="var(--success)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>What worked well</span>
                  </div>
                  {fb.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", paddingLeft: 4, marginBottom: 4, lineHeight: 1.5 }}>
                      • {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Improvements */}
              {fb.improvements.length > 0 && (
                <div style={{ ...card, borderLeft: "3px solid var(--warn)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <AlertTriangle size={15} color="var(--warn)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--warn)" }}>Areas to improve</span>
                  </div>
                  {fb.improvements.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", paddingLeft: 4, marginBottom: 4, lineHeight: 1.5 }}>
                      → {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Better answer */}
              {fb.betterAnswer && (
                <div style={{ ...card, borderLeft: "3px solid var(--accent)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Lightbulb size={15} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>Stronger answer example</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text2)", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>
                    "{fb.betterAnswer}"
                  </p>
                </div>
              )}

              {/* Your answer (collapsed) */}
              <details style={{ ...card, cursor: "pointer" }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: "var(--text3)", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  📝 Your answer
                </summary>
                <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 10, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {current.text}
                </p>
              </details>
            </div>
          )
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
          <button
            onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 18px", borderRadius: 8,
              background: currentQ === 0 ? "transparent" : "var(--surface)",
              border: currentQ === 0 ? "none" : "1px solid var(--border)",
              color: currentQ === 0 ? "var(--text3)" : "var(--text1)",
              fontSize: 13, fontWeight: 600, cursor: currentQ === 0 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>

          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            {answers.filter(a => a.submitted).length} of {questions.length} answered
          </span>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(q => q + 1)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 18px", borderRadius: 8,
                background: "var(--accent)", color: "#fff",
                border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : allDone ? (
            <button
              onClick={() => setStage("done")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 18px", borderRadius: 8,
                background: "var(--success)", color: "#000",
                border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              View Results 🏆
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text3)" }}>Answer to continue</span>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
