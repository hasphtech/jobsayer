/**
 * POST /api/bgv/submit
 * Candidate submits their BGV details.
 * Creates or updates the candidate_bgv row for this user.
 *
 * Body: {
 *   full_name, dob?, pan_number?, aadhaar_last4?,
 *   education: [{degree, institution, year, result}],
 *   employment: [{company, role, from_date, to_date, manager_name, manager_email}]
 * }
 */
import { NextRequest, NextResponse }    from "next/server";
import { createServerClient }           from "@supabase/ssr";
import { createClient }                 from "@supabase/supabase-js";
import { cookies }                      from "next/headers";
import { validatePAN }                  from "@/lib/bgvUtils";
import { runCandidateBgvAutoChecks }    from "@/lib/bgvAutoCheck";

export async function POST(req: NextRequest) {
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { full_name, dob, pan_number, aadhaar_last4, education, employment } = body;
  if (!full_name) return NextResponse.json({ error: "full_name is required" }, { status: 400 });

  // Validate PAN if provided
  if (pan_number) {
    const panCheck = validatePAN(String(pan_number));
    if (!panCheck.valid) return NextResponse.json({ error: `PAN: ${panCheck.error}` }, { status: 400 });
  }

  // Validate aadhaar_last4
  if (aadhaar_last4 && !/^\d{4}$/.test(String(aadhaar_last4))) {
    return NextResponse.json({ error: "aadhaar_last4 must be exactly 4 digits" }, { status: 400 });
  }

  const serviceDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const eduArr = Array.isArray(education) ? education : [];
  const empArr = Array.isArray(employment) ? employment : [];

  // Run automated checks immediately on submit
  const autoChecks = runCandidateBgvAutoChecks({
    full_name:     String(full_name),
    dob:           dob ? String(dob) : null,
    pan_number:    pan_number ? String(pan_number).toUpperCase() : null,
    aadhaar_last4: aadhaar_last4 ? String(aadhaar_last4) : null,
    education:     eduArr as Parameters<typeof runCandidateBgvAutoChecks>[0]["education"],
    employment:    empArr as Parameters<typeof runCandidateBgvAutoChecks>[0]["employment"],
  });

  // Status: in_progress if checks are good, pending otherwise
  const autoStatus = autoChecks.autoScore >= 40 ? "in_progress" : "pending";

  const { data, error } = await serviceDb
    .from("candidate_bgv")
    .upsert({
      user_id:            user.id,
      full_name:          String(full_name),
      dob:                dob ? String(dob) : null,
      pan_number:         pan_number ? String(pan_number).toUpperCase() : null,
      aadhaar_last4:      aadhaar_last4 ? String(aadhaar_last4) : null,
      education:          eduArr,
      employment:         empArr,
      status:             autoStatus,
      auto_check_results: autoChecks,
      id_verified:        autoChecks.idAutoVerified,
      edu_verified:       autoChecks.eduAutoVerified,
      submitted_at:       new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    bgv: data,
    autoScore: autoChecks.autoScore,
    message: autoChecks.autoScore >= 70
      ? "BGV submitted and auto-checks passed ✓ — final review in 1–2 business days."
      : "BGV submitted. Verification takes 2–5 business days.",
  }, { status: 201 });
}
