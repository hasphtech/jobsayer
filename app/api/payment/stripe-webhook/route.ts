/**
 * POST /api/payment/stripe-webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 *
 * Events handled:
 *   checkout.session.completed           → activate plan + store subscription_id
 *   customer.subscription.updated        → sync plan/status changes
 *   customer.subscription.deleted        → downgrade to free
 *   invoice.payment_failed               → mark subscription as past_due
 *   invoice.payment_succeeded            → renew plan_expires_at
 *
 * Env vars:
 *   STRIPE_SECRET_KEY         — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET     — from Stripe Dashboard → Webhooks → Signing secret
 *
 * Register in Stripe Dashboard:
 *   URL: https://jobsayer.com/api/payment/stripe-webhook
 *   Events: checkout.session.completed, customer.subscription.*,
 *           invoice.payment_failed, invoice.payment_succeeded
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { logAuditEvent } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const PLAN_DISPLAY: Record<string, string> = {
  starter: "pro",
  pro:     "elite",
  growth:  "employer_growth",
  scale:   "employer_scale",
};

function planExpiry(interval: string): string {
  const days = interval === "annual" ? 366 : 31;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function getServiceSb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function findUserByCustomer(sb: ReturnType<typeof getServiceSb>, customerId: string) {
  const { data } = await sb
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.id as string | undefined;
}

export async function POST(req: NextRequest) {
  const stripeKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const stripe    = new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" });

  let event: Stripe.Event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(body, signature, webhookSecret)
      : JSON.parse(body) as Stripe.Event;
  } catch (err) {
    console.error("[stripe-webhook] signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sb = getServiceSb();

  // ── checkout.session.completed ────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session    = event.data.object as Stripe.Checkout.Session;
    const userId     = session.metadata?.user_id ?? session.client_reference_id;
    const plan       = session.metadata?.plan ?? "starter";
    const interval   = session.metadata?.interval ?? "monthly";
    const currency   = session.metadata?.currency ?? "USD";
    const subId      = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

    if (!userId) return NextResponse.json({ received: true });

    await sb.from("profiles").update({
      plan,
      plan_expires_at:        planExpiry(interval),
      stripe_subscription_id: subId ?? null,
      subscription_status:    "active",
      ...(session.customer ? { stripe_customer_id: session.customer as string } : {}),
    }).eq("id", userId);

    await logAuditEvent({
      userId, action: "plan.upgrade", resource: `plan:${PLAN_DISPLAY[plan] ?? plan}`,
      meta: { provider: "stripe", plan, interval, currency, stripe_session_id: session.id },
    });
    console.log(`[stripe-webhook] activated: user=${userId} plan=${plan} sub=${subId}`);
  }

  // ── customer.subscription.updated ────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub      = event.data.object as Stripe.Subscription;
    const userId   = sub.metadata?.user_id ?? await findUserByCustomer(sb, sub.customer as string);
    if (!userId) return NextResponse.json({ received: true });

    const plan     = sub.metadata?.plan ?? "starter";
    const interval = sub.metadata?.interval ?? "monthly";
    const status   = sub.status; // active | past_due | canceled | trialing | etc.

    const updates: Record<string, string | null> = {
      subscription_status: status,
      stripe_subscription_id: sub.id,
    };

    if (status === "active") {
      updates.plan = plan;
      updates.plan_expires_at = planExpiry(interval);
    } else if (status === "canceled" || status === "unpaid") {
      updates.plan = "free";
      updates.plan_expires_at = new Date().toISOString();
    }

    await sb.from("profiles").update(updates).eq("id", userId);
    console.log(`[stripe-webhook] subscription updated: user=${userId} status=${status}`);
  }

  // ── customer.subscription.deleted ────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub    = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id ?? await findUserByCustomer(sb, sub.customer as string);
    if (!userId) return NextResponse.json({ received: true });

    await sb.from("profiles").update({
      plan:                    "free",
      plan_expires_at:         new Date().toISOString(),
      subscription_status:     "canceled",
      stripe_subscription_id:  null,
    }).eq("id", userId);

    await logAuditEvent({
      userId, action: "plan.cancelled", resource: "plan:free",
      meta: { provider: "stripe", stripe_subscription_id: sub.id },
    });
    console.log(`[stripe-webhook] subscription canceled: user=${userId}`);
  }

  // ── invoice.payment_succeeded → renew plan ────────────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const inv    = event.data.object as Stripe.Invoice;
    if (!inv.subscription) return NextResponse.json({ received: true });
    const userId = await findUserByCustomer(sb, inv.customer as string);
    if (!userId) return NextResponse.json({ received: true });

    // Retrieve subscription to get interval
    const sub     = await stripe.subscriptions.retrieve(inv.subscription as string);
    const interval = sub.items.data[0]?.plan?.interval === "year" ? "annual" : "monthly";
    const plan    = sub.metadata?.plan ?? "starter";

    await sb.from("profiles").update({
      plan,
      plan_expires_at:     planExpiry(interval),
      subscription_status: "active",
    }).eq("id", userId);

    console.log(`[stripe-webhook] invoice paid / renewed: user=${userId}`);
  }

  // ── invoice.payment_failed ────────────────────────────────────────────────
  if (event.type === "invoice.payment_failed") {
    const inv    = event.data.object as Stripe.Invoice;
    const userId = await findUserByCustomer(sb, inv.customer as string);
    if (userId) {
      await sb.from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("id", userId);

      // Notify user
      await sb.from("notifications").insert({
        user_id: userId,
        type:    "alert",
        title:   "Payment failed",
        body:    "Your subscription payment failed. Please update your payment method to avoid losing access.",
        link:    "/upgrade",
      });
      console.warn(`[stripe-webhook] payment failed: user=${userId}`);
    }
  }

  return NextResponse.json({ received: true });
}
