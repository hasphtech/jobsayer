"use client";
/**
 * /career-health — Career Health Score
 * Periodic career checkup: skill freshness, profile strength, market position,
 * activity score, salary drift. Keeps professionals engaged between job hunts.
 */
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import type { ResumeData } from "@/lib/types";

/* ── Scoring engine ──────────────────────────────────────────── */
interface HealthDimension {
  id:          string;
  label:       string;
  icon:        string;
  score:       number;   // 0–100
  status:      "good" | "warn" | "critical";
  summary:     string;
  actions:     { label: string; href: string }[];
}

const DECAYING_SKILLS = [
  { skill: "React",        halfLifeYears: 2.5 },
  { skill: "TypeScript",   halfLifeYears: 3   },
  { skill: "Python",       halfLifeYears: 3   },
  { skill: "Kubernetes",   halfLifeYears: 2   },
  { skill: "AWS",          halfLifeYears: 2.5 },
  { skill: "Go",           halfLifeYears: 3   },
  { skill: "Next.js",      halfLifeYears: 2   },
  { skill: "Docker",       halfLifeYears: 2.5 },
  { skill: "GraphQL",      halfLifeYears: 2.5 },
  { skill: "Rust",         halfLifeYears: 3   },
];

const TRENDING_SKILLS_2026 = [
  "AI / LLM integration", "RAG pipelines", "Prompt engineering",
  "Kubernetes", "Terraform", "dbt", "TypeScript",
  "Rust", "Edge computing", "WebAssembly",
];

function scoreStatus(n: number): "good" | "warn" | "critical" {
  if (n >= 70) return "good";
  if (n >= 40) return "warn";
  return "critical";
}

function computeDimensions(resume: ResumeData | null, lastUpdatedDays: number): HealthDimension[] {
  /* ── 1. Profile Completeness ── */
  const fields = [
    resume?.name, resume?.title, resume?.email, resume?.summary,
    resume?.skills, resume?.location,
    (resume?.work?.length ?? 0) > 0,
    (resume?.edu?.length  ?? 0) > 0,
    resume?.linkedin,
    resume?.github,
  ];
  const filled   = fields.filter(Boolean).length;
  const profScore = Math.round((filled / fields.length) * 100);
  const missingFields: string[] = [];
  if (!resume?.summary)  missingFields.push("summary");
  if (!resume?.linkedin) missingFields.push("LinkedIn URL");
  if (!resume?.github)   missingFields.push("GitHub URL");
  if (!resume?.title)    missingFields.push("job title");

  /* ── 2. Skill Freshness ── */
  const skillText = [resume?.skills ?? "", ...(resume?.work ?? []).map(w => w.desc ?? ""), ...(resume?.projects ?? []).map(p => p.desc ?? "")].join(" ").toLowerCase();
  const presentSkills = DECAYING_SKILLS.filter(s => skillText.includes(s.skill.toLowerCase()));
  const skillScore = presentSkills.length === 0 ? 35 : Math.min(100, Math.round((presentSkills.length / DECAYING_SKILLS.length) * 100) + 20);
  const trendingMissing = TRENDING_SKILLS_2026.filter(s => !skillText.includes(s.toLowerCase())).slice(0, 3);

  /* ── 3. Resume Recency ── */
  const recencyScore = lastUpdatedDays <= 30 ? 100 :
    lastUpdatedDays <= 90  ? 80 :
    lastUpdatedDays <= 180 ? 60 :
    lastUpdatedDays <= 365 ? 35 : 15;

  /* ── 4. Experience Depth ── */
  const workCount     = resume?.work?.length ?? 0;
  const projectCount  = resume?.projects?.length ?? 0;
  const certCount     = resume?.certifications?.length ?? 0;
  const depthScore = Math.min(100, workCount * 20 + projectCount * 15 + certCount * 10);

  /* ── 5. Market Visibility ── */
  const hasLinkedIn  = Boolean(resume?.linkedin);
  const hasGitHub    = Boolean(resume?.github);
  const hasPortfolio = Boolean(resume?.website);
  const visScore     = (hasLinkedIn ? 40 : 0) + (hasGitHub ? 35 : 0) + (hasPortfolio ? 25 : 0);

  return [
    {
      id:      "completeness",
      label:   "Profile Completeness",
      icon:    "📋",
      score:   profScore,
      status:  scoreStatus(profScore),
      summary: profScore >= 90
        ? "Your profile is thorough — recruiters see everything they need."
        : `Missing: ${missingFields.slice(0, 3).join(", ")}. Incomplete profiles get 60% fewer recruiter views.`,
      actions: profScore < 90
        ? [{ label: "Complete your profile →", href: "/builder" }]
        : [],
    },
    {
      id:      "skill_freshness",
      label:   "Skill Freshness",
      icon:    "⚡",
      score:   skillScore,
      status:  scoreStatus(skillScore),
      summary: trendingMissing.length > 0
        ? `Trending skills not in your profile: ${trendingMissing.join(", ")}. The market moves fast.`
        : "Your skill set is current and well-aligned with 2026 market demand.",
      actions: [
        { label: "Check skill gaps →", href: "/career-gps" },
        ...(trendingMissing.length > 0 ? [{ label: "Update resume skills →", href: "/builder" }] : []),
      ],
    },
    {
      id:      "recency",
      label:   "Resume Recency",
      icon:    "📅",
      score:   recencyScore,
      status:  scoreStatus(recencyScore),
      summary: recencyScore >= 80
        ? "Your resume is recently updated — good habit."
        : lastUpdatedDays > 180
          ? `Last updated ${Math.round(lastUpdatedDays / 30)} months ago. Stale resumes miss recent achievements and keywords.`
          : `Updated ${lastUpdatedDays} days ago. Aim for a monthly refresh.`,
      actions: recencyScore < 80
        ? [{ label: "Refresh your resume →", href: "/builder" }]
        : [],
    },
    {
      id:      "depth",
      label:   "Experience Depth",
      icon:    "🏆",
      score:   Math.min(100, depthScore),
      status:  scoreStatus(Math.min(100, depthScore)),
      summary: depthScore >= 70
        ? `Strong depth: ${workCount} roles, ${projectCount} projects, ${certCount} certifications documented.`
        : `Add ${projectCount === 0 ? "projects, " : ""}${certCount === 0 ? "certifications, " : ""}more work detail to strengthen your profile.`,
      actions: depthScore < 70
        ? [
            { label: "Add projects/certs →", href: "/builder" },
            { label: "Get certified →", href: "/career-gps" },
          ]
        : [],
    },
    {
      id:      "visibility",
      label:   "Market Visibility",
      icon:    "👁",
      score:   visScore,
      status:  scoreStatus(visScore),
      summary: visScore >= 75
        ? "Strong online presence — recruiters can find and vet you easily."
        : `${!hasLinkedIn ? "LinkedIn URL missing — 87% of recruiters check it. " : ""}${!hasGitHub ? "GitHub not linked — key for tech roles." : ""}`,
      actions: [
        ...(!hasLinkedIn  ? [{ label: "Add LinkedIn →",  href: "/builder" }] : []),
        ...(!hasGitHub    ? [{ label: "Add GitHub →",    href: "/builder" }] : []),
        ...(!hasPortfolio ? [{ label: "Add portfolio →", href: "/builder" }] : []),
      ],
    },
  ];
}

