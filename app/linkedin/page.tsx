"use client";
/**
 * /linkedin — LinkedIn Profile Optimizer
 * Score + AI-rewrite headline, about, skills for a target role.
 */
import React, { useState } from "react";
import { useWindowWidth } from "@/lib/useWindowWidth";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { trackAction } from "@/lib/activityTracker";

/* ── Types ───────────────────────────────────────────────────── */
interface SectionScore { score: number; reason: string; }
interface LinkedInResult {
  scores:          { headline: SectionScore; about: SectionScore; skills: SectionScore };
  rewrites:        { headline: string; about: string; skills: string };
  missingKeywords: string[];
  overallScore:    number;
  topTip:          string;
}

/* ── Score ring ──────────────────────────────────────────────── */
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r    = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const col  = score >= 75 ? "var(--success)" : score >= 50 ? "var(--warn)" : "var(--danger)";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={6}
          strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 900, color: col }}>{score}</span>
      </div>
    </div>
  );
}

/* ── Copy button ─────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); });
  }
  return (
    <button onClick={copy} style={{ padding: "5px 12px", borderRadius: 7, background: done ? "rgba(34,197,94,.1)" : "var(--surface2)", border: `1px solid ${done ? "rgba(34,197,94,.25)" : "var(--border)"}`, color: done ? "var(--success)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
      {done ? "✓ Copied" : "Copy"}
    </button>
  );
}

/* ── TARGET ROLES ────────────────────────────────────────────── */
const TARGET_ROLES = [
  "Software Engineer", "Senior Software Engineer", "Staff Engineer",
  "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "ML / AI Engineer", "Data Scientist", "Data Engineer",
  "Product Manager", "Senior Product Manager", "Product Designer",
  "DevOps / SRE Engineer", "Security Engineer",
  "Engineering Manager", "VP of Engineering",
];

