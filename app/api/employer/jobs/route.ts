/**
 * POST /api/employer/jobs
 * Authenticated employer submits a job posting — goes to pending queue (is_approved = false).
 * Admin reviews via /admin before it goes live.
 *
 * Body: { title, company, location, mode, exp, salary, salaryMin, salaryMax, skills, jd }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient }        from "@supabase/ssr";
import { createClient }              from "@supabase/supabase-js";
import { cookies }                   from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify employer profile exists
  const { data: profile } = await sb
    .from("employer_profiles")
    .select("id, company_name, plan")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Employer profile not found. Complete registration first." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { title, location, mode, exp, salaryMin, salaryMax, skills, jd } = body;
  if (!title || !jd) return NextResponse.json({ error: "title and jd are required" }, { status: 400 });

  const salaryMin_ = Number(salaryMin ?? 0);
  const salaryMax_ = Number(salaryMax ?? 0);
  const salaryNum  = salaryMin_ && salaryMax_ ? Math.round((salaryMin_ + salaryMax_) / 2) : (salaryMin_ || salaryMax_);
  const salaryStr  = salaryMin_ && salaryMax_ ? `₹${salaryMin_}–${salaryMax_} LPA` : salaryNum ? `₹${salaryNum} LPA` : null;

  const skillsArr = typeof skills === "string"
    ? skills.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    : (Array.isArray(skills) ? skills.map(String) : []);

  // Use service role to insert (user can't write to jobs directly)
  const serviceDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await serviceDb.from("jobs").insert([{
    title:       String(title),
    company:     profile.company_name,
    location:    String(location ?? "India"),
    mode:        String(mode ?? "onsite"),
    exp:         String(exp ?? ""),
    salary:      salaryStr,
    salary_num:  salaryNum || null,
    skills:      skillsArr,
    jd_text:     String(jd),
    description: String(jd).slice(0, 500),
    source:      "employer",
    source_url:  null,
    apply_url:   null,
    is_active:   true,
    is_approved: false,   // goes to admin review queue
    posted_at:   new Date().toISOString(),
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
  }]).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data, message: "Job submitted for review. It will go live after admin approval." }, { status: 201 });
}
