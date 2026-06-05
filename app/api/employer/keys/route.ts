/**
 * POST /api/employer/keys  — generate a new API key
 * GET  /api/employer/keys  — list keys for this employer
 * DELETE /api/employer/keys?id=<key_id> — revoke a key
 *
 * All routes require Supabase session (employer must be signed in to the portal).
 */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateApiKey } from "@/lib/employerAuth";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getSessionUser() {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );
  const { data: { session } } = await sb.auth.getSession();
  return session?.user ?? null;
}

async function getOrCreateEmployer(userId: string, body?: Record<string, string>) {
  const sb = supabaseAdmin();
  const { data } = await sb.from("employers").select("id, tier").eq("user_id", userId).single();
  if (data) return data;

  // Auto-create employer record on first key generation
  const { data: created } = await sb.from("employers").insert({
    user_id:       userId,
    company_name:  body?.company_name ?? "My Company",
    company_domain: body?.company_domain ?? "",
    tier:          "free",
  }).select("id, tier").single();

  return created;
}

/* ── POST: generate key ── */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const employer = await getOrCreateEmployer(user.id, body);
  if (!employer) return Response.json({ error: "Could not create employer record" }, { status: 500 });

  const { rawKey, prefix, keyHash } = generateApiKey();
  const sb = supabaseAdmin();

  const tierQuotas: Record<string, { rpm: number; monthly: number }> = {
    free:       { rpm: 10,  monthly: 10   },
    starter:    { rpm: 20,  monthly: 100  },
    growth:     { rpm: 60,  monthly: 1000 },
    enterprise: { rpm: 300, monthly: 999999 },
  };
  const limits = tierQuotas[employer.tier] ?? tierQuotas.free;

  const { data: newKey, error } = await sb.from("employer_api_keys").insert({
    employer_id:    employer.id,
    key_hash:       keyHash,
    key_prefix:     prefix,
    name:           body.name ?? "Default key",
    tier:           employer.tier,
    rate_limit_rpm: limits.rpm,
    monthly_quota:  limits.monthly,
  }).select("id, key_prefix, name, tier, monthly_quota, created_at").single();

  if (error) return Response.json({ error: "Failed to generate key" }, { status: 500 });

  // Return the raw key ONCE — never stored, never retrievable again
  return Response.json({ ...newKey, raw_key: rawKey, warning: "Save this key now — it will never be shown again." });
}

/* ── GET: list keys ── */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: employer } = await sb.from("employers").select("id").eq("user_id", user.id).single();
  if (!employer) return Response.json({ keys: [] });

  const { data: keys } = await sb.from("employer_api_keys")
    .select("id, key_prefix, name, tier, monthly_quota, monthly_used, last_used_at, active, created_at")
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false });

  return Response.json({ keys: keys ?? [] });
}

/* ── DELETE: revoke key ── */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");
  if (!keyId) return Response.json({ error: "Missing id param" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: employer } = await sb.from("employers").select("id").eq("user_id", user.id).single();
  if (!employer) return Response.json({ error: "Employer not found" }, { status: 404 });

  await sb.from("employer_api_keys")
    .update({ active: false })
    .eq("id", keyId)
    .eq("employer_id", employer.id);

  return Response.json({ ok: true });
}
