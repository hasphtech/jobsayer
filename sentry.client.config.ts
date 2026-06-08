// sentry.client.config.ts — runs in the browser
// Install: pnpm add @sentry/nextjs
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Capture 5% of replays (1% on error for full replay)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media by default
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Ignore noisy browser errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    /ChunkLoadError/,
    /Loading chunk \d+ failed/,
  ],

  beforeSend(event) {
    // Strip PII from extra context
    if (event.user) {
      delete event.user.ip_address;
    }
    return event;
  },
});
