/**
 * GET /api/jobs
 * Returns all active + approved jobs from Supabase.
 * Public endpoint — no auth required. RLS handles filtering.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json({ jobs: [] });
  }

  const db = createClient(url, anon, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("posted_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("GET /api/jobs error:", error.message);
    return NextResponse.json({ jobs: [] });
  }

  return NextResponse.json({ jobs: data ?? [] });
}
