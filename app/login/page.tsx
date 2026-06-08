"use client";
/**
 * /login — Unified sign-in / sign-up page
 * Methods: Google OAuth · LinkedIn OIDC · Magic Link (OTP) · Enterprise SSO
 *
 * After auth the user is redirected to ?next= (default: /dashboard).
 * New users are redirected to /onboarding instead.
 */
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTheme } from "@/lib/useTheme";
import { track } from "@/lib/analytics";

type Mode = "options" | "email" | "otp" | "sso";

export default function LoginPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const nextUrl      = params.get("next") ?? "/dashboard";
  const { user, loading, signInWithGoogle, signInWithLinkedIn, signInWithOtp, verifyOtp } = useAuth();
  const { dark }     = useTheme();

  const [mode,    setMode]    = useState<Mode>("options");
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [ssoOrg,  setSsoOrg]  = useState("");
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");
  const [info,    setInfo]    = useState("");

  // Redirect if already authed
  useEffect(() => {
    if (!loading && user) router.replace(nextUrl);
  }, [user, loading, nextUrl, router]);

  async function handleGoogle() {
    setBusy(true); setErr("");
    track("sso_login_attempted", { provider: "google" });
    await signInWithGoogle(nextUrl);
    setBusy(false);
  }

  async function handleLinkedIn() {
    setBusy(true); setErr("");
    track("sso_login_attempted", { provider: "linkedin" });
    await signInWithLinkedIn(nextUrl);
    setBusy(false);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setErr("Enter your email."); return; }
    setBusy(true); setErr(""); setInfo("");
    const { error } = await signInWithOtp(email.trim().toLowerCase());
    setBusy(false);
    if (error) { setErr(error); return; }
    setInfo("Check your inbox — we sent a 6-digit code.");
    setMode("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) { setErr("Enter the 6-digit code."); return; }
    setBusy(true); setErr("");
    const { error } = await verifyOtp(email.trim().toLowerCase(), otp.trim());
    setBusy(false);
    if (error) { setErr("Invalid or expired code. Try again."); return; }
    track("sso_login_attempted", { provider: "email_otp" });
    router.replace(nextUrl);
  }

  async function handleEnterpriseSSO(e: React.FormEvent) {
    e.preventDefault();
    if (!ssoOrg.trim()) { setErr("Enter your organisation domain."); return; }
    setBusy(true); setErr("");
    // Enterprise SSO: call the stub route which resolves the SAML/OIDC provider
    const res = await fetch("/api/auth/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: ssoOrg.trim().toLowerCase(), next: nextUrl }),
    });
    const json = await res.json() as { redirectUrl?: string; error?: string };
    setBusy(false);
    if (!res.ok || !json.redirectUrl) {
      setErr(json.error ?? "Organisation not found. Contact enterprise@jobsayer.com.");
      return;
    }
    track("sso_login_attempted", { provider: "saml", org: ssoOrg });
    window.location.href = json.redirectUrl;
  }

  // Gradient text helper
  const brandGrad = dark
    ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" }
    : {};

  const inp: React.CSSProperties = {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 10, color: "var(--text1)", padding: "12px 14px", fontSize: 15,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
  };

  const socialBtn = (bg: string, fg: string): React.CSSProperties => ({
    width: "100%", padding: "13px 18px", borderRadius: 12,
    border: "1px solid var(--border)", background: bg, color: fg,
    fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    transition: "opacity .15s",
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>

      {/* Logo */}
      <a href="/" style={{ textDecoration: "none", marginBottom: 32 }}>
        <span style={{ fontWeight: 800, fontSize: 24, ...brandGrad, color: dark ? undefined : "var(--accent)" }}>jobSayer</span>
      </a>

      <div style={{ width: "100%", maxWidth: 400, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Options ── */}
        {(mode === "options") && (
          <>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Welcome to jobSayer</h1>
              <p style={{ fontSize: 14, color: "var(--text3)", marginTop: 6 }}>Sign in or create your account</p>
            </div>

            {/* Google */}
            <button onClick={handleGoogle} disabled={busy} style={socialBtn("var(--surface2)", "var(--text1)")}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>

            {/* LinkedIn */}
            <button onClick={handleLinkedIn} disabled={busy} style={socialBtn("#0A66C2", "#fff")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M19 0H5C2.239 0 0 2.239 0 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z"/></svg>
              Continue with LinkedIn
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text3)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Magic link */}
            <button onClick={() => setMode("email")} style={{ ...socialBtn("none", "var(--text1)"), border: "1px solid var(--border)" }}>
              ✉️ Continue with Email
            </button>

            {/* Enterprise SSO */}
            <button onClick={() => setMode("sso")} style={{ padding: "10px", fontSize: 13, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              🔑 Enterprise SSO
            </button>
          </>
        )}

        {/* ── Email / OTP ── */}
        {(mode === "email" || mode === "otp") && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <button onClick={() => { setMode("options"); setErr(""); setInfo(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18, padding: 0 }}>←</button>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {mode === "email" ? "Enter your email" : "Check your inbox"}
              </h2>
            </div>

            {info && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", fontSize: 13, color: "var(--success)" }}>{info}</div>}
            {err  && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", fontSize: 13, color: "var(--danger)" }}>{err}</div>}

            {mode === "email" ? (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" autoFocus autoComplete="email"
                  style={inp}
                />
                <button type="submit" disabled={busy} style={{ padding: "13px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  {busy ? "Sending…" : "Send Magic Link →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 14, color: "var(--text3)", margin: 0 }}>
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <input
                  type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" autoFocus maxLength={6} inputMode="numeric"
                  style={{ ...inp, textAlign: "center", fontSize: 28, letterSpacing: 8, fontWeight: 700 }}
                />
                <button type="submit" disabled={busy || otp.length < 6} style={{ padding: "13px", borderRadius: 12, border: "none", background: otp.length >= 6 ? "var(--accent)" : "var(--surface2)", color: otp.length >= 6 ? "#fff" : "var(--text3)", fontSize: 15, fontWeight: 700, cursor: otp.length >= 6 ? "pointer" : "not-allowed" }}>
                  {busy ? "Verifying…" : "Sign In →"}
                </button>
                <button type="button" onClick={() => handleSendOtp({ preventDefault: () => {} } as React.FormEvent)} style={{ padding: "8px", fontSize: 13, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>
                  Resend code
                </button>
              </form>
            )}
          </>
        )}

        {/* ── Enterprise SSO ── */}
        {mode === "sso" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <button onClick={() => { setMode("options"); setErr(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18, padding: 0 }}>←</button>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Enterprise SSO</h2>
            </div>

            <p style={{ fontSize: 14, color: "var(--text3)", margin: 0 }}>
              Enter your organisation's domain to sign in with your company's identity provider (SAML / OIDC).
            </p>

            {err && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", fontSize: 13, color: "var(--danger)" }}>{err}</div>}

            <form onSubmit={handleEnterpriseSSO} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text" value={ssoOrg} onChange={e => setSsoOrg(e.target.value)}
                placeholder="yourcompany.com" autoFocus
                style={inp}
              />
              <button type="submit" disabled={busy} style={{ padding: "13px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {busy ? "Looking up…" : "Continue with SSO →"}
              </button>
            </form>

            <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface2)", fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text2)" }}>Enterprise customers:</strong> SSO is available on Team and Enterprise plans.
              Contact <a href="mailto:enterprise@jobsayer.com" style={{ color: "var(--accent)" }}>enterprise@jobsayer.com</a> to set up your identity provider.
            </div>
          </>
        )}

      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
        By continuing you agree to our{" "}
        <a href="/terms" style={{ color: "var(--accent)" }}>Terms</a>{" & "}
        <a href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>
      </p>
    </div>
  );
}
