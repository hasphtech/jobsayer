/**
 * POST /api/verify/company
 * Employer submits company identifiers for verification.
 * Validates GSTIN/CIN format, attempts live GSTIN lookup,
 * and saves to company_verifications table for admin review.
 *
 * Body: { company_name, cin?, gstin?, pan? }
 *
 * GET /api/verify/company
 * Returns the current employer's verification record.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient }        from "@supabase/ssr";
import { createClient }              from "@supabase/supabase-js";
import { cookies }                   from "next/headers";
import {
  validateGSTIN,
  validateCIN,
  validatePAN,
  verifyGSTINLive,
  computeCompanyTrustScore,
  mcaSearchLink,
} from "@/lib/bgvUtils";

async function getUser() {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}

export async function GET() {
  const { sb, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("company_verifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verification: data });
}

export async function POST(req: NextRequest) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { company_name, cin, gstin, pan } = body;
  if (!company_name?.trim()) return NextResponse.json({ error: "company_name is required" }, { status: 400 });
  if (!cin && !gstin) return NextResponse.json({ error: "Provide at least CIN or GSTIN" }, { status: 400 });

  const errors: string[] = [];
  let cinValid = false, gstValid = false, panValid = false;

  if (cin) {
    const c = validateCIN(cin);
    if (!c.valid) errors.push(`CIN: ${c.error}`);
    else cinValid = true;
  }
  if (gstin) {
    const g = validateGSTIN(gstin);
    if (!g.valid) errors.push(`GSTIN: ${g.error}`);
    else gstValid = true;
  }
  if (pan) {
    const p = validatePAN(pan);
    if (!p.valid) errors.push(`PAN: ${p.error}`);
    else panValid = true;
  }
  if (errors.length > 0) return NextResponse.json({ error: errors.join("; ") }, { status: 400 });

  // ── Live GSTIN verification ───────────────────────────────────────────────
  let gstData: Record<string, unknown> = {};
  let gstStatus = "pending";
  if (gstin && gstValid) {
    const live = await verifyGSTINLive(gstin);
    if (live.found) {
      gstStatus  = live.status === "Active" ? "active" : live.status === "format_valid_manual_review" ? "pending_manual" : (live.status ?? "unknown");
      gstData    = {
        trade_name:         live.tradeName,
        legal_name:         live.legalName,
        registration_date:  live.registrationDate,
        business_type:      live.businessType,
        status:             live.status,
      };
    } else {
      gstStatus = "not_found";
    }
  }

  // ── Compute initial trust score ───────────────────────────────────────────
  const trustScore = computeCompanyTrustScore({
    mcaVerified: false,       // set true only after admin review
    gstVerified: gstStatus === "active",
    panVerified: panValid,
  });

  // ── Get employer profile id ───────────────────────────────────────────────
  const serviceDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: empProfile } = await serviceDb
    .from("employer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // ── Upsert verification record ────────────────────────────────────────────
  const { data, error } = await serviceDb
    .from("company_verifications")
    .upsert({
      user_id:              user.id,
      employer_profile_id:  empProfile?.id ?? null,
      company_name:         company_name.trim(),
      cin:                  cin?.toUpperCase() || null,
      gstin:                gstin?.toUpperCase() || null,
      pan:                  pan?.toUpperCase() || null,
      gst_status:           gstStatus,
      gst_trade_name:       (gstData.trade_name as string) || null,
      gst_legal_name:       (gstData.legal_name as string) || null,
      gst_registration_date:(gstData.registration_date as string) || null,
      gst_business_type:    (gstData.business_type as string) || null,
      gst_raw:              gstData,
      is_gst_verified:      gstStatus === "active",
      trust_score:          trustScore,
      verification_status:  gstStatus === "active" ? "in_progress" : "pending",
      mca_link:             cin ? mcaSearchLink(company_name) : null,
      updated_at:           new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    verification: data,
    gstLive: gstData,
    mcaLink: cin ? mcaSearchLink(company_name) : null,
    message: gstStatus === "active"
      ? "GSTIN verified ✓. CIN/MCA check is in progress — admin will complete within 24 hours."
      : "Verification submitted. Admin will review your CIN and GSTIN within 24 hours.",
  });
}
