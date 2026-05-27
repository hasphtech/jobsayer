/**
 * /api/admin/jobs — Job CRUD (admin only)
 *
 * GET    ?status=all|pending|active  → list jobs
 * POST                               → create job
 * PATCH  { id, ...fields }           → update job (approve / edit / toggle)
 * DELETE ?id=<uuid>                  → delete job
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, isError, createServiceClient } from "@/lib/adminAuth";

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all"; // all | pending | active

  const db = createServiceClient();
  let query = db.from("jobs").select("*").order("created_at", { ascending: false });

  if (status === "pending")  query = query.eq("is_approved", false).eq("is_active", true);
  if (status === "active")   query = query.eq("is_approved", true).eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, company, location } = body;
  if (!title || !company || !location) {
    return NextResponse.json({ error: "title, company, location are required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db.from("jobs").insert([body]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}

// ── PATCH ────────────────────────────────────────────────────────────────────

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
    .from("jobs")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isError(auth)) return auth;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db.from("jobs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
