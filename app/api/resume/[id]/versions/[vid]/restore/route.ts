/**
 * POST /api/resume/[id]/versions/[vid]/restore
 *
 * Restores a version snapshot back into the resume_saves row.
 * Creates a safety snapshot of current state first.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { id, vid } = await params;
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

  // Fetch the target version
  const { data: version } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("id", vid)
    .eq("resume_id", id)
    .eq("user_id", user.id)
    .single();
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Snapshot current state before overwriting (auto-save)
  const { data: current } = await supabase
    .from("resume_saves")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (current) {
    await supabase.from("resume_versions").insert({
      resume_id: id,
      user_id:   user.id,
      label:     `Before restore — ${new Date().toLocaleString()}`,
      snapshot:  { data: current.data, template: current.template, meta: current.meta },
    });
  }

  // Restore
  const snap = version.snapshot as { data: unknown; template: string; meta: unknown };
  const { error } = await supabase
    .from("resume_saves")
    .update({ data: snap.data, template: snap.template, meta: snap.meta, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, restored_from: version.label });
}
