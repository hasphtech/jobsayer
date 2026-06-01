/**
 * PATCH /api/admin/company-verify
 * Admin updates a company verification record and propagates
 * is_verified + trust_score back to employer_profiles.
 *
 * Body: { id, verification_status, is_mca_verified, trust_score,
 *         admin_notes, verified_at }
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

  // 1. Update the company_verifications row
  const { data, error } = await db
    .from("company_verifications")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("employer_profile_id, verification_status, trust_score")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. Propagate is_verified and trust_score to employer_profiles
  if (data?.employer_profile_id) {
    const isVerified = data.verification_status === "verified" ||
                       data.verification_status === "partially_verified";
    await db
      .from("employer_profiles")
      .update({
        is_verified:  isVerified,
        trust_score:  data.trust_score ?? 0,
        updated_at:   new Date().toISOString(),
      })
      .eq("id", data.employer_profile_id);
  }

  return NextResponse.json({ verification: data });
}
