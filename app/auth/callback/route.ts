/**
 * GET /auth/callback
 *
 * Server-side OAuth callback handler for Google (and any future provider).
 *
 * WHY SERVER-SIDE:
 * @supabase/ssr's createBrowserClient writes sessions to cookies. For the
 * cookies to be sent back to the browser on the redirect, the exchange MUST
 * happen server-side so we can attach Set-Cookie headers to the response.
 * A client-side page.tsx cannot set HttpOnly cookies, so the session was
 * being stored only in memory and lost on the next page load.
 *
 * FLOW:
 *   Google → /auth/callback?code=... → exchangeCodeForSession() → Set-Cookie
 *   → redirect(/) → AuthProvider.getSession() reads cookies → user logged in ✓
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  // OAuth error from provider — just go home
  if (error || !code) {
    return NextResponse.redirect(`${origin}/`);
  }

  // Build a redirect response first — we'll attach Set-Cookie headers to it
  const response = NextResponse.redirect(`${origin}/`);

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error("auth/callback: missing Supabase env vars");
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      // Read from the incoming request cookies (PKCE verifier stored here)
      getAll() {
        return request.cookies.getAll();
      },
      // Write session cookies onto the redirect response
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("auth/callback: exchangeCodeForSession error", exchangeError.message);
  }

  // Whether exchange succeeded or not, redirect home.
  // AuthProvider will detect the session (or show guest state on failure).
  return response;
}
