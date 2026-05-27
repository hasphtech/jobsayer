/**
 * @jobsayer/rateLimit — Sliding-window rate limiter
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set (production / Vercel). Falls back to an in-memory Map for local dev
 * so no Redis setup is needed to run the project locally.
 *
 * Usage (always await):
 *   const { allowed, retryAfter } = await rateLimit(`interview:${ip}`, 5, 60_000);
 *   if (!allowed) return 429 with Retry-After: retryAfter
 */

/* ── Types ─────────────────────────────────────────────────────── */

export interface RateLimitResult {
  allowed:    boolean;
  retryAfter: number;   // seconds until window resets (0 if allowed)
  remaining:  number;   // requests left in this window
}

/* ── In-memory fallback (local dev / no Redis) ──────────────────── */

interface Bucket { count: number; reset: number }
const store = new Map<string, Bucket>();

const PURGE_EVERY = 5 * 60_000;
let lastPurge = Date.now();

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastPurge > PURGE_EVERY) {
    for (const [k, b] of store) if (now > b.reset) store.delete(k);
    lastPurge = now;
  }
  const bucket = store.get(key);
  if (!bucket || now > bucket.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, retryAfter: 0, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.reset - now) / 1000), remaining: 0 };
  }
  bucket.count++;
  return { allowed: true, retryAfter: 0, remaining: limit - bucket.count };
}

/* ── Upstash Redis limiter (production) ─────────────────────────── */

let _upstashLimiter: import("@upstash/ratelimit").Ratelimit | null = null;

async function getUpstashLimiter(
  limit: number,
  windowMs: number,
): Promise<import("@upstash/ratelimit").Ratelimit> {
  if (_upstashLimiter) return _upstashLimiter;

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis }     = await import("@upstash/redis");

  const windowSec = Math.round(windowMs / 1000);

  _upstashLimiter = new Ratelimit({
    redis:     Redis.fromEnv(),
    limiter:   Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
    prefix:    "jobsayer:rl",
  });

  return _upstashLimiter;
}

async function upstashRateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter(limit, windowMs);
  const { success, remaining, reset } = await limiter.limit(key);
  const retryAfter = success ? 0 : Math.ceil((reset - Date.now()) / 1000);
  return { allowed: success, retryAfter: Math.max(0, retryAfter), remaining };
}

/* ── Public API ──────────────────────────────────────────────────── */

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Rate-limit `key` to `limit` requests per `windowMs` milliseconds.
 * Always async — awaiting is safe even in the in-memory fallback path.
 */
export async function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (hasUpstash) {
    return upstashRateLimit(key, limit, windowMs);
  }
  return memoryRateLimit(key, limit, windowMs);
}