/* ── Score ring ──────────────────────────────────────────────── */
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r   = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? "var(--success)" : score >= 40 ? "var(--warn)" : "var(--danger)";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.11, color: "var(--text3)", marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  );
}

/* ── Dimension bar ───────────────────────────────────────────── */
function DimBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
    </div>
  );
}

/* ── Check-in streak ─────────────────────────────────────────── */
const STREAK_KEY = "jobsayer-health-checkins";
function getStreak(): { dates: string[]; current: number } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { dates: [], current: 0 };
    const dates: string[] = JSON.parse(raw);
    // Count consecutive weeks
    let streak = 0;
    const now = Date.now();
    for (let i = 0; i < dates.length; i++) {
      const diff = (now - new Date(dates[i]).getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (diff <= i + 1) streak++;
      else break;
    }
    return { dates, current: streak };
  } catch { return { dates: [], current: 0 }; }
}
function recordCheckin() {
  try {
    const raw   = localStorage.getItem(STREAK_KEY);
    const dates: string[] = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().split("T")[0];
    if (!dates.includes(today)) {
      dates.unshift(today);
      localStorage.setItem(STREAK_KEY, JSON.stringify(dates.slice(0, 52)));
    }
  } catch { /* ignore */ }
}

/* ── Page ────────────────────────────────────────────────────── */
export default function CareerHealthPage() {
  const [resume, setResume]             = useState<ResumeData | null>(null);
  const [lastUpdatedDays, setLastUpdated] = useState(999);
  const [streak, setStreak]             = useState(0);
  const [loaded, setLoaded]             = useState(false);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [checkedIn, setCheckedIn]       = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        const data: ResumeData = parsed.data ?? parsed;
        setResume(data);
        // estimate days since last update via timestamp if available
        const ts = parsed.updatedAt ?? parsed.ts;
        if (ts) {
          const days = Math.round((Date.now() - new Date(ts).getTime()) / 86400000);
          setLastUpdated(Math.max(0, days));
        }
      }
    } catch { /* ignore */ }
    const { current } = getStreak();
    setStreak(current);
    setLoaded(true);
  }, []);

  function handleCheckin() {
    recordCheckin();
    const { current } = getStreak();
    setStreak(current);
    setCheckedIn(true);
  }

  const dimensions = useMemo(() => computeDimensions(resume, lastUpdatedDays), [resume, lastUpdatedDays]);

  const overallScore = useMemo(() =>
    Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length),
    [dimensions]);

  const overallLabel =
    overallScore >= 80 ? "Excellent"  :
    overallScore >= 65 ? "Good"        :
    overallScore >= 45 ? "Needs work"  : "Critical";

  const overallColor =
    overallScore >= 80 ? "var(--success)" :
    overallScore >= 65 ? "#22d3ee"         :
    overallScore >= 45 ? "var(--warn)"     : "var(--danger)";

  const statusColors: Record<string, string> = {
    good:     "var(--success)",
    warn:     "var(--warn)",
    critical: "var(--danger)",
  };

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <AppNav />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text3)", fontSize: 14 }}>
          Loading your career health…
        </div>
      </div>
    );
  }

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            🏥 Monthly Career Checkup
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>Career Health Score</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6, maxWidth: 540 }}>
            Your career fitness report — not just when you're job hunting. Professionals who check monthly earn 23% more over 5 years.
          </p>
        </div>

        {!resume && (
          <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(234,179,8,.07)", border: "1px solid rgba(234,179,8,.2)", fontSize: 13, color: "var(--warn)", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            ⚠️ Build your resume first for a personalised health score.{" "}
            <Link href="/builder" style={{ color: "var(--warn)", fontWeight: 700 }}>Go to Builder →</Link>
          </div>
        )}

        {/* Hero score */}
        <div style={{ ...card, padding: "28px 32px", marginBottom: 24, display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap", background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor: "var(--accborder)" }}>
          <ScoreRing score={overallScore} size={130} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: overallColor, marginBottom: 4 }}>{overallLabel}</div>
            <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 18, lineHeight: 1.6 }}>
              {overallScore >= 80
                ? "Your career profile is strong. Keep up the momentum and stay proactive about skill trends."
                : overallScore >= 65
                ? "Good foundation — a few targeted improvements will push you into the top tier."
                : overallScore >= 45
                ? "Your profile needs attention. Recruiters are seeing an outdated or incomplete picture."
                : "Your career profile needs a full refresh. Let's fix the critical gaps first."}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: streak > 0 ? "var(--warn)" : "var(--text3)" }}>{streak}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>week streak</div>
                </div>
              </div>
              {!checkedIn ? (
                <button onClick={handleCheckin} style={{ padding: "10px 22px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ✓ Check in today
                </button>
              ) : (
                <div style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)", fontSize: 13, fontWeight: 700, color: "var(--success)" }}>
                  ✓ Checked in!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dimension overview */}
        <div style={{ ...card, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Dimensions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {dimensions.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 18, width: 24, textAlign: "center", flexShrink: 0 }}>{d.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{d.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: statusColors[d.status] }}>{d.score}</span>
                  </div>
                  <DimBar score={d.score} color={statusColors[d.status]} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed dimension cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {dimensions.map(d => {
            const col  = statusColors[d.status];
            const open = expanded === d.id;
            return (
              <div key={d.id} style={{ ...card, borderLeft: `3px solid ${col}`, overflow: "hidden" }}>
                <button onClick={() => setExpanded(open ? null : d.id)} style={{
                  width: "100%", padding: "16px 20px", background: "none", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, fontFamily: "inherit",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{d.icon}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>{d.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{d.summary.slice(0, 80)}{d.summary.length > 80 ? "…" : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: col }}>{d.score}</span>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>/100</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: col+"18", color: col, border: `1px solid ${col}44` }}>
                      {d.status === "good" ? "Good" : d.status === "warn" ? "Needs work" : "Critical"}
                    </span>
                    <span style={{ color: "var(--text3)" }}>{open ? "▲" : "▼"}</span>
                  </div>
                </button>
                {open && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border2)" }}>
                    <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginTop: 14, marginBottom: 14 }}>
                      {d.summary}
                    </p>
                    {d.actions.length > 0 && (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {d.actions.map((a, i) => (
                          <Link key={i} href={a.href} style={{
                            display: "inline-flex", alignItems: "center", padding: "8px 16px",
                            borderRadius: 8, background: i === 0 ? "var(--accent)" : "var(--surface2)",
                            color: i === 0 ? "#fff" : "var(--text1)",
                            border: i === 0 ? "none" : "1px solid var(--border)",
                            fontSize: 13, fontWeight: 600, textDecoration: "none",
                          }}>{a.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Trending skills callout */}
        <div style={{ ...card, padding: "20px 24px", marginTop: 24, background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor: "var(--accborder)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>🚀 Top skills growing in demand — 2026</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TRENDING_SKILLS_2026.map(skill => (
              <span key={skill} style={{ padding: "5px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                {skill}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <Link href="/career-gps" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Build your skill roadmap →
            </Link>
            <Link href="/interview" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Practice interviews
            </Link>
          </div>
        </div>

        {/* Next check-in */}
        <div style={{ marginTop: 20, padding: "14px 20px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>📆 Set a monthly reminder</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Professionals who review their career health monthly are 3× more likely to get a 20%+ raise within 2 years.</div>
          </div>
          <Link href="/salary" style={{ padding: "8px 18px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text1)", textDecoration: "none", whiteSpace: "nowrap" }}>
            Check salary →
          </Link>
        </div>
      </div>
    </div>
  );
}
