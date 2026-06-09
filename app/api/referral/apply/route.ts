/**
 * POST /api/referral/apply
 *
 * Applies a referral code for the authenticated user.
 * - Looks up the referral code → finds referrer
 * - Creates a referrals row (referee → referrer)
 * - If referrer has ≥ 1 rewarded referral, grants them +1 month free Pro
 * - Sends reward email to referrer
 *
 * Called on: first login after ?ref= landing, or explicitly from onboarding.
 *
 * Body: { code: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { sendReferralRewardEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
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

  const { allowed } = await rateLimit(`referral-apply:${user.id}`, 3, 300_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: { code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.code?.trim()) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const code = body.code.trim().toLowerCase();

  // Check if this user was already referred
  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("referee_id", user.id)
    .single();
  if (existing) return NextResponse.json({ error: "You've already used a referral code" }, { status: 400 });

  // Find referrer by code
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id, email, full_name, plan, plan_expires_at")
    .eq("referral_code", code)
    .single();
  if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });

  // Can't refer yourself
  if (referrer.id === user.id) return NextResponse.json({ error: "Cannot use your own referral code" }, { status: 400 });

  // Service-role client for write operations
  const sbAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Create referral record
  const { error: refError } = await sbAdmin.from("referrals").insert({
    referrer_id:    referrer.id,
    referee_id:     user.id,
    reward_granted: false,
  });
  if (refError) return NextResponse.json({ error: refError.message }, { status: 500 });

  // Grant reward: extend referrer's plan by 1 month
  const currentExpiry = referrer.plan_expires_at ? new Date(referrer.plan_expires_at) : new Date();
  const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
  newExpiry.setDate(newExpiry.getDate() + 31);

  const rewardPlan = referrer.plan === "free" ? "pro" : referrer.plan;

  await sbAdmin.from("profiles").update({
    plan:            rewardPlan,
    plan_expires_at: newExpiry.toISOString(),
  }).eq("id", referrer.id);

  // Mark reward as granted
  await sbAdmin.from("referrals").update({
    reward_granted: true,
    reward_at:      new Date().toISOString(),
  }).eq("referrer_id", referrer.id).eq("referee_id", user.id);

  // Notify referrer in-app
  await sbAdmin.from("notifications").insert({
    user_id: referrer.id,
    type:    "success",
    title:   "Referral reward earned! 🎁",
    body:    "Someone you referred just joined. You've earned 1 free month of Career Pro.",
    link:    "/profile",
  });

  // Send reward email
  if (referrer.email) {
    const { data: referee } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    await sendReferralRewardEmail({
      email:        referrer.email,
      name:         referrer.full_name ?? undefined,
      referredName: referee?.full_name ?? user.email?.split("@")[0],
    });
  }

  return NextResponse.json({ success: true, message: "Referral applied! Your referrer has been rewarded." });
}
