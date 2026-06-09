/**
 * GET  /api/admin/users   — list all users (admin only)
 * PATCH /api/admin/users  — update a user's plan / suspended / is_admin
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function isAdminUser(token: string): Promise<boolean> {
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return false;
  const { data } = await sb.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin === true;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!await isAdminUser(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Join auth.users email via the view or service-role select
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, plan, is_admin, is_suspended, onboarding_completed, created_at, current_job_role, target_role, location")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch emails from auth.users using service role
  const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 500 });
  const emailMap: Record<string, string> = {};
  (authUsers?.users ?? []).forEach(u => { emailMap[u.id] = u.email ?? ""; });

  const users = (data ?? []).map(p => ({ ...p, email: emailMap[p.id] ?? "—" }));

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!await isAdminUser(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: string; plan?: string; is_suspended?: boolean; is_admin?: boolean; onboarding_completed?: boolean };
  const { id, ...patch } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["plan", "is_suspended", "is_admin", "onboarding_completed"] as const;
  const safePatch: Record<string, unknown> = {};
  allowed.forEach(k => { if (k in patch) safePatch[k] = (patch as Record<string, unknown>)[k]; });

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { error } = await sb.from("profiles").update(safePatch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
