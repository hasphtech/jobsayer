/**
 * POST /api/payment/stripe-webhook
 *
 * Handles Stripe webhook events to activate plans after successful payment.
 *
 * Events handled:
 *   checkout.session.completed  → upgrade user's plan in Supabase + log audit
 *   payment_intent.payment_failed → log failure
 *
 * Env vars:
 *   STRIPE_SECRET_KEY         — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET     — from Stripe Dashboard → Webhooks → Signing secret
 *
 * Register webhook endpoint in Stripe Dashboard:
 *   URL: https://jobsayer.com/api/payment/stripe-webhook
 *   Events: checkout.session.completed, payment_intent.payment_failed
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { logAuditEvent } from "@/lib/auditLog";

// Stripe requires the raw request body for signature verification
export const dynamic = "force-dynamic";

const PLAN_MAP: Record<string, string> = {
  starter: "pro",   // starter checkout → pro plan in DB
  pro:     "elite", // pro checkout → elite plan in DB
  growth:  "employer_growth",
  scale:   "employer_scale",
};

// Plan expiry: monthly = +31 days, annual = +366 days
function planExpiry(interval: string): string {
  const days = interval === "annual" ? 366 : 31;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  const stripeKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

  let event: Stripe.Event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Dev mode — skip signature verification
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // ── checkout.session.completed ────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session  = event.data.object as Stripe.Checkout.Session;
    const userId   = session.metadata?.user_id ?? session.client_reference_id;
    const plan     = session.metadata?.plan ?? "starter";
    const interval = session.metadata?.interval ?? "monthly";
    const currency = session.metadata?.currency ?? "USD";
    const dbPlan   = PLAN_MAP[plan] ?? "pro";

    if (!userId) {
      console.error("[stripe-webhook] no user_id in session metadata");
      return NextResponse.json({ received: true });
    }

    // Activate plan
    const { error } = await sb
      .from("profiles")
      .update({
        plan,
        plan_expires_at: planExpiry(interval),
      })
      .eq("id", userId);

    if (error) {
      console.error("[stripe-webhook] failed to update profile:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    // Audit log
    await logAuditEvent({
      userId,
      action: "plan.upgrade",
      resource: `plan:${dbPlan}`,
      meta: {
        provider: "stripe",
        plan,
        interval,
        currency,
        stripe_session_id: session.id,
        amount_total: session.amount_total,
      },
    });

    console.log(`[stripe-webhook] plan activated: user=${userId} plan=${dbPlan} interval=${interval}`);
  }

  // ── payment_intent.payment_failed ────────────────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    console.warn("[stripe-webhook] payment failed:", pi.id, pi.last_payment_error?.message);
  }

  return NextResponse.json({ received: true });
}
