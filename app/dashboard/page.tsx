"use client";
/**
 * /dashboard — Career Command Center
 * XP level, weekly goals, stats, score history, badges, activity feed.
 */
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import {
  getXPState, getLevelInfo, getDerivedStats, BADGES, LEVELS,
  type XPState, type ActivityEntry,
} from "@/lib/activityTracker";

/* ── Tiny SVG line chart ─────────────────────────────────────── */
function ScoreChart({ data }: { data: { score: number; ts: string }[] }) {
  const W = 280, H = 80;
  if (data.length < 2) {
    return (
      <div style={{ width: W, height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>Score history appears after 2+ checks</span>
      </div>
    );
  }
  const scores = data.map(d => d.score);
  const minS = Math.min(...scores) - 5;
  const maxS = Math.max(...scores) + 5;
  const toX = (i: number) => (i / (data.length - 1)) * (W - 20) + 10;
  const toY = (s: number) => H - 8 - ((s - minS) / (maxS - minS)) * (H - 16);
  const points = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(" ");
  const areaPoints = `10,${H - 8} ${points} ${toX(data.length - 1)},${H - 8}`;
  const last = data[data.length - 1];

  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sg)" />
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.score)} r={i === data.length - 1 ? 4 : 2.5}
          fill={i === data.length - 1 ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" strokeWidth="1.5" />
      ))}
      <text x={toX(data.length - 1)} y={toY(last.score) - 8} textAnchor="middle"
        fontSize="11" fontWeight="700" fill="var(--accent)">{last.score}</text>
    </svg>
  );
}

