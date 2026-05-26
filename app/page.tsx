"use client";
/**
 * Root page — /
 * Guests  → Marketing landing page
 * Signed in → Personal dashboard
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { computeScore } from "@/lib/scoreEngine";
import { resumeToText } from "@/lib/jdMatcher";
import JOBS from "@/lib/jobPool";
import type { ResumeData } from "@/lib/types";

/* ══════════════════════════════════════════════════════
   SHARED NAV
══════════════════════════════════════════════════════ */
function Nav({ user, signIn }: { user: any; signIn: () => void }) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(15,17,23,.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      height: 58, display: "flex", alignItems: "center",
      padding: "0 32px", gap: 16,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="jobSayer" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
        <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text1)", letterSpacing: "-.3px" }}>
          job<span style={{ color: "var(--accent)" }}>sayer</span>
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      {/* Nav links */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {user ? (
          <>
            <NavLink href="/builder">Builder</NavLink>
            <NavLink href="/score">My Score</NavLink>
            <NavLink href="/jobs">Jobs</NavLink>
            <Link href="/builder" style={{
              marginLeft: 8, padding: "7px 18px", background: "var(--accent)",
              borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700,
              textDecoration: "none",
            }}>Open Builder →</Link>
          </>
        ) : (
          <>
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how">How it works</NavLink>
            <button onClick={signIn} style={{
              padding: "6px 14px", background: "none", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text2)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>Sign in</button>
            <Link href="/builder" style={{
              padding: "7px 18px", background: "var(--accent)",
              borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700,
              textDecoration: "none",
            }}>Try free →</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{
      padding: "6px 12px", color: "var(--text2)", fontSize: 13, fontWeight: 500,
      textDecoration: "none", borderRadius: 7, transition: "color .15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text1)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text2)")}
    >{children}</a>
  );
}

/* ══════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════ */
function LandingPage({ signIn }: { signIn: () => void }) {
  return (
    <div style={{ background: "var(--bg)", color: "var(--text1)", overflowX: "hidden" }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "120px 24px 80px", position: "relative",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,140,248,.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 14px", borderRadius: 20, marginBottom: 28,
          background: "rgba(129,140,248,.1)", border: "1px solid var(--accborder)",
          fontSize: 12, fontWeight: 600, color: "var(--accent)",
        }}>
          ✦ AI-Powered Jobs. Smarter Future.
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(38px, 6vw, 72px)", fontWeight: 900,
          lineHeight: 1.08, letterSpacing: "-2px", marginBottom: 22, maxWidth: 800,
        }}>
          Land your dream job<br />
          <span style={{
            background: "linear-gradient(135deg, var(--accent), #6366f1, #818cf8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>faster with AI</span>
        </h1>

        <p style={{
          fontSize: "clamp(15px, 2vw, 19px)", color: "var(--text2)",
          maxWidth: 560, lineHeight: 1.65, marginBottom: 40,
        }}>
          Build ATS-ready resumes, get your jobSayer Score, match to verified Indian jobs,
          and prep for interviews — all in one place.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/builder" style={{
            padding: "14px 32px", background: "linear-gradient(135deg, var(--accent), #6366f1)",
            borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700,
            textDecoration: "none", boxShadow: "0 8px 32px rgba(129,140,248,.3)",
          }}>Build your resume free →</Link>
          <button onClick={signIn} style={{
            padding: "14px 28px", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: 12,
            color: "var(--text1)", fontSize: 15, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign in with Google</button>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: "var(--text3)" }}>
          Free forever · No credit card · 2 min setup
        </p>

        {/* App preview mockup */}
        <div style={{
          marginTop: 64, width: "100%", maxWidth: 860,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,.5)",
        }}>
          {/* Fake browser bar */}
          <div style={{
            background: "var(--surface2)", padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid var(--border)",
          }}>
            {["#f87171","#fbbf24","#4ade80"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
            <div style={{
              marginLeft: 8, flex: 1, maxWidth: 240, height: 20, borderRadius: 5,
              background: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", padding: "0 10px",
              fontSize: 10, color: "var(--text3)",
            }}>jobsayer.com/builder</div>
          </div>
          {/* Score preview */}
          <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { icon: "🎯", label: "jobSayer Score", val: "84", sub: "Top 15%", color: "#818cf8" },
              { icon: "💼", label: "Jobs Matched", val: "34", sub: "8 at 90%+", color: "#4ade80" },
              { icon: "🧠", label: "Interview Ready", val: "5", sub: "topics prepped", color: "#fbbf24" },
            ].map(card => (
              <div key={card.label} style={{
                background: "var(--surface2)", borderRadius: 12, padding: "16px",
                border: "1px solid var(--border)", textAlign: "center",
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.val}</div>
                <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 500, marginTop: 2 }}>{card.label}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────── */}
      <section style={{
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: "28px 24px",
        display: "flex", justifyContent: "center", gap: "clamp(32px,6vw,80px)",
        flexWrap: "wrap", background: "var(--surface)",
      }}>
        {[
          { val: "12,400+", label: "Resumes built" },
          { val: "34",      label: "Verified companies" },
          { val: "91%",     label: "ATS pass rate" },
          { val: "4.8 ★",   label: "Candidate rating" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text1)" }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" style={{ padding: "96px 24px", maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>How it works</SectionLabel>
        <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, textAlign: "center", marginBottom: 56, letterSpacing: "-1px" }}>
          From resume to offer in 4 steps
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2 }}>
          {[
            { step: "01", icon: "📄", title: "Build your resume", desc: "AI-assisted builder with ATS-ready templates. Fill once, export anywhere." },
            { step: "02", icon: "🎯", title: "Get your Score", desc: "See exactly why you'd pass or fail ATS — and what to fix to push above 85." },
            { step: "03", icon: "💼", title: "Match to jobs", desc: "Jobs ranked by how well your resume fits — not by who paid for placement." },
            { step: "04", icon: "🧠", title: "Prep the interview", desc: "AI mock interviews tuned to the actual company — Razorpay, Flipkart, and more." },
          ].map((item, i) => (
            <div key={item.step} style={{
              padding: "28px 22px", position: "relative",
              borderRight: i < 3 ? "1px dashed var(--border)" : "none",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: ".08em", marginBottom: 12, opacity: .7 }}>STEP {item.step}</div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)", marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" style={{ padding: "0 24px 96px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Features</SectionLabel>
        <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, textAlign: "center", marginBottom: 48, letterSpacing: "-1px" }}>
          Built different, not just built
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {[
            {
              icon: "🛡",
              title: "JD Trust Score",
              tag: "Unique",
              tagColor: "#818cf8",
              desc: "Every job listing is rated for authenticity. Ghost jobs and fake JDs are flagged before you waste time applying.",
            },
            {
              icon: "🎯",
              title: "jobSayer Score",
              tag: "Core",
              tagColor: "#4ade80",
              desc: "4-dimension resume analysis: ATS compatibility, keyword strength, experience clarity, and impact statements.",
            },
            {
              icon: "💼",
              title: "Resume-first job matching",
              tag: "Core",
              tagColor: "#4ade80",
              desc: "Jobs are ranked by how well your actual resume matches — not by ad spend or who's a premium recruiter.",
            },
            {
              icon: "🧠",
              title: "India-tuned interview prep",
              tag: "Coming soon",
              tagColor: "#fbbf24",
              desc: "AI mock interviews modelled on Razorpay, Flipkart, Swiggy, and Infosys formats. Not US-centric.",
            },
            {
              icon: "📊",
              title: "Career GPS",
              tag: "Coming soon",
              tagColor: "#fbbf24",
              desc: "Set a target role. Get a personalised learning roadmap showing exactly what skills to add to get there.",
            },
            {
              icon: "⚡",
              title: "Honest JD Scanner",
              tag: "Coming soon",
              tagColor: "#fbbf24",
              desc: "AI that reads every JD and flags unrealistic requirements — \"5 years in a 2-year-old framework\" caught instantly.",
            },
          ].map(f => (
            <div key={f.title} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "22px",
              transition: "border-color .2s, transform .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accborder)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 26 }}>{f.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                  background: `${f.tagColor}18`, color: f.tagColor,
                  border: `1px solid ${f.tagColor}30`,
                }}>{f.tag}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────── */}
      <section style={{
        margin: "0 24px 96px", maxWidth: 860, marginLeft: "auto", marginRight: "auto",
        background: "linear-gradient(135deg, rgba(129,140,248,.15), rgba(99,102,241,.08))",
        border: "1px solid var(--accborder)", borderRadius: 24,
        padding: "56px 40px", textAlign: "center",
      }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
        <h2 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, marginBottom: 14, letterSpacing: "-1px" }}>
          Your next job is 4 steps away
        </h2>
        <p style={{ fontSize: 15, color: "var(--text2)", marginBottom: 32, maxWidth: 440, margin: "0 auto 32px" }}>
          Build a resume, see your score, match to jobs. No account needed to start.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/builder" style={{
            padding: "13px 30px", background: "var(--accent)", borderRadius: 10,
            color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>Start building free →</Link>
          <button onClick={signIn} style={{
            padding: "13px 24px", background: "none", border: "1px solid var(--border)",
            borderRadius: 10, color: "var(--text2)", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign in with Google</button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: "24px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="jobSayer" style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>job<span style={{ color: "var(--accent)" }}>sayer</span></span>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>— AI-Powered Jobs. Smarter Future.</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)" }}>© 2026 jobSayer. All rights reserved.</div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DASHBOARD (signed-in)
══════════════════════════════════════════════════════ */
function Dashboard({ user, signOut }: { user: any; signOut?: () => void }) {
  const [score, setScore]         = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [resumeName, setResumeName] = useState("Your resume");
  const [hasResume, setHasResume] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const data: ResumeData = parsed.data ?? parsed;
      if (data.name) { setResumeName(`${data.name}'s resume`); setHasResume(true); }
      const result = computeScore(data);
      setScore(result.total);
      // count matched jobs (score > 30)
      const resumeText = resumeToText(data);
      const matched = JOBS.filter(j => {
        const s = resumeText ? j.skills.filter(sk => resumeText.toLowerCase().includes(sk)).length : 0;
        return s / Math.max(j.skills.length, 1) > 0.3;
      });
      setMatchCount(matched.length);
      if (parsed.ts) {
        const d = new Date(parsed.ts);
        setLastSaved(d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }));
      }
    } catch { /* ignore */ }
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const scoreColor = score === null ? "var(--text3)" : score >= 75 ? "#4ade80" : score >= 55 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ background: "var(--bg)", color: "var(--text1)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "88px 24px 60px" }}>

        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>{greeting}, {firstName} 👋</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px" }}>Your jobSayer Dashboard</h1>
          {lastSaved && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Resume last updated {lastSaved}</div>}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            {
              icon: "🎯", label: "jobSayer Score",
              val: score !== null ? `${score}` : "—",
              sub: score !== null ? (score >= 75 ? "Strong profile" : score >= 55 ? "Room to improve" : "Needs work") : "Build your resume",
              color: scoreColor, href: "/score",
            },
            {
              icon: "💼", label: "Matched Jobs",
              val: matchCount > 0 ? `${matchCount}` : "—",
              sub: matchCount > 0 ? `based on your skills` : "Add skills to match",
              color: "#4ade80", href: "/jobs",
            },
            {
              icon: "📄", label: "Resume",
              val: hasResume ? "Ready" : "Empty",
              sub: hasResume ? resumeName : "Start building",
              color: hasResume ? "#4ade80" : "var(--text3)", href: "/builder",
            },
            {
              icon: "🧠", label: "Interview Prep",
              val: "Soon",
              sub: "Coming in Phase 2",
              color: "#fbbf24", href: "/builder",
            },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 14, padding: "20px", cursor: "pointer",
                transition: "border-color .15s, transform .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accborder)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Quick actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {[
              { icon: "✏️", label: "Edit Resume",         sub: "Resume Builder",         href: "/builder", primary: true  },
              { icon: "📊", label: "View Full Score",      sub: "4-dimension breakdown",  href: "/score",   primary: false },
              { icon: "🔍", label: "Browse Matched Jobs",  sub: `${matchCount || "All"} jobs waiting`,    href: "/jobs",    primary: false },
              { icon: "📤", label: "Share Resume Link",    sub: "Public shareable URL",   href: "/builder", primary: false },
            ].map(a => (
              <Link key={a.label} href={a.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 12,
                  background: a.primary ? "var(--accdim)" : "var(--surface)",
                  border: `1px solid ${a.primary ? "var(--accborder)" : "var(--border)"}`,
                  cursor: "pointer", transition: "opacity .15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: a.primary ? "var(--accent)" : "var(--text1)" }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{a.sub}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Score progress card */}
        {score !== null && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "22px", marginBottom: 28,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Resume Score Snapshot</div>
              <Link href="/score" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Full breakdown →</Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
                  {score >= 75 ? "Strong profile" : score >= 55 ? "Good — room to improve" : "Needs attention"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>out of 100 · top {score >= 75 ? "15" : score >= 55 ? "35" : "60"}% of profiles</div>
              </div>
            </div>
            <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${score}%`, borderRadius: 4,
                background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`,
                transition: "width 1s ease",
              }} />
            </div>
            {score < 85 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)" }}>
                💡 Fix a few things to reach <strong style={{ color: "var(--accent)" }}>85+</strong> —
                <Link href="/score" style={{ color: "var(--accent)", textDecoration: "none", marginLeft: 4 }}>see what to improve →</Link>
              </div>
            )}
          </div>
        )}

        {/* No resume nudge */}
        {!hasResume && (
          <div style={{
            background: "linear-gradient(135deg, rgba(129,140,248,.08), rgba(99,102,241,.04))",
            border: "1px solid var(--accborder)", borderRadius: 16, padding: "32px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Start with your resume</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
              Build once, get your Score, match to jobs — all in under 10 minutes.
            </div>
            <Link href="/builder" style={{
              padding: "11px 26px", background: "var(--accent)", borderRadius: 10,
              color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>Open Resume Builder →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared helpers ──────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 12 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em",
        color: "var(--accent)", background: "var(--accdim)", padding: "4px 12px",
        borderRadius: 20, border: "1px solid var(--accborder)",
      }}>{children}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════ */
export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();

  return (
    <>
      <Nav user={user} signIn={signInWithGoogle} />
      {user
        ? <Dashboard user={user} />
        : <LandingPage signIn={signInWithGoogle} />
      }
    </>
  );
}
