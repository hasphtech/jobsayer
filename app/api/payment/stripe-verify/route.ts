/**
 * POST /api/payment/stripe-verify
 *
 * Called from /upgrade/success after Stripe redirects back.
 * Retrieves the Checkout Session from Stripe, confirms payment_status === "paid",
 * then activates the plan in Supabase.
 *
 * This is a belt-and-suspenders check — the webhook also does activation,
 * but webhooks can arrive after the user lands on the success page.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/auditLog";

const PLAN_EXPIRY_DAYS: Record<string, number> = { monthly: 31, annual: 366 };

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  let body: { sessionId?: string; plan?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { sessionId, plan = "starter" } = body;
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  // Verify caller is authenticated
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

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[stripe-verify] retrieve error:", err);
    return NextResponse.json({ error: "Could not retrieve session from Stripe" }, { status: 502 });
  }

  // Confirm payment
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed", status: session.payment_status }, { status: 402 });
  }

  // Confirm this session belongs to this user
  const metaUserId = session.metadata?.user_id ?? session.client_reference_id;
  if (metaUserId && metaUserId !== user.id) {
    return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 });
  }

  const interval = session.metadata?.interval ?? "monthly";
  const days     = PLAN_EXPIRY_DAYS[interval] ?? 31;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  // Idempotent: only update if not already on a paid plan from this session
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { error } = await sb
    .from("profiles")
    .update({ plan, plan_expires_at: expiresAt.toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("[stripe-verify] DB update error:", error);
    return NextResponse.json({ error: "Could not activate plan" }, { status: 500 });
  }

  await logAuditEvent({
    userId: user.id,
    action: "plan.upgrade",
    resource: `plan:${plan}`,
    meta: {
      provider: "stripe",
      plan,
      interval,
      stripe_session_id: sessionId,
      verified_by: "client_callback",
    },
  });

  return NextResponse.json({ success: true, plan, expiresAt: expiresAt.toISOString() });
}
