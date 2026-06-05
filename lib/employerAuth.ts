/**
 * employerAuth.ts
 * Middleware helper for Employer API routes.
 * Validates API key from Authorization header, checks quota, returns employer context.
 *
 * Usage in route handlers:
 *   const ctx = await verifyApiKey(request);
 *   if (!ctx.ok) return ctx.response;
 *   // ctx.employerId, ctx.tier, ctx.remaining
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const TIER_QUOTAS: Record<string, number> = {
  free:       10,
  starter:    100,
  growth:     1000,
  enterprise: 999999,
};

export interface ApiKeyContext {
  ok:         true;
  keyId:      string;
  employerId: string;
  tier:       string;
  remaining:  number;
}

export interface ApiKeyError {
  ok:       false;
  response: Response;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function verifyApiKey(request: Request): Promise<ApiKeyContext | ApiKeyError> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: errorResponse(401, "Missing Authorization: Bearer <api_key>") };
  }

  const rawKey  = authHeader.slice(7).trim();
  const keyHash = hashKey(rawKey);
  const sb      = supabaseAdmin();

  const { data: key, error } = await sb
    .from("employer_api_keys")
    .select("id, employer_id, tier, monthly_used, monthly_quota, quota_reset_at, active")
    .eq("key_hash", keyHash)
    .single();

  if (error || !key) {
    return { ok: false, response: errorResponse(401, "Invalid API key") };
  }
  if (!key.active) {
    return { ok: false, response: errorResponse(403, "API key is inactive") };
  }

  // Reset monthly quota if past reset date
  const now = new Date();
  if (new Date(key.quota_reset_at) <= now) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    await sb.from("employer_api_keys")
      .update({ monthly_used: 0, quota_reset_at: nextReset, last_used_at: now.toISOString() })
      .eq("id", key.id);
    key.monthly_used = 0;
  }

  const quota     = TIER_QUOTAS[key.tier] ?? TIER_QUOTAS.free;
  const remaining = quota - key.monthly_used;

  if (remaining <= 0) {
    return { ok: false, response: errorResponse(429, `Monthly quota of ${quota} reached. Upgrade your plan.`) };
  }

  // Increment usage
  await sb.from("employer_api_keys")
    .update({ monthly_used: key.monthly_used + 1, last_used_at: now.toISOString() })
    .eq("id", key.id);

  return { ok: true, keyId: key.id, employerId: key.employer_id, tier: key.tier, remaining: remaining - 1 };
}

/** Generate a new API key. Returns { rawKey, prefix, hash } — store hash only. */
export function generateApiKey(): { rawKey: string; prefix: string; keyHash: string } {
  const bytes   = Buffer.from(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)));
  const rawKey  = `js_live_${bytes.toString("hex").slice(0, 40)}`;
  const prefix  = rawKey.slice(0, 16);
  const keyHash = hashKey(rawKey);
  return { rawKey, prefix, keyHash };
}
