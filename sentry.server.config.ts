// sentry.server.config.ts — runs in Node.js API routes
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Redact auth tokens from request headers if captured
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, unknown>)["authorization"];
      delete (event.request.headers as Record<string, unknown>)["cookie"];
    }
    return event;
  },
});
