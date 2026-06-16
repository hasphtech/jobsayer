"use client";
/**
 * /dashboard — Career Command Center (AppShell redesign)
 */
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { createBrowserClient } from "@supabase/ssr";
import {
  getXPState, getLevelInfo, getDerivedStats, BADGES, LEVELS,
  type XPState, type ActivityEntry,
} from "@/lib/activityTracker";
import { useWindowWidth } from "@/lib/useWindowWidth";

/* ── Score sparkline ─────────────────────────────────────────── */
function ScoreChart({ data }: { data: { score: number; ts: string }[] }) {
  const W = 260, H = 64;
  if (data.length < 2) {
    return (
      <div style={{ height: H, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>Score 2+ times to see trend</span>
      </div>
    );
  }
  const scores = data.map(d => d.score);
  const minS = Math.min(...scores) - 5;
  const maxS = Math.max(...scores) + 5;
  const toX = (i: number) => (i / (data.length - 1)) * (W - 16) + 8;
  const toY = (s: number) => H - 6 - ((s - minS) / (maxS - minS)) * (H - 12);
  const pts = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(" ");
  const area = `8,${H - 6} ${pts} ${toX(data.length - 1)},${H - 6}`;
  const last = data[data.length - 1];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(data.length - 1)} cy={toY(last.score)} r={3.5} fill="var(--accent)" />
      <text x={toX(data.length - 1)} y={toY(last.score) - 7} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--accent)">{last.score}</text>
    </svg>
  );
}

/* ── Relative time ───────────────────────────────────────────── */
function relTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  resume_built: "Built a resume", resume_updated: "Updated resume",
  resume_scored: "Scored resume", cover_letter_generated: "Generated cover letter",
  interview_practiced: "Interview session", job_saved: "Saved a job",
  job_applied: "Applied to a job", skill_proof_added: "Added skill proof",
  career_health_checked: "Career health check", salary_checked: "Checked salary",
  bgv_submitted: "Submitted BGV", career_gps_used: "Used Career GPS",
  profile_completed: "Updated profile", daily_login: "Daily login",
};

const ACTION_ICONS: Record<string, string> = {
  resume_built:           "ti-pencil",
  resume_updated:         "ti-pencil",
  resume_scored:          "ti-target",
  cover_letter_generated: "ti-mail",
  interview_practiced:    "ti-microphone",
  job_saved:              "ti-bookmark",
  job_applied:            "ti-briefcase",
  skill_proof_added:      "ti-bolt",
  career_health_checked:  "ti-stethoscope",
  salary_checked:         "ti-coin",
  bgv_submitted:          "ti-shield-check",
  career_gps_used:        "ti-compass",
  profile_completed:      "ti-user",
  daily_login:            "ti-sun",
};

/* ── Today's focus tasks ─────────────────────────────────────── */
function buildFocusTasks(state: XPState) {
  const recent = new Set(state.log.slice(0, 10).map(l => l.type));
  return [
    { label: "Score your resume",         href: "/score",     xp: 30, done: recent.has("resume_scored"),       icon: "ti-target" },
    { label: "Tailor for a job listing",  href: "/tailor",    xp: 50, done: recent.has("resume_updated"),      icon: "ti-cut" },
    { label: "Practice an interview",     href: "/interview", xp: 45, done: recent.has("interview_practiced"), icon: "ti-microphone" },
  ];
}

/* ── Stat card ───────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent = false, href }: {
  label: string; value: string | number; sub?: string; accent?: boolean; href?: string;
}) {
  const inner = (
    <div style={{
      background: accent ? "var(--accdim)" : "var(--surface)",
      border: `1px solid ${accent ? "var(--accborder)" : "var(--border)"}`,
      borderRadius: 12, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 3,
      cursor: href ? "pointer" : "default",
      transition: "border-color .15s",
    }}
      onMouseEnter={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)")}
      onMouseLeave={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = accent ? "var(--accborder)" : "var(--border)")}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text3)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text1)", letterSpacing: "-.03em", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: accent ? "var(--accent)" : "var(--text3)", opacity: 0.7 }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

/* ── Quick action button ─────────────────────────────────────── */
function QuickAction({ href, icon, label, xp }: { href: string; icon: string; label: string; xp: string }) {
  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column", gap: 5,
      padding: "12px 13px", borderRadius: 9,
      background: "var(--surface2)", border: "1px solid var(--border)",
      textDecoration: "none", transition: "border-color .15s, background .15s",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)";
        (e.currentTarget as HTMLAnchorElement).style.background = "var(--accdim)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface2)";
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 18, color: "var(--accent)" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)" }}>{label}</span>
      <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 600 }}>{xp}</span>
    </Link>
  );
}

