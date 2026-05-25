"use client";
/**
 * @jobsayer/auth — AuthProvider + useAuth hook
 *
 * Provides a React context with the current Supabase user, session,
 * and all auth actions (Google OAuth, OTP, sign out).
 *
 * Usage:
 *   // In your root layout
 *   import { AuthProvider } from "@/lib/auth";
 *   <AuthProvider>{children}</AuthProvider>
 *
 *   // In any client component
 *   import { useAuth } from "@/lib/auth";
 *   const { user, signOut } = useAuth();
 *
 * onBeforeSignOut:
 *   Pass a callback to run synchronous cleanup before the Supabase session
 *   is cleared (e.g. clearing app-specific caches). It runs synchronously
 *   so it's guaranteed to complete before the page reloads.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabaseAsync } from "./supabase";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

export interface AuthState {
  user:             User | null;
  session:          Session | null;
  loading:          boolean;
  isRegistered:     boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithOtp:    (email: string) => Promise<{ error: string | null }>;
  verifyOtp:        (email: string, token: string) => Promise<{ error: string | null }>;
  signOut:          () => void;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, loading: true, isRegistered: false,
  signInWithGoogle: async () => {},
  signInWithOtp:    async () => ({ error: null }),
  verifyOtp:        async () => ({ error: null }),
  signOut:          () => {},
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
    getSupabaseAsync()
      .then((sb) => {
        sb.auth
          .getSession()
          .then(({ data }: { data: { session: Session | null } }) => {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
          })
          .catch(() => setLoading(false));

        const {
          data: { subscription },
        } = sb.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        });
        unsub = () => subscription.unsubscribe();
      })
      .catch(() => setLoading(false));

    return () => unsub?.();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const sb = await getSupabaseAsync();
    try {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
    } catch (err) {
      console.error("@jobsayer/auth: Google OAuth error", err);
    }
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    const sb = await getSupabaseAsync();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const sb = await getSupabaseAsync();
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(() => {
    // Run app-specific cleanup (cache clearing, etc.) BEFORE wiping state.
    onBeforeSignOut?.();

    setUser(null);
    setSession(null);

    try {
      // Clear all Supabase-owned localStorage keys.
      if (typeof localStorage !== "undefined") {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("sb-") || k.includes("supabase")) {
            try { localStorage.removeItem(k); } catch { /* ignore */ }
          }
        });
      }
      // Clear PKCE verifier from sessionStorage.
      if (typeof sessionStorage !== "undefined") {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith("sb-") || k.includes("supabase")) {
            try { sessionStorage.removeItem(k); } catch { /* ignore */ }
          }
        });
      }
      // Expire Supabase auth cookies on every likely path+domain.
      if (typeof document !== "undefined") {
        const host = window.location.hostname;
        const past = "Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0].trim();
          if (!name || (!name.startsWith("sb-") && !name.includes("supabase"))) return;
          document.cookie = `${name}=; path=/; expires=${past}`;
          document.cookie = `${name}=; path=/; domain=${host}; expires=${past}`;
          const parts = host.split(".");
          if (parts.length > 2) {
            document.cookie = `${name}=; path=/; domain=.${parts.slice(-2).join(".")}; expires=${past}`;
          }
        });
      }
    } catch (err) {
      console.error("@jobsayer/auth: sign-out cleanup error", err);
    }

    // Fire-and-forget — don't await; page reload is the perceived sign-out.
    getSupabaseAsync()
      .then((sb) => sb.auth.signOut({ scope: "local" }))
      .catch((err) => console.error("@jobsayer/auth: Supabase signOut error", err));

    // Hard reload wipes all React state and restarts as guest.
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
