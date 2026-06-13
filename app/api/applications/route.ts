/**
 * /api/applications
 *
 * GET  — list all applications for the authenticated user, newest first
 * POST — create a new application (or bulk-upsert on first sync from localStorage)
 *
 * Bulk upsert (localStorage → Supabase migration):
 *   POST { bulk: true, applications: Application[] }
 *   Returns { synced: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

interface AppBody {
  company:       string;
  role:          string;
  location?:     string;
  salary?:       string;
  url?:          string;
  stage?:        string;
  notes?:        string;
  appliedDate?:  string;
  offerDate?:    string;
  noticePeriod?: string;
}

function toRow(userId: string, b: AppBody & { id?: string }) {
  return {
    user_id:       userId,
    company:       b.company?.trim()        ?? "",
    role:          b.role?.trim()           ?? "",
    location:      b.location?.trim()       ?? "",
    salary:        b.salary?.trim()         ?? "",
    url:           b.url?.trim()            ?? "",
    stage:         b.stage                  ?? "saved",
    notes:         b.notes?.trim()          ?? "",
    applied_date:  b.appliedDate            ?? null,
    offer_date:    b.offerDate              ?? null,
    notice_period: b.noticePeriod           ?? "30 days",
    updated_at:    new Date().toISOString(),
  };
}

// ── GET ───────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("applications GET error:", error);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { bulk?: boolean; applications?: (AppBody & { id?: string })[] } & AppBody;

  // ── Bulk sync (localStorage migration) ───────────────────────
  if (body.bulk && Array.isArray(body.applications)) {
    const rows = body.applications
      .filter(a => a.company?.trim() && a.role?.trim())
      .map(a => toRow(user.id, a));

    if (rows.length === 0) return NextResponse.json({ synced: 0 });

    const { error: upsertErr } = await sb
      .from("applications")
      .upsert(rows, { onConflict: "user_id,company,role" });   // dedup by company+role

    if (upsertErr) {
      console.error("applications bulk upsert error:", upsertErr);
      return NextResponse.json({ error: "Bulk sync failed" }, { status: 500 });
    }

    return NextResponse.json({ synced: rows.length });
  }

  // ── Single create ─────────────────────────────────────────────
  if (!body.company?.trim() || !body.role?.trim()) {
    return NextResponse.json({ error: "company and role are required" }, { status: 400 });
  }

  const VALID_STAGES = ["saved","applied","screening","interview","offer","rejected"];
  if (body.stage && !VALID_STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("applications")
    .insert(toRow(user.id, body))
    .select()
    .single();

  if (error || !data) {
    console.error("application create error:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }

  return NextResponse.json({ application: data }, { status: 201 });
}
