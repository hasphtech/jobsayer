"use client";
/**
 * ClientAuthProvider
 *
 * Wraps the app with Supabase AuthProvider (client-only — avoids SSR
 * browser-API issues). Uses Suspense so that during SSR the children still
 * render and produce full HTML (required for Google indexing).
 *
 * SSR flow:  Suspense fallback → <>{children}</> → full page HTML sent to Google
 * Client:    AuthProvider mounts → session resolved → auth state available
 *
 * Signed-in users see a brief landing-page flash (~300 ms) while the
 * session cookie is verified. Acceptable trade-off for crawlability.
 */
import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Keep Supabase createBrowserClient out of the server bundle (browser APIs only)
const AuthProvider = dynamic(
  () => import("@/lib/auth").then((m) => ({ default: m.AuthProvider })),
  { ssr: false }
);

export default function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    // Suspense fallback renders children directly during SSR so Googlebot
    // receives full landing-page HTML instead of an empty document.
    <Suspense fallback={<>{children}</>}>
      <AuthProvider>{children}</AuthProvider>
    </Suspense>
  );
}
