"use client";
/**
 * /upgrade/success
 * Landing page after a successful Stripe Checkout.
 * Verifies the session and redirects to /profile with a success toast.
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { track } from "@/lib/analytics";

export default function UpgradeSuccessPage() {
  const router  = useRouter();
  const params  = useSearchParams();
  const { user } = useAuth();

  const sessionId = params.get("session_id");
  const plan      = params.get("plan") ?? "pro";

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMsg("No session ID found.");
      return;
    }

    // Verify the Stripe session server-side
    fetch("/api/payment/stripe-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, plan }),
    })
      .then(r => r.json())
      .then((data: { success?: boolean; error?: string }) => {
        if (data.success) {
          setStatus("success");
          track("plan_purchased", { provider: "stripe", plan });
          // Redirect after brief celebration
          setTimeout(() => router.replace("/profile?upgraded=1"), 2500);
        } else {
          setStatus("error");
          setMsg(data.error ?? "Verification failed. Contact support@jobsayer.com.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMsg("Network error — your payment likely succeeded. Check your email or contact support.");
      });
  }, [sessionId, plan, router]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      {status === "verifying" && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Confirming your payment…</h1>
          <p style={{ color: "var(--text3)", marginTop: 8 }}>Just a moment while we activate your plan.</p>
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>You're now on {plan.charAt(0).toUpperCase() + plan.slice(1)}!</h1>
          <p style={{ color: "var(--text3)", marginTop: 8, fontSize: 15 }}>Your account has been upgraded. Redirecting to your profile…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Something went wrong</h1>
          <p style={{ color: "var(--danger)", marginTop: 8, maxWidth: 420 }}>{msg}</p>
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
            <a href="/upgrade" style={{ padding: "10px 20px", borderRadius: 10, background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Try Again</a>
            <a href="mailto:support@jobsayer.com" style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", color: "var(--text2)", textDecoration: "none", fontSize: 14 }}>Contact Support</a>
          </div>
        </>
      )}
    </div>
  );
}
