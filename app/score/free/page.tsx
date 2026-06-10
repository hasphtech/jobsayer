"use client";
/**
 * /score/free — No-login instant ATS score
 * Acquisition funnel: paste resume text <i className="ti ti-arrow-right"/> instant score + 3 fixes.
 * Full report + builder gated behind signup.
 */
import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import { computeScore } from "@/lib/scoreEngine";
import type { ResumeData } from "@/lib/types";

/* ── Parse pasted plain text into a minimal ResumeData ─────── */
function parseResumeText(text: string): ResumeData {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  // Name — first non-empty line that looks like a name (no @ or digits)
  const nameLine = lines.find(l => l.length > 2 && l.length < 60 && !/[@\d]/.test(l)) ?? "";

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch?.[0] ?? "";

  // Phone
  const phoneMatch = text.match(/[\+\d][\d\s\-().]{7,}/);
  const phone = phoneMatch?.[0]?.trim() ?? "";

  // Summary — first paragraph-like block
  const summaryBlock = lines.slice(0, 6).join(" ");
  const summary = summaryBlock.length > 40 ? summaryBlock.slice(0, 400) : "";

  // Skills — find a skills section
  const skillsIdx = lines.findIndex(l => /^skills?/i.test(l));
  let skills = "";
  if (skillsIdx !== -1) {
    skills = lines.slice(skillsIdx + 1, skillsIdx + 6).join(", ");
  } else {
    // Fallback: grab any comma-dense line
    const commaLine = lines.find(l => (l.match(/,/g) ?? []).length >= 3);
    skills = commaLine ?? "";
  }

  // Work experience — lines after "experience" heading
  const expIdx = lines.findIndex(l => /experience|work history/i.test(l));
  const work: ResumeData["work"] = [];
  if (expIdx !== -1) {
    // Heuristic: company/role pairs are often on consecutive short lines
    for (let i = expIdx + 1; i < Math.min(expIdx + 30, lines.length); i++) {
      const l = lines[i];
      if (l.length > 8 && l.length < 80 && !/^\d/.test(l)) {
        work.push({ id: crypto.randomUUID(), company: l, role: lines[i + 1] ?? "", desc: lines.slice(i + 2, i + 6).join("\n"), from: "", to: "", current: false });
        i += 3;
        if (work.length >= 3) break;
      }
    }
  }
  // If no structured work found, create a synthetic entry from text
  if (work.length === 0 && text.length > 200) {
    work.push({ id: crypto.randomUUID(), company: "—", role: "—", desc: text.slice(0, 800), from: "", to: "", current: false });
  }

  // Education
  const eduIdx = lines.findIndex(l => /education|university|college|degree/i.test(l));
  const edu: ResumeData["edu"] = [];
  if (eduIdx !== -1) {
    edu.push({ id: crypto.randomUUID(), school: lines[eduIdx + 1] ?? lines[eduIdx], degree: lines[eduIdx + 2] ?? "", year: "", gpa: "" });
  }

  return { name: nameLine, email, phone, summary, skills, work, edu } as ResumeData;
}

/* ── Score gauge ─────────────────────────────────────────────── */
function MiniGauge({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 55 ? "#eab308" : "#ef4444";
  return (
    <div style={{ position: "relative", width: 128, height: 128, margin: "0 auto 8px" }}>
      <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface2)" strokeWidth="12" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text1)", lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, color: "var(--text3)" }}>/100</div>
      </div>
    </div>
  );
}

