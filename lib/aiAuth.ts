/**
 * JobSayer — Server-side AI access guard
 *
 * Validates a Supabase JWT and reads the user's real plan from
 * jobsayer_subscriptions. Never trusts tier claims from the client body.
 *
 * AI features require the Pro plan (tier = "pro").
 *
 * Usage in a Next.js route handler:
 *   const token = req.headers.get("authorization")?.replace("Bearer ", "").trim() ?? "";
 *   const { allowed, userId, reason } = await verifyAiAccess(token);
 *   if (!allowed) return NextResponse.json({ error: reason }, { status: 403 });
 *
 * The client must send:   Authorization: Bearer <supabase_access_token>
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";

export interface AiAccessResult {
  allowed: boolean;
  userId:  string | null;
  reason?: string;
}

function resolveEffectiveTier(
  tier:              string,
  status:            string,
  graceUntil:        string | null,
  cancelAtPeriodEnd: boolean,
  expiresAt:         string | null,
): string {
  const now        = new Date();
  const inGrace    = status === "grace" && !!graceUntil && new Date(graceUntil) > now;
  const cancelSoon = cancelAtPeriodEnd && !!expiresAt && new Date(expiresAt) > now;
  const active     = status === "active" || inGrace || cancelSoon;
  if (active && tier !== "free") return tier;
  return "free";
}

const UPGRADE_MSG = "AI features require the Pro plan. Upgrade at jobsayer.com/upgrade";

export async function verifyAiAccess(token: string): Promise<AiAccessResult> {
  if (!token) return { allowed: false, userId: null, reason: "Unauthorized" };

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("[verifyAiAccess] Supabase env vars missing");
    return { allowed: false, userId: null, reason: "Server configuration error" };
  }

  const sb = createClient(url, anonKey, { auth: { persistSession: false } });

  /* 1. Validate JWT */
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return { allowed: false, userId: null, reason: "Unauthorized" };

  /* 2. Read plan from jobsayer_subscriptions */
  const { data: sub } = await sb
    .from("jobsayer_subscriptions")
    .select("tier, status, grace_until, cancel_at_period_end, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub) return { allowed: false, userId: user.id, reason: UPGRADE_MSG };

  /* 3. Resolve effective tier */
  const tier = resolveEffectiveTier(
    sub.tier,
    sub.status,
    sub.grace_until,
    sub.cancel_at_period_end ?? false,
    sub.expires_at,
  );

  if (tier !== "pro") return { allowed: false, userId: user.id, reason: UPGRADE_MSG };

  return { allowed: true, userId: user.id };
}
