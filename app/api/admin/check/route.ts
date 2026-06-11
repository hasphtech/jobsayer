/**
 * GET /api/admin/check
 * Returns { isAdmin: true/false } for the current auth token.
 * Uses ADMIN_EMAILS env var — no service role key required.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return NextResponse.json({ isAdmin: false });

    // Use anon key — getUser() with a token works without service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email) return NextResponse.json({ isAdmin: false });

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = adminEmails.includes(data.user.email.toLowerCase());
    return NextResponse.json({ isAdmin, email: data.user.email });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
