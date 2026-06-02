"use client";
/**
 * /recruit — Recruiter / Employer Portal
 * - Landing with employer pricing
 * - Employer auth modal (Google / Email OTP + company name)
 * - Gated dashboard and job posting (requires auth + employer profile)
 */
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Users, Check, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";

/* ═══════════════════════════════════════════════════════════════
   EMPLOYER AUTH MODAL
═══════════════════════════════════════════════════════════════ */
interface EmployerProfile { id: string; company_name: string; plan: string }
type AuthStep = "method" | "otp_sent" | "company" | "done";

function EmployerAuthModal({
  onClose,
  onProfile,
}: {
  onClose: () => void;
  onProfile: (p: EmployerProfile) => void;
}) {
  const { user, signInWithGoogle, signInWithOtp, verifyOtp } = useAuth();
  const [step, setStep]         = useState<AuthStep>("method");
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState("");
  const [company, setCompany]   = useState("");
  const [website, setWebsite]   = useState("");
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");

  // Once signed in → check / create employer profile
  useEffect(() => {
    if (!user || step === "done") return;
    (async () => {
      const res = await fetch("/api/employer/profile");
      if (res.ok) {
        const { profile } = await res.json() as { profile: EmployerProfile | null };
        if (profile?.company_name) { onProfile(profile); setStep("done"); }
        else setStep("company");
      }
    })();
  }, [user, step, onProfile]);

  async function handleSendOtp() {
    if (!email.includes("@")) { setErr("Enter a valid work email."); return; }
    setBusy(true); setErr("");
    const { error } = await signInWithOtp(email.trim().toLowerCase());
    if (error) { setErr(error); } else setStep("otp_sent");
    setBusy(false);
  }

  async function handleVerifyOtp() {
    if (otp.length < 4) { setErr("Enter the 6-digit code."); return; }
    setBusy(true); setErr("");
    const { error } = await verifyOtp(email.trim().toLowerCase(), otp.trim());
    if (error) { setErr(error); setBusy(false); }
    // useEffect above handles the rest once user changes
  }

  async function handleCompany() {
    if (!company.trim()) { setErr("Company name is required."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/employer/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: company.trim(), website: website.trim() }),
    });
    const data = await res.json() as { profile?: EmployerProfile; error?: string };
    if (data.profile) { onProfile(data.profile); setStep("done"); onClose(); }
    else { setErr(data.error ?? "Failed to save profile."); }
    setBusy(false);
  }

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  };
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 18, padding: "32px 28px", width: "100%", maxWidth: 400, position: "relative",
  };
  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 9,
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text1)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };
  const btn: React.CSSProperties = {
    width: "100%", padding: "12px", borderRadius: 9, border: "none",
    background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text1)" }}>Employer Sign In</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
            {step === "company" ? "Almost there — tell us about your company" : "Post jobs and reach top candidates"}
          </div>
        </div>

        {step === "company" ? (
          /* Company name step */
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>COMPANY NAME *</label>
              <input style={inp} placeholder="e.g. Razorpay, Flipkart…" value={company}
                onChange={e => { setCompany(e.target.value); setErr(""); }}
                onKeyDown={e => e.key === "Enter" && handleCompany()} autoFocus />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>COMPANY WEBSITE (optional)</label>
              <input style={inp} placeholder="https://yourcompany.com" value={website}
                onChange={e => setWebsite(e.target.value)} />
            </div>
            {err && <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 10px" }}>{err}</p>}
            <button onClick={handleCompany} disabled={busy} style={btn}>
              {busy ? "Saving…" : "Continue →"}
            </button>
          </>
        ) : step === "otp_sent" ? (
          /* OTP verify step */
          <>
            <p style={{ fontSize: 13, color: "var(--text2)", textAlign: "center", marginBottom: 14 }}>
              Code sent to <strong style={{ color: "var(--text1)" }}>{email}</strong>
            </p>
            <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code"
              value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
              style={{ ...inp, letterSpacing: "0.3em", textAlign: "center", fontSize: 20, fontWeight: 700, marginBottom: 12 }}
              autoFocus />
            {err && <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 10px" }}>{err}</p>}
            <button onClick={handleVerifyOtp} disabled={busy} style={btn}>
              {busy ? "Verifying…" : "Verify & Continue →"}
            </button>
            <button onClick={() => { setStep("method"); setOtp(""); setErr(""); }}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, marginTop: 10, fontFamily: "inherit" }}>
              ← Use different email
            </button>
          </>
        ) : (
          /* Method selection */
          <>
            {/* Google */}
            <button onClick={() => signInWithGoogle()} style={{
              width: "100%", padding: "11px", borderRadius: 9,
              border: "1px solid var(--border)", background: "var(--surface2)",
              color: "var(--text1)", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16,
            }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text3)" }}>or work email</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <input type="email" placeholder="you@company.com" value={email}
              onChange={e => { setEmail(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && handleSendOtp()}
              style={{ ...inp, marginBottom: 10 }} autoFocus />
            {err && <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 10px" }}>{err}</p>}
            <button onClick={handleSendOtp} disabled={busy} style={btn}>
              {busy ? "Sending…" : "Send OTP →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMPLOYER PRICING
═══════════════════════════════════════════════════════════════ */
const EMP_PLANS = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    highlight: false,
    badge: null,
    features: [
      "3 active job posts",
      "Basic candidate matching",
      "10 candidate views/month",
      "jobSayer candidate badge",
      "Email support",
    ],
    cta: "Get Started Free",
    ctaStyle: "ghost" as const,
  },
  {
    name: "Growth",
    price: { monthly: 2999, annual: 29900 },
    highlight: false,
    badge: "Popular",
    features: [
      "10 active job posts",
      "AI JD-to-candidate matching",
      "50 direct candidate contacts/mo",
      "Hiring analytics dashboard",
      "Priority listing in search",
      "GSTIN invoice",
    ],
    cta: "Start Growth",
    ctaStyle: "secondary" as const,
  },
  {
    name: "Scale",
    price: { monthly: 7999, annual: 79900 },
    highlight: true,
    badge: "Best for Teams",
    features: [
      "Unlimited job posts",
      "Unlimited candidate contacts",
      "Bulk outreach (CSV upload)",
      "ATS integration (Webhook/API)",
      "Dedicated account manager",
      "Custom branded job pages",
      "GSTIN invoice + priority support",
    ],
    cta: "Start Scale",
    ctaStyle: "primary" as const,
  },
];

function EmployerPricing({
  interval,
  onUpgrade,
  payLoading,
}: {
  interval: "monthly" | "annual";
  onUpgrade: (plan: string) => void;
  payLoading: string | null;
}) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)", background: "var(--accdim)", border: "1px solid var(--accborder)", padding: "4px 14px", borderRadius: 20, marginBottom: 14 }}>
          Employer Plans
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Simple, transparent pricing</h2>
        <p style={{ fontSize: 14, color: "var(--text3)" }}>Start free. Scale when you're ready to hire more.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, maxWidth: 960, margin: "0 auto" }}>
        {EMP_PLANS.map(plan => (
          <div key={plan.name} style={{
            background: plan.highlight ? "linear-gradient(145deg,rgba(99,102,241,.1),rgba(99,102,241,.06))" : "var(--surface)",
            border: `1.5px solid ${plan.highlight ? "var(--accborder)" : "var(--border)"}`,
            borderRadius: 16, padding: "28px 22px", position: "relative",
            display: "flex", flexDirection: "column",
          }}>
            {plan.badge && (
              <div style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 20,
                background: plan.highlight ? "var(--accent)" : "var(--surface2)",
                color: plan.highlight ? "#fff" : "var(--text2)",
                border: plan.highlight ? "none" : "1px solid var(--border)",
                whiteSpace: "nowrap",
              }}>{plan.badge}</div>
            )}

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)", marginBottom: 8 }}>{plan.name}</div>
              <div>
                <span style={{ fontSize: 32, fontWeight: 900, color: plan.highlight ? "var(--accent)" : "var(--text1)" }}>
                  {plan.price.monthly === 0 ? "Free" : `₹${interval === "annual" ? Math.round(plan.price.annual / 12) : plan.price.monthly}`}
                </span>
                {plan.price.monthly > 0 && (
                  <span style={{ fontSize: 13, color: "var(--text3)", marginLeft: 4 }}>/mo</span>
                )}
              </div>
              {plan.price.monthly > 0 && interval === "annual" && (
                <div style={{ fontSize: 11, color: "var(--success)", marginTop: 4 }}>
                  Billed ₹{plan.price.annual}/yr — save {Math.round((plan.price.monthly * 12 - plan.price.annual) / (plan.price.monthly * 12) * 100)}%
                </div>
              )}
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, fontSize: 13, color: "var(--text2)" }}>
                  <Check size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => plan.price.monthly === 0 ? null : onUpgrade(plan.name.toLowerCase())}
              disabled={!!payLoading || plan.price.monthly === 0}
              style={{
                width: "100%", padding: "12px", borderRadius: 9, border: plan.ctaStyle === "ghost" ? "1px solid var(--border)" : "none",
                background: plan.ctaStyle === "primary" ? "var(--accent)" : plan.ctaStyle === "secondary" ? "rgba(99,102,241,.15)" : "var(--surface2)",
                color: plan.ctaStyle === "primary" ? "#fff" : plan.ctaStyle === "secondary" ? "var(--accent)" : "var(--text2)",
                fontSize: 14, fontWeight: 700, cursor: plan.price.monthly === 0 ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {payLoading === plan.name.toLowerCase() ? "Opening checkout…" : plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POST JOB FORM (connected to real API)
═══════════════════════════════════════════════════════════════ */
function PostJobForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: "", location: "Bangalore", mode: "hybrid",
    exp: "", salaryMin: "", salaryMax: "", skills: "", jd: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.jd.trim().split(/\s+/).length < 50) { setError("Please write at least 50 words for the job description."); return; }
    setSubmitting(true); setError("");
    const res = await fetch("/api/employer/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json() as { job?: object; error?: string };
    if (data.job) { setSubmitted(true); setTimeout(onSuccess, 2000); }
    else { setError(data.error ?? "Submission failed. Try again."); setSubmitting(false); }
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text1)", fontSize: 14,
    boxSizing: "border-box", fontFamily: "inherit",
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em",
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Job Submitted for Review!</div>
      <div style={{ fontSize: 14, color: "var(--text3)" }}>Our team will approve your post within 24 hours. You'll receive a confirmation email.</div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div><label style={label}>Job Title *</label>
        <input required value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Senior React Developer" style={input} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div><label style={label}>Location</label>
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Bangalore" style={input} />
        </div>
        <div><label style={label}>Work Mode</label>
          <select value={form.mode} onChange={e => set("mode", e.target.value)} style={{ ...input, appearance: "none" as React.CSSProperties["appearance"] }}>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>
        <div><label style={label}>Experience</label>
          <input value={form.exp} onChange={e => set("exp", e.target.value)} placeholder="2–4 yrs" style={input} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><label style={label}>Min Salary (LPA)</label>
          <input type="number" value={form.salaryMin} onChange={e => set("salaryMin", e.target.value)} placeholder="18" style={input} />
        </div>
        <div><label style={label}>Max Salary (LPA)</label>
          <input type="number" value={form.salaryMax} onChange={e => set("salaryMax", e.target.value)} placeholder="26" style={input} />
        </div>
      </div>
      <div><label style={label}>Required Skills (comma-separated)</label>
        <input value={form.skills} onChange={e => set("skills", e.target.value)} placeholder="React, Node.js, TypeScript…" style={input} />
      </div>
      <div>
        <label style={label}>Full Job Description * ({form.jd.trim().split(/\s+/).filter(Boolean).length} words)</label>
        <textarea required value={form.jd} onChange={e => set("jd", e.target.value)}
          rows={7} placeholder="Describe the role, responsibilities, and ideal candidate… (50+ words required)"
          style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
      </div>
      {error && <div style={{ fontSize: 13, color: "var(--danger)", padding: "10px 14px", background: "rgba(239,68,68,.08)", borderRadius: 8 }}>{error}</div>}
      <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99,102,241,.06)", border: "1px solid var(--accborder)", fontSize: 12, color: "var(--text2)" }}>
        🤖 jobSayer AI will match your JD against our candidate pool and rank by fit score. Your job goes live after admin review (usually within 24 hours).
      </div>
      <button type="submit" disabled={submitting} style={{
        padding: "14px", border: "none", borderRadius: 10,
        background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
      }}>
        {submitting ? "Submitting…" : "Post Job & Find Candidates →"}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOCK CANDIDATES (for pool view)
═══════════════════════════════════════════════════════════════ */
const MOCK_CANDIDATES = [
  { id: "c1", name: "Priya Sharma",  title: "Full Stack Engineer",       location: "Bangalore", exp: "4 yrs", skills: ["React","Node.js","TypeScript","AWS"],      score: 82, openTo: "remote",  avatar: "PS" },
  { id: "c2", name: "Arjun Mehta",   title: "Backend Engineer",          location: "Pune",      exp: "3 yrs", skills: ["Go","PostgreSQL","Kubernetes","Docker"],    score: 76, openTo: "hybrid",  avatar: "AM" },
  { id: "c3", name: "Sneha Reddy",   title: "Frontend Developer",        location: "Hyderabad", exp: "2 yrs", skills: ["React","TypeScript","Next.js","CSS"],       score: 71, openTo: "onsite",  avatar: "SR" },
  { id: "c4", name: "Karthik Nair",  title: "DevOps Engineer",           location: "Bangalore", exp: "5 yrs", skills: ["Kubernetes","Terraform","AWS","CI/CD"],     score: 88, openTo: "remote",  avatar: "KN" },
  { id: "c5", name: "Divya Patel",   title: "Python Backend Engineer",   location: "Mumbai",    exp: "3 yrs", skills: ["Python","Django","Redis","PostgreSQL"],     score: 74, openTo: "hybrid",  avatar: "DP" },
  { id: "c6", name: "Rahul Verma",   title: "Full Stack Developer",      location: "Delhi",     exp: "2 yrs", skills: ["React","Node.js","MongoDB","Docker"],       score: 68, openTo: "remote",  avatar: "RV" },
];

/* ═══════════════════════════════════════════════════════════════
   RECRUITER DASHBOARD
═══════════════════════════════════════════════════════════════ */
function RecruiterDashboard({ profile, onViewPricing }: { profile: EmployerProfile; onViewPricing: () => void }) {
  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" };
  const stats = [
    { icon: "💼", label: "Active Jobs",          value: "3",   trend: "+1 this week" },
    { icon: "👥", label: "Candidates Reached",   value: "142", trend: "+28 today" },
    { icon: "📨", label: "Interview Invites",    value: "18",  trend: "5 pending reply" },
    { icon: "✅", label: "Offers Extended",      value: "2",   trend: "1 accepted" },
  ];
  const planColor = profile.plan === "scale" ? "var(--accent)" : profile.plan === "growth" ? "var(--warn)" : "var(--text3)";
  return (
    <div>
      {/* Welcome strip */}
      <div style={{ ...card, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Welcome, {profile.company_name}</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
            Plan: <span style={{ fontWeight: 700, color: planColor, textTransform: "capitalize" }}>{profile.plan}</span>
            {profile.plan === "free" && <> · <Link href="#pricing" style={{ color: "var(--accent)" }}>Upgrade for more features</Link></>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/verify" style={{ padding: "8px 16px", background: profile.plan !== "free" ? "rgba(34,197,94,.08)" : "var(--surface2)", border: `1px solid ${profile.plan !== "free" ? "rgba(34,197,94,.2)" : "var(--border)"}`, borderRadius: 8, color: profile.plan !== "free" ? "var(--success)" : "var(--text3)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            🏅 Verify Company
          </Link>
          <button onClick={onViewPricing} style={{ padding: "8px 16px", background: "var(--accdim)", border: "1px solid var(--accborder)", borderRadius: 8, color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ⚡ {profile.plan === "free" ? "Upgrade Plan" : "View Plans"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text1)", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "var(--success)", marginTop: 2 }}>{s.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Active Job Posts</div>
          {[
            { title: "Senior React Developer", applicants: 34, top: 88, daysLeft: 12 },
            { title: "Backend Engineer (Go)",   applicants: 18, top: 82, daysLeft: 8 },
            { title: "DevOps Engineer",         applicants: 7,  top: 76, daysLeft: 21 },
          ].map(job => (
            <div key={job.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{job.title}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{job.applicants} applicants · Top match: {job.top}%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{job.daysLeft}d left</div>
                <button style={{ marginTop: 4, padding: "4px 10px", border: "none", borderRadius: 6, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View</button>
              </div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Activity</div>
          {[
            { time: "2h ago", text: "Priya Sharma applied for Senior React Developer" },
            { time: "4h ago", text: "Karthik Nair matched your DevOps posting (88%)" },
            { time: "1d ago", text: "Backend Engineer received 12 new applications" },
            { time: "2d ago", text: "Arjun Mehta accepted interview invite" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, fontSize: 13 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
              <div>
                <div style={{ color: "var(--text2)", lineHeight: 1.5 }}>{a.text}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
type View = "landing" | "post" | "pool" | "dashboard";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function RecruitPage() {
  const { user } = useAuth();
  const [view, setView]               = useState<View>("landing");
  const [showAuthModal, setAuthModal] = useState(false);
  const [profile, setProfile]         = useState<EmployerProfile | null>(null);
  const [searchQ, setSearchQ]         = useState("");
  const [interval, setInterval]       = useState<"monthly" | "annual">("monthly");
  const [payLoading, setPayLoading]   = useState<string | null>(null);
  const [payError, setPayError]       = useState("");

  // Load employer profile if signed in
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    fetch("/api/employer/profile")
      .then(r => r.json())
      .then((d: { profile: EmployerProfile | null }) => setProfile(d.profile))
      .catch(() => {});
  }, [user]);

  function requireAuth(action: () => void) {
    if (!user) { setAuthModal(true); return; }
    if (!profile) { setAuthModal(true); return; }
    action();
  }

  const handleUpgrade = useCallback(async (plan: string) => {
    if (!user) { setAuthModal(true); return; }
    setPayError(""); setPayLoading(plan);
    try {
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const orderData = await orderRes.json() as { orderId?: string; amount?: number; currency?: string; key?: string; error?: string };
      if (!orderData.orderId) throw new Error(orderData.error ?? "Could not create order");
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Razorpay failed to load.");
      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key: orderData.key, amount: orderData.amount, currency: orderData.currency ?? "INR",
          order_id: orderData.orderId, name: "jobSayer Employer",
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${interval})`,
          image: "/logo.png",
          prefill: { email: user.email ?? "", name: user.user_metadata?.full_name ?? profile?.company_name ?? "" },
          theme: { color: "var(--accent)" },
          handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...resp, plan, interval }),
            });
            const vd = await verifyRes.json() as { success?: boolean; error?: string };
            if (vd.success) {
              setProfile(p => p ? { ...p, plan } : p);
              resolve();
              setView("dashboard");
            } else reject(new Error(vd.error ?? "Verification failed"));
          },
          modal: { ondismiss: () => reject(new Error("dismissed")) },
        });
        rzp.open();
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      if (msg !== "dismissed") setPayError(msg);
    } finally { setPayLoading(null); }
  }, [user, interval, profile]);

  const filteredCandidates = MOCK_CANDIDATES.filter(c =>
    !searchQ || [c.name, c.title, ...c.skills].some(v => v.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" };

  /* ── Shared Nav ── */
  function PageNav({ title }: { title: string }) {
    return (
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setView("landing")} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            <ArrowLeft size={14} /> Employer Home
          </button>
          {title && <><span style={{ color: "var(--border)", fontSize: 18 }}>›</span><span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span></>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {profile && <span style={{ fontSize: 12, color: "var(--text3)", padding: "6px 12px", background: "var(--surface2)", borderRadius: 7, border: "1px solid var(--border)" }}>🏢 {profile.company_name}</span>}
          <button onClick={() => { setView("landing"); setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 100); }}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "none", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Pricing
          </button>
          <button onClick={() => requireAuth(() => setView("post"))} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={13} /> Post Job
          </button>
          {profile && <button onClick={() => setView("dashboard")} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Dashboard</button>}
        </div>
      </div>
    );
  }

  /* ── Post job ── */
  if (view === "post") {
    if (!user || !profile) {
      setAuthModal(true); setView("landing");
      return null;
    }
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <PageNav title="Post a Job" />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Post a Job</h1>
            <p style={{ fontSize: 14, color: "var(--text3)" }}>Posting as <strong>{profile.company_name}</strong> — the more detail, the better the AI matching.</p>
          </div>
          <div style={card}><PostJobForm onSuccess={() => setView("pool")} /></div>
        </div>
      </div>
    );
  }

  /* ── Candidate pool ── */
  if (view === "pool") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <PageNav title="Candidate Pool" />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Candidate Pool</h1>
              <p style={{ fontSize: 13, color: "var(--text3)" }}>Ranked by jobSayer score · {MOCK_CANDIDATES.length} active candidates</p>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search skills, role…"
                style={{ padding: "8px 12px 8px 30px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, width: 200 }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {filteredCandidates.map(c => {
              const scoreColor = c.score >= 80 ? "var(--success)" : c.score >= 70 ? "var(--warn)" : "var(--danger)";
              return (
                <div key={c.id} style={{ ...card, borderRadius: 14 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${scoreColor}22`, border: `2px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>{c.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: "var(--text2)" }}>{c.title} · {c.location}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{c.exp} · Open to {c.openTo}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{c.score}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase" }}>score</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                    {c.skills.map(s => <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 500, background: "rgba(99,102,241,.08)", color: "var(--accent)", border: "1px solid var(--accborder)" }}>{s}</span>)}
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button style={{ padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "var(--text2)", background: "var(--surface2)", cursor: "pointer" }}>View Profile</button>
                    <button onClick={() => requireAuth(() => {})} style={{ padding: "6px 16px", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--accent)", cursor: "pointer" }}>Contact →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── Dashboard ── */
  if (view === "dashboard") {
    if (!user || !profile) { setAuthModal(true); setView("landing"); return null; }
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <PageNav title="📊 Dashboard" />
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px" }}>
          <RecruiterDashboard profile={profile} onViewPricing={() => { setView("landing"); setTimeout(() => { document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }, 100); }} />
        </div>
      </div>
    );
  }

  /* ── Landing ── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      {/* Nav */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "var(--text3)", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={14} /> Home
          </Link>
          <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🏢 For Employers</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="#pricing" style={{ padding: "6px 14px", borderRadius: 8, background: "none", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
            Pricing
          </a>
          {profile ? (
            <>
              <button onClick={() => setView("dashboard")} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                📊 Dashboard
              </button>
              <button onClick={() => requireAuth(() => setView("post"))} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Post a Job →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setAuthModal(true)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--accborder)", background: "var(--accdim)", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Sign in as Recruiter
              </button>
              <button onClick={() => requireAuth(() => setView("post"))} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Post a Job →
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)", background: "var(--accdim)", border: "1px solid var(--accborder)", padding: "4px 14px", borderRadius: 20, marginBottom: 20 }}>
            For Hiring Teams
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-.02em" }}>
            Hire top Indian tech talent<br />
            <span style={{ background: "linear-gradient(135deg,var(--accent),#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI-matched, not spam-filtered
            </span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--text3)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>
            Every candidate has a verified resume score. Match your JD against pre-scored profiles and reach candidates who <em>actually</em> fit.
          </p>

          {/* ── Auth / action CTAs ── */}
          {profile ? (
            /* Already an employer — quick actions */
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => requireAuth(() => setView("post"))} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                <Plus size={16} /> Post a Job
              </button>
              <button onClick={() => setView("dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                📊 Go to Dashboard
              </button>
            </div>
          ) : (
            /* Not logged in — prominent sign-in + secondary actions */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => setAuthModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 40px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}
              >
                🏢 Sign in as Recruiter — it&apos;s free
              </button>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setView("pool")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Users size={14} /> Browse Candidates
                </button>
                <a href="#pricing" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  See Pricing ↓
                </a>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>
                Free plan includes 3 job posts · No credit card required
              </p>
            </div>
          )}
        </div>

        {/* ── Pricing — moved up so users see it without scrolling ── */}
        <div id="pricing" style={{ marginBottom: 56, scrollMarginTop: 72 }}>
          {/* Interval toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 2, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: 4 }}>
              {(["monthly", "annual"] as const).map(i => (
                <button key={i} onClick={() => setInterval(i)} style={{
                  padding: "7px 20px", borderRadius: 7, border: "none",
                  background: interval === i ? "var(--accent)" : "transparent",
                  color: interval === i ? "#fff" : "var(--text2)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {i === "monthly" ? "Monthly" : "Annual · Save ~30%"}
                </button>
              ))}
            </div>
          </div>
          <EmployerPricing interval={interval} onUpgrade={handleUpgrade} payLoading={payLoading} />
          {payError && (
            <div style={{ maxWidth: 500, margin: "16px auto 0", padding: "12px 16px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 10, fontSize: 13, color: "var(--danger)", textAlign: "center" }}>
              {payError}
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 56 }}>
          {[
            { value: "2,400+", label: "Scored Candidates" },
            { value: "91%",    label: "ATS Pass Rate" },
            { value: "3.2 days", label: "Avg Time to Match" },
            { value: "78%",    label: "Candidate Reply Rate" },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Features ── */}
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>Why recruiters choose jobSayer</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 56 }}>
          {[
            { icon: "🎯", title: "AI-Scored Profiles",      desc: "Every candidate has a resume score (0–100) across ATS compatibility, keywords, and impact language." },
            { icon: "🔍", title: "JD-to-Profile Matching",  desc: "Paste your JD and instantly see ranked candidate match % — no manual shortlisting." },
            { icon: "👻", title: "Ghost-Proof Posting",      desc: "We flag JDs with ghost signals. Your posts are reviewed so candidates trust your openings." },
            { icon: "⚡", title: "Fast Response Pool",       desc: "Candidates are actively job hunting — average reply rate 78%, 3× higher than job boards." },
            { icon: "📊", title: "Hiring Analytics",         desc: "Track applicant flow, funnel conversion, and competitor salary benchmarks." },
            { icon: "🆓", title: "Free to Start",            desc: "Post your first 3 jobs free. Upgrade when you need scale." },
          ].map(f => (
            <div key={f.title} style={card}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ ...card, textAlign: "center", padding: "48px", background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(99,102,241,.04))", borderColor: "var(--accborder)", marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Ready to hire smarter?</h2>
          <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Post your first job in under 5 minutes — free to start, no credit card required.</p>
          {profile ? (
            <button onClick={() => requireAuth(() => setView("post"))} style={{ padding: "14px 36px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Post a Job →
            </button>
          ) : (
            <button onClick={() => setAuthModal(true)} style={{ padding: "14px 36px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              🏢 Sign in as Recruiter — Free →
            </button>
          )}
        </div>
      </div>

      {/* Auth modal */}
      {showAuthModal && (
        <EmployerAuthModal
          onClose={() => setAuthModal(false)}
          onProfile={(p) => { setProfile(p); setAuthModal(false); }}
        />
      )}
    </div>
  );
}
