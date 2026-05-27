/**
 * @jobsayer/adminAuth — Admin authentication utilities (server-side only)
 *
 * Admin access is controlled by the ADMIN_EMAILS env var.
 * Format: comma-separated list of email addresses.
 * Example: ADMIN_EMAILS=hasphtech@gmail.com,ops@jobsayer.com
 *
 * Admin API routes:
 *   1. Extract the Supabase access token from the Authorization header.
 *   2. Call verifyAdmin(token) — verifies the JWT and checks email whitelist.
 *   3. Use createServiceClient() for DB writes (bypasses RLS).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the email is in the ADMIN_EMAILS whitelist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/**
 * Create a Supabase client with service role privileges.
 * Server-side ONLY — bypasses RLS for admin operations.
 * Requires SUPABASE_SERVICE_ROLE_KEY env var.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin operations."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Auth verification ────────────────────────────────────────────────────────

export interface AdminUser {
  id:    string;
  email: string;
}

/**
 * Verify the bearer token from the request and confirm admin access.
 * Returns the admin user on success, or a NextResponse error on failure.
 */
export async function verifyAdmin(
  req: NextRequest
): Promise<AdminUser | NextResponse> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  if (!isAdminEmail(data.user.email)) {
    return NextResponse.json({ error: "Access denied — not an admin" }, { status: 403 });
  }

  return { id: data.user.id, email: data.user.email! };
}

/** Helper: returns true if the value is a NextResponse (i.e. an error). */
export function isError(v: AdminUser | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
