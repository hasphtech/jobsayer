/**
 * PATCH /api/admin/bgv
 * Admin updates a candidate BGV record status, scores, and notes.
 * Body: { id, status, verification_score, id_verified, edu_verified,
 *         emp_verified, admin_notes, reviewed_at }
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, isError, createServiceClient } from "@/lib/adminAuth";

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

  // If fully verified, also update employer_profiles.is_verified for any
  // employer profile linked to this user — candidates can be both
  // For candidate BGV, update a trust signal if score is high
  if (fields.status === "verified" && data?.user_id) {
    await db
      .from("candidate_bgv")
      .update({ verification_score: fields.verification_score ?? 100 })
      .eq("id", id);
  }

  return NextResponse.json({ bgv: data });
}
