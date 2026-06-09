/**
 * GET    /api/alerts   — list user's job alerts
 * POST   /api/alerts   — create a job alert
 * DELETE /api/alerts?id=xxx — delete an alert
 * PATCH  /api/alerts?id=xxx — toggle active/pause
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("job_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await rateLimit(`job-alerts:${user.id}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: { keywords?: string; location?: string; job_type?: string; frequency?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.keywords?.trim()) {
    return NextResponse.json({ error: "keywords is required" }, { status: 400 });
  }

  // Enforce max 5 alerts per free user
  const { count } = await supabase
    .from("job_alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Maximum 5 job alerts per account" }, { status: 400 });
  }

  const { data, error } = await supabase.from("job_alerts").insert({
    user_id:   user.id,
    keywords:  body.keywords.trim(),
    location:  body.location?.trim() ?? "",
    job_type:  body.job_type ?? "any",
    frequency: body.frequency ?? "daily",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { active?: boolean };
  try { body = await req.json(); } catch { body = {}; }

  const { data, error } = await supabase
    .from("job_alerts")
    .update({ active: body.active ?? true })
    .eq("id", id)
    .eq("user_id", user.id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("job_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
