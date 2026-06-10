"use client";
/**
 * /score — jobSayer Score Dashboard
 * Reads resume data from localStorage (saved by builder) and computes
 * a 4-dimension score with improvement suggestions.
 */
import React, { useEffect, useState } from "react";
import { useWindowWidth } from "@/lib/useWindowWidth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw, Briefcase, ChevronRight,
  TrendingUp, AlertTriangle, Lightbulb, CheckCircle2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import CourseCard from "@/components/CourseCard";
import { getCoursesForSkills } from "@/lib/courseRecommendations";
import { computeScore, type ScoreResult } from "@/lib/scoreEngine";
import { matchJd, resumeToText } from "@/lib/jdMatcher";
import type { ResumeData } from "@/lib/types";
import { trackAction, recordScore } from "@/lib/activityTracker";

/* ── JD Match Panel ────────────────────────────────────────────── */
function JdMatchPanel({ resumeText }: { resumeText: string }) {
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<{ score: number; found: string[]; missing: string[] } | null>(null);

  function handleMatch() {
    if (!jdText.trim() || !resumeText.trim()) return;
    const r = matchJd(resumeText, jdText);
    setResult({ score: r.score, found: r.found, missing: r.missing.slice(0, 10) });
  }

  const matchColor = result
    ? result.score >= 70 ? "var(--success)" : result.score >= 45 ? "var(--warn)" : "var(--danger)"
    : "var(--text3)";

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "22px",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
        🎯 Match Against a Specific JD
      </div>
      <textarea
        value={jdText}
        onChange={e => { setJdText(e.target.value); setResult(null); }}
        placeholder="Paste a job description here to see how well your resume matches it — we'll highlight matched and missing keywords…"
        rows={4}
        style={{
          width: "100%", padding: "12px 14px",
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: 8, color: "var(--text1)", fontSize: 13,
          resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", marginBottom: 10,
        }}
      />
      <button
        onClick={handleMatch}
        disabled={!jdText.trim() || !resumeText.trim()}
        style={{
          padding: "9px 22px", borderRadius: 8, border: "none",
          background: jdText.trim() ? "var(--accent)" : "var(--surface2)",
          color: jdText.trim() ? "#fff" : "var(--text3)",
          fontSize: 13, fontWeight: 600,
          cursor: jdText.trim() ? "pointer" : "not-allowed",
          marginBottom: result ? 16 : 0,
        }}
      >
        Compute Match
      </button>

      {result && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: result.score >= 70 ? "rgba(34,197,94,.12)" : result.score >= 45 ? "rgba(234,179,8,.12)" : "rgba(239,68,68,.12)",
              border: `2px solid ${matchColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: matchColor,
            }}>{result.score}%</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: matchColor }}>
                {result.score >= 70 ? "Strong match" : result.score >= 45 ? "Partial match" : "Low match"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{result.found.length} keywords matched · {result.missing.length} missing</div>
            </div>
          </div>

          {result.found.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--success)", marginBottom: 6 }}>✅ Matched</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.found.slice(0, 10).map(s => (
                  <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(34,197,94,.08)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)", fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--danger)", marginBottom: 6 }}>❌ Missing from your resume</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.missing.map(s => (
                  <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(239,68,68,.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)", fontWeight: 500, textDecoration: "line-through", opacity: .8 }}>{s}</span>
                ))}
              </div>
              <Link href="/builder" style={{
                display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10,
                fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none",
              }}>
                ✏️ Add missing skills in Builder →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Gauge SVG ─────────────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const r = 64;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const offset = circ - filled;

  const color =
    score >= 75 ? "var(--success)" :
    score >= 55 ? "var(--warn)" : "var(--danger)";

  const label =
    score >= 75 ? "Strong" :
    score >= 55 ? "Good — improving" : "Needs work";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 16px" }}>
        <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id="gaugeFill" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--surface2)" strokeWidth="14" />
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
        background: score >= 75 ? "rgba(34,197,94,.12)" : score >= 55 ? "rgba(234,179,8,.12)" : "rgba(239,68,68,.12)",
        color,
      }}>{label}</div>
    </div>
  );
}

/* ── Bar ───────────────────────────────────────────────────────── */
function DimBar({ pct, status }: { pct: number; status: string }) {
  const color =
    status === "green" ? "var(--success)" :
    status === "amber" ? "var(--warn)" : "var(--danger)";
  return (
    <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 3, width: `${pct}%`,
        background: `linear-gradient(90deg,${color}88,${color})`,
        transition: "width .7s ease",
      }} />
    </div>
  );
}

/* ── Per-ATS score derivation ──────────────────────────────────── */
interface AtsSystem {
  name:      string;
  icon:      string;
  safeScore: number;  // score needed to pass
  weights:   Record<string, number>; // dimension label → weight (must sum 1)
  usedBy:    string;
}
const ATS_SYSTEMS: AtsSystem[] = [
  { name: "Naukri RMS",       icon: "🔵", safeScore: 75, weights: { "ATS Compatibility": .35, "Keyword Strength": .35, "Experience Clarity": .20, "Impact Statements": .10 }, usedBy: "Naukri job applications" },
  { name: "Workday",          icon: "🟣", safeScore: 80, weights: { "ATS Compatibility": .30, "Keyword Strength": .30, "Experience Clarity": .30, "Impact Statements": .10 }, usedBy: "TCS, Infosys, Wipro, MNCs" },
  { name: "Taleo (Oracle)",   icon: "🔴", safeScore: 78, weights: { "ATS Compatibility": .25, "Keyword Strength": .45, "Experience Clarity": .20, "Impact Statements": .10 }, usedBy: "Large enterprises, banks" },
  { name: "Greenhouse/Lever", icon: "🟢", safeScore: 70, weights: { "ATS Compatibility": .20, "Keyword Strength": .40, "Experience Clarity": .30, "Impact Statements": .10 }, usedBy: "Razorpay, CRED, funded startups" },
];

function deriveAtsScore(result: ScoreResult, ats: AtsSystem): number {
  let total = 0;
  for (const dim of result.dimensions) {
    const w = ats.weights[dim.label] ?? 0;
    total += (dim.score / 25) * w * 100; // each dim is /25, scale to 100
  }
  return Math.round(total);
}

/* ── Format parser check ────────────────────────────────────────── */
interface FormatIssue { severity: "high" | "medium" | "low"; message: string; fix: string }

function checkFormat(data: ResumeData): FormatIssue[] {
  const issues: FormatIssue[] = [];
  if (!data.skills?.trim()) issues.push({ severity: "high", message: "No skills section detected", fix: "Add a dedicated Skills section — ATS parsers look for this specifically." });
  if (!data.email?.trim()) issues.push({ severity: "high", message: "Missing email address", fix: "Add email — ATS can't process applications without contact info." });
  if (!data.phone?.trim()) issues.push({ severity: "high", message: "Missing phone number", fix: "Add phone number to your contact section." });
  if (!data.summary?.trim()) issues.push({ severity: "medium", message: "No summary / objective section", fix: "Add a 2–3 line professional summary with keywords from your target JD." });
  if (data.photo && data.photo.length > 100) issues.push({ severity: "medium", message: "Photo detected in resume", fix: "Remove photo for ATS submissions — most Indian ATS systems (Workday, Taleo) cannot parse images and may skip your entire resume." });
  const allDesc = (data.work ?? []).map(w => w.desc ?? "").join(" ");
  if (allDesc && !allDesc.includes("•") && !allDesc.includes("-") && !allDesc.includes("\n")) {
    issues.push({ severity: "medium", message: "Work experience written as paragraphs", fix: "Use bullet points (•) for each work achievement. ATS parsers extract bullets better than dense paragraphs." });
  }
  const hasMetrics = /\d+%|\d+x|\d+ (users|customers|engineers|people|crore|lakh|million|thousand)/i.test(allDesc);
  if (!hasMetrics && allDesc.length > 50) issues.push({ severity: "low", message: "No quantified results in experience", fix: "Add numbers: 'Improved load time by 40%', 'Served 2M users', 'Led team of 6'. Naukri and Workday rank quantified resumes higher." });
  return issues;
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function ScorePage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const router = useRouter();
  const [result,      setResult]      = useState<ScoreResult | null>(null);
  const [resumeData,  setResumeData]  = useState<ResumeData | null>(null);
  const [resumeName,  setResumeName]  = useState("Your resume");
  const [resumeText,  setResumeText]  = useState("");
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        const data: ResumeData = parsed.data ?? parsed;
        const computed = computeScore(data);
        setResult(computed);
        setResumeData(data);
        setResumeText(resumeToText(data));
        if (data.name) setResumeName(`${data.name}'s resume`);
        // Track XP + record score snapshot for dashboard
        trackAction("resume_scored", 60);
        recordScore(computed.total);
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
    <AppShell actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/jobs" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text1)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            Matched Jobs
          </Link>
          <Link href="/builder" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--accent)", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            Fix in Builder
          </Link>
        </div>
      }>

      <div style={{ padding: "24px 24px 48px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>jobSayer Score</h1>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>{resumeName} · Analysed just now</p>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "280px 1fr", gap: 20, marginBottom: 20 }}>

          {/* Gauge card */}
          <div style={{ ...card, textAlign: "center" }}>
            <ScoreGauge score={result.total} />
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>
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
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--danger)" }}>{result.improvements.filter(i => i.severity === "critical").length}</div>
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
                dim.status === "green" ? "var(--success)" :
                dim.status === "amber" ? "var(--warn)" : "var(--danger)";
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
                  imp.severity === "critical" ? "var(--danger)" :
                  imp.severity === "warning" ? "var(--warn)" : "var(--accent)";
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>+{imp.points}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Score-triggered upgrade CTA ── */}
        {result.total < 70 && (
          <div style={{
            ...card, marginBottom: 20,
            background: "var(--accdim)", border: "1px solid var(--accborder)",
            display: "flex", gap: 20, alignItems: "center",
            flexWrap: "wrap",
          }}>
            {/* Before/after visual */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--danger)", lineHeight: 1 }}>{result.total}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>Now</div>
              </div>
              <div style={{ fontSize: 18, color: "var(--text3)" }}>→</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--success)", lineHeight: 1 }}>
                  {Math.min(result.total + result.improvements.reduce((s, i) => s + i.points, 0), 100)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>With fixes</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 5 }}>
                Your score has room to grow
              </div>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65, marginBottom: 12 }}>
                Upgrade to Pro and let AI rewrite your resume bullets, optimise keywords for your target role, and apply directly — all in one flow.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/upgrade" style={{
                  padding: "9px 20px", borderRadius: 9,
                  background: "var(--accent)", color: "#fff",
                  fontSize: 13, fontWeight: 700, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>⚡ Upgrade to Pro →</a>
                <a href="/builder" style={{
                  padding: "9px 18px", borderRadius: 9, border: "1px solid var(--border)",
                  background: "var(--surface)", color: "var(--text1)",
                  fontSize: 13, fontWeight: 600, textDecoration: "none",
                }}>Fix manually in Builder</a>
              </div>
            </div>
          </div>
        )}

        {/* ── JD Match ── */}
        <div style={{ marginBottom: 20 }}>
          <JdMatchPanel resumeText={resumeText} />
        </div>

        {/* ── Per-ATS Breakdown ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>🖥️ Per-ATS Score Breakdown</div>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18, lineHeight: 1.6 }}>
            Different ATS systems weight resume sections differently. A score ≥ safe threshold means your resume reaches a human recruiter.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ATS_SYSTEMS.map(ats => {
              const score = deriveAtsScore(result, ats);
              const passes = score >= ats.safeScore;
              const color = passes ? "var(--success)" : score >= ats.safeScore - 10 ? "var(--warn)" : "var(--danger)";
              return (
                <div key={ats.name}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{ats.icon} {ats.name}</span>
                      <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>Used by: {ats.usedBy}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color }}>{score}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${color}15`, color, border: `1px solid ${color}40` }}>
                        {passes ? "✓ Passes" : `✗ Need ${ats.safeScore}+`}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 3, transition: "width .6s ease" }} />
                    {/* safe threshold marker */}
                    <div style={{ position: "absolute", top: 0, left: `${ats.safeScore}%`, width: 2, height: "100%", background: "var(--text3)" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>Safe threshold: {ats.safeScore} · Your score: {score}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Format & Parser Check ── */}
        {resumeData && (() => {
          const issues = checkFormat(resumeData);
          const highs = issues.filter(i => i.severity === "high");
          const meds  = issues.filter(i => i.severity === "medium");
          const lows  = issues.filter(i => i.severity === "low");
          const sevColor = { high: "var(--danger)", medium: "var(--warn)", low: "var(--accent)" };
          return (
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>⚙️ ATS Parser Compatibility Check</div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, lineHeight: 1.6 }}>
                Many Indian ATS systems silently reject resumes due to formatting issues — before a human ever reads them.
              </p>
              {issues.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 10, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)" }}>
                  <CheckCircle2 size={18} color="var(--success)" />
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>No parser issues detected — your resume format is ATS-safe.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...highs, ...meds, ...lows].map((issue, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10, background: "var(--surface2)", borderLeft: `3px solid ${sevColor[issue.severity]}` }}>
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        {issue.severity === "high" ? <AlertTriangle size={15} color={sevColor.high} /> : issue.severity === "medium" ? <AlertTriangle size={15} color={sevColor.medium} /> : <Lightbulb size={15} color={sevColor.low} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", marginBottom: 3 }}>{issue.message}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{issue.fix}</div>
                        <a href="/builder" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>✏️ Fix in Builder →</a>
                      </div>
                      <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${sevColor[issue.severity]}15`, color: sevColor[issue.severity], height: "fit-content" }}>
                        {issue.severity.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Skills Map ── */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            🧩 Skills detected vs. market demand
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 24 }}>
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
                      background: "rgba(34,197,94,.1)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)",
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
                  ? <span style={{ fontSize: 12, color: "var(--success)" }}>All key skills covered! 🎉</span>
                  : result.missingSkills.map(s => (
                    <span key={s} style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
                      background: "rgba(239,68,68,.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)",
                      textDecoration: "line-through", opacity: .8,
                    }}>{s}</span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Course recommendations for missing skills ── */}
        {result.missingSkills.length > 0 && (() => {
          const courses = getCoursesForSkills(result.missingSkills, 1, 4);
          if (!courses.length) return null;
          return (
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                📚 Courses to close your skill gaps
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, lineHeight: 1.6 }}>
                Adding these skills to your resume can increase your score significantly.
                These courses are matched to your specific gaps.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {courses.map(c => <CourseCard key={c.affiliateUrl} course={c} />)}
              </div>
              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 10 }}>
                Affiliate disclosure: jobSayer may earn a commission if you enroll. Price shown is approximate — check the platform for current offers.
              </p>
            </div>
          );
        })()}

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
    </AppShell>
  );
}
