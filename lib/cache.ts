/**
 * @jobsayer/cache — Redis-backed application cache
 *
 * Thin typed wrapper over Upstash Redis for caching expensive DB lookups
 * and API responses. Falls back to a no-op (cache-miss) when Redis is
 * unavailable so the app degrades gracefully.
 *
 * All keys are namespaced under "jobsayer:cache:" to avoid collisions
 * with the rate-limiter namespace ("jobsayer:rl:").
 *
 * TTL presets (tune as needed):
 *   JOBS_LIST    5 min  — public job board (invalidated on admin write)
 *   SUBSCRIPTION 2 min  — user plan tier (invalidated on payment webhook)
 *   PROFILE      1 min  — user profile row
 *   COMPANY      10 min — company detail pages
 *   SALARY       30 min — salary data (rarely changes)
 *
 * Usage:
 *   import { cache, CACHE_TTL } from "@/lib/cache";
 *
 *   // read-through pattern
 *   const jobs = await cache.getOrSet("jobs:all", CACHE_TTL.JOBS_LIST, async () => {
 *     const { data } = await supabase.from("jobs").select("*")...;
 *     return data ?? [];
 *   });
 *
 *   // explicit invalidation
 *   await cache.del("jobs:all");
 */

/* ── TTL constants (seconds) ─────────────────────────────────────── */

export const CACHE_TTL = {
  JOBS_LIST:    5 * 60,    //  5 min
  SUBSCRIPTION: 2 * 60,    //  2 min
  PROFILE:      1 * 60,    //  1 min
  COMPANY:      10 * 60,   // 10 min
  SALARY:       30 * 60,   // 30 min
  NOTIFICATIONS: 30,       // 30 s  (near-real-time)
} as const;

/* ── Redis client singleton ──────────────────────────────────────── */

type RedisClient = import("@upstash/redis").Redis;

let _redis: RedisClient | null  = null;
let _available: boolean | null  = null;  // null = not yet probed

const NS = "jobsayer:cache:";

async function getRedis(): Promise<RedisClient | null> {
  if (_available === false) return null;  // already confirmed unavailable

  if (_redis) return _redis;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    _available = false;
    return null;
  }

  try {
    const { Redis } = await import("@upstash/redis");
    _redis     = Redis.fromEnv();
    _available = true;
    return _redis;
  } catch {
    _available = false;
    return null;
  }
}

/* ── Core helpers ─────────────────────────────────────────────────── */

async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get<T>(NS + key);
    return raw ?? null;
  } catch (err) {
    console.warn("[cache] get error", key, (err as Error).message);
    return null;
  }
}

async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.set(NS + key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn("[cache] set error", key, (err as Error).message);
  }
}

async function cacheDel(key: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(NS + key);
  } catch (err) {
    console.warn("[cache] del error", key, (err as Error).message);
  }
}

async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    // Upstash supports SCAN; iterate to find matching keys
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: NS + pattern,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== 0);
  } catch (err) {
    console.warn("[cache] delPattern error", pattern, (err as Error).message);
  }
}

/**
 * Read-through cache: return cached value or compute + store it.
 * If Redis is down, `fetcher` is always called (no caching, no error).
 */
async function getOrSet<T>(
  key:        string,
  ttlSeconds: number,
  fetcher:    () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  // fire-and-forget to avoid blocking the response
  cacheSet(key, fresh, ttlSeconds).catch(() => {});
  return fresh;
}

/* ── Public API ──────────────────────────────────────────────────── */

export const cache = {
  get:        cacheGet,
  set:        cacheSet,
  del:        cacheDel,
  delPattern: cacheDelPattern,
  getOrSet,
  /** Returns true when Upstash is configured and reachable */
  isAvailable: () => _available === true,
} as const;

/* ── Typed key builders (prevents typos at call sites) ──────────── */

export const CacheKey = {
  jobsList:     ()           => "jobs:all",
  subscription: (userId: string) => `sub:${userId}`,
  profile:      (userId: string) => `profile:${userId}`,
  company:      (slug: string)   => `company:${slug}`,
  notifications:(userId: string) => `notif:${userId}`,
} as const;
