/**
 * GET /api/resume/[id]/analytics
 *
 * Returns view stats for a resume the authenticated user owns.
 * Returns: { total, today, week, month, topReferrers, byDay }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Verify ownership
  const { data: resume } = await supabase
    .from("resume_saves")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  // Fetch all views (max last 1000 for performance)
  const { data: views } = await supabase
    .from("resume_views")
    .select("viewed_at, referrer")
    .eq("resume_id", id)
    .order("viewed_at", { ascending: false })
    .limit(1000);

  if (!views) return NextResponse.json({ total: 0, today: 0, week: 0, month: 0, topReferrers: [], byDay: [] });

  const now   = new Date();
  const day   = new Date(now); day.setHours(0,0,0,0);
  const week  = new Date(now); week.setDate(week.getDate() - 7);
  const month = new Date(now); month.setDate(month.getDate() - 30);

  const total  = views.length;
  const today  = views.filter(v => new Date(v.viewed_at) >= day).length;
  const wk     = views.filter(v => new Date(v.viewed_at) >= week).length;
  const mo     = views.filter(v => new Date(v.viewed_at) >= month).length;

  // Top referrers
  const refCount: Record<string, number> = {};
  for (const v of views) {
    const ref = v.referrer ? new URL(v.referrer.startsWith("http") ? v.referrer : `https://${v.referrer}`).hostname : "Direct";
    refCount[ref] = (refCount[ref] ?? 0) + 1;
  }
  const topReferrers = Object.entries(refCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  // Views by day (last 30)
  const dayCount: Record<string, number> = {};
  for (const v of views) {
    const d = new Date(v.viewed_at).toISOString().slice(0, 10);
    dayCount[d] = (dayCount[d] ?? 0) + 1;
  }
  const byDay = Object.entries(dayCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({ total, today, week: wk, month: mo, topReferrers, byDay });
}
