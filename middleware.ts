/**
 * Next.js Edge Middleware
 *
 * Responsibilities (in order):
 *  1. Security headers on every response (CSP, HSTS, X-Frame, etc.)
 *  2. CSRF token validation on state-mutating API routes
 *  3. Auth guard — redirect unauthenticated users away from protected routes
 *  4. Admin guard — block non-admins from /admin/*
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/* ── Route config ──────────────────────────────────────────── */

/** Routes that require a logged-in session */
const PROTECTED_PREFIXES = [
  "/builder", "/score", "/applications", "/interview",
  "/career-gps", "/career-health", "/bgv", "/salary",
  "/profile", "/upgrade", "/dashboard", "/tailor",
  "/linkedin", "/vault", "/integrations", "/learn",
  "/company", "/employer-dashboard", "/recruit",
  "/cover-letter",
];

/** API routes that mutate state — require CSRF token */
const CSRF_METHODS  = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_SKIP_API = [
  "/api/auth",    // Supabase auth (has its own CSRF)
  "/api/payment", // Webhooks from Razorpay / Stripe carry their own signatures
  "/api/jobs/remotive", // public seed endpoint
  "/api/geo",     // read-only
];

/* ── Helpers ───────────────────────────────────────────────── */

function isCsrfSafe(pathname: string): boolean {
  return CSRF_SKIP_API.some(p => pathname.startsWith(p));
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
}

function generateCsrfToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, c =>
    c === "+" ? "-" : c === "/" ? "_" : ""
  );
}

/* ── Security headers ──────────────────────────────────────── */

const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  // Prevent MIME sniffing
  "X-Content-Type-Options": "nosniff",
  // XSS filter (legacy browsers)
  "X-XSS-Protection": "1; mode=block",
  // Referrer policy — don't leak full URLs cross-origin
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // DNS prefetch control
  "X-DNS-Prefetch-Control": "on",
  // Disable browser features we don't use
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=()",
  // HSTS — 1 year, include subdomains (applied to https only below)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    // Scripts: self + Razorpay + Stripe + Tabler icons CDN + inline (needed for Next.js)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://js.stripe.com https://cdn.jsdelivr.net",
    // Styles: self + Google Fonts + inline (Next.js injects styles)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    // Fonts
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
    // Images: self + data URIs + any HTTPS (for company logos, avatars)
    "img-src 'self' data: blob: https:",
    // Connect: self + Supabase + Groq + Posthog + Sentry
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://app.posthog.com https://o*.ingest.sentry.io https://ip-api.com",
    // Frames: Razorpay + Stripe payment iframes
    "frame-src https://checkout.razorpay.com https://js.stripe.com https://hooks.stripe.com",
    // Workers (Next.js uses service workers in production)
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
};

/* ── Main middleware ───────────────────────────────────────── */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res          = NextResponse.next();

  /* 1 ─ Apply security headers to every response */
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    // Only send HSTS over HTTPS
    if (k === "Strict-Transport-Security" && req.nextUrl.protocol !== "https:") continue;
    res.headers.set(k, v);
  }

  /* 2 ─ CSRF validation for mutating API calls */
  if (
    pathname.startsWith("/api/") &&
    CSRF_METHODS.has(req.method) &&
    !isCsrfSafe(pathname)
  ) {
    const tokenFromHeader = req.headers.get("x-csrf-token");
    const tokenFromCookie = req.cookies.get("csrf_token")?.value;

    // If no token exists yet, mint one and set the cookie (first request)
    if (!tokenFromCookie) {
      const token = generateCsrfToken();
      const nextRes = NextResponse.next();
      // Copy security headers
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        if (k === "Strict-Transport-Security" && req.nextUrl.protocol !== "https:") continue;
        nextRes.headers.set(k, v);
      }
      nextRes.cookies.set("csrf_token", token, {
        httpOnly: false,   // Must be readable by JS to send in header
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
      });
      return nextRes;
    }

    // Validate double-submit cookie pattern
    if (!tokenFromHeader || tokenFromHeader !== tokenFromCookie) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid CSRF token" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /* 3 ─ Auth guard for protected pages */
  if (isProtected(pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    /* 4 ─ Admin guard */
    if (pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimiser)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot)$).*)",
  ],
};
