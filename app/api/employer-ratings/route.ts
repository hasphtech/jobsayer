/**
 * POST /api/employer-ratings   — submit or update a trust rating for an employer
 * GET  /api/employer-ratings   — get the current user's own ratings
 * GET  /api/employer-ratings?employer=<name> — get aggregate score for an employer
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

interface RatingBody {
  employerName:       string;
  jobTitle?:          string;
  stage?:             string;
  offerReliability?:  number;   // 1–5
  interviewExperience?: number; // 1–5
  cultureTransparency?: number; // 1–5
  responseTime?:      number;   // 1–5
  review?:            string;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as RatingBody;
  const { employerName, jobTitle, stage, offerReliability, interviewExperience, cultureTransparency, responseTime, review } = body;

  if (!employerName?.trim()) return NextResponse.json({ error: "employerName required" }, { status: 400 });

  // Validate rating values
  for (const [key, val] of Object.entries({ offerReliability, interviewExperience, cultureTransparency, responseTime })) {
    if (val !== undefined && val !== null && (val < 1 || val > 5 || !Number.isInteger(val))) {
      return NextResponse.json({ error: `${key} must be an integer 1–5` }, { status: 400 });
    }
  }

  const { data, error } = await sb
    .from("employer_trust_ratings")
    .upsert({
      user_id:              user.id,
      employer_name:        employerName.trim(),
      job_title:            jobTitle ?? null,
      stage:                stage ?? null,
      offer_reliability:    offerReliability ?? null,
      interview_experience: interviewExperience ?? null,
      culture_transparency: cultureTransparency ?? null,
      response_time:        responseTime ?? null,
      review:               review ? review.slice(0, 500) : null,
    }, { onConflict: "user_id,employer_name" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rating: data });
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employer = searchParams.get("employer");

  if (employer) {
    // Return aggregate for a specific employer (from the view)
    const { data, error } = await sb
      .from("employer_trust_summary")
      .select("*")
      .eq("employer_name", employer.trim())
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ summary: data });
  }

  // Return all ratings by this user
  const { data, error } = await sb
    .from("employer_trust_ratings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ratings: data ?? [] });
}
