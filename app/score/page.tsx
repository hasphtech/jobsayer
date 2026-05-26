"use client";
/**
 * /score — jobSayer Score Dashboard
 * Reads resume data from localStorage (saved by builder) and computes
 * a 4-dimension score with improvement suggestions.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Briefcase, ChevronRight,
  TrendingUp, AlertTriangle, Lightbulb, CheckCircle2,
} from "lucide-react";
import { computeScore, type ScoreResult } from "@/lib/scoreEngine";
import type { ResumeData } from "@/lib/types";

/* ── Gauge SVG ─────────────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const r = 64;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const offset = circ - filled;

  const color =
    score >= 75 ? "#4ade80" :
    score >= 55 ? "#fbbf24" : "#f87171";

  const label =
    score >= 75 ? "Strong" :
    score >= 55 ? "Good — improving" : "Needs work";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 16px" }}>
        <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id="gaugeFill" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          <circle
            cx="80" cy="80" r={r} fill="none"
            stroke="url(#gaugeFill)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", textAlign: "center",
        }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: "var(--text1)", lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>/100</div>
        </div>
      </div>
      <div style={{
        display: "inline-block", fontSize: 12, fontWeight: 600,
        padding: "4px 14px", borderRadius: 20,
        background: score >= 75 ? "rgba(74,222,128,.12)" : score >= 55 ? "rgba(251,191,36,.12)" : "rgba(248,113,113,.12)",
        color,
      }}>{label}</div>
    </div>
  );
}

/* ── Bar ───────────────────────────────────────────────────────── */
function DimBar({ pct, status }: { pct: number; status: string }) {
  const color =
    status === "green" ? "#4ade80" :
    status === "amber" ? "#fbbf24" : "#f87171";
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 3, width: `${pct}%`,
        background: `linear-gradient(90deg,${color}88,${color})`,
        transition: "width .7s ease",
      }} />
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function ScorePage() {
  const router = useRouter();
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [resumeName, setResumeName] = useState("Your resume");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        const data: ResumeData = parsed.data ?? parsed;
        const computed = computeScore(data);
        setResult(computed);
        if (data.name) setResumeName(`${data.name}'s resume`);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const card: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "22px",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Analysing your resume…</div>
    </div>
  );

  if (!result) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>📄</div>
      <div style={{ color: "var(--text1)", fontSize: 18, fontWeight: 600 }}>No resume found</div>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Build your resume first to see your score.</div>
      <Link href="/builder" style={{ marginTop: 8, padding: "10px 24px", background: "var(--accent)", color: "#fff", borderRadius: 10, fontWeight: 600, textDecoration: "none", fontSize: 14 }}>
        Go to Resume Builder →
      </Link>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      {/* ── Top bar ── */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/builder" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>
            <ArrowLeft size={14} /> Builder
          </Link>
          <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text1)" }}>jobSayer Score</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/jobs" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 16px", background: "var(--accdim)", border: "1px solid var(--accborder)",
            borderRadius: 8, color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            <Briefcase size={13} /> View Matched Jobs
          </Link>
          <Link href="/builder" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 16px", background: "var(--accent)",
            borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            Fix Issues in Builder
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>jobSayer Score</h1>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>{resumeName} · Analysed just now</p>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginBottom: 20 }}>

          {/* Gauge card */}
          <div style={{ ...card, textAlign: "center" }}>
            <ScoreGauge score={result.total} />
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80" }}>
                  +{result.improvements.reduce((s, i) => s + i.points, 0)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>pts achievable</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text1)" }}>Top {result.percentile}%</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>vs similar profiles</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{result.matchedSkills.length}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>skills detected</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f87171" }}>{result.improvements.filter(i => i.severity === "critical").length}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>critical issues</div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Score Breakdown
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text3)" }}>4 dimensions · 25 pts each</span>
            </div>
            {result.dimensions.map(dim => {
              const scoreColor =
                dim.status === "green" ? "#4ade80" :
                dim.status === "amber" ? "#fbbf24" : "#f87171";
              return (
                <div key={dim.label} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text1)", display: "flex", alignItems: "center", gap: 6 }}>
                      {dim.icon} {dim.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor }}>{dim.score} / 25</span>
                  </div>
                  <DimBar pct={dim.pct} status={dim.status} />
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>{dim.hint}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Improvements ── */}
        {result.improvements.length > 0 && (
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              🔧 Fix these to reach <span style={{ color: "var(--accent)" }}>{Math.min(result.total + result.improvements.reduce((s, i) => s + i.points, 0), 100)}+</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.improvements.map((imp, i) => {
                const borderColor =
                  imp.severity === "critical" ? "#f87171" :
                  imp.severity === "warning" ? "#fbbf24" : "#818cf8";
                const Icon =
                  imp.severity === "critical" ? AlertTriangle :
                  imp.severity === "warning"  ? TrendingUp   : Lightbulb;
                return (
                  <div key={i} style={{
                    display: "flex", gap: 12, padding: "12px 14px",
                    borderRadius: 10, border: `1px solid var(--border)`,
                    borderLeft: `3px solid ${borderColor}`,
                    background: "var(--surface2)",
                    cursor: "pointer",
                  }}
                    onClick={() => router.push("/builder")}
                  >
                    <Icon size={16} color={borderColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", marginBottom: 3 }}>{imp.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{imp.detail}</div>
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6, fontWeight: 600 }}>
                        ✏️ Fix in Resume Builder →
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>+{imp.points}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Skills Map ── */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            🧩 Skills detected vs. market demand
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)", marginBottom: 10 }}>
                ✅ Matched ({result.matchedSkills.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.matchedSkills.length === 0
                  ? <span style={{ fontSize: 12, color: "var(--text3)" }}>None detected — add your skills.</span>
                  : result.matchedSkills.map(s => (
                    <span key={s} style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
                      background: "rgba(74,222,128,.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,.2)",
                    }}>{s}</span>
                  ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)", marginBottom: 10 }}>
                ❌ In-demand — missing ({result.missingSkills.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.missingSkills.length === 0
                  ? <span style={{ fontSize: 12, color: "#4ade80" }}>All key skills covered! 🎉</span>
                  : result.missingSkills.map(s => (
                    <span key={s} style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
                      background: "rgba(248,113,113,.08)", color: "#f87171", border: "1px solid rgba(248,113,113,.2)",
                      textDecoration: "line-through", opacity: .8,
                    }}>{s}</span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/jobs" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "13px 28px",
            background: "var(--accent)", borderRadius: 12, color: "#fff",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            <Briefcase size={15} /> View {result.matchedSkills.length > 5 ? "Your Matched" : "Available"} Jobs
            <ChevronRight size={14} />
          </Link>
          <Link href="/builder" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "13px 28px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, color: "var(--text1)",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}>
            Fix Resume
          </Link>
        </div>
      </div>
    </div>
  );
}
