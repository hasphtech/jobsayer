/**
 * jobSayer — Supabase client factory
 *
 * Three client types, each with a singleton per-process:
 *
 *   getSupabaseAsync() / getSupabase()
 *     Browser client (anon key). Safe to call in "use client" components.
 *     Manages session via cookies automatically.
 *
 *   getServiceSupabase()
 *     Server-only service-role client. Bypasses RLS — use only in:
 *       - API routes that run as the platform (notifications POST, admin routes)
 *       - Payment webhooks
 *       - Cron jobs
 *     NEVER expose to client code. Requires SUPABASE_SERVICE_ROLE_KEY.
 *
 *   createServerSupabase(cookieStore)
 *     Per-request server client (anon key + cookie auth). Use in Server
 *     Components, route handlers that need the requesting user's session.
 *
 * All clients reuse a shared createClient instance per process — avoids
 * creating TCP connections on every serverless invocation.
 */

/* ── Browser client (anon key) ───────────────────────────────────── */

type SupabaseBrowserClient = Awaited<ReturnType<typeof import("@supabase/ssr").createBrowserClient>>;

let _browserClient: SupabaseBrowserClient | null        = null;
let _browserPromise: Promise<SupabaseBrowserClient> | null = null;

export async function getSupabaseAsync(): Promise<SupabaseBrowserClient> {
  if (_browserClient) return _browserClient;
  if (_browserPromise) return _browserPromise;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "jobSayer: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }

  _browserPromise = import("@supabase/ssr").then(({ createBrowserClient }) => {
    // Do NOT call getSession() here — it fires INITIAL_SESSION before
    // AuthProvider's onAuthStateChange listener is set up, causing Google
    // OAuth sessions to be silently lost. Let AuthProvider own the first call.
    _browserClient = createBrowserClient(url, anon, {
      global: { headers: { "x-client-info": "jobsayer" } },
    });
    return _browserClient;
  }).catch((err) => {
    _browserPromise = null; // allow retry on next call
    console.error("jobSayer: failed to initialise Supabase browser client", err);
    throw err;
  });

  return _browserPromise;
}

/** Synchronous getter — only safe after getSupabaseAsync() has resolved once. */
export function getSupabase(): SupabaseBrowserClient {
  if (!_browserClient) {
    throw new Error(
      "jobSayer: getSupabase() called before getSupabaseAsync() resolved. " +
      "Await getSupabaseAsync() first.",
    );
  }
  return _browserClient;
}

/* ── Service-role client (server only) ──────────────────────────── */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _serviceClient: SupabaseClient | null = null;

/**
 * Returns a service-role Supabase client that bypasses RLS.
 * SERVER-SIDE ONLY. Never call from "use client" components.
 * Requires SUPABASE_SERVICE_ROLE_KEY env var.
 */
export function getServiceSupabase(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const url         = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "jobSayer: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set " +
      "for service-role operations.",
    );
  }

  _serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "jobsayer-server" } },
  });

  return _serviceClient;
}

/* ── Per-request server client (anon key + cookies) ─────────────── */

import { createServerClient as _createServerClient } from "@supabase/ssr";
import type { ReadonlyRequestCookies }               from "next/dist/server/web/spec-extension/adapters/request-cookies";

/**
 * Per-request server client. Use in Server Components and route handlers
 * where you need the requesting user's authenticated session.
 *
 * Usage:
 *   import { cookies } from "next/headers";
 *   const sb = createServerSupabase(await cookies());
 */
export function createServerSupabase(
  cookieStore: ReadonlyRequestCookies,
): ReturnType<typeof _createServerClient> {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return _createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) =>
        toSet.forEach(({ name, value, options }) =>
          (cookieStore as unknown as { set: (n: string, v: string, o: unknown) => void })
            .set(name, value, options)
        ),
    },
  });
}

export type { User, Session } from "@supabase/supabase-js";
