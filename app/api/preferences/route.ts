/**
 * /api/preferences
 * GET  — load current user's job preferences
 * POST — save (upsert) job preferences
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getUserFromReq(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!token) return null;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data } = await sb.auth.getUser(token);
  return data.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await sb
      .from("job_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: data ?? null });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      job_titles?:   string[];
      locations?:    string[];
      job_types?:    string[];
      min_salary?:   number | null;
      currency?:     string;
      skills?:       string[];
      notify_email?: boolean;
      notify_freq?:  string;
    };

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await sb
      .from("job_preferences")
      .upsert({
        user_id:      user.id,
        job_titles:   body.job_titles   ?? [],
        locations:    body.locations    ?? [],
        job_types:    body.job_types    ?? [],
        min_salary:   body.min_salary   ?? null,
        currency:     body.currency     ?? "USD",
        skills:       body.skills       ?? [],
        notify_email: body.notify_email ?? true,
        notify_freq:  body.notify_freq  ?? "daily",
        updated_at:   new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ preferences: data });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
