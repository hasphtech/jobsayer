/**
 * JobSayer — Server-side AI access guard
 *
 * Validates a Supabase JWT and reads the user's real plan from
 * jobsayer_subscriptions. Never trusts tier claims from the client body.
 *
 * AI features require the Pro plan (tier = "pro").
 *
 * Performance:
 *   - Subscription row is cached in Redis for 2 min (CACHE_TTL.SUBSCRIPTION).
 *   - Cache is invalidated by the Stripe/Razorpay payment webhook on upgrade/downgrade.
 *   - On a warm hit this function costs only the auth.getUser() JWT decode (~20ms).
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

import { createClient }               from "@supabase/supabase-js";
import { cache, CacheKey, CACHE_TTL } from "@/lib/cache";

export interface AiAccessResult {
  allowed: boolean;
  userId:  string | null;
  reason?: string;
}

interface SubRow {
  tier:                 string;
  status:               string;
  grace_until:          string | null;
  cancel_at_period_end: boolean;
  expires_at:           string | null;
}

function resolveEffectiveTier(sub: SubRow): string {
  const now        = new Date();
  const inGrace    = sub.status === "grace" && !!sub.grace_until && new Date(sub.grace_until) > now;
  const cancelSoon = sub.cancel_at_period_end && !!sub.expires_at && new Date(sub.expires_at) > now;
  const active     = sub.status === "active" || inGrace || cancelSoon;
  if (active && sub.tier !== "free") return sub.tier;
  return "free";
}

const UPGRADE_MSG = "AI features require the Pro plan. Upgrade at jobsayer.com/upgrade";

// Reuse Supabase client across warm invocations — avoids repeated SDK init
let _sb: ReturnType<typeof createClient> | null = null;

function getAnonClient() {
  if (_sb) return _sb;
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  _sb = createClient(url, anonKey, { auth: { persistSession: false } });
  return _sb;
}

export async function verifyAiAccess(token: string): Promise<AiAccessResult> {
  if (!token) return { allowed: false, userId: null, reason: "Unauthorized" };

  const sb = getAnonClient();
  if (!sb) {
    console.error("[verifyAiAccess] Supabase env vars missing");
    return { allowed: false, userId: null, reason: "Server configuration error" };
  }

  /* 1. Validate JWT — must always be verified, cannot be cached */
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return { allowed: false, userId: null, reason: "Unauthorized" };

  /* 2. Read plan — cached in Redis for 2 min to avoid a DB hit per AI call */
  const cacheKey = CacheKey.subscription(user.id);

  const sub = await cache.getOrSet<SubRow | null>(
    cacheKey,
    CACHE_TTL.SUBSCRIPTION,
    async () => {
      const { data } = await sb
        .from("jobsayer_subscriptions")
        .select("tier, status, grace_until, cancel_at_period_end, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return data ?? null;
    },
  );

  if (!sub) return { allowed: false, userId: user.id, reason: UPGRADE_MSG };

  /* 3. Resolve effective tier */
  const tier = resolveEffectiveTier(sub);

  if (tier !== "pro") return { allowed: false, userId: user.id, reason: UPGRADE_MSG };

  return { allowed: true, userId: user.id };
}

/**
 * Invalidate the cached subscription for a user.
 * Call from payment webhooks (Stripe / Razorpay) after any plan change.
 */
export async function invalidateSubscriptionCache(userId: string): Promise<void> {
  await cache.del(CacheKey.subscription(userId)).catch(() => {});
}
