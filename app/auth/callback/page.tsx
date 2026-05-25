"use client";
/**
 * /auth/callback — Google OAuth PKCE landing page for the resume builder.
 *
 * WHY NO exchangeCodeForSession() HERE:
 * @supabase/ssr's createBrowserClient sets detectSessionInUrl: true, so the
 * client auto-exchanges the ?code= param the moment it initialises (consuming
 * the PKCE verifier cookie). Calling exchangeCodeForSession() manually in a
 * useEffect races that auto-exchange — the verifier is already gone → the
 * "PKCE code verifier not found in storage" error.
 *
 * Fix: just await getSupabaseAsync() (which internally awaits getSession(),
 * giving the auto-exchange time to settle), then redirect. No manual exchange.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseAsync } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    if (params.get("error") || hashParams.get("error")) {
      router.replace("/");
      return;
    }

    (async () => {
      try {
        // Initialising the client triggers detectSessionInUrl → auto-exchanges
        // the PKCE code. getSupabaseAsync() awaits getSession() internally, so
        // by the time it resolves the session cookie is already written.
        await getSupabaseAsync();
        router.replace("/");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", fontFamily: "inherit", color: "var(--text3)", fontSize: 14 }}>
      {error ? (
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>Sign-in failed</div>
          <div style={{ color: "var(--text3)", marginBottom: 20, lineHeight: 1.5 }}>{error}</div>
          <button onClick={() => router.replace("/")} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Back to Resume Builder
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", margin: "0 auto 14px" }}>R</div>
          <div style={{ fontWeight: 600, color: "var(--text2)" }}>Signing you in…</div>
        </div>
      )}
    </div>
  );
}
