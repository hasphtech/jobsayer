"use client";
/**
 * UpgradePlans — embeddable pricing/upgrade UI
 * Used inside /profile. Extracted from the old /upgrade page.
 */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Star, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCurrency, formatPrice } from "@/lib/useCurrency";

/* ── Razorpay script loader ─────────────────────────────────── */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ── Prices & features ──────────────────────────────────────── */
const PRICES = {
  starter: { monthly: 9,  annual: 84  },
  pro:     { monthly: 19, annual: 168 },
} as const;

const FEATURES = {
  free: [
    "2 saved resumes",
    "4 basic templates",
    "PDF export",
    "ATS score",
    "Matched jobs feed",
    "Public share link",
  ],
  starter: [
    "5 saved resumes",
    "All 20+ templates",
    "PDF + DOCX export",
    "ATS score + JD Tailor",
    "Matched jobs + Job tracker",
    "AI writing assistant",
    "Interview prep (AI)",
    "Career GPS roadmap",
    "Resume upload & parse",
    "Draft auto-save",
  ],
  pro: [
    "Unlimited resumes",
    "All 20+ templates",
    "PDF + DOCX export",
    "ATS score + JD Tailor",
    "Matched jobs + Job tracker",
    "AI writing assistant",
    "Interview prep (AI)",
    "Career GPS roadmap",
    "Salary intelligence",
    "LinkedIn Optimizer",
    "AI cover letter writer",
    "Resume upload & parse",
    "Draft auto-save",
    "Priority support",
  ],
} as const;

