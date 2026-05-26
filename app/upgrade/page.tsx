"use client";
/**
 * /upgrade — JobSayer pricing page
 * Three tiers: Free · Starter · Pro
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Star, Sparkles } from "lucide-react";
import { PLAN_DEFAULTS } from "@/lib/resumePlan";

const PRICES = {
  starter: { monthly: 199, annual: 1990 },
  pro:     { monthly: 499, annual: 4990 },
} as const;

const FEATURES = {
  free: [
    "2 saved resumes",
    "8 core templates",
    "PDF export",
    "Shareable public link",
    "ATS score checker",
    "JD match scoring",
  ],
  starter: [
    "5 saved resumes",
    "All 35 templates",
    "PDF + DOCX export",
    "Shareable public link",
    "ATS score checker",
    "JD match scoring",
    "Draft auto-save",
    "Resume upload & parse",
  ],
  pro: [
    "10 saved resumes",
    "All 35 templates",
    "PDF + DOCX + JSON export",
    "Shareable public link",
    "ATS score checker",
    "JD match scoring",
    "AI summary writer",
    "AI bullet rewriter",
    "AI cover letter writer",
    "AI JD tailor",
    "Draft auto-save",
    "Resume upload & parse",
  ],
} as const;

export default function UpgradePage() {
  const router  = useRouter();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  const annualSavingStarter = Math.round(
    (PRICES.starter.monthly * 12 - PRICES.starter.annual) / (PRICES.starter.monthly * 12) * 100
  );
  const annualSavingPro = Math.round(
    (PRICES.pro.monthly * 12 - PRICES.pro.annual) / (PRICES.pro.monthly * 12) * 100
  );

  function getPrice(tier: "starter" | "pro") {
    return interval === "monthly" ? PRICES[tier].monthly : Math.round(PRICES[tier].annual / 12);
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text1)",
      fontFamily: "inherit",
      padding: "0 16px 60px",
    }}>
      {/* ── Header ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", paddingTop: 52, textAlign: "center" }}>
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
          Build résumés that get interviews
        </h1>
        <p style={{ fontSize: 15, color: "var(--text3)", margin: "0 0 28px", lineHeight: 1.6 }}>
          Start free. Upgrade when you need AI or more templates.
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
                    background: "#16a34a", color: "#fff",
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
            price={0}
            interval={interval}
            badge={null}
            features={FEATURES.free}
            cta="Get started free"
            ctaStyle="secondary"
            onCta={() => router.push("/builder")}
          />

          {/* Starter */}
          <PlanCard
            name="Starter"
            price={getPrice("starter")}
            interval={interval}
            badge={interval === "annual" ? `Save ${annualSavingStarter}%` : null}
            features={FEATURES.starter}
            cta="Upgrade to Starter"
            ctaStyle="secondary"
            onCta={() => {
              // TODO: integrate payment — for now open contact/email
              window.open("mailto:hello@jobsayer.com?subject=JobSayer Starter Plan", "_blank");
            }}
          />

          {/* Pro — highlighted */}
          <PlanCard
            name="Pro"
            price={getPrice("pro")}
            interval={interval}
            badge="Most popular"
            features={FEATURES.pro}
            cta="Upgrade to Pro"
            ctaStyle="primary"
            highlight
            icon={<Star size={14} fill="currentColor" />}
            onCta={() => {
              // TODO: integrate payment — for now open contact/email
              window.open("mailto:hello@jobsayer.com?subject=JobSayer Pro Plan", "_blank");
            }}
          />
        </div>

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
              "Payments are processed via Cashfree — a PCI DSS compliant gateway. We never store card details."],
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
          Prices in INR. GST may apply. Questions?{" "}
          <a href="mailto:hello@jobsayer.com" style={{ color: "var(--accent)" }}>hello@jobsayer.com</a>
        </p>
      </div>
    </div>
  );
}

// ── Plan card component ───────────────────────────────────────

interface PlanCardProps {
  name:      string;
  price:     number;
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
          {price === 0 ? "₹0" : `₹${price}`}
        </span>
        {price > 0 && (
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
