/**
 * GET /api/gdpr/export
 *
 * Returns all personal data for the authenticated user as a JSON download.
 * Covers: profile, resumes, applications, notifications, job_alerts, referrals.
 *
 * GDPR Art. 20 — Right to Data Portability.
 * Rate limited to 2 exports per hour per user.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await rateLimit(`gdpr-export:${user.id}`, 2, 3_600_000);
  if (!allowed) return NextResponse.json({ error: "Export limit reached — try again in an hour" }, { status: 429 });

  // Gather all user data in parallel
  const [
    { data: profile },
    { data: resumes },
    { data: applications },
    { data: notifications },
    { data: alerts },
    { data: referrals },
    { data: versions },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("resume_saves").select("*").eq("user_id", user.id),
    supabase.from("applications").select("*").eq("user_id", user.id),
    supabase.from("notifications").select("*").eq("user_id", user.id),
    supabase.from("job_alerts").select("*").eq("user_id", user.id),
    supabase.from("referrals").select("*").eq("referrer_id", user.id),
    supabase.from("resume_versions").select("id, resume_id, label, created_at").eq("user_id", user.id),
  ]);

  const export_data = {
    exported_at:  new Date().toISOString(),
    platform:     "jobSayer",
    gdpr_notice:  "This export contains all personal data we hold about you under GDPR Art. 20.",
    account: {
      id:         user.id,
      email:      user.email,
      created_at: user.created_at,
      providers:  user.identities?.map(i => i.provider) ?? [],
    },
    profile:      profile ?? {},
    resumes:      resumes ?? [],
    applications: applications ?? [],
    notifications: notifications ?? [],
    job_alerts:   alerts ?? [],
    referrals:    referrals ?? [],
    resume_version_history: versions ?? [],
  };

  const json = JSON.stringify(export_data, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="jobsayer-data-export-${new Date().toISOString().slice(0,10)}.json"`,
      "Content-Length":      String(Buffer.byteLength(json, "utf8")),
    },
  });
}
