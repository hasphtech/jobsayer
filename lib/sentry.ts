/**
 * lib/sentry.ts
 * Sentry helpers — safe to call when NEXT_PUBLIC_SENTRY_DSN is not set (dev/local).
 *
 * Setup:
 *   pnpm add @sentry/nextjs
 *   Add to .env.local:
 *     NEXT_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYYYY
 *     SENTRY_ORG=your-org
 *     SENTRY_PROJECT=jobsayer
 *     SENTRY_AUTH_TOKEN=sntrys_...   (for source map uploads)
 */

type SentryInstance = {
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  captureMessage:   (msg: string,  level?: "info" | "warning" | "error") => void;
  setUser:          (user: { id: string; email?: string } | null) => void;
  addBreadcrumb:    (crumb: { message: string; category?: string; level?: string }) => void;
};

let _sentry: SentryInstance | null = null;

async function getSentry(): Promise<SentryInstance | null> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
  if (_sentry) return _sentry;
  const Sentry = await import("@sentry/nextjs");
  _sentry = Sentry as unknown as SentryInstance;
  return _sentry;
}

export async function captureError(err: unknown, context?: Record<string, unknown>) {
  const sentry = await getSentry();
  if (sentry) sentry.captureException(err, context);
  else        console.error("[error]", err, context);
}

export async function captureMessage(msg: string, level: "info" | "warning" | "error" = "info") {
  const sentry = await getSentry();
  if (sentry) sentry.captureMessage(msg, level);
  else        console[level === "error" ? "error" : "log"]("[sentry]", msg);
}

export async function setSentryUser(user: { id: string; email?: string } | null) {
  const sentry = await getSentry();
  if (sentry) sentry.setUser(user);
}

export async function addBreadcrumb(message: string, category = "app") {
  const sentry = await getSentry();
  if (sentry) sentry.addBreadcrumb({ message, category, level: "info" });
}
