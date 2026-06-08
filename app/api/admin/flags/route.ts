/**
 * PATCH /api/admin/flags — toggle a feature flag (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!await isAdminUser(token)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, enabled } = await req.json() as { key: string; enabled: boolean };
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { error } = await sb
    .from("feature_flags")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, key, enabled });
}
