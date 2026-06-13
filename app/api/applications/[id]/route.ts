/**
 * /api/applications/[id]
 *
 * PATCH  — update stage, notes, salary, url, appliedDate, offerDate, noticePeriod
 * DELETE — remove application
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

const VALID_STAGES = new Set(["saved","applied","screening","interview","offer","rejected"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, string | undefined>;

  // Build update object from allowed fields only
  const update: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if ("company"      in body) update.company       = body.company?.trim()       ?? "";
  if ("role"         in body) update.role          = body.role?.trim()          ?? "";
  if ("location"     in body) update.location      = body.location?.trim()      ?? "";
  if ("salary"       in body) update.salary        = body.salary?.trim()        ?? "";
  if ("url"          in body) update.url           = body.url?.trim()           ?? "";
  if ("notes"        in body) update.notes         = body.notes?.trim()         ?? "";
  if ("noticePeriod" in body) update.notice_period = body.noticePeriod?.trim()  ?? "30 days";
  if ("appliedDate"  in body) update.applied_date  = body.appliedDate           ?? null;
  if ("offerDate"    in body) update.offer_date    = body.offerDate             ?? null;

  if ("stage" in body) {
    if (!VALID_STAGES.has(body.stage ?? "")) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    update.stage = body.stage!;
  }

  const { data, error } = await sb
    .from("applications")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("application PATCH error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ application: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await sb
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("application DELETE error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
