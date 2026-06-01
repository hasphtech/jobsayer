/**
 * POST /api/payment/verify
 * Verifies a Razorpay payment signature and upgrades the user's subscription.
 *
 * Body: {
 *   razorpay_order_id:   string,
 *   razorpay_payment_id: string,
 *   razorpay_signature:  string,
 *   plan:     "starter" | "pro",
 *   interval: "monthly" | "annual",
 * }
 * Returns: { success: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import { createServerClient }        from "@supabase/ssr";
import { cookies }                   from "next/headers";

export async function POST(req: NextRequest) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return NextResponse.json({ error: "Payment not configured" }, { status: 503 });

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    plan = "pro",
    interval = "monthly",
  } = body;

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  // ── Verify HMAC signature ──────────────────────────────────────
  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    console.error("Razorpay signature mismatch");
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // ── Update subscription in Supabase ───────────────────────────
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

  // Compute expiry (monthly = 30 days, annual = 365 days)
  const days = interval === "annual" ? 365 : 30;
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();

  // Use service role to bypass RLS for subscription upsert
  const { createClient } = await import("@supabase/supabase-js");
  const serviceDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const isEmployerPlan = plan === "growth" || plan === "scale";

  if (isEmployerPlan) {
    // Update employer_profiles.plan
    const { error } = await serviceDb
      .from("employer_profiles")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) {
      console.error("Employer plan update error:", error.message);
      return NextResponse.json({ error: "Failed to activate employer plan" }, { status: 500 });
    }
  } else {
    // Candidate subscription upsert
    const { error } = await serviceDb
      .from("jobsayer_subscriptions")
      .upsert({
        user_id:              user.id,
        tier:                 plan,
        status:               "active",
        interval,
        expires_at:           expiresAt,
        cancel_at_period_end: false,
        updated_at:           new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (error) {
      console.error("Subscription upsert error:", error.message);
      return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, plan, expiresAt });
}
