/**
 * GET /api/bgv/status
 * Returns the current user's BGV record (status, scores, verified fields).
 * Strips sensitive fields before sending to client.
 */
import { NextResponse }       from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies }            from "next/headers";

export async function GET() {
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

  const { data, error } = await sb
    .from("candidate_bgv")
    .select(`
      id, status, verification_score,
      id_verified, edu_verified, emp_verified, address_verified,
      submitted_at, reviewed_at, admin_notes, rejection_reason,
      full_name, dob, education, employment,
      pan_number, aadhaar_last4,
      auto_check_results
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bgv: data });
}
