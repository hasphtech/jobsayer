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
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import { useCurrency, formatPrice } from "@/lib/useCurrency";
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
  { icon: "ti-target", text: "Use the exact job title from the JD as your resume headline — ATS matches it directly." },
  { icon: "ti-chart-bar", text: "Add at least one number to every bullet point. \"Reduced load time by 40%\" beats \"Improved performance\"." },
  { icon: "ti-shield-check", text: "Check the JD Trust Score before applying — ghost jobs waste your time and personal data." },
  { icon: "ti-bolt", text: "Keep your resume to 1 page if you have under 8 years of experience." },
  { icon: "ti-key", text: "Skills section first for freshers, work experience first for experienced candidates." },
  { icon: "ti-handshake", text: "Mention the company name in your cover letter — generic letters get ignored." },
];

/* ── Trending roles ─────────────────────────────────────────── */
const TRENDING = [
  { role: "ML / AI Engineer",      count: "2,400+", delta: "+38%" },
  { role: "Senior Software Eng.",  count: "3,100+", delta: "+12%" },
  { role: "Product Manager",       count: "1,840+", delta: "+9%"  },
  { role: "Data Engineer",         count: "1,560+", delta: "+24%" },
  { role: "DevOps / SRE",          count: "1,280+", delta: "+19%" },
  { role: "Frontend (React/Next)", count: "980+",  delta: "+11%"  },
];

/* ══════════════════════════════════════════════════════════════
   SHARED NAV
══════════════════════════════════════════════════════════════ */
function Nav({ user, signIn }: { user: any; signIn: () => void; }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle: toggleTheme } = useTheme();

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "var(--nav-bg)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        height: 56, display: "flex", alignItems: "center",
        padding: "0 24px", gap: 12,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="jobSayer" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)", letterSpacing: "-.4px" }}>
            jobSayer
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
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/builder">Resume Builder</NavLink>
                <NavLink href="/jobs">Jobs</NavLink>
                <NavLink href="/career-gps">Career GPS</NavLink>
                <button onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"} style={{ ...ghostBtn, padding: "6px 10px" }}>{dark ? "☀" : "🌙"}</button>
                <Link href="/profile" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px" }}>
                  {user.user_metadata?.avatar_url
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                    : <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accdim)", border: "1px solid var(--accborder)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{(user.email?.[0] ?? "?").toUpperCase()}</span>
                  }
                  {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0]}
                </Link>
                <Link href="/dashboard" style={primaryBtn}>Go to Dashboard →</Link>
              </>
            ) : (
              <>
                <NavLink href="#features">Features</NavLink>
                <NavLink href="#pricing">Pricing</NavLink>
                <NavLink href="/recruit">For Recruiters</NavLink>
                <button onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"} style={{ ...ghostBtn, padding: "6px 10px" }}>{dark ? "☀" : "🌙"}</button>
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
          {/* Theme toggle row */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <button
              onClick={() => { toggleTheme(); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9,
                border: "1px solid var(--border)", background: "var(--surface2)",
                color: "var(--text2)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {dark ? "☀" : "🌙"} {dark ? "Light mode" : "Dark mode"}
            </button>
          </div>
          {user ? (
            <>
              <MobileNavLink href="/builder"      onClick={() => setMenuOpen(false)}>✏️ Resume Builder</MobileNavLink>
              <MobileNavLink href="/score"        onClick={() => setMenuOpen(false)}>🎯 My Score</MobileNavLink>
              <MobileNavLink href="/jobs"         onClick={() => setMenuOpen(false)}>💼 Matched Jobs</MobileNavLink>
              <MobileNavLink href="/applications" onClick={() => setMenuOpen(false)}>📋 Application Tracker</MobileNavLink>
              <MobileNavLink href="/interview"    onClick={() => setMenuOpen(false)}>🎤 Interview Prep</MobileNavLink>
              <MobileNavLink href="/career-gps"   onClick={() => setMenuOpen(false)}>🧭 Career GPS</MobileNavLink>
              <MobileNavLink href="/bgv"          onClick={() => setMenuOpen(false)}>🛡 BGV Badge</MobileNavLink>
              <MobileNavLink href="/salary"       onClick={() => setMenuOpen(false)}>💰 Salary Insights</MobileNavLink>
              <MobileNavLink href="/profile"      onClick={() => setMenuOpen(false)}>👤 My Account</MobileNavLink>
            </>
          ) : (
            <>
              <MobileNavLink href="#how"       onClick={() => setMenuOpen(false)}>How it works</MobileNavLink>
              <MobileNavLink href="#features"  onClick={() => setMenuOpen(false)}>Features</MobileNavLink>
              <MobileNavLink href="#pricing"   onClick={() => setMenuOpen(false)}>Pricing</MobileNavLink>
              <button onClick={() => { signIn(); setMenuOpen(false); }} style={{ ...ghostBtn, width: "100%", padding: "11px" }}>Sign in / Register</button>
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
    <a href={href} style={{ padding: "6px 12px", color: "var(--text2)", fontSize: 13, fontWeight: 500, textDecoration: "none", borderRadius: 99, transition: "color .15s" }}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text1)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text2)")}
    >{children}</a>
  );
}
function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} style={{ padding: "11px 16px", color: "var(--text1)", fontSize: 14, fontWeight: 500, textDecoration: "none", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)" }}>
      {children}
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════
   SIGN-IN MODAL  (Google OAuth + Email OTP)
══════════════════════════════════════════════════════════════ */
type OtpStep = "idle" | "sending" | "sent" | "verifying" | "error";

function SignInModal({ onClose }: { onClose: () => void }) {
  const { signInWithGoogle, signInWithOtp, verifyOtp } = useAuth();
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [step, setStep]       = useState<OtpStep>("idle");
  const [errMsg, setErrMsg]   = useState("");

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSendOtp() {
    if (!email.trim() || !email.includes("@")) { setErrMsg("Enter a valid email address."); return; }
    setStep("sending"); setErrMsg("");
    const { error } = await signInWithOtp(email.trim().toLowerCase());
    if (error) { setErrMsg(error); setStep("error"); }
    else setStep("sent");
  }

  async function handleVerifyOtp() {
    if (otp.trim().length < 4) { setErrMsg("Enter the 6-digit code from your email."); return; }
    setStep("verifying"); setErrMsg("");
    const { error } = await verifyOtp(email.trim().toLowerCase(), otp.trim());
    if (error) { setErrMsg(error); setStep("sent"); }
    else onClose(); // auth state change fires → user logged in
  }

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px",
  };
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 18, padding: "32px 28px", width: "100%", maxWidth: 380,
    position: "relative",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 9,
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text1)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
    outline: "none",
  };
  const btnPrimary: React.CSSProperties = {
    width: "100%", padding: "12px", borderRadius: 9, border: "none",
    background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  };
  const btnGhost: React.CSSProperties = {
    width: "100%", padding: "11px", borderRadius: 9,
    border: "1px solid var(--border)", background: "var(--surface2)",
    color: "var(--text1)", fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", display: "flex",
    alignItems: "center", justifyContent: "center", gap: 10,
  };

  return (
    <div style={overlay} onClick={handleBackdrop}>
      <div style={card}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text3)", fontSize: 18, lineHeight: 1, padding: 4,
        }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 auto 12px",
          }}>J</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text1)", marginBottom: 4 }}>
            Sign in to jobSayer
          </div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>
            Build smarter resumes. Land better jobs.
          </div>
        </div>

        {/* Google */}
        <button onClick={() => signInWithGoogle()} style={btnGhost}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 500 }}>or continue with email</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Email OTP */}
        {step !== "sent" && step !== "verifying" ? (
          <>
            <div style={{ marginBottom: 10 }}>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrMsg(""); }}
                onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                style={inputStyle}
                autoFocus
              />
            </div>
            {errMsg && <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8, margin: "0 0 8px" }}>{errMsg}</p>}
            <button onClick={handleSendOtp} disabled={step === "sending"} style={btnPrimary}>
              {step === "sending" ? "Sending…" : "Send OTP →"}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12, textAlign: "center" }}>
              We sent a 6-digit code to <strong style={{ color: "var(--text1)" }}>{email}</strong>
            </p>
            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setErrMsg(""); }}
                onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                style={{ ...inputStyle, letterSpacing: "0.3em", textAlign: "center", fontSize: 20, fontWeight: 700 }}
                autoFocus
              />
            </div>
            {errMsg && <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 8px" }}>{errMsg}</p>}
            <button onClick={handleVerifyOtp} disabled={step === "verifying"} style={btnPrimary}>
              {step === "verifying" ? "Verifying…" : "Verify & Sign In →"}
            </button>
            <button onClick={() => { setStep("idle"); setOtp(""); setErrMsg(""); }} style={{
              width: "100%", background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", fontSize: 12, marginTop: 10, fontFamily: "inherit",
            }}>
              ← Use a different email
            </button>
          </>
        )}

        <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          By signing in you agree to our{" "}
          <a href="/terms" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms</a>
          {" & "}
          <a href="/privacy" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

