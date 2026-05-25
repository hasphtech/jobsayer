/**
 * @/lib/auth — barrel re-export
 * Mirrors what the shared auth package exported so all existing imports resolve.
 */
export { getSupabaseAsync, getSupabase } from "./supabase";
export type { User, Session } from "./supabase";

export { AuthProvider, useAuth } from "./useAuth";
export type { AuthState } from "./useAuth";

export { usePersistentState } from "./usePersistentState";
