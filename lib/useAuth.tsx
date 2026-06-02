"use client";
/**
 * @jobsayer/auth — AuthProvider + useAuth hook
 *
 * CRITICAL ORDER RULE (Supabase SSR):
 *   1. Set up onAuthStateChange FIRST — captures INITIAL_SESSION event
 *   2. THEN call getSession() — triggers the INITIAL_SESSION event
 *   Reversing this order means the Google OAuth session is silently missed.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabaseAsync } from "./supabase";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

export interface AuthState {
  user:             User | null;
  session:          Session | null;
  loading:          boolean;
  isRegistered:     boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signInWithOtp:    (email: string) => Promise<{ error: string | null }>;
  verifyOtp:        (email: string, token: string) => Promise<{ error: string | null }>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, loading: true, isRegistered: false,
  signInWithGoogle: async () => {},
  signInWithOtp:    async () => ({ error: null }),
  verifyOtp:        async () => ({ error: null }),
  signOut:          async () => {},
});

export function AuthProvider({
  children,
  onBeforeSignOut,
}: {
  children: React.ReactNode;
  onBeforeSignOut?: () => void;
}): React.ReactElement {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    getSupabaseAsync().then((sb) => {
      // ── STEP 1: Wire the listener BEFORE calling getSession() ─────────────
      // Supabase fires INITIAL_SESSION during the first getSession() call.
      // If onAuthStateChange isn't registered yet, that event is permanently
      // lost — Google OAuth sessions are never detected on the post-redirect page.
      const { data: { subscription } } = sb.auth.onAuthStateChange(
        (_event: AuthChangeEvent, newSession: Session | null) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        }
      );
      unsub = () => subscription.unsubscribe();

      // ── STEP 2: Now trigger the INITIAL_SESSION event ─────────────────────
      sb.auth.getSession().catch(() => setLoading(false));

    }).catch(() => setLoading(false));

    return () => unsub?.();
  }, []);

  // ── signInWithGoogle ─────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const sb = await getSupabaseAsync();
    // Use NEXT_PUBLIC_SITE_URL for a consistent redirectTo — avoids www vs
    // non-www mismatches that cause Supabase bad_oauth_state errors.
    // Falls back to window.location.origin only in local dev.
    const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? window.location.origin;
    const callbackBase = `${siteUrl}/auth/callback`;
    const callbackUrl  = redirectTo
      ? `${callbackBase}?next=${encodeURIComponent(redirectTo)}`
      : callbackBase;
    try {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
    } catch (err) {
      console.error("@jobsayer/auth: Google OAuth error", err);
    }
  }, []);

  // ── signInWithOtp ────────────────────────────────────────────────────────
  const signInWithOtp = useCallback(async (email: string) => {
    const sb = await getSupabaseAsync();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? window.location.origin;
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  // ── verifyOtp ────────────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (email: string, token: string) => {
    const sb = await getSupabaseAsync();
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    return { error: error?.message ?? null };
  }, []);

  // ── signOut ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    onBeforeSignOut?.();

    // Optimistically clear UI state immediately
    setUser(null);
    setSession(null);

    try {
      const sb = await getSupabaseAsync();
      // MUST await — if we navigate before this completes, cookies survive
      // the page reload and getSession() re-authenticates the user silently.
      await sb.auth.signOut({ scope: "local" });
    } catch (err) {
      console.error("@jobsayer/auth: signOut error", err);
    }

    // Navigate only after Supabase has cleared the session cookies.
    window.location.href = "/";
  }, [onBeforeSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user, session, loading,
        isRegistered: !!user,
        signInWithGoogle, signInWithOtp, verifyOtp, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
