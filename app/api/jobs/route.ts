/**
 * GET /api/jobs
 * Returns all active + approved jobs from Supabase.
 * Public endpoint — no auth required. RLS handles filtering.
 *
 * Caching strategy (two layers):
 *  1. Redis (server-side): 5-minute TTL. Eliminates DB round trips for
 *     concurrent users. Invalidated by admin job writes via cache.del().
 *  2. HTTP headers (CDN/edge): s-maxage=300, stale-while-revalidate=600.
 *     Vercel Edge and any upstream CDN serve stale content while revalidating.
 *
 * Combined, this means:
 *  - 0 Supabase queries for any burst of traffic within a 5-min window.
 *  - Single DB query per 5-min window regardless of concurrent users.
 *  - Graceful degradation: if Redis is down, falls through to Supabase.
 */
import { NextResponse }              from "next/server";
import { createClient }              from "@supabase/supabase-js";
import { cache, CacheKey, CACHE_TTL } from "@/lib/cache";

// Reuse client across warm invocations — avoids new TCP handshake per request
let _db: ReturnType<typeof createClient> | null = null;

function getDb() {
  if (_db) return _db;
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  _db = createClient(url, anon, { auth: { persistSession: false } });
  return _db;
}

export async function GET() {
  const cacheKey = CacheKey.jobsList();

  const jobs = await cache.getOrSet(cacheKey, CACHE_TTL.JOBS_LIST, async () => {
    const db = getDb();
    if (!db) return [];

    const { data, error } = await db
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .eq("is_approved", true)
      .order("posted_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("GET /api/jobs error:", error.message);
      return [];
    }

    return data ?? [];
  });

  return NextResponse.json(
    { jobs },
    {
      headers: {
        // CDN caches for 5 min; serves stale for up to 10 min while revalidating
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
