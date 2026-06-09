/**
 * POST /api/payment/stripe-checkout
 *
 * Creates a Stripe Checkout Session for non-INR currencies.
 * The upgrade page calls this when currency !== INR.
 *
 * Body:   { plan: "starter" | "pro", interval: "monthly" | "annual", currency: "USD" | ... }
 * Returns: { url }  — Stripe-hosted checkout URL to redirect to
 *
 * Env vars:
 *   STRIPE_SECRET_KEY           — from Stripe Dashboard → Developers → API Keys
 *   NEXT_PUBLIC_SITE_URL        — your production URL (e.g. https://jobsayer.com)
 *
 * After payment, Stripe redirects to:
 *   /upgrade/success?session_id={CHECKOUT_SESSION_ID}
 *
 * Stripe webhook (for plan activation) is at /api/payment/stripe-webhook
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

// USD prices (in cents)
const USD_PRICES: Record<string, Record<string, number>> = {
  starter: { monthly:  999, annual:  9900  },  // $9.99/mo  | $99/yr
  pro:     { monthly: 1999, annual: 19900  },  // $19.99/mo | $199/yr
  growth:  { monthly: 4999, annual: 49900  },  // $49.99/mo | $499/yr
  scale:   { monthly: 9999, annual: 99900  },  // $99.99/mo | $999/yr
};

// Currency → multiplier vs USD (approximate)
const CURRENCY_RATE: Record<string, number> = {
  USD: 1, GBP: 0.79, EUR: 0.92, AUD: 1.53, SGD: 1.34, AED: 3.67,
  CAD: 1.36, NZD: 1.63, JPY: 150, MYR: 4.7, BRL: 5.0,
};

// Currencies where Stripe expects amounts in smallest unit (no decimals)
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "TWD", "BIF", "CLP", "DJF", "GNF", "MGA", "PYG", "RWF", "UGX", "XAF", "XOF"]);

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured", hint: "Set STRIPE_SECRET_KEY in .env" }, { status: 503 });
  }

  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed } = await rateLimit(`stripe-checkout:${ip}`, 5, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { plan?: string; interval?: string; currency?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { plan = "starter", interval = "monthly", currency = "USD" } = body;
  const cur = currency.toUpperCase();

  // Don't accept INR — that goes to Razorpay
  if (cur === "INR") return NextResponse.json({ error: "Use Razorpay for INR payments" }, { status: 400 });

  const usdCents = USD_PRICES[plan]?.[interval];
  if (!usdCents) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const rate   = CURRENCY_RATE[cur] ?? 1;
  const factor = ZERO_DECIMAL.has(cur) ? 1 : 100;
  const amount = Math.round(usdCents * rate * (ZERO_DECIMAL.has(cur) ? 0.01 : 1));

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const planLabels: Record<string, string> = {
    starter: "Career Pro", pro: "Career Elite", growth: "Employer Growth", scale: "Employer Scale",
  };
  const intervalLabel = interval === "annual" ? "/ year" : "/ month";

  // Look up or create Stripe customer (idempotent)
  let customerId: string | undefined;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);
    }
  } catch { /* non-fatal — continue without customer */ }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
      line_items: [{
        price_data: {
          currency: cur.toLowerCase(),
          product_data: {
            name: `jobSayer ${planLabels[plan] ?? plan} Plan`,
            description: `${interval === "monthly" ? "Monthly" : "Annual"} subscription`,
            images: [`${siteUrl}/logo.png`],
          },
          unit_amount: amount,
          recurring: { interval: interval === "annual" ? "year" : "month" },
        },
        quantity: 1,
      }],
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan,
        interval,
        currency: cur,
      },
      subscription_data: {
        metadata: { user_id: user.id, plan, interval },
      },
      success_url: `${siteUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${siteUrl}/upgrade?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe-checkout] error:", err);
    return NextResponse.json({ error: "Stripe error — please try again" }, { status: 500 });
  }
}
