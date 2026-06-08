/**
 * POST /api/auth/sso
 *
 * Enterprise SSO resolver — maps an organisation domain to its identity
 * provider and returns a Supabase SAML/OIDC redirect URL.
 *
 * CURRENT STATE: Stub implementation.
 *   - Checks a hardcoded allow-list of enterprise orgs (seeded from env vars or DB).
 *   - Returns a Supabase SSO sign-in URL for configured orgs.
 *   - Unknown orgs get a 404 directing them to enterprise@jobsayer.com.
 *
 * PRODUCTION PATH:
 *   1. Provision each enterprise customer via Supabase Dashboard → Auth → SSO Providers
 *      (supports SAML 2.0 and OIDC providers like Okta, Azure AD, OneLogin)
 *   2. Store { domain, supabase_sso_provider_id } in an `enterprise_sso` table
 *   3. Replace the hardcoded map below with a DB lookup
 *   4. Call supabase.auth.signInWithSSO({ providerId }) or use the manual redirect URL
 *
 * Supabase SSO docs: https://supabase.com/docs/guides/auth/enterprise-sso
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rateLimit";

// ── Enterprise org registry ──────────────────────────────────────────────────
// In production: replace with a `enterprise_sso` Supabase table lookup.
// Format: { domain → supabase_sso_provider_id (UUID from Supabase Auth > SSO) }
const SSO_PROVIDERS: Record<string, string> = JSON.parse(
  process.env.ENTERPRISE_SSO_PROVIDERS ?? "{}"
);

export async function POST(req: NextRequest) {
  // Rate limit: 10 req/min per IP (prevent domain enumeration)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { success } = await rateLimit(`sso:${ip}`, 10, 60_000);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: { org?: string; next?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const org  = (body.org ?? "").toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const next = body.next ?? "/dashboard";

  if (!org) return NextResponse.json({ error: "org is required" }, { status: 400 });

  // ── DB lookup (production) ───────────────────────────────────────────────
  // Check the feature_flags table first to ensure enterprise SSO is enabled
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("key", "enterprise_sso")
    .single();

  if (!flag?.enabled) {
    return NextResponse.json({
      error: "Enterprise SSO is not yet enabled on this instance. Contact enterprise@jobsayer.com.",
    }, { status: 503 });
  }

  // ── Look up org in DB (preferred over env var hardcoding) ────────────────
  const { data: ssoRecord } = await sb
    .from("enterprise_sso")
    .select("supabase_provider_id, org_name")
    .eq("domain", org)
    .eq("is_active", true)
    .single();

  const providerId = ssoRecord?.supabase_provider_id ?? SSO_PROVIDERS[org];

  if (!providerId) {
    // Unknown org — guide them to enterprise sales
    return NextResponse.json({
      error: `No SSO configuration found for "${org}". Please contact enterprise@jobsayer.com to set up SSO for your organisation.`,
    }, { status: 404 });
  }

  // ── Build the Supabase SSO redirect URL ──────────────────────────────────
  // Supabase SSO endpoint: POST /auth/v1/sso?provider_id=<UUID>&redirect_to=<URL>
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const redirectTo   = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const redirectUrl = `${supabaseUrl}/auth/v1/sso?provider_id=${encodeURIComponent(providerId)}&redirect_to=${encodeURIComponent(redirectTo)}`;

  return NextResponse.json({ redirectUrl, org: ssoRecord?.org_name ?? org });
}
