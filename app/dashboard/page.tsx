"use client";
/**
 * /dashboard — Career Command Center (AppShell redesign)
 */
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import {
  getXPState, getLevelInfo, getDerivedStats, BADGES, LEVELS,
  type XPState, type ActivityEntry,
} from "@/lib/activityTracker";

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
  resume_built: "✏️", resume_updated: "✏️", resume_scored: "🎯",
  cover_letter_generated: "✉️", interview_practiced: "🎤",
  job_saved: "🔖", job_applied: "💼", skill_proof_added: "⚡",
  career_health_checked: "🏥", salary_checked: "💰",
  bgv_submitted: "🛡", career_gps_used: "🧭",
  profile_completed: "👤", daily_login: "☀️",
};

/* ── Today's focus tasks ─────────────────────────────────────── */
function buildFocusTasks(state: XPState) {
  const recent = new Set(state.log.slice(0, 10).map(l => l.type));
  return [
    { label: "Score your resume",         href: "/score",     xp: 30, done: recent.has("resume_scored"),       icon: "🎯" },
    { label: "Tailor for a job listing",  href: "/tailor",    xp: 50, done: recent.has("resume_updated"),      icon: "✂️" },
    { label: "Practice an interview",     href: "/interview", xp: 45, done: recent.has("interview_practiced"), icon: "🎤" },
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
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)" }}>{label}</span>
      <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 600 }}>{xp}</span>
    </Link>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<XPState | null>(null);
  const [derived, setDerived] = useState({
    applicationsTotal: 0, applicationsActive: 0, offersCount: 0,
    interviewsTotal: 0, skillProofsCount: 0, resumeScore: null as number | null,
  });

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
      <div style={{ padding: "24px 24px 48px" }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 3 }}>
            {greet()}, {firstName} 👋
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>
            {levelInfo.icon} Level {levelInfo.level} · {levelInfo.title}
            {streak > 0 && ` · 🔥 ${streak} day streak`}
          </p>
        </div>

        {/* ── Level progress bar ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)" }}>
              {state.totalXP.toLocaleString()} XP total
            </span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>
              {levelInfo.level < 7
                ? `${levelInfo.xpToNext.toLocaleString()} XP to Level ${levelInfo.level + 1} · ${LEVELS[levelInfo.level]?.title ?? ""}`
                : "Max level reached 🏆"}
            </span>
          </div>
          <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${levelInfo.progressPct}%`,
              background: levelInfo.color,
              transition: "width 1s ease",
            }} />
          </div>
        </div>

        {/* ── 4 stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
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

        {/* ── 2-col: focus tasks + recent activity ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>

          {/* Today's focus */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Today&apos;s focus
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
                    {t.done && <span style={{ fontSize: 10, color: "#fff" }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, flex: 1, color: t.done ? "var(--text3)" : "var(--text1)", textDecoration: t.done ? "line-through" : "none" }}>
                    {t.icon} {t.label}
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
                      {ACTION_ICONS[entry.type] ?? "•"} {ACTION_LABELS[entry.type] ?? entry.type}
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>

          {/* Score trend */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ATS Score trend
              </div>
              <Link href="/score" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
                Score now →
              </Link>
            </div>
            <ScoreChart data={state.scoreHistory ?? []} />
          </div>

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
                    fontSize: 16, opacity: earned ? 1 : 0.3,
                  }}>
                    {b.icon}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
            Quick actions
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
            <QuickAction href="/builder"       icon="✏️" label="Update Resume"       xp="+20 XP" />
            <QuickAction href="/score"         icon="🎯" label="Score Resume"         xp="+30 XP" />
            <QuickAction href="/interview"     icon="🎤" label="Practice Interview"   xp="+45 XP" />
            <QuickAction href="/jobs"          icon="💼" label="Apply to Jobs"         xp="+25 XP" />
            <QuickAction href="/career-gps"    icon="🧭" label="Career GPS"            xp="+15 XP" />
            <QuickAction href="/career-health" icon="🏥" label="Health Checkup"        xp="+40 XP" />
            <QuickAction href="/salary"        icon="💰" label="Salary Intel"          xp="+10 XP" />
            <QuickAction href="/profile"       icon="⚡" label="Add Skill Proof"       xp="+35 XP" />
          </div>
        </div>

        {/* ── Level roadmap ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
            Level roadmap
          </div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
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
                    <span style={{ fontSize: 18, filter: isPassed || isActive ? "none" : "grayscale(1) opacity(0.4)" }}>
                      {lvl.icon}
                    </span>
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
          </div>
        </div>

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
                      {goal.done ? "✅ " : ""}{goal.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      {goal.progress}/{goal.target} {goal.unit}
                    </div>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
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
