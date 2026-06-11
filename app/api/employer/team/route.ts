/**
 * /api/employer/team
 * GET  — list team members for the employer
 * POST — invite a new team member
 * DELETE — remove a member (pass ?memberId=xxx)
 * PATCH — update member role (pass ?memberId=xxx)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { logEmployerActivity } from "@/lib/employerActivity";

async function getEmployerForUser(userId: string) {
  const sb = createServiceClient();
  const { data } = await sb.from("employers").select("id, company_name").eq("user_id", userId).single();
  return data;
}

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

    const employer = await getEmployerForUser(user.id);
    if (!employer) return NextResponse.json({ error: "No employer account" }, { status: 403 });

    const sb = createServiceClient();
    const { data: members } = await sb
      .from("company_members")
      .select("*")
      .eq("employer_id", employer.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ members: members ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employer = await getEmployerForUser(user.id);
    if (!employer) return NextResponse.json({ error: "No employer account" }, { status: 403 });

    const body = await req.json();
    const { email, name, role = "recruiter" } = body;
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const sb = createServiceClient();
    const { data: member, error } = await sb
      .from("company_members")
      .upsert({
        employer_id: employer.id,
        email: email.toLowerCase().trim(),
        name: name ?? null,
        role,
        status: "invited",
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      }, { onConflict: "employer_id,email" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logEmployerActivity({
      employerId: employer.id, userId: user.id,
      memberEmail: user.email, memberName: user.user_metadata?.full_name,
      action: "member.invited", entityType: "member",
      entityId: member.id, entityLabel: email,
      metadata: { role },
    });

    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employer = await getEmployerForUser(user.id);
    if (!employer) return NextResponse.json({ error: "No employer account" }, { status: 403 });

    const memberId = req.nextUrl.searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

    const body = await req.json();
    const sb = createServiceClient();
    const { data: member, error } = await sb
      .from("company_members")
      .update({ role: body.role, status: body.status })
      .eq("id", memberId)
      .eq("employer_id", employer.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logEmployerActivity({
      employerId: employer.id, userId: user.id,
      memberEmail: user.email, memberName: user.user_metadata?.full_name,
      action: "member.role_changed", entityType: "member",
      entityId: memberId, entityLabel: member.email,
      metadata: { newRole: body.role },
    });

    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employer = await getEmployerForUser(user.id);
    if (!employer) return NextResponse.json({ error: "No employer account" }, { status: 403 });

    const memberId = req.nextUrl.searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

    const sb = createServiceClient();
    const { data: member } = await sb.from("company_members").select("email").eq("id", memberId).single();

    await sb.from("company_members").delete().eq("id", memberId).eq("employer_id", employer.id);

    await logEmployerActivity({
      employerId: employer.id, userId: user.id,
      memberEmail: user.email, memberName: user.user_metadata?.full_name,
      action: "member.removed", entityType: "member",
      entityId: memberId, entityLabel: member?.email ?? memberId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