/* ── Dim bar ─────────────────────────────────────────────────── */
function DimBar({ label, pct, status }: { label: string; pct: number; status: string }) {
  const c = status === "green" ? "#22c55e" : status === "amber" ? "#eab308" : "#ef4444";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "var(--surface2)" }}>
        <div style={{ height: "100%", borderRadius: 4, background: c, width: `${pct}%`, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

/* ── Severity chip ───────────────────────────────────────────── */
function SeverityChip({ s }: { s: "critical" | "warning" | "suggestion" }) {
  const cfg = {
    critical:   { bg: "rgba(239,68,68,.10)",  color: "#ef4444", label: "Critical" },
    warning:    { bg: "rgba(234,179,8,.10)",   color: "#eab308", label: "Warning"  },
    suggestion: { bg: "rgba(99,102,241,.10)",  color: "#6366f1", label: "Tip"      },
  }[s];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color, textTransform: "uppercase" }}>
      {cfg.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function FreeScorePage() {
  const { dark } = useTheme();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof computeScore> | null>(null);
  const [scoring, setScoring] = useState(false);

  function handleScore() {
    if (text.trim().length < 80) return;
    setScoring(true);
    setTimeout(() => {
      const parsed = parseResumeText(text);
      setResult(computeScore(parsed));
      setScoring(false);
    }, 900);
  }

  const scoreColor = result
    ? result.total >= 75 ? "#22c55e" : result.total >= 55 ? "#eab308" : "#ef4444"
    : "var(--accent)";

  const percentileLabel = result
    ? result.total >= 80 ? "Top 15%" : result.total >= 65 ? "Top 35%" : result.total >= 50 ? "Top 50%" : "Bottom 40%"
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)", fontFamily: "inherit" }}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{
        borderBottom: "1px solid var(--border)", padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--nav-bg)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 800, color: "var(--text1)", textDecoration: "none", letterSpacing: "-.03em" }}>
          job<span style={{ color: "var(--accent)" }}>Sayer</span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" style={{ padding: "7px 16px", fontSize: 13, color: "var(--text2)", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
          <Link href="/auth/signup" style={{
            padding: "7px 16px", fontSize: 13, fontWeight: 700,
            background: "var(--accent)", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>Get full report free</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* ── Hero ────────────────────────────────────────────── */}
        {!result && (
          <>
            {/* Fear hook */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
                background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                borderRadius: 99, padding: "6px 16px",
              }}>
                <span style={{ fontSize: 14 }}>⏱</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
                  Recruiters spend 6 seconds on your resume. Does yours pass?
                </span>
              </div>
              <h1 style={{
                fontSize: 38, fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1.1,
                marginBottom: 12,
                ...(dark ? {
                  background: "linear-gradient(160deg,#fff 40%,rgba(255,255,255,.55))",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                } : {}),
              }}>
                Instant ATS Score<br />
                <span style={{ color: "var(--accent)" }}>— no login needed</span>
              </h1>
              <p style={{ fontSize: 15, color: "var(--text3)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                Paste your resume below. Get an ATS score, keyword gaps, and your top 3 fixes in under 10 seconds.
              </p>
            </div>

            {/* Social proof strip */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap",
              marginBottom: 28, padding: "14px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
            }}>
              {[
                { val: "91%", label: "ATS pass rate after fixes" },
                { val: "50K+", label: "Resumes scored" },
                { val: "Free", label: "No credit card, ever" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Paste area */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 10 }}>
                <i className="ti ti-layout-list"/> Paste your resume text
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"Paste your full resume here — name, experience, skills, education…\n\nTip: copy all text from your PDF or Word file and paste it here."}
                rows={12}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 10, color: "var(--text1)", fontSize: 13,
                  resize: "vertical", lineHeight: 1.65, boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>
                  {text.length < 80 ? `${80 - text.length} more characters needed` : `${text.length} characters — ready to score`}
                </span>
                <button
                  onClick={handleScore}
                  disabled={text.trim().length < 80 || scoring}
                  style={{
                    padding: "10px 28px", borderRadius: 10, border: "none",
                    background: text.trim().length >= 80 ? "var(--accent)" : "var(--surface2)",
                    color: text.trim().length >= 80 ? "#fff" : "var(--text3)",
                    fontSize: 14, fontWeight: 700,
                    cursor: text.trim().length >= 80 ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  {scoring ? "Scoring…" : "Score my resume"}
                </button>
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)" }}>
              <i className="ti ti-lock"/> Your resume text is processed locally — never stored without an account.
            </p>
          </>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {result && (
          <>
            {/* Score hero */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "28px 24px", marginBottom: 20, textAlign: "center",
            }}>
              <MiniGauge score={result.total} />
              <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor, marginBottom: 4 }}>
                {result.total >= 75 ? "Strong resume" : result.total >= 55 ? "Good — needs polish" : "Needs significant work"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 20 }}>
                Estimated {percentileLabel} of resumes for similar roles
              </div>

              {/* Dim bars */}
              <div style={{ maxWidth: 400, margin: "0 auto", textAlign: "left" }}>
                {result.dimensions.map(d => (
                  <DimBar key={d.label} label={d.label} pct={d.pct} status={d.status} />
                ))}
              </div>
            </div>

            {/* Top 3 fixes — always visible */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                <i className="ti ti-tool"/> Your top {Math.min(3, result.improvements.length)} fixes
                <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>
                  (fix these first for biggest score jump)
                </span>
              </div>
              {result.improvements.slice(0, 3).map((imp, i) => (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 10, marginBottom: 10,
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "var(--accdim)", border: "1px solid var(--accborder)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "var(--accent)",
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{imp.title}</span>
                      <SeverityChip s={imp.severity} />
                      <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600, marginLeft: "auto" }}>+{imp.points} pts</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{imp.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gate: more fixes + builder behind signup */}
            {result.improvements.length > 3 && (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--accborder)",
                borderRadius: 16, padding: "24px", marginBottom: 20,
                position: "relative", overflow: "hidden",
              }}>
                {/* Blurred preview of hidden fixes */}
                <div style={{ filter: "blur(4px)", pointerEvents: "none", marginBottom: 16 }}>
                  {result.improvements.slice(3, 6).map((imp, i) => (
                    <div key={i} style={{
                      padding: "12px 14px", borderRadius: 10, marginBottom: 8,
                      background: "var(--surface2)", border: "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", marginBottom: 3 }}>{imp.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>{imp.detail}</div>
                    </div>
                  ))}
                </div>
                {/* Overlay CTA */}
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(to bottom, transparent 0%, var(--surface) 40%)",
                  padding: "0 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)", marginBottom: 6 }}>
                    <i className="ti ti-lock"/> {result.improvements.length - 3} more improvements found
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16, maxWidth: 340 }}>
                    Create a free account to unlock the full report, fix your resume in the builder, and get AI-tailored suggestions per job.
                  </p>
                  <Link href="/auth/signup?from=free-score" style={{
                    padding: "12px 28px", borderRadius: 10,
                    background: "var(--accent)", color: "#fff",
                    fontSize: 14, fontWeight: 700, textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 8,
                  }}>
                    Get full report — free <i className="ti ti-arrow-right"/>
                  </Link>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 10 }}>No credit card · 2-min setup · Free forever tier</div>
                </div>
              </div>
            )}

            {/* Missing keywords teaser */}
            {result.missingSkills.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                  <i className="ti ti-alert-triangle"/> Missing market-relevant keywords
                  <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>showing 3 of {result.missingSkills.length}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {result.missingSkills.slice(0, 3).map(s => (
                    <span key={s} style={{
                      fontSize: 12, padding: "4px 12px", borderRadius: 8,
                      background: "rgba(239,68,68,.08)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,.2)", fontWeight: 500,
                    }}>{s}</span>
                  ))}
                  <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 8, background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)" }}>
                    +{result.missingSkills.length - 3} more — sign up to see all
                  </span>
                </div>
                <Link href="/auth/signup?from=free-score" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                  Fix keywords in the Resume Builder <i className="ti ti-arrow-right"/>
                </Link>
              </div>
            )}

            {/* Rescore */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button onClick={() => { setResult(null); setText(""); }} style={{
                padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)",
                background: "transparent", color: "var(--text3)", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <i className="ti ti-arrow-left"/> Score a different resume
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
