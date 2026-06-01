/**
 * POST /api/admin/bgv/run-check
 * Admin-only: run automated checks on a candidate BGV record.
 *
 * Body: { id: string }
 *
 * Updates candidate_bgv with:
 *   auto_check_results  — full AutoCheckSummary JSON
 *   id_verified         — set true if identity auto-passes
 *   edu_verified        — set true if education auto-passes
 *   status              — pending → in_progress (never downgrades verified/failed)
 */
import { NextRequest, NextResponse }              from "next/server";
import { verifyAdmin, isError, createServiceClient } from "@/lib/adminAuth";
import { runCandidateBgvAutoChecks }              from "@/lib/bgvAutoCheck";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isError(auth)) return auth;

  let id: string | undefined;
  try { ({ id } = await req.json()); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = createServiceClient();

  // Fetch the full record
  const { data: record, error: fetchErr } = await db
    .from("candidate_bgv")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Run checks
  const summary = runCandidateBgvAutoChecks({
    full_name:     record.full_name,
    dob:           record.dob,
    pan_number:    record.pan_number,
    aadhaar_last4: record.aadhaar_last4,
    education:     record.education  ?? [],
    employment:    record.employment ?? [],
  });

  // Don't downgrade status if already verified/failed/partial
  const LOCKED_STATUSES = ["verified", "partial", "failed"];
  const newStatus = LOCKED_STATUSES.includes(record.status)
    ? record.status
    : "in_progress";

  const { data: updated, error: updErr } = await db
    .from("candidate_bgv")
    .update({
      auto_check_results: summary,
      id_verified:        summary.idAutoVerified,
      edu_verified:       summary.eduAutoVerified,
      status:             newStatus,
      updated_at:         new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ bgv: updated, summary });
}
