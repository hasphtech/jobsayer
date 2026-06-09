/**
 * GET  /api/notifications       — list (last 30, unread first)
 * PATCH /api/notifications      — mark all as read
 * POST /api/notifications       — create (internal use, service-role only)
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

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("read",       { ascending: true })
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notifications: data ?? [],
    unread: (data ?? []).filter(n => !n.read).length,
  });
}

export async function PATCH(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  // Internal-only endpoint — requires service role key in Authorization header
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { user_id?: string; type?: string; title?: string; body?: string; link?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.user_id || !body.title) {
    return NextResponse.json({ error: "user_id and title are required" }, { status: 400 });
  }

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data, error } = await sb.from("notifications").insert({
    user_id: body.user_id,
    type:    body.type ?? "info",
    title:   body.title,
    body:    body.body ?? null,
    link:    body.link ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
