/**
 * GET  /api/admin/bgv         — List all candidate BGV submissions (admin only)
 * PATCH /api/admin/bgv        — Update a BGV record (status, score, notes)
 */
import { NextRequest, NextResponse }              from "next/server";
import { verifyAdmin, isError, createServiceClient } from "@/lib/adminAuth";

/* ── GET: list all BGV records ───────────────────────────────── */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter

  const db = createServiceClient();
  let query = db
    .from("candidate_bgv")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bgvRecords: data ?? [] });
}

/* ── PATCH: update a BGV record ──────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db
    .from("candidate_bgv")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bgv: data });
}