/* ── Page ────────────────────────────────────────────────────── */
export default function LinkedInPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [headline,    setHeadline]    = useState("");
  const [about,       setAbout]       = useState("");
  const [skills,      setSkills]      = useState("");
  const [targetRole,  setTargetRole]  = useState("");
  const [customRole,  setCustomRole]  = useState("");
  const [result,      setResult]      = useState<LinkedInResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [activeTab,   setActiveTab]   = useState<"headline"|"about"|"skills">("headline");

  const role = targetRole === "Other" ? customRole : targetRole;

  async function handleAnalyze() {
    if (!role.trim()) { setError("Select or enter your target role."); return; }
    if (!headline.trim() && !about.trim()) { setError("Add your headline or about section to analyse."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, about, skills, targetRole: role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
      trackAction("profile_completed", 30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 };
  const sectionColor = (s: number) => s >= 75 ? "var(--success)" : s >= 50 ? "var(--warn)" : "var(--danger)";
  const tabKey = activeTab as "headline"|"about"|"skills";

  return (
    <AppShell>
      <div style={{ padding: "24px 24px 48px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            💼 AI-Powered · Role-Targeted
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>LinkedIn Profile Optimizer</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6, maxWidth: 560 }}>
            87% of recruiters check LinkedIn before calling. Score your profile against your target role and get
            AI-rewritten copy you can paste directly into LinkedIn.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>

          {/* Input form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Target role */}
            <div style={{ ...card, padding: "18px 20px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Target Role</label>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", marginBottom: targetRole === "Other" ? 8 : 0 }}>
                <option value="">Select your target role…</option>
                {TARGET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="Other">Other (type below)</option>
              </select>
              {targetRole === "Other" && (
                <input value={customRole} onChange={e => setCustomRole(e.target.value)}
                  placeholder="e.g. Founding Engineer"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              )}
            </div>

            {/* Headline */}
            <div style={{ ...card, padding: "18px 20px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Current Headline <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(under 220 chars)</span>
              </label>
              <input value={headline} onChange={e => setHeadline(e.target.value)} maxLength={220}
                placeholder="e.g. Senior Software Engineer | React · TypeScript · Node.js | Building at scale"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>{headline.length}/220</div>
            </div>

            {/* About */}
            <div style={{ ...card, padding: "18px 20px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>About Section</label>
              <textarea value={about} onChange={e => setAbout(e.target.value)} maxLength={2600}
                placeholder="Paste your LinkedIn About section here…"
                style={{ width: "100%", minHeight: 120, padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, outline: "none" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={e =>  (e.currentTarget.style.borderColor = "var(--border)")} />
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>{about.length}/2,600</div>
            </div>

            {/* Skills */}
            <div style={{ ...card, padding: "18px 20px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Current Skills (comma-separated)</label>
              <input value={skills} onChange={e => setSkills(e.target.value)}
                placeholder="React, TypeScript, Node.js, PostgreSQL, AWS…"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
            </div>

            {error && (
              <div style={{ padding: "10px 16px", borderRadius: 9, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", fontSize: 13, color: "var(--danger)" }}>{error}</div>
            )}

            <button onClick={handleAnalyze} disabled={loading || !role.trim()} style={{
              padding: "13px 28px", borderRadius: 10, background: "var(--accent)", color: "#fff",
              border: "none", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8,
            }}>
              {loading ? (
                <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Analysing…</>
              ) : "💼 Analyse & optimise"}
            </button>
          </div>

          {/* Results panel */}
          <div>
            {!result ? (
              <div style={{ ...card, padding: "40px 28px", textAlign: "center", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <div style={{ fontSize: 48 }}>💼</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text2)" }}>Your LinkedIn score will appear here</div>
                <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, maxWidth: 300 }}>
                  Fill in your profile sections on the left and click Analyse to get your scores and AI-rewritten copy.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 280 }}>
                  {["Headline strength score", "About section rewrite", "Missing keywords for your role", "Skills gap analysis", "Top 1 priority action"].map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text3)" }}>
                      <span style={{ color: "var(--accent)", flexShrink: 0 }}>✦</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Overall score */}
                <div style={{ ...card, padding: "20px 24px", display: "flex", gap: 20, alignItems: "center", background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor: "var(--accborder)" }}>
                  <ScoreRing score={result.overallScore} size={80} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: result.overallScore >= 75 ? "var(--success)" : result.overallScore >= 50 ? "var(--warn)" : "var(--danger)", marginBottom: 4 }}>
                      {result.overallScore >= 75 ? "Strong profile" : result.overallScore >= 50 ? "Needs improvement" : "Significant gaps"}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, maxWidth: 280 }}>{result.topTip}</div>
                  </div>
                </div>

                {/* Section scores */}
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
                  {(["headline","about","skills"] as const).map(section => {
                    const s = result.scores[section];
                    return (
                      <button key={section} onClick={() => setActiveTab(section)} style={{
                        ...card, padding: "12px 14px", textAlign: "center", cursor: "pointer",
                        borderColor: activeTab === section ? "var(--accent)" : "var(--border)",
                        background: activeTab === section ? "var(--accdim)" : "var(--surface)",
                        fontFamily: "inherit",
                      }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: sectionColor(s.score) }}>{s.score}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "capitalize", marginTop: 2 }}>{section}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, lineHeight: 1.4 }}>{s.reason}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Rewrite tab */}
                <div style={{ ...card, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>
                      ✨ AI-rewritten {activeTab}
                    </div>
                    <CopyBtn text={result.rewrites[tabKey]} />
                  </div>
                  <div style={{ padding: "14px 16px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, color: "var(--text1)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {result.rewrites[tabKey]}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
                    Click Copy, then paste directly into LinkedIn → Edit profile → {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </div>
                </div>

                {/* Missing keywords */}
                {result.missingKeywords.length > 0 && (
                  <div style={{ ...card, padding: "16px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn)", marginBottom: 10 }}>
                      ⚠ Keywords missing from your current profile
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {result.missingKeywords.map(kw => (
                        <span key={kw} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(234,179,8,.1)", border: "1px solid rgba(234,179,8,.25)", color: "var(--warn)" }}>
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href="/builder" style={{ padding: "9px 18px", borderRadius: 9, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    Update resume to match →
                  </Link>
                  <Link href="/career-gps" style={{ padding: "9px 18px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    Close skill gaps →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
