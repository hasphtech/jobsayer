"use client";
/**
 * /upgrade — JobSayer pricing page
 * Three tiers: Free · Starter · Pro
 * Payments via Razorpay checkout popup.
 */
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Star, Sparkles } from "lucide-react";
import { PLAN_DEFAULTS } from "@/lib/resumePlan";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { useCurrency, formatPrice, type CurrencyInfo } from "@/lib/useCurrency";

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

/* ── Base USD prices ────────────────────────────────────────── */
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

export default function UpgradePage() {
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
    if (!user) { router.push("/"); return; }

    setPayLoading(plan);
    try {
      // 1. Create Razorpay order server-side
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const orderData = await orderRes.json() as { orderId?: string; amount?: number; currency?: string; key?: string; error?: string };
      if (!orderData.orderId) throw new Error(orderData.error ?? "Could not create order");

      // 2. Load Razorpay checkout
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Razorpay failed to load. Check your connection.");

      // 3. Open checkout popup
      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key:         orderData.key,
          amount:      orderData.amount,
          currency:    orderData.currency ?? "INR",
          order_id:    orderData.orderId,
          name:        "jobSayer",
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${interval})`,
          image:       "/logo.png",
          prefill: {
            email: user.email ?? "",
            name:  user.user_metadata?.full_name ?? "",
          },
          theme: { color: "var(--accent)" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            // 4. Verify payment server-side
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, plan, interval }),
            });
            const verifyData = await verifyRes.json() as { success?: boolean; error?: string };
            if (verifyData.success) {
              resolve();
              router.push("/profile?upgraded=1");
            } else {
              reject(new Error(verifyData.error ?? "Payment verification failed"));
            }
          },
          modal: {
            ondismiss: () => reject(new Error("dismissed")),
          },
        });
        rzp.open();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg !== "dismissed") setPayError(msg);
    } finally {
      setPayLoading(null);
    }
  }, [user, interval, router]);

  return (
    <AppShell>
      {/* ── Header ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", paddingTop: 32, textAlign: "center" }}>
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute", left: 20, top: 16,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text3)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          ← Back
        </button>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--accdim)", borderWidth: 1, borderStyle: "solid",
          borderColor: "var(--accborder)", borderRadius: 20,
          padding: "4px 12px", fontSize: 11, fontWeight: 700,
          color: "var(--accent)", marginBottom: 16,
        }}>
          <Sparkles size={11} /> JobSayer Plans
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--text1)", margin: "0 0 10px" }}>
          Grow your career with jobSayer
        </h1>
        <p style={{ fontSize: 15, color: "var(--text3)", margin: "0 0 28px", lineHeight: 1.6 }}>
          Start free. Upgrade to unlock AI, unlimited resumes, and the full career toolkit.
        </p>

        {/* ── Interval toggle ── */}
        <div style={{
          display: "inline-flex", background: "var(--surface2)",
          border: "1px solid var(--border)", borderRadius: 10,
          padding: 3, gap: 2, marginBottom: 40,
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
                    fontSize: 9, fontWeight: 800, borderRadius: 4,
                    padding: "1px 5px",
                  }}>
                    save {annualSavingPro}%
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Pricing cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16, maxWidth: 860, margin: "0 auto",
        }}>

          {/* Free */}
          <PlanCard
            name="Free"
            price="Free"
            interval={interval}
            badge={null}
            features={FEATURES.free}
            cta="Get started free"
            ctaStyle="secondary"
            onCta={() => router.push("/builder")}
          />

          {/* Career Pro */}
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

          {/* Career Elite — highlighted */}
          <PlanCard
            name="Career Elite"
            price={getDisplayPrice("pro")}
            interval={interval}
            badge={interval === "annual" ? `Save ${annualSavingPro}%` : null}
            features={FEATURES.pro}
            cta={payLoading === "pro" ? "Opening checkout…" : "Upgrade to Career Elite"}
            ctaStyle="primary"
            highlight
            icon={<Star size={14} fill="currentColor" />}
            onCta={() => handleUpgrade("pro")}
          />
        </div>

        {/* Payment error */}
        {payError && (
          <div style={{
            maxWidth: 500, margin: "16px auto 0", padding: "12px 16px",
            background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)",
            borderRadius: 10, fontSize: 13, color: "var(--danger)", textAlign: "center",
          }}>
            {payError}
          </div>
        )}

        {/* ── FAQ strip ── */}
        <div style={{ maxWidth: 600, margin: "48px auto 0", textAlign: "left" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text1)", marginBottom: 16 }}>
            Common questions
          </h2>
          {[
            ["Can I try Pro features before paying?",
              "Start with Free — you get ATS scoring, JD matching, and shareable links with no card required."],
            ["What happens to my resumes if I downgrade?",
              "Your saved resumes stay intact. You'll just be limited to editing 2 at a time on Free."],
            ["Is payment secure?",
              "Payments are processed via Stripe — a PCI DSS Level 1 certified gateway trusted by millions of businesses globally. We never store your card details."],
            ["Can I cancel anytime?",
              "Yes. Cancel before the next billing cycle and you won't be charged again. Access continues until the period ends."],
            ["Can I share my resume without signing up?",
              "You need a free account to get a shareable link, but it costs nothing."],
          ].map(([q, a]) => (
            <div key={q} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 4 }}>{q}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{a}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 32 }}>
          Prices shown in {currency.code}.{currency.code !== "USD" ? " Converted from USD at indicative rates." : ""} Cancel anytime. Questions?{" "}
          <a href="mailto:hello@jobsayer.com" style={{ color: "var(--accent)" }}>hello@jobsayer.com</a>
        </p>
      </div>
    </AppShell>
  );
}

// ── Plan card component ───────────────────────────────────────

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
  onCta:     () => void;
}

function PlanCard({ name, price, interval, badge, features, cta, ctaStyle, highlight, icon, onCta }: PlanCardProps) {
  return (
    <div style={{
      background: highlight ? "var(--accent)" : "var(--surface)",
      border: highlight ? "none" : "1px solid var(--border)",
      borderRadius: 14,
      padding: "24px 22px",
      display: "flex", flexDirection: "column", gap: 0,
      position: "relative",
      boxShadow: highlight ? "0 12px 40px rgba(99,102,241,.35)" : "none",
    }}>
      {/* Badge */}
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

      {/* Name */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 13, fontWeight: 800,
        color: highlight ? "rgba(255,255,255,.85)" : "var(--text3)",
        marginBottom: 8,
      }}>
        {icon} {name.toUpperCase()}
      </div>

      {/* Price */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontSize: 38, fontWeight: 900,
          color: highlight ? "#fff" : "var(--text1)",
        }}>
          {price}
        </span>
        {price !== "Free" && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: highlight ? "rgba(255,255,255,.7)" : "var(--text3)",
            marginLeft: 4,
          }}>
            /mo{interval === "annual" ? " billed annually" : ""}
          </span>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onCta}
        style={{
          width: "100%", padding: "11px 0", borderRadius: 9,
          cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
          marginBottom: 20,
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

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Check
              size={13}
              style={{
                flexShrink: 0, marginTop: 1,
                color: highlight ? "#fff" : "var(--accent)",
              }}
            />
            <span style={{
              fontSize: 12, lineHeight: 1.4,
              color: highlight ? "rgba(255,255,255,.9)" : "var(--text2)",
            }}>
              {f}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
