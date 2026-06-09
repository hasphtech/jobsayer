/**
 * lib/planGuard.ts
 *
 * Server-side plan expiry check. Call at the top of any server component
 * or API route that gates on plan tier.
 *
 * Usage (server component):
 *   import { checkAndExpirePlan } from "@/lib/planGuard";
 *   const plan = await checkAndExpirePlan(userId, supabase);
 *
 * Usage (API route):
 *   const { plan, expired } = await checkAndExpirePlan(user.id, supabase);
 *   if (plan === "free" && featureRequiresPro) return 402;
 *
 * The function is idempotent — it only writes when expiry actually occurs.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface PlanState {
  plan:    string;
  expired: boolean;  // true if plan was just downgraded this call
}

const FREE_PLANS = new Set(["free"]);
const PAID_PLANS = new Set(["pro", "elite", "starter", "growth", "scale",
                             "employer_growth", "employer_scale"]);

export async function checkAndExpirePlan(
  userId:  string,
  supabase: SupabaseClient,
): Promise<PlanState> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_expires_at, subscription_status")
    .eq("id", userId)
    .single();

  if (!profile) return { plan: "free", expired: false };

  const { plan, plan_expires_at, subscription_status } = profile;

  // Already free — nothing to do
  if (FREE_PLANS.has(plan)) return { plan: "free", expired: false };

  // Active subscription tracked by Stripe webhook — don't double-expire
  if (subscription_status === "active") return { plan, expired: false };

  // Check expiry timestamp
  if (plan_expires_at && new Date(plan_expires_at) < new Date()) {
    await supabase
      .from("profiles")
      .update({ plan: "free", subscription_status: "expired" })
      .eq("id", userId);

    return { plan: "free", expired: true };
  }

  return { plan, expired: false };
}

/** Quick boolean — "does this user have an active paid plan?" */
export async function hasPaidPlan(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { plan } = await checkAndExpirePlan(userId, supabase);
  return PAID_PLANS.has(plan);
}

/** Minimum required plan check. Returns true if user's plan meets the bar. */
export const PLAN_RANK: Record<string, number> = {
  free: 0, starter: 1, pro: 2, elite: 3,
  employer_growth: 4, employer_scale: 5, growth: 4, scale: 5,
};

export async function requiresPlan(
  userId:      string,
  supabase:    SupabaseClient,
  minPlan:     string,
): Promise<{ allowed: boolean; plan: string }> {
  const { plan } = await checkAndExpirePlan(userId, supabase);
  const allowed  = (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
  return { allowed, plan };
}
