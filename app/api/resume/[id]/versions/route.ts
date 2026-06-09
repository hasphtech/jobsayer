/**
 * GET  /api/resume/[id]/versions           — list versions (metadata only)
 * POST /api/resume/[id]/versions           — create snapshot manually
 * GET  /api/resume/[id]/versions/[vid]     — get a single version's snapshot
 * POST /api/resume/[id]/versions/[vid]/restore — restore version → overwrite save
 *
 * Auto-snapshot is called from resumeDb.ts saveResume() — see lib/resumeVersions.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: resume } = await supabase
    .from("resume_saves")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("resume_versions")
    .select("id, label, created_at")
    .eq("resume_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ versions: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase    = makeSupabase(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label?: string } = {};
  try { body = await req.json(); } catch {}

  // Fetch current resume data
  const { data: resume } = await supabase
    .from("resume_saves")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: version, error } = await supabase
    .from("resume_versions")
    .insert({
      resume_id: id,
      user_id:   user.id,
      label:     body.label ?? `Saved ${new Date().toLocaleString()}`,
      snapshot:  { data: resume.data, template: resume.template, meta: resume.meta },
    })
    .select("id, label, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Prune: keep only last 10 versions
  const { data: allVersions } = await supabase
    .from("resume_versions")
    .select("id")
    .eq("resume_id", id)
    .order("created_at", { ascending: false });

  if ((allVersions?.length ?? 0) > 10) {
    const toDelete = allVersions!.slice(10).map(v => v.id);
    await supabase.from("resume_versions").delete().in("id", toDelete);
  }

  return NextResponse.json(version, { status: 201 });
}
