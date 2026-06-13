/**
 * POST /api/learn/log  — record a course start or completion
 * GET  /api/learn/log  — fetch the user's learning log
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

interface LogBody {
  courseId:     string;
  courseTitle:  string;
  provider:     string;
  affiliateUrl?: string;
  skillTag?:    string;
  status:       "started" | "completed" | "dropped";
}

export async function GET() {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("learning_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as LogBody;
  const { courseId, courseTitle, provider, affiliateUrl, skillTag, status } = body;

  if (!courseId?.trim()) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  if (!courseTitle?.trim()) return NextResponse.json({ error: "courseTitle required" }, { status: 400 });
  if (!["started", "completed", "dropped"].includes(status)) {
    return NextResponse.json({ error: "status must be started|completed|dropped" }, { status: 400 });
  }

  const completedAt = status === "completed" ? new Date().toISOString() : null;

  // Upsert — same user + courseId = update status
  const { data, error } = await sb
    .from("learning_logs")
    .upsert({
      user_id:       user.id,
      course_id:     courseId,
      course_title:  courseTitle,
      provider,
      affiliate_url: affiliateUrl ?? null,
      skill_tag:     skillTag ?? null,
      status,
      ...(completedAt ? { completed_at: completedAt } : {}),
    }, { onConflict: "user_id,course_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If completed and has a skill tag — offer to push to resume (client decides)
  return NextResponse.json({ log: data, skillPushAvailable: status === "completed" && !!skillTag });
}
