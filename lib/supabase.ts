/**
 * @jobsayer/auth — Supabase client singleton
 *
 * Consumed by every EMI24 app (apps/web, apps/billing, apps/career, …).
 * Each Next.js app gets its own bundled copy — singleton state is per-app,
 * not shared across subdomains.
 *
 * SSO across subdomains:
 *   Set NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.emi24.com in each app's Vercel env.
 *   Leave it unset in local dev (localhost doesn't support wildcard cookies).
 */

type SupabaseClient = Awaited<ReturnType<typeof import("@supabase/ssr").createBrowserClient>>;

let _client: SupabaseClient | null = null;
let _clientPromise: Promise<SupabaseClient> | null = null;

export async function getSupabaseAsync(): Promise<SupabaseClient> {
  if (_client) return _client;
  if (_clientPromise) return _clientPromise;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "@jobsayer/auth: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }

  // NEXT_PUBLIC_AUTH_COOKIE_DOMAIN should be ".emi24.com" in production.
  // This makes the Supabase auth cookie valid on ALL subdomains, enabling
  // seamless SSO: sign in on emi24.com → automatically authenticated on
  // billing.emi24.com, career.emi24.com, etc.
  const cookieDomain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? undefined;

  _clientPromise = import("@supabase/ssr").then(async ({ createBrowserClient }) => {
    _client = createBrowserClient(url, anon, {
      cookieOptions: cookieDomain ? { domain: cookieDomain, sameSite: "lax", secure: true } : {},
      global: {
        headers: { "x-client-info": "emi24" },
      },
    });

    if (typeof document !== "undefined") {
      await _client.auth.getSession();
    }

    return _client;
  }).catch((err) => {
    _clientPromise = null; // allow retry
    console.error("@jobsayer/auth: failed to initialise Supabase client", err);
    throw err;
  });

  return _clientPromise;
}

/** Synchronous getter — only safe after getSupabaseAsync() has resolved once. */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    throw new Error(
      "@jobsayer/auth: getSupabase() called before getSupabaseAsync() resolved",
    );
  }
  return _client;
}

export type { User, Session } from "@supabase/supabase-js";
