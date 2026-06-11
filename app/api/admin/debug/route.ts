/**
 * GET /api/admin/debug
 * Temporary: diagnose admin auth issues. DELETE after fixing.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const adminEmails = process.env.ADMIN_EMAILS ?? "(not set)";
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  let userEmail: string | null = null;
  let userError: string | null = null;

  if (token && hasServiceKey && hasSupabaseUrl) {
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { data, error } = await sb.auth.getUser(token);
      userEmail = data.user?.email ?? null;
      userError = error?.message ?? null;
    } catch (e: unknown) {
      userError = String(e);
    }
  }

  return NextResponse.json({
    adminEmails,
    hasServiceKey,
    hasSupabaseUrl,
    tokenPresent: !!token,
    userEmail,
    userError,
    emailMatch: userEmail
      ? adminEmails.toLowerCase().includes(userEmail.toLowerCase())
      : false,
  });
}