/* ── Career milestone prompt ─────────────────────────────────── */
type Milestone = {
  monthsMin: number;
  monthsMax: number;
  icon: string;
  headline: string;
  body: string;
  cta: string;
  ctaHref: string;
  ctaSecondary?: string;
  ctaSecondaryHref?: string;
  color: string;
};

const MILESTONES: Milestone[] = [
  {
    monthsMin: 3, monthsMax: 5,
    icon: "ti-leaf",
    headline: "You've hit 3 months in your role",
    body: "You're past the ramp-up phase. A great time to document your early wins and benchmark your salary against the market before your first review.",
    cta: "Check salary benchmark", ctaHref: "/salary",
    ctaSecondary: "Update resume with wins", ctaSecondaryHref: "/builder",
    color: "var(--success)",
  },
  {
    monthsMin: 6, monthsMax: 11,
    icon: "ti-bolt",
    headline: "6 months in — time to check your market value",
    body: "Professionals who benchmark their salary at 6 months are 2.4× more likely to negotiate a raise at their next review. Your market rate may have shifted.",
    cta: "Get salary benchmark", ctaHref: "/salary",
    ctaSecondary: "Close skill gaps", ctaSecondaryHref: "/career-gps",
    color: "var(--accent)",
  },
  {
    monthsMin: 12, monthsMax: 17,
    icon: "ti-trophy",
    headline: "1 year in — your next move starts now",
    body: "Your impact is proven. Run Career GPS to see what 3 skills separate you from a senior title, and get your resume ready for internal or external opportunities.",
    cta: "Run Career GPS", ctaHref: "/career-gps",
    ctaSecondary: "Refresh resume", ctaSecondaryHref: "/builder",
    color: "#f59e0b",
  },
  {
    monthsMin: 18, monthsMax: 23,
    icon: "ti-rocket",
    headline: "18 months — the sweet spot for a move",
    body: "18–24 months is when professionals see the biggest salary jumps from switching roles. See what your profile looks like to recruiters right now.",
    cta: "Score your resume", ctaHref: "/score",
    ctaSecondary: "Check salary data", ctaSecondaryHref: "/salary",
    color: "var(--accent)",
  },
  {
    monthsMin: 24, monthsMax: 9999,
    icon: "ti-bulb",
    headline: "2+ years — you have serious leverage",
    body: "Staying beyond 2 years? Make sure your profile and salary reflect the experience and impact you've built. Now is the time to negotiate or explore.",
    cta: "Optimise LinkedIn", ctaHref: "/linkedin",
    ctaSecondary: "Salary benchmark", ctaSecondaryHref: "/salary",
    color: "#8b5cf6",
  },
];

