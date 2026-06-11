/**
 * GET /api/employer/activity
 * Returns paginated activity log + per-member stats.
 * Query params: userId, action, from, to, limit, offset, stats=true
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/adminAuth";
import { getEmployerActivity, getMemberStats } from "@/lib/employerActivity";

async function getUserFromToken(token: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb.auth.getUser(token);
  return data.user;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = createServiceClient();
    const { data: employer } = await sb
      .from("employers").select("id").eq("user_id", user.id).single();

    // Also allow team members with admin/hr_manager role
    let employerId = employer?.id;
    if (!employerId) {
      const { data: member } = await sb
        .from("company_members")
        .select("employer_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["admin", "hr_manager"])
        .single();
      employerId = member?.employer_id;
    }

    if (!employerId) return NextResponse.json({ error: "No employer account" }, { status: 403 });

    const p = req.nextUrl.searchParams;
    const wantStats = p.get("stats") === "true";

    if (wantStats) {
      const stats = await getMemberStats(employerId);
      return NextResponse.json({ stats });
    }

    const activity = await getEmployerActivity({
      employerId,
      userId:  p.get("userId")  ?? undefined,
      action:  p.get("action")  ?? undefined,
      from:    p.get("from")    ?? undefined,
      to:      p.get("to")      ?? undefined,
      limit:   p.get("limit")   ? parseInt(p.get("limit")!)  : 50,
      offset:  p.get("offset")  ? parseInt(p.get("offset")!) : 0,
    });

    return NextResponse.json({ activity });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
