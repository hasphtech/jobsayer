/**
 * @jobsayer/rateLimit — Sliding-window rate limiter
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set (production / Vercel). Falls back to an in-memory Map for local dev
 * so no Redis setup is needed to run the project locally.
 *
 * Bug fix (scalability): the previous implementation shared a single
 * _upstashLimiter instance across all callers. A second endpoint with a
 * different `limit` / `windowMs` would silently reuse the first endpoint's
 * settings. Now instances are keyed by `${limit}:${windowMs}`.
 *
 * Usage (always await):
 *   const { allowed, retryAfter } = await rateLimit(`interview:${ip}`, 5, 60_000);
 *   if (!allowed) return 429 with Retry-After: retryAfter
 *
 * Preset helpers (preferred — documents intent at call sites):
 *   rateLimitAi(ip)        — 10 req / 60 s  (AI endpoints)
 *   rateLimitUpload(ip)    —  5 req / 60 s  (file uploads)
 *   rateLimitAuth(ip)      — 20 req / 60 s  (auth endpoints)
 *   rateLimitPublic(ip)    — 60 req / 60 s  (public read endpoints)
 */

/* ── Types ─────────────────────────────────────────────────────── */

export interface RateLimitResult {
  allowed:    boolean;
  retryAfter: number;   // seconds until window resets (0 if allowed)
  remaining:  number;   // requests left in this window
}

/* ── In-memory fallback (local dev / no Redis) ──────────────────── */

interface Bucket { count: number; reset: number }
const store    = new Map<string, Bucket>();
let lastPurge  = Date.now();
const PURGE_EVERY = 5 * 60_000;

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

/* ── Upstash Redis limiter pool (production) ────────────────────── */
//
// Key insight: Ratelimit instances are stateless wrappers — they don't hold
// connections, just config + a reference to the Redis client. Cache them by
// config key so each unique (limit, window) pair gets exactly one instance.

type RatelimitInstance = import("@upstash/ratelimit").Ratelimit;
const _limiterPool = new Map<string, RatelimitInstance>();
let   _redisReady  = false;
let   _redis: import("@upstash/redis").Redis | null = null;

async function ensureRedis(): Promise<import("@upstash/redis").Redis> {
  if (_redis) return _redis;
  const { Redis } = await import("@upstash/redis");
  _redis = Redis.fromEnv();
  _redisReady = true;
  return _redis;
}

async function getUpstashLimiter(
  limit:    number,
  windowMs: number,
): Promise<RatelimitInstance> {
  const poolKey = `${limit}:${windowMs}`;
  const cached  = _limiterPool.get(poolKey);
  if (cached) return cached;

  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis         = await ensureRedis();
  const windowSec     = Math.round(windowMs / 1000);

  const instance = new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
    prefix:    "jobsayer:rl",
  });

  _limiterPool.set(poolKey, instance);
  return instance;
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
  return hasUpstash
    ? upstashRateLimit(key, limit, windowMs)
    : memoryRateLimit(key, limit, windowMs);
}

/* ── Preset helpers ──────────────────────────────────────────────── */

/** AI generation endpoints — 10 req / 60 s per IP */
export const rateLimitAi = (ip: string) =>
  rateLimit(`ai:${ip}`, 10, 60_000);

/** File upload endpoints — 5 req / 60 s per IP */
export const rateLimitUpload = (ip: string) =>
  rateLimit(`upload:${ip}`, 5, 60_000);

/** Auth endpoints — 20 req / 60 s per IP */
export const rateLimitAuth = (ip: string) =>
  rateLimit(`auth:${ip}`, 20, 60_000);

/** Public read endpoints — 60 req / 60 s per IP */
export const rateLimitPublic = (ip: string) =>
  rateLimit(`pub:${ip}`, 60, 60_000);

/** Returns true if Redis is currently initialised (useful for health checks) */
export const redisReady = () => _redisReady;