export default function UpgradePlans() {
  const router   = useRouter();
  const { user } = useAuth();
  const currency = useCurrency();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [payLoading, setPayLoading] = useState<string | null>(null);
  const [payError,   setPayError]   = useState("");

  const annualSavingStarter = Math.round(
    (PRICES.starter.monthly * 12 - PRICES.starter.annual) / (PRICES.starter.monthly * 12) * 100
  );
  const annualSavingPro = Math.round(
    (PRICES.pro.monthly * 12 - PRICES.pro.annual) / (PRICES.pro.monthly * 12) * 100
  );

  function getUsdPrice(tier: "starter" | "pro") {
    return interval === "monthly" ? PRICES[tier].monthly : Math.round(PRICES[tier].annual / 12);
  }
  function getDisplayPrice(tier: "starter" | "pro") {
    return formatPrice(getUsdPrice(tier), currency);
  }

  const handleUpgrade = useCallback(async (plan: "starter" | "pro") => {
    setPayError("");
    if (!user) { router.push("/login?next=/profile"); return; }
    setPayLoading(plan);
    try {
      if (currency.code === "INR") {
        const orderRes = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval }),
        });
        const orderData = await orderRes.json() as { orderId?: string; amount?: number; currency?: string; key?: string; error?: string };
        if (!orderData.orderId) throw new Error(orderData.error ?? "Could not create order");

        const loaded = await loadRazorpay();
        if (!loaded) throw new Error("Razorpay failed to load. Check your connection.");

        await new Promise<void>((resolve, reject) => {
          const rzp = new (window as any).Razorpay({
            key:         orderData.key,
            amount:      orderData.amount,
            currency:    orderData.currency ?? "INR",
            order_id:    orderData.orderId,
            name:        "jobSayer",
            description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${interval})`,
            image:       "/logo.png",
            prefill: { email: user.email ?? "", name: user.user_metadata?.full_name ?? "" },
            theme: { color: "var(--accent)" },
            handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...response, plan, interval }),
              });
              const verifyData = await verifyRes.json() as { success?: boolean; error?: string };
              if (verifyData.success) { resolve(); router.push("/profile?upgraded=1"); }
              else reject(new Error(verifyData.error ?? "Payment verification failed"));
            },
            modal: { ondismiss: () => reject(new Error("dismissed")) },
          });
          rzp.open();
        });
      } else {
        const res = await fetch("/api/payment/stripe-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval, currency: currency.code }),
        });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Could not create Stripe session");
        window.location.href = data.url;
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg !== "dismissed") setPayError(msg);
    } finally {
      setPayLoading(null);
    }
  }, [user, interval, currency, router]);

  return (
    <div id="upgrade">
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--accdim)", border: "1px solid var(--accborder)",
          borderRadius: 20, padding: "4px 12px",
          fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12,
        }}>
          <Sparkles size={11} /> Choose your plan
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text1)", margin: "0 0 6px" }}>
          Unlock your full career toolkit
        </h2>
        <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
          Start free. Upgrade anytime to access AI features, unlimited resumes, and more.
        </p>
      </div>

      {/* Interval toggle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <div style={{
          display: "inline-flex", background: "var(--surface2)",
          border: "1px solid var(--border)", borderRadius: 10,
          padding: 3, gap: 2,
        }}>
          {(["monthly", "annual"] as const).map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              style={{
                padding: "7px 18px", borderRadius: 8, border: "none",
                cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: interval === iv ? "var(--accent)" : "transparent",
                color: interval === iv ? "#fff" : "var(--text3)",
                transition: "all .15s",
              }}
            >
              {iv === "monthly" ? "Monthly" : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  Annual
                  <span style={{
                    background: "var(--success)", color: "#fff",
                    fontSize: 9, fontWeight: 800, borderRadius: 4, padding: "1px 5px",
                  }}>
                    save {annualSavingPro}%
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 14,
      }}>
        <PlanCard
          name="Free"
          price="Free"
          interval={interval}
          badge={null}
          features={FEATURES.free}
          cta="Current plan"
          ctaStyle="secondary"
          onCta={() => {}}
          disabled
        />
        <PlanCard
          name="Career Pro"
          price={getDisplayPrice("starter")}
          interval={interval}
          badge={interval === "annual" ? `Save ${annualSavingStarter}%` : "Most popular"}
          features={FEATURES.starter}
          cta={payLoading === "starter" ? "Opening checkout…" : "Upgrade to Career Pro"}
          ctaStyle="secondary"
          onCta={() => handleUpgrade("starter")}
        />
        <PlanCard
          name="Career Elite"
          price={getDisplayPrice("pro")}
          interval={interval}
          badge={interval === "annual" ? `Save ${annualSavingPro}%` : null}
          features={FEATURES.pro}
          cta={payLoading === "pro" ? "Opening checkout…" : "Upgrade to Career Elite"}
          ctaStyle="primary"
          highlight
          icon={<Star size={13} fill="currentColor" />}
          onCta={() => handleUpgrade("pro")}
        />
      </div>

      {payError && (
        <div style={{
          marginTop: 16, padding: "12px 16px",
          background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)",
          borderRadius: 10, fontSize: 13, color: "var(--danger)", textAlign: "center",
        }}>
          {payError}
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 20, textAlign: "center" }}>
        Prices in {currency.code}.{currency.code !== "USD" ? " Converted from USD at indicative rates." : ""}{" "}
        Cancel anytime. Questions?{" "}
        <a href="mailto:hello@jobsayer.com" style={{ color: "var(--accent)" }}>hello@jobsayer.com</a>
      </p>
    </div>
  );
}

/* ── PlanCard ────────────────────────────────────────────────── */
interface PlanCardProps {
  name:      string;
  price:     string;
  interval:  "monthly" | "annual";
  badge:     string | null;
  features:  readonly string[];
  cta:       string;
  ctaStyle:  "primary" | "secondary";
  highlight?: boolean;
  icon?:     React.ReactNode;
  disabled?: boolean;
  onCta:     () => void;
}

function PlanCard({ name, price, interval, badge, features, cta, ctaStyle, highlight, icon, disabled, onCta }: PlanCardProps) {
  return (
    <div style={{
      background: highlight ? "var(--accent)" : "var(--surface)",
      border: highlight ? "none" : "1px solid var(--border)",
      borderRadius: 14, padding: "22px 20px",
      display: "flex", flexDirection: "column",
      position: "relative",
      boxShadow: highlight ? "0 12px 40px rgba(99,102,241,.3)" : "none",
    }}>
      {badge && (
        <div style={{
          position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
          background: highlight ? "#fff" : "var(--accent)",
          color: highlight ? "var(--accent)" : "#fff",
          fontSize: 10, fontWeight: 800, borderRadius: 20,
          padding: "3px 12px", whiteSpace: "nowrap",
        }}>
          {badge}
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 800,
        color: highlight ? "rgba(255,255,255,.8)" : "var(--text3)",
        marginBottom: 8,
      }}>
        {icon} {name.toUpperCase()}
      </div>
      <div style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 34, fontWeight: 900, color: highlight ? "#fff" : "var(--text1)" }}>
          {price}
        </span>
        {price !== "Free" && (
          <span style={{ fontSize: 12, fontWeight: 600, color: highlight ? "rgba(255,255,255,.7)" : "var(--text3)", marginLeft: 4 }}>
            /mo{interval === "annual" ? " billed annually" : ""}
          </span>
        )}
      </div>
      <button
        onClick={onCta}
        disabled={disabled}
        style={{
          width: "100%", padding: "10px 0", borderRadius: 9,
          cursor: disabled ? "default" : "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 800,
          marginBottom: 18, opacity: disabled ? 0.5 : 1,
          background: ctaStyle === "primary"
            ? "#fff"
            : highlight ? "rgba(255,255,255,.15)" : "var(--surface2)",
          color: ctaStyle === "primary"
            ? "var(--accent)"
            : highlight ? "#fff" : "var(--text1)",
          border: ctaStyle === "secondary" && !highlight ? "1px solid var(--border)" : "none",
        }}
      >
        {cta}
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Check size={12} style={{ flexShrink: 0, marginTop: 2, color: highlight ? "#fff" : "var(--accent)" }} />
            <span style={{ fontSize: 12, lineHeight: 1.4, color: highlight ? "rgba(255,255,255,.9)" : "var(--text2)" }}>
              {f}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