/* ── XP progress ring ────────────────────────────────────────── */
function XPRing({ pct, color, size = 110 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

/* ── Stat card ───────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = "var(--text1)", href }: {
  icon: string; label: string; value: string | number;
  sub?: string; color?: string; href?: string;
}) {
  const inner = (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4,
      transition: "border-color .15s",
    }}
      onMouseEnter={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)")}
      onMouseLeave={e => href && ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")}
    >
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: "-.03em" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text3)" }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

/* ── Page ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [state,   setState]   = useState<XPState | null>(null);
  const [derived, setDerived] = useState({
    applicationsTotal: 0, applicationsActive: 0, offersCount: 0,
    interviewsTotal: 0, skillProofsCount: 0, resumeScore: null as number | null,
  });
  const [tab, setTab] = useState<"activity"|"goals"|"badges">("activity");

  useEffect(() => {
    setState(getXPState());
    setDerived(getDerivedStats());
  }, []);

  const levelInfo = useMemo(() => state ? getLevelInfo(state.totalXP) : null, [state]);

  if (!state || !levelInfo) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <AppNav />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text3)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 };
  const earnedBadges = BADGES.filter(b => state.badges.includes(b.id));
  const lockedBadges = BADGES.filter(b => !state.badges.includes(b.id));

  const recentLog: ActivityEntry[] = state.log.slice(0, 20);

  function relativeTime(ts: string): string {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60)     return "just now";
    if (diff < 3600)   return `${Math.round(diff/60)}m ago`;
    if (diff < 86400)  return `${Math.round(diff/3600)}h ago`;
    return `${Math.round(diff/86400)}d ago`;
  }

  const goalsCompleted = state.weeklyGoals.filter(g => g.done).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav />
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, letterSpacing: "-.02em" }}>
              Career Command Center
            </h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              Your career progress at a glance — everything you've built, scored, and practiced.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/career-health" style={{ padding: "8px 16px", borderRadius: 9, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              🏥 Health check
            </Link>
            <Link href="/jobs" style={{ padding: "8px 16px", borderRadius: 9, background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Find jobs →
            </Link>
          </div>
        </div>

        {/* ── Level hero ── */}
        <div style={{
          ...card,
          marginBottom: 20,
          padding: "24px 28px",
          background: "linear-gradient(135deg, rgba(99,102,241,.09) 0%, rgba(99,102,241,.03) 100%)",
          borderColor: "var(--accborder)",
          display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap",
        }}>
          {/* Ring */}
          <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
            <XPRing pct={levelInfo.progressPct} color={levelInfo.color} size={110} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 28 }}>{levelInfo.icon}</span>
            </div>
          </div>

          {/* Level info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: levelInfo.color }}>Level {levelInfo.level}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>{levelInfo.title}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 10 }}>
              {state.totalXP.toLocaleString()} XP total
              {levelInfo.level < 7 && ` · ${levelInfo.xpToNext} XP to next level`}
            </div>
            {/* XP bar */}
            <div style={{ height: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden", maxWidth: 360 }}>
              <div style={{
                height: "100%", borderRadius: 4,
                width: `${levelInfo.progressPct}%`,
                background: levelInfo.color,
                transition: "width 1s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginTop: 4, maxWidth: 360 }}>
              <span>{levelInfo.title}</span>
              {levelInfo.level < 7 && <span>{LEVELS[levelInfo.level].title}</span>}
            </div>
          </div>

          {/* Week XP + streak */}
          <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: "center", padding: "14px 18px", background: "rgba(255,255,255,.04)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--accent)" }}>+{state.weekXP}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>XP this week</div>
            </div>
            <div style={{ textAlign: "center", padding: "14px 18px", background: "rgba(255,255,255,.04)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: state.streakDays > 0 ? "var(--warn)" : "var(--text3)" }}>
                {state.streakDays > 0 ? "🔥" : "💤"} {state.streakDays}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>day streak</div>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px,1fr))", gap: 12, marginBottom: 20 }}>
          <StatCard icon="📤" label="Jobs Applied"     value={derived.applicationsTotal}
            sub={`${derived.applicationsActive} active`}          color="var(--accent)"  href="/applications" />
          <StatCard icon="🎤" label="Interviews Practiced" value={state.log.filter(a => a.type==="interview_practiced").length}
            sub="sessions total"                                   color="var(--text1)"   href="/interview" />
          <StatCard icon="🎯" label="Resume Score"     value={derived.resumeScore ?? "—"}
            sub={derived.resumeScore ? `out of 100` : "Not scored yet"} color={derived.resumeScore ? (derived.resumeScore>=75?"var(--success)":derived.resumeScore>=50?"var(--warn)":"var(--danger)") : "var(--text3)"} href="/score" />
          <StatCard icon="🎉" label="Offers Received"  value={derived.offersCount}
            sub="this job search"                                  color={derived.offersCount>0?"var(--success)":"var(--text1)"} href="/applications" />
          <StatCard icon="⚡" label="Skill Proofs"     value={derived.skillProofsCount}
            sub="verified"                                         color="var(--text1)"   href="/profile" />
          <StatCard icon="🏅" label="Badges Earned"    value={earnedBadges.length}
            sub={`of ${BADGES.length} total`}                      color="var(--warn)" />
        </div>

        {/* ── Score history + bottom panels ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginBottom: 20 }}>

          {/* Score trend */}
          <div style={{ ...card, padding: "20px 22px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📈 Resume Score Trend</div>
            <ScoreChart data={state.scoreHistory} />
            {state.scoreHistory.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
                Last {state.scoreHistory.length} score{state.scoreHistory.length > 1 ? "s" : ""} · Updated every time you score
              </div>
            )}
            <Link href="/score" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, padding: "7px 14px", borderRadius: 8, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
              Score my resume →
            </Link>
          </div>

          {/* Tabbed panel: activity / goals / badges */}
          <div style={{ ...card, display: "flex", flexDirection: "column" }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
              {([
                ["activity", "⚡ Activity"],
                ["goals",    `🎯 Goals ${goalsCompleted}/${state.weeklyGoals.length}`],
                ["badges",   `🏅 Badges ${earnedBadges.length}`],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  padding: "12px 14px", background: "none", border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  color: tab === key ? "var(--text1)" : "var(--text3)",
                  borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1,
                }}>{label}</button>
              ))}
            </div>

            <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto", maxHeight: 310 }}>
              {/* ── Activity feed ── */}
              {tab === "activity" && (
                recentLog.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)", fontSize: 13 }}>
                    No activity yet — start using jobSayer to earn XP!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {recentLog.map((entry, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < recentLog.length - 1 ? "1px solid var(--border2)" : "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accdim)", border: "1px solid var(--accborder)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                          +
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{relativeTime(entry.ts)}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", flexShrink: 0 }}>+{entry.xp} XP</div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── Weekly goals ── */}
              {tab === "goals" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
                    Resets every Monday. Complete goals for bonus XP.
                  </div>
                  {state.weeklyGoals.map(goal => (
                    <div key={goal.id} style={{ padding: "12px 14px", borderRadius: 10, background: goal.done ? "rgba(34,197,94,.06)" : "var(--surface2)", border: `1px solid ${goal.done ? "rgba(34,197,94,.2)" : "var(--border)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: goal.done ? "var(--success)" : "var(--text1)" }}>
                          {goal.done ? "✅ " : ""}{goal.label}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>
                          {goal.progress}/{goal.target} {goal.unit}
                        </div>
                      </div>
                      <div style={{ height: 5, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          width: `${Math.min(100, (goal.progress/goal.target)*100)}%`,
                          background: goal.done ? "var(--success)" : "var(--accent)",
                          transition: "width .5s ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Badges ── */}
              {tab === "badges" && (
                <div>
                  {earnedBadges.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Earned</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                        {earnedBadges.map(badge => (
                          <div key={badge.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(99,102,241,.08)", border: "1px solid var(--accborder)", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{badge.icon}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>{badge.label}</div>
                              <div style={{ fontSize: 10, color: "var(--text3)" }}>{badge.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {lockedBadges.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Locked</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {lockedBadges.map(badge => (
                          <div key={badge.id} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, opacity: 0.6 }}>
                            <span style={{ fontSize: 20, filter: "grayscale(1)" }}>{badge.icon}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{badge.label}</div>
                              <div style={{ fontSize: 10, color: "var(--text3)" }}>{badge.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div style={{ ...card, padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>⚡ Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10 }}>
            {[
              { href: "/builder",        icon: "✏️", label: "Update Resume",        xp: "+20 XP" },
              { href: "/interview",      icon: "🎤", label: "Practice Interview",   xp: "+45 XP" },
              { href: "/score",          icon: "🎯", label: "Score Resume",          xp: "+30 XP" },
              { href: "/jobs",           icon: "💼", label: "Apply to Jobs",         xp: "+25 XP each" },
              { href: "/career-gps",     icon: "🧭", label: "Career GPS",            xp: "+15 XP" },
              { href: "/career-health",  icon: "🏥", label: "Health Checkup",        xp: "+40 XP" },
              { href: "/salary",         icon: "💰", label: "Salary Intelligence",   xp: "+10 XP" },
              { href: "/profile",        icon: "⚡", label: "Add Skill Proof",       xp: "+35 XP" },
            ].map(action => (
              <Link key={action.href} href={action.href} style={{
                display: "flex", flexDirection: "column", gap: 6,
                padding: "12px 14px", borderRadius: 10,
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
                <span style={{ fontSize: 20 }}>{action.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{action.label}</span>
                <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>{action.xp}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Level roadmap ── */}
        <div style={{ ...card, padding: "20px 24px", marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🗺 Level Roadmap</div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {LEVELS.map((lvl, i) => {
              const isActive  = state.level === lvl.level;
              const isPassed  = state.level > lvl.level;
              return (
                <div key={lvl.level} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 14px", borderRadius: 10,
                    background: isActive ? "var(--accdim)" : "transparent",
                    border: isActive ? "1px solid var(--accborder)" : "1px solid transparent",
                  }}>
                    <span style={{ fontSize: 20, filter: isPassed || isActive ? "none" : "grayscale(1) opacity(0.4)" }}>
                      {lvl.icon}
                    </span>
                    <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 400, color: isActive ? lvl.color : isPassed ? "var(--text2)" : "var(--text3)", textAlign: "center", maxWidth: 72 }}>
                      {lvl.title}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>
                      {lvl.minXP === 0 ? "0" : lvl.minXP.toLocaleString()} XP
                    </div>
                  </div>
                  {i < LEVELS.length - 1 && (
                    <div style={{ width: 20, height: 2, background: isPassed ? "var(--accent)" : "var(--border)", flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