/* ── Shared button styles ───────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
  padding: "8px 20px", background: "var(--accent)", borderRadius: 9,
  color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
  border: "none", cursor: "pointer", fontFamily: "inherit", display: "inline-block",
  letterSpacing: "-.01em",
};
const ghostBtn: React.CSSProperties = {
  padding: "7px 15px", background: "none", border: "1px solid var(--border)",
  borderRadius: 9, color: "var(--text2)", fontSize: 13, fontWeight: 500,
  cursor: "pointer", fontFamily: "inherit", transition: "all .18s",
};

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════ */
function LandingPage({ signIn }: { signIn: () => void }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const tablet = w < 900;
  const { dark } = useTheme();
  const [featuresTab, setFeaturesTab] = useState<"resume" | "jobseeker" | "recruiter">("resume");
  const [pricingTab, setPricingTab]   = useState<"jobseeker" | "employer">("jobseeker");
  const currency = useCurrency();

  return (
    <div style={{ background: "var(--bg)", color: "var(--text1)", overflowX: "hidden" }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: mobile ? 0 : "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: mobile ? "88px 20px 40px" : "120px 24px 80px",
        position: "relative",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: mobile ? 400 : 700, height: mobile ? 300 : 500,
          background: "radial-gradient(ellipse at center top, rgba(99,102,241,.14) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        {/* Announcement pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "5px 7px 5px 14px", borderRadius: 99, marginBottom: 28,
          background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)",
          fontSize: 12, color: "var(--text2)",
        }}>
          <span>JD Tailoring + LinkedIn Optimizer now live</span>
          <span style={{ background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 99 }}>New</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: mobile ? 38 : tablet ? 54 : 64,
          fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.04em",
          marginBottom: 20, maxWidth: 700,
          color: "var(--text1)",
          ...(dark ? {
            background: "linear-gradient(160deg, #fff 40%, rgba(255,255,255,.55) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          } : {}),
        }}>
          Build the career you deserve
        </h1>

        <p style={{
          fontSize: mobile ? 15 : 17, color: "var(--text3)",
          maxWidth: 520, lineHeight: 1.75, marginBottom: 24,
        }}>
          AI resume builder, ATS scorer, interview prep, salary benchmarks, and skill gap analysis — everything you need to land a better role and grow your salary.
        </p>
        <div style={{ display: "flex", gap: mobile ? 12 : 24, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
          {["Resume Builder", "ATS Scorer", "Interview AI", "Career GPS", "Salary Intel"].map(f => (
            <span key={f} style={{ fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--accent)", fontSize: 10, fontWeight: 700 }}>✓</span> {f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
          <Link href="/builder" style={{
            padding: mobile ? "13px 26px" : "15px 32px",
            background: "var(--accent)", borderRadius: 12, color: "#fff",
            fontSize: mobile ? 14 : 16, fontWeight: 700, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 7, letterSpacing: "-.01em",
            boxShadow: "0 8px 28px rgba(99,102,241,.35)",
            transition: "box-shadow .2s, transform .15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 36px rgba(99,102,241,.5)";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 28px rgba(99,102,241,.35)";
              (e.currentTarget as HTMLAnchorElement).style.transform = "none";
            }}
          ><i className="ti ti-file-text" style={{ fontSize: 15 }} /> Build your resume — free</Link>
          <button onClick={signIn} style={{
            padding: mobile ? "13px 22px" : "15px 26px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, color: "var(--text1)",
            fontSize: mobile ? 14 : 15, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "-.01em",
            transition: "border-color .15s, background .15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text3)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--surface2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
            }}
          >Sign in →</button>
        </div>

        {/* Social proof row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          {/* Stacked avatars */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {["#6366f1","#f59e0b","#22c55e","#ef4444","#a78bfa"].map((col, i) => (
              <div key={i} style={{
                width: 26, height: 26, borderRadius: "50%", background: col,
                border: "2px solid var(--bg)", marginLeft: i === 0 ? 0 : -8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#fff",
              }}>
                {["S","L","A","R","D"][i]}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>
            <strong style={{ color: "var(--text1)" }}>50K+ professionals</strong> already growing their careers
          </span>
          <span style={{ fontSize: 12, color: "var(--warn)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
            ★★★★★ <span style={{ color: "var(--text3)", fontWeight: 400 }}>4.8</span>
          </span>
        </div>

        <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
          {["No credit card", "Free forever tier", "2 min setup"].map(t => (
            <span key={t} style={{ fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: "var(--success)", fontSize: 10 }}>✓</span> {t}
            </span>
          ))}
        </div>

        {/* App preview */}
        {!mobile && (
          <div style={{
            marginTop: 60, width: "100%", maxWidth: 820,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{ background: "var(--surface2)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid var(--border)" }}>
              {["#ef4444","#eab308","#22c55e"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: .7 }} />)}
              <div style={{ marginLeft: 10, fontSize: 10, color: "var(--text3)", background: "var(--surface)", borderRadius: 6, padding: "2px 12px", border: "1px solid var(--border)" }}>jobsayer.com/score</div>
            </div>
            <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "jobSayer Score", val: "84",   sub: "Top 15%",          color: "var(--accent)" },
                { label: "Jobs Matched",   val: "34",   sub: "8 at 90%+ match",  color: "var(--success)" },
                { label: "JD Trust",       val: "8/10", sub: "verified listings", color: "var(--warn)" },
                { label: "Prep Topics",    val: "5",    sub: "ready to practice", color: "#a78bfa" },
              ].map(c => (
                <div key={c.label} style={{ background: "var(--surface2)", borderRadius: 10, padding: "16px 14px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: c.color, letterSpacing: "-.03em", marginBottom: 4 }}>{c.val}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Stats bar ────────────────────────────────────────── */}
      <section style={{
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: mobile ? "20px 16px" : "32px 24px", background: "var(--surface)",
      }}>
        <div style={{
          maxWidth: 860, margin: "0 auto",
          display: mobile ? "grid" : "flex",
          gridTemplateColumns: mobile ? "1fr 1fr" : undefined,
          justifyContent: "space-around",
          gap: mobile ? 12 : 0, flexWrap: "wrap",
        }}>
          {[
            { val: "50K+",    label: "Professionals growing", col: "var(--accent)", icon: "ti-users"     },
            { val: "4.8 ★",   label: "Average rating",        col: "var(--warn)",   icon: "ti-star"      },
            { val: "91%",     label: "ATS pass rate",          col: "var(--success)", icon: "ti-check"    },
            { val: "50+",     label: "Countries",              col: "var(--text2)",   icon: "ti-world"    },
          ].map((s, i) => (
            <div key={s.label} style={{
              textAlign: "center", padding: mobile ? "8px" : "0 24px",
              borderRight: !mobile && i < 3 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 800, color: s.col, letterSpacing: "-.04em", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social proof — company logos ─────────────────────── */}
      <section style={{ padding: mobile ? "28px 16px" : "56px 24px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 24 }}>
          Candidates placed at
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: mobile ? 20 : 36 }}>
          {["Stripe", "Shopify", "Atlassian", "Grab", "Revolut", "Monzo", "Razorpay", "Linear", "Tabby"].map(co => (
            <span key={co} style={{
              fontSize: mobile ? 13 : 15, fontWeight: 700, color: "var(--text3)",
              letterSpacing: "-.02em", opacity: .6,
              padding: "6px 14px", borderRadius: 8,
              border: "1px solid var(--border)",
            }}>{co}</span>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section style={{ padding: mobile ? "0 16px 40px" : "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Career stories</SectionLabel>
        <h2 style={{ fontSize: mobile ? 22 : 34, fontWeight: 800, textAlign: "center", marginBottom: 24, letterSpacing: "-1px" }}>
          Real careers, real growth
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3,1fr)", gap: mobile ? 10 : 16 }}>
          {[
            {
              name: "Sarah K.",
              outcome: "₹40L offer at Stripe",
              outcomeSub: "Score jumped 58 → 89 in one session",
              avatar: "SK",
              text: "Pasted the Stripe JD and it rewrote my bullets to match exactly. Got a callback within 3 days. I hadn't expected the turnaround to be this fast.",
              tag: "Senior SWE · San Francisco",
            },
            {
              name: "Liam O.",
              outcome: "£12K above first offer",
              outcomeSub: "Consulting → Product at Monzo",
              avatar: "LO",
              text: "Career GPS told me exactly what was missing for a product role. The salary coach gave me market data to back every counter I made. The negotiation paid for Pro 100× over.",
              tag: "PM · London",
            },
            {
              name: "Aisha R.",
              outcome: "Offer on 4th application",
              outcomeSub: "Career switcher → Grab in 2 weeks",
              avatar: "AR",
              text: "I had no idea how ATS systems worked. jobSayer's score flagged every gap and the interview prep built my confidence. Grab was my 4th application — not my 40th.",
              tag: "Data Analyst · Singapore",
            },
          ].map(t => (
            <div key={t.name} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 14, padding: mobile ? "14px" : "22px", display: "flex", flexDirection: "column", gap: mobile ? 10 : 14,
            }}>
              {/* Outcome headline — number first */}
              <div style={{
                background: "var(--accdim)", border: "1px solid var(--accborder)",
                borderRadius: 10, padding: "10px 14px",
              }}>
                <div style={{ fontSize: mobile ? 15 : 18, fontWeight: 800, color: "var(--accent)", lineHeight: 1.2 }}>
                  {t.outcome}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
                  {t.outcomeSub}
                </div>
              </div>
              {/* Stars */}
              <div style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ color: "#eab308", fontSize: 13 }}>★</span>
                ))}
              </div>
              {/* Quote */}
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, flex: 1, margin: 0 }}>
                &ldquo;{t.text}&rdquo;
              </p>
              {/* Footer */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "var(--text2)",
                }}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{t.tag}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" style={{ padding: mobile ? "36px 16px" : "96px 24px", maxWidth: 900, margin: "0 auto" }}>
        <SectionLabel>How it works</SectionLabel>
        <h2 style={{ fontSize: mobile ? 22 : 38, fontWeight: 800, textAlign: "center", marginBottom: mobile ? 20 : 48, letterSpacing: "-1px" }}>
          Your career growth, step by step
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : tablet ? "1fr 1fr" : "repeat(4,1fr)",
          gap: mobile ? 12 : 2,
        }}>
          {[
            { step: "01", icon: "🧭", title: "Map your gaps",         desc: "Career GPS analyses your profile against your target role and shows the exact skills to close." },
            { step: "02", icon: "📄", title: "Craft your story",     desc: "AI resume + cover letter with ATS-ready templates. Your career narrative, perfectly packaged." },
            { step: "03", icon: "🎤", title: "Master every room",    desc: "Targeted interview practice on your specific gaps — not random questions. STAR feedback per answer." },
            { step: "04", icon: "💰", title: "Grow your salary",     desc: "Know your market worth before the offer. Hike calculator and salary benchmarks by company type." },
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
      <section id="features" style={{ padding: mobile ? "0 16px 40px" : "0 24px 96px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Career growth tools</SectionLabel>
        <h2 style={{ fontSize: mobile ? 22 : 38, fontWeight: 800, textAlign: "center", marginBottom: mobile ? 16 : 28, letterSpacing: "-1px" }}>
          Every tool your career needs
        </h2>

        {/* Role tab switcher */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: mobile ? 18 : 32 }}>
          <div style={{
            display: "inline-flex", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: 12, padding: 4, gap: 2,
          }}>
            {([
              { key: "resume",    label: mobile ? "📄 Resume" : "📄 Resume Builder" },
              { key: "jobseeker", label: mobile ? "🎯 Job Seekers" : "🎯 For Job Seekers" },
              { key: "recruiter", label: mobile ? "🏢 Recruiters" : "🏢 For Recruiters" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFeaturesTab(tab.key)}
                style={{
                  padding: mobile ? "7px 10px" : "8px 20px",
                  borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: mobile ? 11 : 13, fontWeight: 600,
                  background: featuresTab === tab.key ? "var(--accent)" : "transparent",
                  color: featuresTab === tab.key ? "#fff" : "var(--text2)",
                  transition: "all .18s",
                  whiteSpace: "nowrap",
                }}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Features grid — filtered by tab */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : tablet ? "1fr 1fr" : "repeat(3,1fr)", gap: mobile ? 8 : 14 }}>
          {(featuresTab === "resume" ? [
            { icon: "📄", title: "Resume + Cover Letter AI",  tag: "Core",    tagC: "var(--success)", iconBg: "rgba(34,197,94,.08)",  desc: "Build a career story that passes ATS and impresses humans. 20+ templates, linked cover letters." },
            { icon: "✂️", title: "JD Resume Tailor",          tag: "New",     tagC: "#22d3ee",        iconBg: "rgba(34,211,238,.08)", desc: "Paste any JD → AI rewrites your bullets to match keywords and requirements. Before/after diff view." },
            { icon: "💼", title: "LinkedIn Optimizer",        tag: "New",     tagC: "#22d3ee",        iconBg: "rgba(34,211,238,.08)", desc: "Score and AI-rewrite your LinkedIn headline, about section and skills. Drop-in copy ready to paste." },
            { icon: "🎯", title: "ATS Score & Fix",           tag: "Core",    tagC: "var(--success)", iconBg: "rgba(34,197,94,.08)",  desc: "ATS, keywords, clarity, impact — one score with actionable fixes to maximise your market value." },
            { icon: "🎨", title: "20+ Pro Templates",         tag: "Design",  tagC: "var(--warn)",    iconBg: "rgba(234,179,8,.08)",  desc: "ATS-safe designs for every industry — from tech to finance to creative roles. Always recruiter-ready." },
            { icon: "📤", title: "PDF + DOCX Export",         tag: "Export",  tagC: "var(--accent)",  iconBg: "rgba(99,102,241,.1)",  desc: "One-click export in recruiter-friendly formats. Share a live link or download anytime." },
          ] : featuresTab === "jobseeker" ? [
            { icon: "🧭", title: "Career GPS",                tag: "Core",   tagC: "var(--success)", iconBg: "rgba(34,197,94,.08)",  desc: "Map your skill gaps vs your target role. Get a prioritised learning plan with study time estimates." },
            { icon: "🎤", title: "Skill-gap Interview Prep",  tag: "Core",   tagC: "var(--success)", iconBg: "rgba(34,197,94,.08)",  desc: "Practice questions targeted at YOUR gaps — not random topics. STAR feedback per answer." },
            { icon: "💰", title: "Salary Intelligence",       tag: "Growth", tagC: "var(--warn)",    iconBg: "rgba(234,179,8,.08)",  desc: "Global salary benchmarks across 15+ cities. Multi-currency. Underpaid detector. Negotiation scripts." },
            { icon: "📋", title: "Pipeline Tracker",          tag: "Track",  tagC: "var(--accent)",  iconBg: "rgba(99,102,241,.1)",  desc: "Track applications with ghosting detection, notice period countdowns, and follow-up generators." },
            { icon: "🛡", title: "BGV Credential Badge",      tag: "Trust",  tagC: "var(--accent)",  iconBg: "rgba(99,102,241,.1)",  desc: "Get identity, education, and employment verified upfront. Share your badge. Skip offer delays." },
            { icon: "⚡", title: "JD Trust Scanner",          tag: "Protect",tagC: "var(--accent)",  iconBg: "rgba(99,102,241,.1)",  desc: "Ghost jobs and inflated requirements flagged before you waste your time or data." },
          ] : [
            { icon: "📢", title: "Post & Manage Jobs",        tag: "Core",   tagC: "var(--success)", iconBg: "rgba(34,197,94,.08)",  desc: "Ghost-proof verified listings go live after admin review. Candidates trust verified employer posts." },
            { icon: "🤖", title: "AI Candidate Matching",     tag: "Core",   tagC: "var(--success)", iconBg: "rgba(34,197,94,.08)",  desc: "Candidates ranked by fit score against your JD. Spend time on the right people, not the stack." },
            { icon: "🏅", title: "Verified Company Badge",    tag: "Trust",  tagC: "var(--accent)",  iconBg: "rgba(99,102,241,.1)",  desc: "Verify your company identity. Boosts apply rates and filters out spam applicants." },
            { icon: "📊", title: "Candidate Pipeline",        tag: "Manage", tagC: "var(--warn)",    iconBg: "rgba(234,179,8,.08)",  desc: "Review, shortlist, and communicate with candidates in one place. No ATS integration needed." },
            { icon: "🛡", title: "Pre-screened Candidates",   tag: "Quality",tagC: "var(--accent)",  iconBg: "rgba(99,102,241,.1)",  desc: "Access candidates with BGV-verified credentials — identity, education, and employment already checked." },
            { icon: "📈", title: "Hiring Analytics",          tag: "Insight",tagC: "var(--warn)",    iconBg: "rgba(234,179,8,.08)",  desc: "Track post views, apply rates, shortlist conversions and time-to-hire across all your listings." },
          ]).map(f => (
            <div key={f.title} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: mobile ? "14px 12px" : "22px",
              transition: "border-color .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text3)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: mobile ? 8 : 14 }}>
                <div style={{ width: mobile ? 30 : 40, height: mobile ? 30 : 40, borderRadius: 10, background: f.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: mobile ? 15 : 20 }}>{f.icon}</div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: `${f.tagC}18`, color: f.tagC, border: `1px solid ${f.tagC}30` }}>{f.tag}</span>
              </div>
              <div style={{ fontSize: mobile ? 12 : 14, fontWeight: 700, color: "var(--text1)", marginBottom: 4, letterSpacing: "-.01em" }}>{f.title}</div>
              <div style={{ fontSize: mobile ? 11 : 13, color: "var(--text3)", lineHeight: 1.6, marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: mobile ? 2 : 4, WebkitBoxOrient: "vertical" as const }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: mobile ? "0 16px 40px" : "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Pricing</SectionLabel>
        <h2 style={{ fontSize: mobile ? 22 : 38, fontWeight: 800, textAlign: "center", marginBottom: 8, letterSpacing: "-1px" }}>
          Simple, transparent pricing
        </h2>
        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 14, marginBottom: 28 }}>
          No hidden fees. Start free, upgrade when you need more.
        </p>

        {/* Pricing category toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: mobile ? 20 : 36 }}>
          <div style={{
            display: "inline-flex", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: 12, padding: 4, gap: 2,
          }}>
            {([
              { key: "jobseeker", label: mobile ? "🎯 Job Seekers" : "🎯 For Job Seekers" },
              { key: "employer",  label: mobile ? "🏢 Employers" : "🏢 For Employers" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setPricingTab(tab.key)}
                style={{
                  padding: mobile ? "7px 10px" : "8px 20px",
                  borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: mobile ? 11 : 13, fontWeight: 600,
                  background: pricingTab === tab.key ? "var(--accent)" : "transparent",
                  color: pricingTab === tab.key ? "#fff" : "var(--text2)",
                  transition: "all .18s",
                  whiteSpace: "nowrap",
                }}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: mobile ? 10 : 16, alignItems: "start" }}>
          {(pricingTab === "jobseeker" ? [
            {
              name: "Free",
              price: "Free", period: "forever",
              tagline: "Start your career journey",
              color: "var(--text2)", highlight: false,
              features: ["2 saved resumes", "4 basic templates", "PDF export", "ATS score", "Matched jobs feed", "Public share link"],
              missing: ["All 20+ templates", "AI writing assistant", "Interview prep (AI)", "Career GPS roadmap", "JD Tailor", "Salary intelligence"],
              cta: "Start free", ctaHref: "/builder",
            },
            {
              name: "Career Pro",
              price: formatPrice(9, currency), period: "/ month",
              tagline: "For active job hunters",
              color: "var(--accent)", highlight: true,
              features: ["5 saved resumes", "All 20+ templates", "PDF + DOCX export", "ATS score + JD Tailor", "Matched jobs + Job tracker", "AI writing assistant", "Interview prep (AI)", "Career GPS roadmap"],
              missing: ["Salary intelligence", "LinkedIn optimizer", "Priority support"],
              cta: "Get Career Pro", ctaHref: "/upgrade",
            },
            {
              name: "Career Elite",
              price: formatPrice(19, currency), period: "/ month",
              tagline: "For career accelerators",
              color: "#a78bfa", highlight: false,
              features: ["Unlimited resumes", "All 20+ templates", "PDF + DOCX export", "ATS score + JD Tailor", "Matched jobs + Job tracker", "AI writing assistant", "Interview prep (AI)", "Career GPS roadmap", "Salary intelligence", "LinkedIn Optimizer", "Priority support"],
              missing: [],
              cta: "Get Career Elite", ctaHref: "/upgrade",
            },
          ] : [
            {
              name: "Free",
              price: "Free", period: "forever",
              tagline: "Post your first jobs",
              color: "var(--text2)", highlight: false,
              features: ["3 job posts", "Basic candidate listing", "Company profile page", "AI job description helper"],
              missing: ["AI candidate matching", "Verified badge", "Candidate pipeline", "Analytics", "Priority placement"],
              cta: "Start hiring free", ctaHref: "/recruit",
            },
            {
              name: "Growth",
              price: formatPrice(49, currency), period: "/ month",
              tagline: "For growing teams",
              color: "var(--accent)", highlight: true,
              features: ["20 active job posts", "AI candidate matching", "Verified company badge", "Candidate pipeline", "Hiring analytics", "Priority job placement"],
              missing: ["Unlimited posts", "API access", "Dedicated account manager"],
              cta: "Start Growth", ctaHref: "/recruit",
            },
            {
              name: "Scale",
              price: formatPrice(149, currency), period: "/ month",
              tagline: "For high-volume hiring",
              color: "#a78bfa", highlight: false,
              features: ["Unlimited job posts", "AI candidate matching", "Verified company badge", "Candidate pipeline", "Hiring analytics", "Priority placement", "API access", "Dedicated account manager"],
              missing: [],
              cta: "Contact Sales", ctaHref: "/recruit",
            },
          ]).map(plan => (
            <div key={plan.name} style={{
              background: plan.highlight ? "linear-gradient(160deg, rgba(99,102,241,.1), rgba(99,102,241,.04))" : "var(--surface)",
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
                {(mobile ? plan.features.slice(0, 5) : plan.features).map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text2)" }}>
                    <span style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                  </div>
                ))}
                {mobile && plan.features.length > 5 && (
                  <div style={{ fontSize: 12, color: "var(--text3)", paddingLeft: 4 }}>+{plan.features.length - 5} more included</div>
                )}
                {!mobile && plan.missing.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text3)", opacity: .5 }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>—</span>{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text3)", marginTop: 20 }}>
          All plans include resume builder, ATS scoring, matched jobs, and public share link. Billed in {currency.code}. Cancel anytime.
        </p>
      </section>

      {/* ── Trending roles ───────────────────────────────────── */}
      <section style={{ padding: mobile ? "0 16px 36px" : "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel>Market pulse</SectionLabel>
        <h2 style={{ fontSize: mobile ? 24 : 34, fontWeight: 800, textAlign: "center", marginBottom: 32, letterSpacing: "-1px" }}>
          Fastest-growing roles globally right now
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
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", background: "rgba(34,197,94,.1)", padding: "3px 8px", borderRadius: 8 }}>{r.delta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recruiter crosssell ──────────────────────────────── */}
      <section style={{ padding: mobile ? "0 16px 36px" : "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden",
        }}>
          <div style={{ padding: mobile ? "28px 24px" : "36px 40px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 12 }}>For Employers</div>
            <h3 style={{ fontSize: mobile ? 20 : 26, fontWeight: 800, marginBottom: 12, letterSpacing: "-.02em" }}>
              Hire AI-scored<br />candidates faster
            </h3>
            <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: 20 }}>
              Post jobs, get AI-matched candidates ranked by fit score, and skip the ghost-job noise. Verified employers get priority placement.
            </p>
            <Link href="/recruit" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 22px", background: "var(--accent)", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              🏢 Start hiring free →
            </Link>
          </div>
          <div style={{ padding: mobile ? "0 24px 28px" : "36px 40px 36px 0", display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            {[
              { icon: "🎯", text: "AI matches JDs to pre-scored candidate pool" },
              { icon: "👻", text: "Ghost-proof listings — admin-reviewed before going live" },
              { icon: "🛡", text: "Verified company badge builds candidate trust" },
              { icon: "🆓", text: "Free to start — 3 job posts, no card needed" },
            ].map(p => (
              <div key={p.text} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon}</span>
                <span style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────── */}
      <section style={{
        margin: mobile ? "0 16px 40px" : "0 24px 96px",
        maxWidth: 860, marginLeft: "auto", marginRight: "auto",
        background: "linear-gradient(135deg, rgba(99,102,241,.12), rgba(99,102,241,.06))",
        border: "1px solid var(--accborder)", borderRadius: 20,
        padding: mobile ? "28px 20px" : "56px 48px", textAlign: "center",
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
        borderTop: "1px solid var(--border)",
        padding: mobile ? "24px 16px 20px" : "40px 48px 28px",
        background: "var(--surface)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* Top row */}
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: mobile ? 20 : 40, marginBottom: mobile ? 20 : 32 }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="jobSayer" style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover" }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)" }}>jobSayer</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, maxWidth: 240, margin: 0 }}>
                The platform that grows your career — close skill gaps, ace interviews, and negotiate your worth. Used in 50+ countries.
              </p>
            </div>
            {/* Candidates */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 12 }}>For Candidates</div>
              {[
                { label: "Resume Builder",       href: "/builder"      },
                { label: "Resume Score",         href: "/score"        },
                { label: "Matched Jobs",         href: "/jobs"         },
                { label: "Application Tracker",  href: "/applications" },
                { label: "Interview Prep",        href: "/interview"    },
                { label: "Career GPS",            href: "/career-gps"   },
                { label: "Salary Intelligence",    href: "/salary"       },
                { label: "JD Tailor",             href: "/tailor"       },
                { label: "LinkedIn Optimizer",    href: "/linkedin"     },
                { label: "BGV Badge",             href: "/bgv"          },
                { label: "Career Health",         href: "/career-health"},
                { label: "Employer Trust",        href: "/employer-trust"},
              ].slice(0, mobile ? 6 : 12).map(l => (
                <Link key={l.label} href={l.href} style={{ display: "block", fontSize: 12, color: "var(--text3)", textDecoration: "none", marginBottom: 7, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                >{l.label}</Link>
              ))}
            </div>
            {/* Employers */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 12 }}>For Employers</div>
              {[
                { label: "Post a Job",        href: "/recruit" },
                { label: "Browse Candidates", href: "/recruit" },
                { label: "Employer Pricing",  href: "/recruit#pricing" },
                { label: "Company Verify",    href: "/verify" },
              ].map(l => (
                <Link key={l.label} href={l.href} style={{ display: "block", fontSize: 12, color: "var(--text3)", textDecoration: "none", marginBottom: 7, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                >{l.label}</Link>
              ))}
            </div>
            {/* Legal */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 12 }}>Company</div>
              {[
                { label: "Terms of Service", href: "/terms" },
                { label: "Privacy Policy",   href: "/privacy" },
                { label: "Upgrade",          href: "/upgrade" },
              ].map(l => (
                <Link key={l.label} href={l.href} style={{ display: "block", fontSize: 12, color: "var(--text3)", textDecoration: "none", marginBottom: 7, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                >{l.label}</Link>
              ))}
            </div>
          </div>
          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>© 2026 jobSayer. All rights reserved.</span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>Used in 50+ countries 🌍</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD (signed-in)
══════════════════════════════════════════════════════════════ */
interface ScoreDim { label: string; score: number; status: string }
interface BgvStatus { status: string; id_verified: boolean; edu_verified: boolean; emp_verified: boolean }

function Dashboard({ user }: { user: any }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [score, setScore]               = useState<number | null>(null);
  const [scoreDims, setScoreDims]       = useState<ScoreDim[]>([]);
  const [matchCount, setMatchCount]     = useState(0);
  const [hasResume, setHasResume]       = useState(false);
  const [lastSaved, setLastSaved]       = useState("");
  const [tipIdx]                        = useState(() => Math.floor(Math.random() * TIPS.length));
  const [bgv, setBgv]                   = useState<BgvStatus | null>(null);
  const [employerProfile, setEmployerProfile] = useState<{ company_name: string } | null>(null);
  const { signOut }                     = useAuth();

  useEffect(() => {
    // Load resume from localStorage
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        const data: ResumeData = parsed.data ?? parsed;
        if (data.name) { setHasResume(true); }
        const result = computeScore(data);
        setScore(result.total);
        setScoreDims(result.dimensions.map(d => ({ label: d.label, score: d.score, status: d.status })));
        const rt = resumeToText(data).toLowerCase();
        const matched = JOBS.filter(j => !j.ghost && j.skills.filter(s => rt.includes(s)).length / j.skills.length > 0.3);
        setMatchCount(matched.length);
        if (parsed.ts) {
          const d = new Date(parsed.ts);
          setLastSaved(d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }));
        }
      }
    } catch { /* ignore */ }

    // Fetch real BGV status
    fetch("/api/bgv/status")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.bgv) setBgv(d.bgv); })
      .catch(() => {});

    // Check if this user also has an employer profile (dual-role)
    fetch("/api/employer/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.profile?.company_name) setEmployerProfile(d.profile); })
      .catch(() => {});
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const scoreColor = score === null ? "var(--text3)" : score >= 75 ? "var(--success)" : score >= 55 ? "var(--warn)" : "var(--danger)";
  const circ = 2 * Math.PI * 26;

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--text1)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: mobile ? "76px 16px 20px" : "80px 24px 20px" }}>

        {/* ── Dual-role banner ── */}
        {employerProfile && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderRadius: 10, marginBottom: 14,
            background: "rgba(99,102,241,.06)", border: "1px solid var(--accborder)",
            flexWrap: "wrap", gap: 8,
          }}>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>
              <i className="ti ti-building" style={{marginRight:6}}/>You also have a recruiter account — <strong style={{ color: "var(--text1)" }}>{employerProfile.company_name}</strong>
            </span>
            <Link href="/recruit" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none", padding: "5px 12px", borderRadius: 7, background: "var(--accdim)", border: "1px solid var(--accborder)" }}>
              Switch to Recruiter →
            </Link>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
          <div>
            <div style={{ fontSize: mobile ? 22 : 26, fontWeight: 800, letterSpacing: "-.04em", marginBottom: 3 }}>
              {greeting}, {firstName}
            </div>
            {lastSaved
              ? <div style={{ fontSize: 12, color: "var(--text3)" }}>Resume last saved {lastSaved}</div>
              : <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  You have <span style={{ color: "var(--accent)", fontWeight: 600 }}>{matchCount} job matches</span> based on your resume
                </div>
            }
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/bgv" style={{ padding: "7px 14px", background: "var(--accdim)", border: "1px solid var(--accborder)", borderRadius: 9, color: "var(--accent)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>🛡 Get Verified</Link>
            {!mobile && <button onClick={signOut} style={{ ...ghostBtn, fontSize: 12, padding: "7px 13px" }}>Sign out</button>}
          </div>
        </div>

        {/* ── 3-col stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
          {/* Score ring card */}
          <Link href="/score" style={{ textDecoration: "none" }}>
            <div style={{ ...card, padding: "18px 16px", cursor: "pointer", transition: "border-color .18s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--text3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12, fontWeight: 500 }}>Resume score</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                  <svg width="56" height="56" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="var(--surface2)" strokeWidth="5" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={circ * (1 - (score ?? 0) / 100)}
                      style={{ transition: "stroke-dashoffset 1.2s ease" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 13, fontWeight: 800, color: scoreColor }}>{score ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{score !== null ? (score >= 75 ? "Strong" : score >= 55 ? "Good" : "Needs work") : "Build resume"}</div>
                  <div style={{ fontSize: 11, color: "var(--success)", marginTop: 3 }}>{score !== null ? `+6 pts this week` : "Start now →"}</div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/jobs" style={{ textDecoration: "none" }}>
            <div style={{ ...card, padding: "18px 16px", cursor: "pointer", transition: "border-color .18s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--text3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12, fontWeight: 500 }}>Job matches</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "var(--warn)", letterSpacing: "-.04em", marginBottom: 4 }}>{matchCount || "—"}</div>
              <div style={{ fontSize: 11, color: "var(--success)" }}>3 new today</div>
            </div>
          </Link>

          <Link href="/bgv" style={{ textDecoration: "none" }}>
            <div style={{ ...card, padding: "18px 16px", cursor: "pointer", transition: "border-color .18s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--text3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12, fontWeight: 500 }}>BGV status</div>
              {(() => {
                if (!bgv) return <>
                  <div style={{ fontSize: 26, marginBottom: 6, color: "var(--text3)" }}><i className="ti ti-shield-check"/></div>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>Not started</div>
                  <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 3 }}>Get verified →</div>
                </>;
                const cfg: Record<string, { icon: string; label: string; col: string }> = {
                  pending:     { icon: "ti-clock",         label: "Pending review",    col: "var(--warn)" },
                  in_progress: { icon: "ti-search",        label: "In progress",       col: "var(--accent)" },
                  verified:    { icon: "ti-circle-check",  label: "Verified",           col: "var(--success)" },
                  partial:     { icon: "ti-alert-triangle",label: "Partially verified", col: "var(--warn)" },
                  failed:      { icon: "ti-x",             label: "Failed",            col: "var(--danger)" },
                };
                const s = cfg[bgv.status] ?? cfg.pending;
                const checks = [bgv.id_verified, bgv.edu_verified, bgv.emp_verified].filter(Boolean).length;
                return <>
                  <div style={{ fontSize: 22, marginBottom: 5, color: s.col }}><i className={`ti ${s.icon}`}/></div>
                  <div style={{ fontSize: 11, color: s.col, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>{checks}/3 checks passed</div>
                </>;
              })()}
            </div>
          </Link>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 300px", gap: 12, marginBottom: 12 }}>

          {/* Score breakdown */}
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>Resume breakdown</div>
              <Link href="/score" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Full report →</Link>
            </div>
            {score !== null && scoreDims.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {scoreDims.map(dim => {
                  const c = dim.status === "green" ? "var(--success)" : dim.status === "amber" ? "var(--warn)" : "var(--danger)";
                  const pct = Math.round((dim.score / 25) * 100);
                  return (
                    <div key={dim.label} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--text2)" }}>{dim.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{dim.score}<span style={{ fontSize: 10, color: "var(--text3)" }}>/25</span></span>
                      </div>
                      <div style={{ background: "var(--surface2)", borderRadius: 99, height: 5 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 10, color: "var(--text3)" }}><i className="ti ti-file-description"/></div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No resume yet</div>
                <Link href="/builder" style={{ padding: "9px 22px", background: "var(--accent)", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Build resume →</Link>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-.01em", marginBottom: 12 }}>Quick actions</div>
            <div style={{ display: mobile ? "grid" : "flex", gridTemplateColumns: mobile ? "1fr 1fr" : undefined, flexDirection: mobile ? undefined : "column", gap: 6 }}>
              {[
                { label: "Edit Resume",       sub: "Builder",             href: "/builder",      accent: true  },
                { label: "View Score",        sub: "Full breakdown",       href: "/score",        accent: false },
                { label: "Browse Jobs",       sub: `${matchCount || "—"} matched`, href: "/jobs", accent: false },
                { label: "Track Applications",sub: "Kanban board",         href: "/applications", accent: false },
                { label: "Interview Prep",    sub: "AI mock sessions",     href: "/interview",    accent: false },
                { label: "Career GPS",        sub: "Skill roadmap",        href: "/career-gps",   accent: false },
                { label: "Salary Intelligence", sub: "Global benchmarks",   href: "/salary",       accent: false },
                { label: "JD Tailor",         sub: "Match resume to role", href: "/tailor",       accent: false },
                { label: "LinkedIn Optimizer",sub: "Score + rewrite",      href: "/linkedin",     accent: false },
                { label: "Get Verified",      sub: "BGV badge",            href: "/bgv",          accent: false },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: mobile ? "9px 10px" : "10px 13px", borderRadius: 9,
                    background: a.accent ? "var(--accdim)" : "var(--surface2)",
                    border: `1px solid ${a.accent ? "var(--accborder)" : "var(--border)"}`,
                    transition: "border-color .15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--text3)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = a.accent ? "var(--accborder)" : "var(--border)"}
                  >
                    <div>
                      <div style={{ fontSize: mobile ? 11 : 12, fontWeight: 600, color: a.accent ? "var(--accent)" : "var(--text1)" }}>{a.label}</div>
                      {!mobile && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{a.sub}</div>}
                    </div>
                    <span style={{ fontSize: 14, color: "var(--text3)" }}>›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 10 : 14 }}>

          {/* Trending roles */}
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-.01em" }}>Trending globally</div>
              <Link href="/jobs" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Browse →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {TRENDING.slice(0, 5).map((r, i) => (
                <div key={r.role} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{r.role}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{r.count} openings</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.15)", padding: "3px 9px", borderRadius: 99 }}>{r.delta}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily tip + recruiter activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Daily tip */}
            <div style={{ ...card, padding: "18px", flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--accent)", marginBottom: 10 }}><i className="ti ti-bulb" style={{marginRight:4}}/>Resume tip of the day</div>
              <div style={{ fontSize: 18, marginBottom: 6, color: "var(--accent)" }}><i className={`ti ${TIPS[tipIdx].icon}`}/></div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{TIPS[tipIdx].text}</div>
            </div>

            {/* Recruiter activity */}
            <div style={{ ...card, padding: "18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 12 }}><i className="ti ti-radio" style={{marginRight:4}}/>Platform activity</div>
              {[
                { icon: "ti-eye", text: "14 recruiters viewed candidate profiles today" },
                { icon: "ti-circle-check", text: "3 new verified companies joined this week"      },
                { icon: "ti-mail", text: "Average recruiter response time: 2.4 days"     },
              ].map(a => (
                <div key={a.text} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: 14, flexShrink: 0, color: "var(--accent)", marginTop: 1 }}/>
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showSignIn, setShowSignIn]   = useState(false);
  const [authError,  setAuthError]    = useState<string | null>(null);
  const openSignIn  = useCallback(() => setShowSignIn(true),  []);
  const closeSignIn = useCallback(() => setShowSignIn(false), []);

  // Redirect signed-in users straight to the dashboard
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  // Surface auth errors from three sources:
  //   ?auth_error=        — our own callback route
  //   ?error_description= — Supabase query-param style (bad_oauth_state etc.)
  //   #error=             — Supabase hash-fragment style (server_error etc.)
  useEffect(() => {
    // Query params
    const qp = new URLSearchParams(window.location.search);
    // Hash fragment (strip leading #)
    const hp = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const raw =
      qp.get("auth_error") ||
      qp.get("error_description") ||
      qp.get("error") ||
      hp.get("error_description") ||
      hp.get("error");

    if (raw) {
      // Double-decode: Supabase sometimes double-encodes (%253A → %3A → :)
      let msg = raw;
      try { msg = decodeURIComponent(decodeURIComponent(raw)).replace(/\+/g, " "); } catch {
        try { msg = decodeURIComponent(raw).replace(/\+/g, " "); } catch { /* use raw */ }
      }
      setAuthError(msg);
      // Clean the URL without reload
      const clean = new URL(window.location.href);
      ["auth_error", "error", "error_code", "error_description", "sb"].forEach(k => clean.searchParams.delete(k));
      window.history.replaceState({}, "", clean.pathname + (clean.search !== "?" ? clean.search : ""));
    }
  }, []);

  // While auth is resolving OR user is signed in (redirect pending), render nothing.
  // This prevents the landing page nav/content flashing for signed-in users.
  if (loading || user) return null;

  return (
    <>
      <Nav user={null} signIn={openSignIn} />
      {authError && (
        <div style={{
          position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, padding: "10px 20px", borderRadius: 10,
          background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)",
          color: "var(--danger)", fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,.3)",
        }}>
          ⚠ {authError}
          <button onClick={() => setAuthError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 16, padding: 0 }}>✕</button>
        </div>
      )}
      <LandingPage signIn={openSignIn} />
      {showSignIn && <SignInModal onClose={closeSignIn} />}
    </>
  );
}
