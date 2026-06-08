/**
 * GET /api/geo
 * Returns the visitor's ISO country code detected from IP.
 *
 * Detection order (fastest / most reliable first):
 *   1. cf-ipcountry   — set by Cloudflare (free on all plans)
 *   2. x-vercel-ip-country — set by Vercel Edge
 *   3. ip-api.com lookup using x-forwarded-for / x-real-ip
 *   4. null (localhost / unknown)
 *
 * Response: { country: "IN" | null }
 * Cached at the CDN edge for 24 h; client should cache for the session.
 */
import { NextRequest, NextResponse } from "next/server";

const LOCAL_IPS = new Set(["127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1"]);

function clientIp(req: NextRequest): string | null {
  // x-forwarded-for may be a comma-separated list; first entry is the client
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first && !LOCAL_IPS.has(first)) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real && !LOCAL_IPS.has(real)) return real;
  return null;
}

export async function GET(req: NextRequest) {
  // 1. Cloudflare
  const cf = req.headers.get("cf-ipcountry");
  if (cf && cf !== "XX" && cf !== "T1") {
    return NextResponse.json({ country: cf }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // 2. Vercel
  const vercel = req.headers.get("x-vercel-ip-country");
  if (vercel) {
    return NextResponse.json({ country: vercel }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // 3. ip-api.com lookup (free, 45 req/min, HTTP only)
  const ip = clientIp(req);
  if (!ip) {
    // Localhost / dev — no lookup possible
    return NextResponse.json({ country: null });
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode,status`,
      { next: { revalidate: 86400 } }         // cache lookup for 24 h at the edge
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.countryCode) {
        return NextResponse.json({ country: data.countryCode as string }, {
          headers: { "Cache-Control": "public, max-age=86400" },
        });
      }
    }
  } catch { /* fall through */ }

  return NextResponse.json({ country: null });
}
