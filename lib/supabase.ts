/**
 * jobSayer — Supabase client singleton
 *
 * Standalone project — fully independent from emi24.com.
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL      — from your jobsayer Supabase project
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — from your jobsayer Supabase project
 *
 * Each Next.js instance (dev / prod) gets its own singleton.
 * No cross-domain SSO — jobsayer.com users are completely separate
 * from any other product.
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
      "jobSayer: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.\n" +
      "See SUPABASE_SETUP.md for instructions.",
    );
  }

  _clientPromise = import("@supabase/ssr").then(async ({ createBrowserClient }) => {
    _client = createBrowserClient(url, anon, {
      global: {
        headers: { "x-client-info": "jobsayer" },
      },
    });

    if (typeof document !== "undefined") {
      await _client.auth.getSession();
    }

    return _client;
  }).catch((err) => {
    _clientPromise = null; // allow retry on next call
    console.error("jobSayer: failed to initialise Supabase client", err);
    throw err;
  });

  return _clientPromise;
}

/** Synchronous getter — only safe after getSupabaseAsync() has resolved once. */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    throw new Error(
      "jobSayer: getSupabase() called before getSupabaseAsync() resolved. " +
      "Await getSupabaseAsync() first.",
    );
  }
  return _client;
}

export type { User, Session } from "@supabase/supabase-js";
