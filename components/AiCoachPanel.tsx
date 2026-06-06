"use client";
/**
 * AiCoachPanel — right-side contextual AI suggestions panel
 * Reads XP/badge/score state from localStorage and surfaces
 * proactive career nudges + level progress.
 */
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getXPState, getLevelInfo, BADGES,
  type XPState,
} from "@/lib/activityTracker";

interface Suggestion {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}

function buildSuggestions(xp: XPState): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const scoreHistory: { score: number }[] =
    JSON.parse(typeof window !== "undefined"
      ? localStorage.getItem("jobsayer-score-history") ?? "[]"
      : "[]");

  const latestScore = scoreHistory.length
    ? scoreHistory[scoreHistory.length - 1].score
    : null;

  if (latestScore === null) {
    suggestions.push({
      icon: "ti-target",
      title: "Score your resume",
      body: "Check your ATS pass rate before applying anywhere.",
      href: "/score",
      cta: "Score now →",
    });
  } else if (latestScore < 75) {
    suggestions.push({
      icon: "ti-target",
      title: `ATS score: ${latestScore} — improve it`,
      body: "Most ATS filters reject scores below 75. Tailor your resume.",
      href: "/tailor",
      cta: "Tailor now →",
    });
  } else {
    suggestions.push({
      icon: "ti-check",
      title: `ATS score: ${latestScore} — strong`,
      body: "Good score. Tailor for specific JDs to push past 90.",
      href: "/tailor",
      cta: "Tailor for a JD →",
    });
  }

  if (xp.log.filter(a => a.type === "interview_practiced").length < 3) {
    suggestions.push({
      icon: "ti-microphone",
      title: "Practice interviews",
      body: "Candidates who practice 3+ times get 2× more offers.",
      href: "/interview",
      cta: "Start session →",
    });
  } else {
    suggestions.push({
      icon: "ti-coin",
      title: "Are you underpaid?",
      body: "Check global salary benchmarks for your role and market.",
      href: "/salary",
      cta: "Check salary →",
    });
  }

  if (!xp.log.find(a => a.type === "career_gps_used")) {
    suggestions.push({
      icon: "ti-compass",
      title: "Map your career path",
      body: "Career GPS shows the fastest route to your target role.",
      href: "/career-gps",
      cta: "Open GPS →",
    });
  } else {
    suggestions.push({
      icon: "ti-brand-linkedin",
      title: "Optimise LinkedIn",
      body: "Recruiters filter by headline keywords — update yours.",
      href: "/linkedin",
      cta: "Optimise →",
    });
  }

  return suggestions.slice(0, 3);
}

export default function AiCoachPanel() {
  const [xp, setXp] = useState<XPState | null>(null);

  useEffect(() => {
    setXp(getXPState());
  }, []);

  if (!xp) return null;

  const levelInfo = getLevelInfo(xp.totalXP);
  const earnedBadges = BADGES.filter(b => xp.badges.includes(b.id));
  const suggestions = buildSuggestions(xp);

  return (
    <aside style={{
      width: "var(--shell-ai-panel-w)",
      flexShrink: 0,
      borderLeft: "1px solid var(--border)",
      background: "var(--shell-ai-bg)",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      padding: "16px 14px",
    }}>
      {/* ── AI Coach header ── */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: "var(--shell-section-col)",
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <i className="ti ti-sparkles" style={{ fontSize: 12 }} />
        AI Coach
      </div>

      {/* ── Contextual suggestions ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "11px 12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 13, color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)", lineHeight: 1.3 }}>
                {s.title}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, margin: "0 0 8px" }}>
              {s.body}
            </p>
            <Link href={s.href} style={{
              fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 500,
            }}>
              {s.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "var(--border)", marginBottom: 14 }} />

      {/* ── Level progress ── */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: "var(--shell-section-col)",
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10,
      }}>
        Level progress
      </div>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "12px 12px", marginBottom: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>
            {levelInfo.icon} {levelInfo.title}
          </span>
          <span style={{
            fontSize: 11, color: "var(--accent)",
            background: "var(--accdim)", borderRadius: 20,
            padding: "2px 7px", fontWeight: 600,
          }}>
            Lv {levelInfo.level}
          </span>
        </div>
        {/* XP bar */}
        <div style={{
          background: "var(--border)", borderRadius: 4, height: 4, marginBottom: 5, overflow: "hidden",
        }}>
          <div style={{
            width: `${levelInfo.progressPct}%`, height: 4,
            borderRadius: 4, background: levelInfo.color,
            transition: "width .6s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>{xp.totalXP.toLocaleString()} XP</span>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>{levelInfo.xpToNext.toLocaleString()} to next</span>
        </div>
      </div>

      {/* ── Badges ── */}
      {earnedBadges.length > 0 && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--shell-section-col)",
            textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8,
          }}>
            Badges earned
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {earnedBadges.map(b => (
              <div key={b.id} title={b.label} style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--accdim)", border: "1px solid var(--accborder)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, cursor: "default",
              }}>
                {b.icon}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Streak ── */}
      {xp.streakDays > 0 && (
        <div style={{
          marginTop: 14, background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)" }}>
              {xp.streakDays} day streak
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)" }}>Keep it going!</div>
          </div>
        </div>
      )}
    </aside>
  );
}
