/**
 * GET /auth/callback
 *
 * Server-side OAuth + magic-link callback handler.
 *
 * FLOW:
 *   Google/OTP → /auth/callback?code=...&next=/bgv
 *     → exchangeCodeForSession() writes Set-Cookie on the redirect response
 *     → redirects to ?next (or / by default)
 *     → AuthProvider.onAuthStateChange fires INITIAL_SESSION → user logged in ✓
 *
 * WHY SERVER-SIDE:
 *   createBrowserClient stores sessions in cookies. Set-Cookie headers must be
 *   attached to a server response — a client page.tsx cannot do this.
 *
 * PKCE verifier:
 *   createBrowserClient writes the code_verifier to document.cookie (not
 *   localStorage). The browser sends that cookie on the redirect back here, so
 *   request.cookies.getAll() picks it up and exchangeCodeForSession() succeeds.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient }        from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code      = searchParams.get("code");
  const error     = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  // Determine where to send the user after auth
  const rawNext  = searchParams.get("next") ?? "/";
  // Reject open-redirect attempts — only allow same-origin relative paths
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/";

  // Provider reported an error (e.g. user denied Google access)
  if (error) {
    console.error(`auth/callback: provider error — ${error}: ${errorDesc}`);
    const dest = new URL("/", origin);
    dest.searchParams.set("auth_error", errorDesc ?? error);
    return NextResponse.redirect(dest.toString());
  }

  // No code — abnormal, go home
  if (!code) {
    console.error("auth/callback: missing code param");
    return NextResponse.redirect(`${origin}/`);
  }

  const sbUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!sbUrl || !sbAnon) {
    console.error("auth/callback: missing Supabase env vars");
    return NextResponse.redirect(`${origin}/`);
  }

  // Build the redirect response first — session cookies are attached to it
  const response = NextResponse.redirect(`${origin}${nextPath}`);

  const supabase = createServerClient(sbUrl, sbAnon, {
    cookies: {
      // Read the PKCE code_verifier written by createBrowserClient to document.cookie
      getAll() {
        return request.cookies.getAll();
      },
      // Attach session cookies onto the redirect response → browser stores them
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // Most common cause: PKCE verifier cookie missing or expired.
    // Redirect home with a visible error flag so the UI can surface it.
    console.error("auth/callback: exchangeCodeForSession failed —", exchangeError.message);
    const dest = new URL("/", origin);
    dest.searchParams.set("auth_error", "Sign-in failed. Please try again.");
    return NextResponse.redirect(dest.toString());
  }

  // Success — response already has session cookies + redirect to nextPath
  return response;
}
