/**
 * @jobsayer/ai — In-process sliding-window rate limiter
 *
 * Zero external dependencies. Shared across requests in the same
 * server container. For cross-instance limiting (high traffic /
 * many Vercel containers) swap the Map for Upstash Redis — same interface.
 *
 * Usage:
 *   const { allowed, retryAfter } = rateLimit(`ai:${ip}`, 10, 60_000);
 *   if (!allowed) return 429 with Retry-After: retryAfter
 */

interface Bucket {
  count: number;
  reset: number; // epoch ms when the window resets
}

const store = new Map<string, Bucket>();

const PURGE_INTERVAL_MS = 5 * 60_000;
let lastPurge = Date.now();

function maybePurge() {
  const now = Date.now();
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  for (const [key, bucket] of store) {
    if (now > bucket.reset) store.delete(key);
  }
  lastPurge = now;
}

/**
 * @param key       Unique identifier — e.g. `"ai:${ip}"` or `"ai:${userId}"`
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): { allowed: boolean; retryAfter: number; remaining: number } {
  maybePurge();

  const now    = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, retryAfter: 0, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.reset - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, retryAfter: 0, remaining: limit - bucket.count };
}
