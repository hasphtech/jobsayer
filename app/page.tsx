"use client";
/**
 * Root page — /
 * Guests     → Marketing landing page
 * Signed in  → Personal dashboard
 *
 * Fully mobile-responsive via useWindowWidth hook.
 */
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { computeScore } from "@/lib/scoreEngine";
import { resumeToText } from "@/lib/jdMatcher";
import JOBS from "@/lib/jobPool";
import type { ResumeData } from "@/lib/types";

/* ── Responsive hook ────────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}

/* ── Resume tips pool ───────────────────────────────────────── */
const TIPS = [
  { icon: "🎯", text: "Use the exact job title from the JD as your resume headline — ATS matches it directly." },
  { icon: "📊", text: "Add at least one number to every bullet point. \"Reduced load time by 40%\" beats \"Improved performance\"." },
  { icon: "🛡", text: "Check the JD Trust Score before applying — ghost jobs waste your time and personal data." },
  { icon: "⚡", text: "Keep your resume to 1 page if you have under 8 years of experience." },
  { icon: "🔑", text: "Skills section first for freshers, work experience first for experienced candidates." },
  { icon: "🤝", text: "Mention the company name in your cover letter — generic letters get ignored." },
];

/* ── Trending roles ─────────────────────────────────────────── */
const TRENDING = [
  { role: "SDE-2 (Full Stack)",    count: "820+", delta: "+12%" },
  { role: "Product Manager",       count: "540+", delta: "+8%"  },
  { role: "Data Engineer",         count: "460+", delta: "+22%" },
  { role: "DevOps / SRE",          count: "390+", delta: "+18%" },
  { role: "ML Engineer",           count: "310+", delta: "+31%" },
  { role: "Frontend (React/Next)", count: "280+", delta: "+9%"  },
];

/* ══════════════════════════════════════════════════════════════
   SHARED NAV
══════════════════════════════════════════════════════════════ */
function Nav({ user, signIn }: { user: any; signIn: () => void }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(15,17,23,.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        height: 56, display: "flex", alignItems: "center",
        padding: "0 20px", gap: 12,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="jobSayer" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text1)", letterSpacing: "-.3px" }}>
            job<span style={{ color: "var(--accent)" }}>sayer</span>
          </span>
        </Link>

        <div style={{ flex: 1 }} />

        {mobile ? (
          /* Hamburger */
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 9px", cursor: "pointer", color: "var(--text2)", fontFamily: "inherit" }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        ) : (
          /* Desktop links */
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {user ? (
              <>
                <NavLink href="/builder">Builder</NavLink>
                <NavLink href="/score">Score</NavLink>
                <NavLink href="/jobs">Jobs</NavLink>
                <NavLink href="/interview">Interview</NavLink>
                <NavLink href="/career-gps">Career GPS</NavLink>
                <NavLink href="/recruit">Recruiters</NavLink>
                <Link href="/builder" style={primaryBtn}>Open Builder →</Link>
              </>
            ) : (
              <>
                <NavLink href="#how">How it works</NavLink>
                <NavLink href="#features">Features</NavLink>
                <NavLink href="#pricing">Pricing</NavLink>
                <button onClick={signIn} style={ghostBtn}>Sign in</button>
                <Link href="/builder" style={primaryBtn}>Try free →</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Mobile drawer */}
      {mobile && menuOpen && (
        <div style={{
          position: "fixed", top: 56, left: 0, right: 0, zIndex: 99,
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10,
        }}>
          {user ? (
            <>
              <MobileNavLink href="/builder"    onClick={() => setMenuOpen(false)}>✏️ Resume Builder</MobileNavLink>
              <MobileNavLink href="/score"      onClick={() => setMenuOpen(false)}>🎯 My Score</MobileNavLink>
              <MobileNavLink href="/jobs"       onClick={() => setMenuOpen(false)}>💼 Matched Jobs</MobileNavLink>
              <MobileNavLink href="/interview"  onClick={() => setMenuOpen(false)}>🎤 Interview Prep</MobileNavLink>
              <MobileNavLink href="/career-gps" onClick={() => setMenuOpen(false)}>🧭 Career GPS</MobileNavLink>
              <MobileNavLink href="/recruit"    onClick={() => setMenuOpen(false)}>🏢 For Recruiters</MobileNavLink>
            </>
          ) : (
            <>
              <MobileNavLink href="#how"       onClick={() => setMenuOpen(false)}>How it works</MobileNavLink>
              <MobileNavLink href="#features"  onClick={() => setMenuOpen(false)}>Features</MobileNavLink>
              <MobileNavLink href="#pricing"   onClick={() => setMenuOpen(false)}>Pricing</MobileNavLink>
              <button onClick={() => { signIn(); setMenuOpen(false); }} style={{ ...ghostBtn, width: "100%", padding: "11px" }}>Sign in with Google</button>
            </>
          )}
          <Link href="/builder" onClick={() => setMenuOpen(false)} style={{ ...primaryBtn, textAlign: "center", padding: "11px" }}>
            {user ? "Open Builder →" : "Try free →"}
          </Link>
        </div>
      )}
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ padding: "6px 11px", color: "var(--text2)", fontSize: 13, fontWeight: 500, textDecoration: "none", borderRadius: 7 }}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text1)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text2)")}
    >{children}</a>
  );
}
function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} style={{ padding: "11px 14px", color: "var(--text1)", fontSize: 14, fontWeight: 500, textDecoration: "none", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
      {children}
    </Link>
  );
}