function CareerMilestonePrompt() {
  const START_KEY    = "jobsayer-role-start";
  const DISMISS_KEY  = "jobsayer-milestone-dismissed";

  const [startDate, setStartDate] = useState<string>("");
  const [input,     setInput]     = useState<string>("");
  const [dismissed, setDismissed] = useState<Record<number, boolean>>({});
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(START_KEY);
      if (s) setStartDate(s);
      const d = localStorage.getItem(DISMISS_KEY);
      if (d) setDismissed(JSON.parse(d));
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  function saveStart() {
    if (!input) return;
    try { localStorage.setItem(START_KEY, input); } catch { /* ignore */ }
    setStartDate(input);
  }

  function dismiss(min: number) {
    const next = { ...dismissed, [min]: true };
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  if (!mounted) return null;

  // If no start date, show a small setup prompt
  if (!startDate) {
    return (
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "14px 16px", marginBottom: 16,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}><i className="ti ti-calendar"/></span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", marginBottom: 3 }}>
            When did you start your current role?
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>
            We&apos;ll surface salary benchmarks and skill recs at the right career moment.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="month"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 7, color: "var(--text1)", padding: "6px 10px",
              fontSize: 12, fontFamily: "inherit",
            }}
          />
          <button onClick={saveStart} style={{
            padding: "7px 14px", borderRadius: 7, background: "var(--accent)", color: "#fff",
            fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>
            Set
          </button>
        </div>
      </div>
    );
  }

  // Calculate months in role
  const start  = new Date(startDate + "-01");
  const months = Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  const milestone = MILESTONES.find(m => months >= m.monthsMin && months <= m.monthsMax);

  if (!milestone || dismissed[milestone.monthsMin]) return null;

  return (
    <div style={{
      background: "var(--surface)", borderLeft: `3px solid ${milestone.color}`,
      border: `1px solid var(--border)`, borderLeftWidth: 3, borderLeftColor: milestone.color,
      borderRadius: 12, padding: "16px", marginBottom: 16,
      position: "relative",
    }}>
      <button
        onClick={() => dismiss(milestone.monthsMin)}
        style={{
          position: "absolute", top: 10, right: 12, background: "none", border: "none",
          fontSize: 14, color: "var(--text3)", cursor: "pointer", lineHeight: 1, padding: 0,
        }}
        aria-label="Dismiss"
      >×</button>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <i className={`ti ${milestone.icon}`} style={{ fontSize: 20, color: milestone.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text1)", marginBottom: 5 }}>
            {milestone.headline}
          </div>
          <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65, margin: "0 0 12px" }}>
            {milestone.body}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={milestone.ctaHref} style={{
              padding: "7px 14px", borderRadius: 7,
              background: milestone.color, color: "#fff",
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}>
              {milestone.cta} <i className="ti ti-arrow-right"/>
            </Link>
            {milestone.ctaSecondary && (
              <Link href={milestone.ctaSecondaryHref!} style={{
                padding: "7px 14px", borderRadius: 7,
                background: "var(--surface2)", border: "1px solid var(--border)",
                color: "var(--text1)", fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}>
                {milestone.ctaSecondary}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Post-hire continuity panel (GAP 3) ─────────────────────── */
type PHPhase = "30" | "60" | "90";

const PH_PHASES: { key: PHPhase; label: string; color: string; goals: string[] }[] = [
  {
    key: "30", label: "First 30 days", color: "#6366f1",
    goals: [
      "Meet every direct teammate 1-on-1",
      "Understand team's top 3 OKRs",
      "Ship one small contribution",
      "Set up 1:1 cadence with manager",
    ],
  },
  {
    key: "60", label: "Days 31–60", color: "#f59e0b",
    goals: [
      "Identify one process gap to improve",
      "Own a meaningful deliverable end-to-end",
      "Build cross-team relationships",
      "Request first informal feedback",
    ],
  },
  {
    key: "90", label: "Days 61–90", color: "var(--success)",
    goals: [
      "Document your wins + metrics impact",
      "Propose a growth plan to manager",
      "Contribute to a roadmap discussion",
      "Schedule formal 90-day review",
    ],
  },
];

function PostHirePanel() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const STORAGE_KEY = "jobsayer-posthire";

  // Load/save state from localStorage after mount
  const [mounted, setMounted] = useState(false);
  const [activePhase, setActivePhase] = useState<PHPhase>("30");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [offerSalary, setOfferSalary] = useState("1200000");
  const [currentSalary, setCurrentSalary] = useState("1000000");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.checked) setChecked(s.checked);
        if (s.activePhase) setActivePhase(s.activePhase);
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ checked, activePhase })); } catch { /* ignore */ }
  }, [checked, activePhase, mounted]);

  function toggleCheck(key: string) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const phase = PH_PHASES.find(p => p.key === activePhase)!;
  const doneCount = phase.goals.filter((_, i) => checked[`${activePhase}_${i}`]).length;
  const pct = Math.round((doneCount / phase.goals.length) * 100);

  // Counteroffer calculator
  const offerNum = Number(offerSalary.replace(/,/g, "")) || 0;
  const curNum   = Number(currentSalary.replace(/,/g, "")) || 0;
  const delta    = offerNum - curNum;
  const deltaPct = curNum > 0 ? ((delta / curNum) * 100).toFixed(1) : "0";
  const isGood   = delta > 0;
  const totalComp1yr = offerNum;
  const counterTarget = Math.round(offerNum * 1.08); // aim 8% above offer

  function fmt(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
  }

  return (
    <div style={{ marginTop: 14 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Post-Hire Continuity
        </div>
        <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(99,102,241,.12)", color: "var(--accent)", fontWeight: 700 }}>
          NEW
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setExpanded(o => !o)}
          style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          {expanded ? "Collapse ↑" : "Expand ↓"}
        </button>
      </div>

      {/* 30-60-90 tracker */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 10 }}>
        {/* Phase tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {PH_PHASES.map(p => (
            <button key={p.key} onClick={() => setActivePhase(p.key)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                cursor: "pointer", border: "1px solid transparent",
                background: activePhase === p.key ? `${p.color}18` : "var(--surface2)",
                color: activePhase === p.key ? p.color : "var(--text3)",
                borderColor: activePhase === p.key ? `${p.color}40` : "var(--border)",
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: phase.color, borderRadius: 3, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: phase.color, flexShrink: 0 }}>{doneCount}/{phase.goals.length}</span>
        </div>

        {/* Goals checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {phase.goals.map((goal, i) => {
            const key = `${activePhase}_${i}`;
            const done = !!checked[key];
            return (
              <button key={i} onClick={() => toggleCheck(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  background: done ? `${phase.color}10` : "var(--surface2)",
                  border: `1px solid ${done ? phase.color + "35" : "var(--border)"}`,
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: done ? phase.color : "transparent",
                  border: `1.5px solid ${done ? phase.color : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {done && <span style={{ fontSize: 10, color: "#fff" }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: done ? "var(--text3)" : "var(--text1)", textDecoration: done ? "line-through" : "none", flex: 1 }}>
                  {goal}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded section: promotion readiness + appraisal prep + counteroffer */}
      {expanded && (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10 }}>

          {/* Promotion readiness */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", marginBottom: 10 }}><i className="ti ti-rocket"/> Promotion Readiness</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Performance above expectations", done: doneCount >= 2 },
                { label: "Visibility with senior leadership", done: doneCount >= 3 },
                { label: "Document impact with metrics", done: false },
                { label: "Sponsor/mentor identified", done: false },
                { label: "Next-level skills in progress", done: false },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                  <span style={{ color: item.done ? "var(--success)" : "var(--text3)", flexShrink: 0 }}>{item.done ? "✓" : "○"}</span>
                  <span style={{ color: item.done ? "var(--text1)" : "var(--text3)" }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 7, background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.15)", fontSize: 11, color: "var(--text3)" }}>
              <i className="ti ti-bulb"/> <strong style={{ color: "var(--accent)" }}>Tip:</strong> Most promotions happen when you do the next level&apos;s job before the title change. Focus on scope, not time served.
            </div>
          </div>

          {/* Counteroffer calculator */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", marginBottom: 10 }}><i className="ti ti-coin"/> Counteroffer Calculator</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Your Current CTC (₹/year)</label>
                <input value={currentSalary} onChange={e => setCurrentSalary(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Offer CTC (₹/year)</label>
                <input value={offerSalary} onChange={e => setOfferSalary(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ padding: "12px", borderRadius: 8, background: isGood ? "rgba(34,197,94,.07)" : "rgba(239,68,68,.07)", border: `1px solid ${isGood ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isGood ? "var(--success)" : "var(--danger)", marginBottom: 4 }}>
                  {isGood ? `+${deltaPct}% raise` : `${deltaPct}% cut — reconsider`}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Delta: {fmt(Math.abs(delta))}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Counter at: <strong style={{ color: "var(--accent)" }}>{fmt(counterTarget)}</strong></div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, lineHeight: 1.5 }}>
                  {Number(deltaPct) < 20 && Number(deltaPct) > 0 ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-alert-triangle" style={{ fontSize: 11, color: "var(--warn)" }} /> Less than 20% — typically not worth the switch unless role or growth is materially better.</span> : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Appraisal prep */}
          <div style={{ gridColumn: "1 / -1", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><i className="ti ti-chart-bar" style={{ fontSize: 14, color: "var(--accent)" }} /> Appraisal Prep — What to Document</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {[
                { icon: "ti-trending-up", title: "Quantified Impact", desc: "Revenue influenced, cost saved, load reduced — anything with a number." },
                { icon: "ti-link",        title: "Cross-team Work", desc: "Projects where you collaborated outside your team. Shows breadth." },
                { icon: "ti-school",      title: "Skills Acquired", desc: "Certifications, new tools adopted, technologies picked up." },
                { icon: "ti-rocket",      title: "Initiatives Launched", desc: "Processes you started, problems you found and solved without being asked." },
                { icon: "ti-users",       title: "People Grown", desc: "If you mentored, onboarded, or unblocked others — document it." },
                { icon: "ti-bulb",        title: "Feedback Received", desc: "Positive 360 feedback, awards, shoutouts — keep receipts." },
              ].map(item => (
                <div key={item.title} style={{ padding: "10px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div style={{ marginBottom: 6 }}><i className={`ti ${item.icon}`} style={{ fontSize: 16, color: "var(--accent)" }} /></div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Link href="/vault" style={{
                fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 7,
                background: "var(--accent)", color: "#fff", textDecoration: "none",
              }}>
                <i className="ti ti-folder"/> Store in Doc Vault
              </Link>
              <Link href="/builder" style={{
                fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 7,
                background: "var(--surface2)", color: "var(--text1)", textDecoration: "none",
                border: "1px solid var(--border)",
              }}>
                ✏️ Update Resume
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

/* ── Onboarding banner (new users — 0 XP) ──────────────────── */
function OnboardingBanner() {
  const DISMISS_KEY = "jobsayer-onboarding-dismissed";
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setDismissed(true);
  }

  if (!mounted || dismissed) return null;

  const steps = [
    { icon: "ti-file-text",  label: "Build your resume",           href: "/builder",   cta: "Open Builder" },
    { icon: "ti-target",     label: "Score it against ATS",        href: "/score",     cta: "Score Now" },
    { icon: "ti-compass",    label: "Find your skill gaps",        href: "/career-gps", cta: "Run GPS" },
    { icon: "ti-microphone", label: "Practice an interview",       href: "/interview", cta: "Practice" },
  ];

  return (
    <div style={{
      background: "var(--accdim)", border: "1px solid var(--accborder)",
      borderRadius: 14, padding: "20px 22px", marginBottom: 20, position: "relative",
    }}>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute", top: 12, right: 14,
          background: "none", border: "none", fontSize: 15,
          color: "var(--text3)", cursor: "pointer", lineHeight: 1, padding: 0,
        }}
      >×</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <i className="ti ti-rocket" style={{ fontSize: 18, color: "#fff" }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)", letterSpacing: "-.02em" }}>
            Welcome to jobSayer — let&apos;s set up your career profile
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
            Complete these 4 steps to unlock your Career Health Score and personalised recommendations.
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        {steps.map((step, i) => (
          <Link key={i} href={step.href} style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: "12px 14px", borderRadius: 10, textDecoration: "none",
            background: "var(--surface)", border: "1px solid var(--accborder)",
            transition: "box-shadow .15s, border-color .15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 16px rgba(99,102,241,.2)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accborder)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                background: "var(--accdim)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <i className={`ti ${step.icon}`} style={{ fontSize: 12, color: "var(--accent)" }} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>
                Step {i + 1}
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)" }}>{step.label}</div>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              {step.cta} <i className="ti ti-arrow-right" style={{ fontSize: 10 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Growth Plan card ────────────────────────────────────────── */
// Reads target_role from Supabase profiles + skill gap state from
// localStorage (written by /career-gps after a run). If no GPS data
// yet, shows an upsell state with a CTA to /career-gps.

const GPS_KEY = "jobsayer-career-gps";

interface GpsSnapshot {
  targetRole: string;
  skills: { name: string; status: "done" | "progress" | "todo" }[];
  runAt: string;
}

function GrowthPlanCard() {
  const { user } = useAuth();
  const [targetRole, setTargetRole] = useState<string>("");
  const [gps, setGps] = useState<GpsSnapshot | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read GPS snapshot from localStorage
    try {
      const raw = localStorage.getItem(GPS_KEY);
      if (raw) setGps(JSON.parse(raw) as GpsSnapshot);
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  useEffect(() => {
    // Pull target_role from Supabase profiles
    if (!user) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase
      .from("profiles")
      .select("target_role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data?.target_role) setTargetRole(data.target_role); });
  }, [user]);

  if (!mounted) return null;

  const displayRole = gps?.targetRole || targetRole;
  const skills = gps?.skills ?? [];
  const done = skills.filter(s => s.status === "done").length;
  const pct  = skills.length ? Math.round((done / skills.length) * 100) : 0;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "16px", marginBottom: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accdim)", border: "1px solid var(--accborder)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-map-2" style={{ fontSize: 14, color: "var(--accent)" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
              Growth plan
            </div>
            {displayRole && (
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 1 }}>
                Target: <strong style={{ color: "var(--text1)" }}>{displayRole}</strong>
              </div>
            )}
          </div>
        </div>
        <Link href="/career-gps" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          {gps ? "Update" : "Set up"} <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
        </Link>
      </div>

      {gps && skills.length > 0 ? (
        <>
          {/* Progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{done} of {skills.length} skills complete</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 3, transition: "width .4s ease" }} />
            </div>
          </div>

          {/* Skill rows — show up to 5 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {skills.slice(0, 5).map((sk, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                {sk.status === "done" && <i className="ti ti-circle-check" style={{ fontSize: 14, color: "var(--success)", flexShrink: 0 }} />}
                {sk.status === "progress" && <i className="ti ti-circle-half-2" style={{ fontSize: 14, color: "var(--accent)", flexShrink: 0 }} />}
                {sk.status === "todo"     && <i className="ti ti-circle-dashed" style={{ fontSize: 14, color: "var(--text3)", flexShrink: 0 }} />}
                <span style={{ color: sk.status === "done" ? "var(--text3)" : "var(--text1)", textDecoration: sk.status === "done" ? "line-through" : "none" }}>
                  {sk.name}
                </span>
                {sk.status === "todo" && (
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text3)" }}>not started</span>
                )}
                {sk.status === "progress" && (
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>in progress</span>
                )}
              </div>
            ))}
            {skills.length > 5 && (
              <Link href="/career-gps" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", paddingLeft: 22 }}>
                +{skills.length - 5} more skills →
              </Link>
            )}
          </div>
        </>
      ) : (
        /* No GPS data yet — upsell */
        <div style={{ padding: "14px 0 2px" }}>
          <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 12px", lineHeight: 1.6 }}>
            Find out exactly which skills separate you from your target role — and get a personalised roadmap to close the gaps.
          </p>
          <Link href="/career-gps" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, textDecoration: "none",
            background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600,
          }}>
            <i className="ti ti-map-2" /> Run growth plan
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const { user } = useAuth();
  const [state, setState] = useState<XPState | null>(null);
  const [derived, setDerived] = useState({
    applicationsTotal: 0, applicationsActive: 0, offersCount: 0,
    interviewsTotal: 0, skillProofsCount: 0, resumeScore: null as number | null,
  });
  const [showRoadmap, setShowRoadmap] = useState(false);

  useEffect(() => {
    setState(getXPState());
    setDerived(getDerivedStats());
  }, []);

  const levelInfo = useMemo(() => state ? getLevelInfo(state.totalXP) : null, [state]);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] || "there";

  const actions = (
    <Link href="/builder" style={{
      padding: "5px 14px", borderRadius: 7,
      background: "var(--accent)", color: "#fff",
      fontSize: 12, fontWeight: 600, textDecoration: "none",
    }}>
      + New resume
    </Link>
  );

  if (!state || !levelInfo) {
    return (
      <AppShell actions={actions}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text3)", fontSize: 14 }}>
          Loading…
        </div>
      </AppShell>
    );
  }

  const earnedBadges = BADGES.filter(b => state.badges.includes(b.id));
  const lockedBadges = BADGES.filter(b => !state.badges.includes(b.id));
  const focusTasks   = buildFocusTasks(state);
  const recentLog: ActivityEntry[] = state.log.slice(0, 12);
  const streak = (state as unknown as { streak?: number; streakDays?: number }).streak
    ?? (state as unknown as { streakDays?: number }).streakDays ?? 0;

  return (
    <AppShell actions={actions}>
      <div style={{ padding: mobile ? "16px 12px 48px" : "24px 24px 48px" }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 3 }}>
            {greet()}, {firstName}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <i className={`ti ${levelInfo.icon}`} style={{ fontSize: 13, color: levelInfo.color }} />
            Level {levelInfo.level} · {levelInfo.title}
            {streak > 0 && <><i className="ti ti-flame" style={{ fontSize: 12, color: "var(--danger)", marginLeft: 6 }} />{streak} day streak</>}
            <span style={{ marginLeft: 8, color: "var(--border)", fontSize: 11 }}>·</span>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>Career command center</span>
          </p>
        </div>



        {/* ── Onboarding banner (new users) ── */}
        {state.totalXP === 0 && <OnboardingBanner />}

        {/* ── Career milestone prompt ── */}
        {state.totalXP > 0 && <CareerMilestonePrompt />}

        {/* ── 4 stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          <StatCard
            label="ATS Score"
            value={derived.resumeScore ?? "—"}
            sub={derived.resumeScore ? (derived.resumeScore >= 80 ? "↑ Strong" : derived.resumeScore >= 60 ? "Needs work" : "↓ Low") : "Not scored yet"}
            href="/score"
          />
          <StatCard
            label="XP Earned"
            value={state.totalXP.toLocaleString()}
            sub={`Level ${levelInfo.level} · ${levelInfo.progressPct}% to next`}
          />
          <StatCard
            label="Applications"
            value={derived.applicationsTotal}
            sub={`${derived.applicationsActive} active · ${derived.offersCount} offer${derived.offersCount !== 1 ? "s" : ""}`}
            href="/applications"
          />
          <StatCard
            label="Career Health"
            value={`${Math.round((earnedBadges.length / Math.max(BADGES.length, 1)) * 100)}%`}
            sub={`${earnedBadges.length}/${BADGES.length} badges`}
            accent
            href="/career-health"
          />
        </div>

        {/* ── Growth Plan ── */}
        <GrowthPlanCard />

        {/* ── Quick access ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
            Quick access
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
            <QuickAction href="/builder"   icon="ti-pencil"     label="Resume Builder"   xp="+20 XP" />
            <QuickAction href="/score"     icon="ti-target"     label="ATS Score"         xp="+30 XP" />
            <QuickAction href="/jobs"      icon="ti-briefcase"  label="Browse Jobs"       xp="+25 XP" />
            <QuickAction href="/interview" icon="ti-microphone" label="Interview Prep"    xp="+45 XP" />
          </div>
        </div>

        {/* ── 2-col: focus tasks + recent activity ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>

          {/* Today's focus */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              What to do next
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {focusTasks.map((t, i) => (
                <Link key={i} href={t.href} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8, textDecoration: "none",
                  background: t.done ? "var(--accdim)" : "var(--surface2)",
                  border: `1px solid ${t.done ? "var(--accborder)" : "var(--border)"}`,
                  opacity: t.done ? 0.75 : 1,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    background: t.done ? "var(--accent)" : "transparent",
                    border: `1.5px solid ${t.done ? "var(--accent)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {t.done && <i className="ti ti-check" style={{ fontSize: 10, color: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 13, flex: 1, color: t.done ? "var(--text3)" : "var(--text1)", textDecoration: t.done ? "line-through" : "none", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className={`ti ${t.icon}`} style={{ fontSize: 13, color: t.done ? "var(--text3)" : "var(--accent)" }} />{t.label}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--accent)", background: "var(--accdim)", padding: "1px 6px", borderRadius: 4 }}>
                    +{t.xp} XP
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Recent activity
            </div>
            {recentLog.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text3)", padding: "20px 0", textAlign: "center" }}>
                No activity yet — use any tool to earn XP!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentLog.map((entry, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 0",
                    borderBottom: i < recentLog.length - 1 ? "1px solid var(--border2)" : "none",
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: i === 0 ? "var(--accent)" : "var(--border)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: i === 0 ? "var(--text1)" : "var(--text2)", flex: 1 }}>
                      {ACTION_ICONS[entry.type]
                        ? <><i className={`ti ${ACTION_ICONS[entry.type]}`} style={{ fontSize: 11, color: "var(--text3)", marginRight: 4 }} />{ACTION_LABELS[entry.type] ?? entry.type}</>
                        : ACTION_LABELS[entry.type] ?? entry.type
                      }
                    </span>
                    <span style={{ fontSize: 10, color: i === 0 ? "var(--accent)" : "var(--text3)" }}>
                      +{entry.xp} XP
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text3)", whiteSpace: "nowrap" }}>{relTime(entry.ts)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Score trend + Badges ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : ((state.scoreHistory ?? []).length >= 2 ? "1fr 1fr" : "1fr"), gap: 12, marginBottom: 14 }}>

          {/* Score trend — only shown when there are ≥2 data points */}
          {(state.scoreHistory ?? []).length >= 2 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ATS Score trend
              </div>
              <Link href="/score" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
                Score now <i className="ti ti-arrow-right"/>
              </Link>
            </div>
            <ScoreChart data={state.scoreHistory ?? []} />
          </div>
          )}

          {/* Badges */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Badges — {earnedBadges.length}/{BADGES.length}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {BADGES.map(b => {
                const earned = state.badges.includes(b.id);
                return (
                  <div key={b.id} title={`${b.label}${earned ? "" : " (locked)"}`} style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: earned ? "var(--accdim)" : "var(--surface2)",
                    border: `1px solid ${earned ? "var(--accborder)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: earned ? 1 : 0.3,
                  }}>
                    <i className={`ti ${b.icon}`} style={{ fontSize: 15, color: earned ? "var(--accent)" : "var(--text3)" }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Level roadmap (collapsible) ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showRoadmap ? 12 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Level roadmap
            </div>
            <button onClick={() => setShowRoadmap(o => !o)} style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {showRoadmap ? "Hide ↑" : "Show ↓"}
            </button>
          </div>
          {showRoadmap && <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {LEVELS.map((lvl, i) => {
              const isActive = (state as unknown as { level?: number }).level === lvl.level
                || levelInfo.level === lvl.level;
              const isPassed = levelInfo.level > lvl.level;
              return (
                <div key={lvl.level} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    padding: "8px 12px", borderRadius: 8,
                    background: isActive ? "var(--accdim)" : "transparent",
                    border: isActive ? "1px solid var(--accborder)" : "1px solid transparent",
                  }}>
                    <i className={`ti ${lvl.icon}`} style={{ fontSize: 18, color: isPassed || isActive ? lvl.color : "var(--text3)", opacity: isPassed || isActive ? 1 : 0.4 }} />
                    <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? lvl.color : isPassed ? "var(--text2)" : "var(--text3)", textAlign: "center", maxWidth: 60 }}>
                      {lvl.title}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text3)" }}>
                      {lvl.minXP === 0 ? "0" : lvl.minXP.toLocaleString()} XP
                    </div>
                  </div>
                  {i < LEVELS.length - 1 && (
                    <div style={{ width: 16, height: 2, background: isPassed ? "var(--accent)" : "var(--border)", flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>}
        </div>

        {/* ── POST-HIRE CONTINUITY (GAP 3) ── */}
        <PostHirePanel />

        {/* ── Weekly goals (if any) ── */}
        {state.weeklyGoals?.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Weekly goals · {state.weeklyGoals.filter(g => g.done).length}/{state.weeklyGoals.length} done
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {state.weeklyGoals.map(goal => (
                <div key={goal.id} style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: goal.done ? "rgba(34,197,94,.06)" : "var(--surface2)",
                  border: `1px solid ${goal.done ? "rgba(34,197,94,.2)" : "var(--border)"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: goal.done ? "var(--success)" : "var(--text1)" }}>
                      {goal.done ? "" : ""}{goal.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      {goal.progress}/{goal.target} {goal.unit}
                    </div>
                  </div>
                  <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${Math.min(100, (goal.progress / goal.target) * 100)}%`,
                      background: goal.done ? "var(--success)" : "var(--accent)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
