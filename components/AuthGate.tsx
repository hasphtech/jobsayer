"use client";
/**
 * AuthGate — wraps the entire resume app.
 * Same auth pattern as billing.emi24.com:
 *   loading + cookie found → spinner (returning user)
 *   loading + no cookie   → show sign-in immediately
 *   user authenticated    → render children inside persistent header shell
 */
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle, LogOut, ChevronDown } from "lucide-react";

const inp: React.CSSProperties = {
  background: "var(--surface2)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text1)", fontSize: 14,
  padding: "11px 13px", outline: "none", width: "100%",
  fontFamily: "inherit", letterSpacing: ".5px",
  transition: "border-color .15s, box-shadow .15s",
};

const btn = (accent = false): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  width: "100%", padding: "12px 0", borderRadius: 9, cursor: "pointer",
  fontFamily: "inherit", fontSize: 14, fontWeight: 700,
  border: accent ? "none" : "1px solid var(--border)",
  background: accent ? "var(--accent)" : "var(--surface2)",
  color: accent ? "#000" : "var(--text2)",
  transition: "opacity .15s",
});

type OtpStep = "idle" | "email" | "code" | "sending" | "verifying";

function hasStoredSession(): boolean {
  try {
    return document.cookie.split(";").some(c => /sb-.+-auth-token/.test(c.trim()));
  } catch { return false; }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle, signInWithOtp, verifyOtp, signOut } = useAuth();

  const [otpStep,      setOtpStep]      = useState<OtpStep>("idle");
  const [email,        setEmail]        = useState("");
  const [code,         setCode]         = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [googleBusy,   setGoogleBusy]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef                     = useRef<HTMLDivElement>(null);

  /* Close user dropdown on outside click */
  useEffect(() => {
    if (!userMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  const hasSession = typeof window !== "undefined" && hasStoredSession();

  if (loading) {
    if (!hasSession) {
      // fall through to sign-in
    } else {
      return (
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
          <Loader2 size={28} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
        </div>
      );
    }
  }

  if (user) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "var(--bg)" }}>
      {/* ── Persistent top bar ──────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 48, zIndex: 100,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px",
      }}>
        {/* Brand */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, color: "#fff", flexShrink: 0,
          }}>R</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text1)", lineHeight: 1 }}>Resume</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: "var(--text3)", letterSpacing: ".3px" }}>by emi24.com</div>
          </div>
        </a>

        {/* User chip + dropdown */}
        <div ref={userMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "5px 10px 5px 7px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "var(--accent)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 900, color: "#000",
            }}>
              {(user.email?.[0] ?? "U").toUpperCase()}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, color: "var(--text2)",
              maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{user.email}</span>
            <ChevronDown size={11} style={{ color: "var(--text3)", transform: userMenuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>

          {userMenuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "8px 0",
              boxShadow: "0 8px 28px rgba(0,0,0,.4)",
              minWidth: 190, zIndex: 200,
            }}>
              <div style={{ padding: "4px 14px 8px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>Signed in as</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", wordBreak: "break-all" }}>{user.email}</div>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); signOut(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "9px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text2)", fontSize: 12, fontWeight: 600,
                  fontFamily: "inherit", textAlign: "left",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <LogOut size={13} style={{ color: "var(--text3)" }} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content (push down by header height) ─────────────── */}
      <div style={{ flex: 1, marginTop: 48 }}>
        {children}
      </div>
    </div>
  );

  async function handleGoogle() {
    setError(null); setGoogleBusy(true);
    try { await signInWithGoogle(); }
    catch { setError("Google sign-in failed. Please try again."); }
    finally { setGoogleBusy(false); }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null); setOtpStep("sending");
    const { error: err } = await signInWithOtp(email.trim().toLowerCase());
    if (err) { setError(err); setOtpStep("email"); }
    else     { setOtpStep("code"); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setError(null); setOtpStep("verifying");
    const { error: err } = await verifyOtp(email.trim().toLowerCase(), code.trim());
    if (err) { setError("Invalid or expired code. Please try again."); setOtpStep("code"); }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "24px 16px" }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "36px 32px",
        boxShadow: "0 24px 64px rgba(0,0,0,.5)",
        animation: "fadeIn .22s ease both",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0,
          }}>R</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)", lineHeight: 1 }}>Resume</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", letterSpacing: ".3px", marginTop: 1 }}>by emi24.com</div>
          </div>
        </div>

        {/* OTP verify */}
        {(otpStep === "code" || otpStep === "verifying") && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <button onClick={() => { setOtpStep("email"); setCode(""); setError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 0 }}>
                <ArrowLeft size={16} />
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text1)", margin: 0 }}>Check your email</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20, lineHeight: 1.5 }}>
              We sent a 6-digit code to <strong style={{ color: "var(--text2)" }}>{email}</strong>
            </p>
            <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                style={{ ...inp, fontSize: 22, fontWeight: 800, textAlign: "center", letterSpacing: "6px" }}
                placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6} inputMode="numeric" autoFocus
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accdim)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
              {error && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--danger)", background: "var(--dangerdim)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 7, padding: "8px 10px" }}><AlertCircle size={13} /> {error}</div>}
              <button type="submit" disabled={code.length !== 6 || otpStep === "verifying"} style={btn(true)}>
                {otpStep === "verifying" ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Verifying…</> : <><CheckCircle2 size={15} /> Verify Code</>}
              </button>
            </form>
            <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 16 }}>
              Didn&apos;t get it?{" "}
              <button onClick={() => { setOtpStep("email"); setCode(""); setError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 11, fontWeight: 600, padding: 0 }}>Try again</button>
            </p>
          </>
        )}

        {/* Email entry */}
        {(otpStep === "email" || otpStep === "sending") && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <button onClick={() => { setOtpStep("idle"); setEmail(""); setError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 0 }}>
                <ArrowLeft size={16} />
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text1)", margin: 0 }}>Sign in with email</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20, lineHeight: 1.5 }}>Enter your email and we&apos;ll send a one-time code.</p>
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email" style={inp} placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accdim)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
              {error && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--danger)", background: "var(--dangerdim)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 7, padding: "8px 10px" }}><AlertCircle size={13} /> {error}</div>}
              <button type="submit" disabled={!email.trim() || otpStep === "sending"} style={btn(true)}>
                {otpStep === "sending" ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : <><Mail size={15} /> Send Code</>}
              </button>
            </form>
          </>
        )}

        {/* Initial choice */}
        {otpStep === "idle" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text1)", marginBottom: 6 }}>Sign in to continue</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24, lineHeight: 1.5 }}>
              Your resumes are synced to your account. Sign in to access them from any device.
            </p>
            {error && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--danger)", background: "var(--dangerdim)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 7, padding: "8px 10px", marginBottom: 14 }}><AlertCircle size={13} /> {error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handleGoogle} disabled={googleBusy} style={btn(true)}>
                {googleBusy ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</> : <><GoogleIcon /> Continue with Google</>}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <button onClick={() => { setOtpStep("email"); setError(null); }} style={btn(false)}>
                <Mail size={15} /> Continue with Email
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 20, lineHeight: 1.5 }}>
              By signing in you agree to JobSayer&apos;s{" "}
              <a href="https://emi24.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Privacy Policy</a>
              {" "}&amp;{" "}
              <a href="https://emi24.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Terms</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