/* ── Shared button styles ───────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
  padding: "7px 18px", background: "var(--accent)", borderRadius: 8,
  color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
  border: "none", cursor: "pointer", fontFamily: "inherit", display: "inline-block",
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 14px", background: "none", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text2)", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════ */
function LandingPage({ signIn }: { signIn: () => void }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const tablet = w < 900;

  return (
    <div style={{ background: "var(--bg)", color: "var(--text1)", overflowX: "hidden" }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: mobile ? "100px 20px 60px" : "120px 24px 80px",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)",
          width: mobile ? 300 : 600, height: mobile ? 300 : 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,140,248,.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 20, marginBottom: 24,
          background: "rgba(129,140,248,.1)", border: "1px solid var(--accborder)",
          fontSize: 11, fontWeight: 600, color: "var(--accent)",
        }}>
          ✦ AI-Powered Jobs. Smarter Future.
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: mobile ? 36 : tablet ? 52 : 68,
          fontWeight: 900, lineHeight: 1.08, letterSpacing: "-2px",
          marginBottom: 20, maxWidth: 760,
        }}>
          Land your dream job{mobile ? " " : <br />}
          <span style={{
            background: "linear-gradient(135deg, #818cf8, #6366f1, #a78bfa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>faster with AI</span>
        </h1>

        <p style={{
          fontSize: mobile ? 15 : 18, color: "var(--text2)",
          maxWidth: 520, lineHeight: 1.7, marginBottom: 36,
          padding: mobile ? "0 4px" : "0",
        }}>
          Build ATS-ready resumes, get your jobSayer Score, match to verified Indian jobs,
          and prep for interviews — all in one place.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
          <Link href="/builder" style={{
            padding: mobile ? "13px 26px" : "14px 32px",
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            borderRadius: 12, color: "#fff",
            fontSize: mobile ? 14 : 15, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 8px 32px rgba(129,140,248,.3)",
            display: "block",
          }}>Build your resume free →</Link>
          <button onClick={signIn} style={{
            padding: mobile ? "13px 22px" : "14px 26px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, color: "var(--text1)",
            fontSize: mobile ? 14 : 15, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign in with Google</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text3)" }}>Free forever · No credit card · 2 min setup</p>

        {/* App preview — hidden on small mobile */}
        {!mobile && (
          <div style={{
            marginTop: 56, width: "100%", maxWidth: 820,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 20, overflow: "hidden",
            boxShadow: "0 32px 80px rgba(0,0,0,.5)",
          }}>
            <div style={{ background: "var(--surface2)", padding: "9px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid var(--border)" }}>
              {["#f87171","#fbbf24","#4ade80"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
              <div style={{ marginLeft: 8, fontSize: 10, color: "var(--text3)", background: "var(--surface)", borderRadius: 5, padding: "2px 10px", border: "1px solid var(--border)" }}>jobsayer.com/score</div>
            </div>
            <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { icon: "🎯", label: "jobSayer Score", val: "84",  sub: "Top 15%",          color: "#818cf8" },
                { icon: "💼", label: "Jobs Matched",   val: "34",  sub: "8 at 90%+ match",  color: "#4ade80" },
                { icon: "🛡", label: "JD Trust",       val: "8/10",sub: "verified listings", color: "#fbbf24" },
                { icon: "🧠", label: "Prep Topics",    val: "5",   sub: "ready to practice", color: "#a78bfa" },
              ].map(c => (
                <div key={c.label} style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 12px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.val}</div>
                  <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 2, fontWeight: 500 }}>{c.label}</div>
                  <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 1 }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Stats bar ────────────────────────────────────────── */}
      <section style={{
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: "24px 20px", background: "var(--surface)",
        display: "flex", justifyContent: "center",
        gap: mobile ? 24 : 64, flexWrap: "wrap",
      }}>
        {[
          { val: "12,400+", label: "Resumes built"       },
          { val: "34",      label: "Verified companies"  },
          { val: "91%",     label: "ATS pass rate"       },
          { val: "4.8 ★",   label: "Candidate rating"    },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: mobile ? 22 : 26, fontWeight: 800, color: "var(--text1)" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" style={{ padding: mobile ? "64px 20px" : "96px 24px", maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>How it works</SectionLabel>
        <h2 style={{ fontSize: mobile ? 26 : 38, fontWeight: 800, textAlign: "center", marginBottom: 48, letterSpacing: "-1px" }}>
          From resume to offer in 4 steps
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : tablet ? "1fr 1fr" : "repeat(4,1fr)",
          gap: mobile ? 12 : 2,
        }}>
          {[
            { step: "01", icon: "📄", title: "Build your resume",    desc: "AI-assisted builder with ATS-ready templates. Fill once, export anywhere." },
            { step: "02", icon: "🎯", title: "Get your Score",       desc: "4-dimension analysis: ATS, keywords, clarity, and impact — with fixes." },
            { step: "03", icon: "💼", title: "Match to jobs",        desc: "Jobs ranked by how well your resume actually fits. No pay-to-rank." },
            { step: "04", icon: "🧠", title: "Prep the interview",   desc: "AI mock interviews tuned to Razorpay, Flipkart, Swiggy formats." },
          ].map((item, i) => (
            <div key={item.step} style={{
              padding: mobile ? "20px 18px" : "28px 20px",
              borderRight: !mobile && !tablet && i < 3 ? "1px dashed var(--border)" : "none",
              background: mobile ? "var(--surface)" : "none",
              borderRadius: mobile ? 14 : 0,
              border: mobile ? "1px solid var(--border)" : undefined,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: ".06em", opacity: .7 }}>STEP {item.step}</span>
              </div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)", marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" style={{ padding: mobile ? "0 20px 64px" : "0 24px 96px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Features</SectionLabel>
        <h2 style={{ fontSize: mobile ? 26 : 38, fontWeight: 800, textAlign: "center", marginBottom: 40, letterSpacing: "-1px" }}>
          Built different, not just built
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : tablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 14 }}>
          {[
            { icon: "🛡", title: "JD Trust Score",            tag: "Unique",      tagC: "#818cf8", desc: "Every listing rated for authenticity. Ghost jobs and fake JDs are flagged before you waste time." },
            { icon: "🎯", title: "jobSayer Score",            tag: "Core",        tagC: "#4ade80", desc: "ATS compatibility, keyword strength, experience clarity, impact statements — one score, clear fixes." },
            { icon: "💼", title: "Resume-first job matching", tag: "Core",        tagC: "#4ade80", desc: "Jobs ranked by how your actual resume fits — not who paid for premium placement." },
            { icon: "🧠", title: "India-tuned interview prep",tag: "New",         tagC: "#4ade80", desc: "AI mock interviews modelled on Razorpay, Flipkart, Swiggy, Infosys — company-specific questions.", href: "/interview"  },
            { icon: "🗺", title: "Career GPS",                tag: "New",         tagC: "#4ade80", desc: "Set a target role. Get a personalised skill roadmap with curated learning resources.",          href: "/career-gps" },
            { icon: "⚡", title: "Honest JD Scanner",         tag: "New",         tagC: "#4ade80", desc: "AI flags ghost jobs, unrealistic requirements, salary red flags, and your JD match % instantly.", href: "/jobs"       },
          ].map(f => (
            <div key={f.title} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "20px",
              transition: "border-color .2s, transform .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accborder)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{f.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${f.tagC}18`, color: f.tagC, border: `1px solid ${f.tagC}30` }}>{f.tag}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trending roles ───────────────────────────────────── */}
      <section style={{ padding: mobile ? "0 20px 64px" : "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Market pulse</SectionLabel>
        <h2 style={{ fontSize: mobile ? 24 : 34, fontWeight: 800, textAlign: "center", marginBottom: 32, letterSpacing: "-1px" }}>
          Trending roles in Bangalore right now
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
          {TRENDING.map(r => (
            <div key={r.role} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", marginBottom: 2 }}>{r.role}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.count} openings</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,.1)", padding: "3px 8px", borderRadius: 8 }}>{r.delta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: mobile ? "0 20px 64px" : "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Pricing</SectionLabel>
        <h2 style={{ fontSize: mobile ? 26 : 38, fontWeight: 800, textAlign: "center", marginBottom: 8, letterSpacing: "-1px" }}>
          Simple, transparent pricing
        </h2>
        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 14, marginBottom: 40 }}>No hidden fees. Start free, upgrade when you need more.</p>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 16, alignItems: "start" }}>
          {[
            {
              name: "Free",
              price: "₹0",
              period: "forever",
              tagline: "Get started, no card needed",
              color: "var(--text2)",
              highlight: false,
              features: [
                "2 saved resumes",
                "4 basic templates",
                "PDF export",
                "Public share link",
                "2 resume uploads / mo",
                "jobSayer Score",
                "Matched jobs feed",
              ],
              missing: ["DOCX export","All 20+ templates","AI writing assistant","JSON export"],
              cta: "Start free", ctaHref: "/builder",
            },
            {
              name: "Starter",
              price: "₹199",
              period: "/ month",
              tagline: "For active job seekers",
              color: "#818cf8",
              highlight: true,
              features: [
                "5 saved resumes",
                "All 20+ templates",
                "PDF + DOCX export",
                "Public share link",
                "5 resume uploads / mo",
                "jobSayer Score",
                "Matched jobs feed",
              ],
              missing: ["JSON export","AI writing assistant"],
              cta: "Get Starter", ctaHref: "/upgrade",
            },
            {
              name: "Pro",
              price: "₹499",
              period: "/ month",
              tagline: "For serious career movers",
              color: "#a78bfa",
              highlight: false,
              features: [
                "10 saved resumes",
                "All 20+ templates",
                "PDF + DOCX + JSON export",
                "Public share link",
                "20 resume uploads / mo",
                "jobSayer Score",
                "Matched jobs feed",
                "AI writing assistant",
                "Priority support",
              ],
              missing: [],
              cta: "Get Pro", ctaHref: "/upgrade",
            },
          ].map(plan => (
            <div key={plan.name} style={{
              background: plan.highlight ? "linear-gradient(160deg, rgba(129,140,248,.1), rgba(99,102,241,.04))" : "var(--surface)",
              border: `1.5px solid ${plan.highlight ? "var(--accborder)" : "var(--border)"}`,
              borderRadius: 18, padding: "26px 22px",
              position: "relative", overflow: "hidden",
            }}>
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: 14, right: 14,
                  fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
                  background: "var(--accent)", color: "#fff",
                }}>Most popular</div>
              )}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: "var(--text1)", letterSpacing: "-1px" }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: "var(--text3)" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{plan.tagline}</div>
              </div>

              <Link href={plan.ctaHref} style={{
                display: "block", textAlign: "center", padding: "11px",
                background: plan.highlight ? "var(--accent)" : "var(--surface2)",
                border: `1px solid ${plan.highlight ? "transparent" : "var(--border)"}`,
                borderRadius: 10, color: plan.highlight ? "#fff" : "var(--text1)",
                fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 20,
              }}>{plan.cta} →</Link>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 10 }}>Includes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text2)" }}>
                    <span style={{ color: "#4ade80", flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text3)", opacity: .5 }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>—</span>{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text3)", marginTop: 20 }}>
          All plans include ATS scoring, matched jobs, and share links. Prices in INR incl. GST.
        </p>
      </section>

      {/* ── CTA banner ───────────────────────────────────────── */}
      <section style={{
        margin: mobile ? "0 20px 64px" : "0 24px 96px",
        maxWidth: 860, marginLeft: "auto", marginRight: "auto",
        background: "linear-gradient(135deg, rgba(129,140,248,.12), rgba(99,102,241,.06))",
        border: "1px solid var(--accborder)", borderRadius: 24,
        padding: mobile ? "40px 24px" : "56px 48px", textAlign: "center",
      }}>
        <div style={{ fontSize: 32, marginBottom: 14 }}>🚀</div>
        <h2 style={{ fontSize: mobile ? 22 : 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-1px" }}>
          Your next job is 4 steps away
        </h2>
        <p style={{ fontSize: mobile ? 14 : 15, color: "var(--text2)", marginBottom: 28, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
          No account needed to start. Build a resume, see your score, match to jobs.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/builder" style={{ padding: "12px 28px", background: "var(--accent)", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Start building free →
          </Link>
          <button onClick={signIn} style={{ padding: "12px 22px", background: "none", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text2)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Sign in with Google
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: mobile ? "20px" : "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="jobSayer" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>job<span style={{ color: "var(--accent)" }}>sayer</span></span>
          {!mobile && <span style={{ fontSize: 11, color: "var(--text3)" }}>— AI-Powered Jobs. Smarter Future.</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)" }}>© 2026 jobSayer. All rights reserved.</div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD (signed-in)
══════════════════════════════════════════════════════════════ */
function Dashboard({ user }: { user: any }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [score, setScore]         = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [resumeName, setResumeName] = useState("");
  const [hasResume, setHasResume]   = useState(false);
  const [lastSaved, setLastSaved]   = useState("");
  const [tipIdx]                    = useState(() => Math.floor(Math.random() * TIPS.length));
  const { signOut }                 = useAuth();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const data: ResumeData = parsed.data ?? parsed;
      if (data.name) { setResumeName(data.name); setHasResume(true); }
      const result = computeScore(data);
      setScore(result.total);
      const rt = resumeToText(data).toLowerCase();
      const matched = JOBS.filter(j => !j.ghost && j.skills.filter(s => rt.includes(s)).length / j.skills.length > 0.3);
      setMatchCount(matched.length);
      if (parsed.ts) {
        const d = new Date(parsed.ts);
        setLastSaved(d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }));
      }
    } catch { /* ignore */ }
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const scoreColor = score === null ? "var(--text3)" : score >= 75 ? "#4ade80" : score >= 55 ? "#fbbf24" : "#f87171";

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--text1)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: mobile ? "76px 16px 20px" : "80px 24px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={firstName} style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid var(--accborder)" }} />
              : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{firstName[0]?.toUpperCase()}</div>
            }
            <div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{greeting} 👋</div>
              <div style={{ fontSize: mobile ? 18 : 22, fontWeight: 800, letterSpacing: "-.5px" }}>Welcome back, {firstName}</div>
              {lastSaved && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Resume saved {lastSaved}</div>}
            </div>
          </div>
          {!mobile && (
            <button onClick={signOut} style={{ ...ghostBtn, fontSize: 12, padding: "6px 12px" }}>Sign out</button>
          )}
        </div>

        {/* ── Score + stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { icon: "🎯", label: "jobSayer Score", val: score !== null ? `${score}` : "—", sub: score !== null ? `Top ${score >= 75 ? 15 : score >= 55 ? 35 : 60}%` : "Build resume", color: scoreColor, href: "/score" },
            { icon: "💼", label: "Matched Jobs",   val: matchCount > 0 ? `${matchCount}` : "—", sub: matchCount > 0 ? "roles matched" : "Add skills", color: "#4ade80", href: "/jobs" },
            { icon: "📄", label: "Resume",         val: hasResume ? "Ready" : "Empty", sub: hasResume ? (resumeName || "Untitled") : "Start building", color: hasResume ? "#4ade80" : "var(--text3)", href: "/builder" },
            { icon: "🧠", label: "Interview Prep", val: "Live",     sub: "AI mock interviews", color: "#4ade80", href: "/interview" },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
              <div style={{ ...card, padding: "16px 14px", cursor: "pointer", transition: "border-color .15s, transform .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accborder)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>{s.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Main grid — score + actions ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 320px", gap: 14, marginBottom: 14 }}>

          {/* Score progress card */}
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Resume Score</div>
              <Link href="/score" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Full breakdown →</Link>
            </div>

            {score !== null ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  {/* Circular indicator */}
                  <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
                    <svg width="68" height="68" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="7" />
                      <circle cx="34" cy="34" r="28" fill="none" stroke={scoreColor} strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 28}
                        strokeDashoffset={2 * Math.PI * 28 * (1 - score / 100)}
                        style={{ transition: "stroke-dashoffset 1s ease" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 14, fontWeight: 800, color: scoreColor }}>{score}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)" }}>
                      {score >= 75 ? "Strong profile 💪" : score >= 55 ? "Good — keep improving" : "Needs attention"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
                      out of 100 · top {score >= 75 ? "15" : score >= 55 ? "35" : "60"}% of similar profiles
                    </div>
                  </div>
                </div>
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: `${score}%`, borderRadius: 3, background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`, transition: "width 1s ease" }} />
                </div>
                {score < 85 && (
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>
                    💡 Fix a few things to reach <strong style={{ color: "var(--accent)" }}>85+</strong> —{" "}
                    <Link href="/score" style={{ color: "var(--accent)", textDecoration: "none" }}>see what →</Link>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No resume yet</div>
                <Link href="/builder" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Start building →</Link>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Quick actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "✏️", label: "Edit Resume",        sub: "Builder",               href: "/builder",    accent: true  },
                { icon: "📊", label: "View Score",          sub: "4-dimension breakdown", href: "/score",      accent: false },
                { icon: "🔍", label: "Browse Jobs",         sub: `${matchCount || "—"} matched roles`, href: "/jobs", accent: false },
                { icon: "🎤", label: "Interview Prep",      sub: "AI mock interview",     href: "/interview",  accent: false },
                { icon: "🧭", label: "Career GPS",          sub: "Skill gap roadmap",     href: "/career-gps", accent: false },
                { icon: "🏢", label: "For Recruiters",      sub: "Post jobs, find talent",href: "/recruit",    accent: false },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 12px", borderRadius: 10,
                    background: a.accent ? "var(--accdim)" : "var(--surface2)",
                    border: `1px solid ${a.accent ? "var(--accborder)" : "var(--border)"}`,
                    cursor: "pointer", transition: "opacity .15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = ".8")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    <span style={{ fontSize: 17 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: a.accent ? "var(--accent)" : "var(--text1)" }}>{a.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>{a.sub}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>

          {/* Trending roles */}
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>🔥 Trending roles in Bangalore</div>
              <Link href="/jobs" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Browse →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TRENDING.slice(0, 5).map(r => (
                <div key={r.role} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text1)" }}>{r.role}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>{r.count} openings</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,.1)", padding: "2px 8px", borderRadius: 8 }}>{r.delta}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily tip + recruiter activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Daily tip */}
            <div style={{ ...card, padding: "18px", flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--accent)", marginBottom: 10 }}>💡 Resume tip of the day</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>{TIPS[tipIdx].icon}</div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{TIPS[tipIdx].text}</div>
            </div>

            {/* Recruiter activity */}
            <div style={{ ...card, padding: "18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 12 }}>📡 Platform activity</div>
              {[
                { icon: "👀", text: "14 recruiters viewed candidate profiles today" },
                { icon: "✅", text: "3 new verified companies joined this week"      },
                { icon: "📬", text: "Average recruiter response time: 2.4 days"     },
              ].map(a => (
                <div key={a.text} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{a.icon}</span>
                  <span style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{a.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile sign out */}
        {mobile && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button onClick={signOut} style={{ ...ghostBtn, fontSize: 13, padding: "10px 24px" }}>Sign out</button>
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

/* ══════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════ */
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
