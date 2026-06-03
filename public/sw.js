/**
 * jobSayer Service Worker — offline shell cache
 * Caches the app shell so the UI loads instantly on repeat visits
 * and shows a friendly offline page when there's no connection.
 */

const CACHE  = "jobsayer-shell-v1";
const SHELL  = ["/", "/builder", "/score", "/jobs", "/applications", "/interview", "/career-gps", "/bgv", "/logo.png", "/favicon.ico"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Only intercept GET requests for same-origin navigation
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // API calls: network-first, no cache
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses for shell pages
        if (res.ok && SHELL.includes(url.pathname)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached ?? caches.match("/")))
  );
});
