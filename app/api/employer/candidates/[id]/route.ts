/**
 * GET /api/employer/candidates/[id]
 * Fetch a single discoverable candidate's full profile.
 * Requires valid API key. Contact details gated to growth+ tier.
 */
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyApiKey } from "@/lib/employerAuth";

const CONTACT_UNLOCK_TIERS = new Set(["growth", "enterprise"]);

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await verifyApiKey(req);
  if (!ctx.ok) return ctx.response;

  const candidateUserId = params.id;
  const unlockContact   = req.headers.get("X-Unlock-Contact") === "true" && CONTACT_UNLOCK_TIERS.has(ctx.tier);
  const sb              = supabaseAdmin();

  const { data: row, error } = await sb
    .from("resume_saves")
    .select("id, user_id, data, updated_at")
    .eq("user_id", candidateUserId)
    .eq("discoverable", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !row) {
    return Response.json({ error: "Candidate not found or not discoverable" }, { status: 404 });
  }

  const d = row.data as Record<string, unknown> ?? {};

  // Build work history (sanitised — no PII beyond what user opted to share)
  const work = (Array.isArray(d.work) ? d.work as Record<string, unknown>[] : []).map((w) => ({
    company: w.company, role: w.role, from: w.from, to: w.to,
    current: w.current, desc: w.desc,
  }));

  const edu = (Array.isArray(d.edu) ? d.edu as Record<string, unknown>[] : []).map((e) => ({
    school: e.school, degree: e.degree, year: e.year,
  }));

  const profile: Record<string, unknown> = {
    id:         row.user_id,
    title:      d.title ?? "",
    summary:    d.summary ?? "",
    location:   d.location ?? "",
    skills:     typeof d.skills === "string" ? d.skills.split(/[\s,;]+/).filter(Boolean) : [],
    work,
    education:  edu,
    certifications: Array.isArray(d.certifications) ? d.certifications : [],
    languages:  Array.isArray(d.languages) ? d.languages : [],
    github:     d.github ?? null,
    website:    d.website ?? null,
    last_active: row.updated_at,
  };

  if (unlockContact) {
    profile.email   = d.email ?? null;
    profile.phone   = d.phone ?? null;
    profile.linkedin = d.linkedin ?? null;
  }

  // Audit log (non-critical, fire-and-forget)
  void sb.from("employer_access_log").insert({
    api_key_id:   ctx.keyId,
    employer_id:  ctx.employerId,
    candidate_id: candidateUserId,
    action:       unlockContact ? "unlock_contact" : "view_profile",
  });

  return Response.json({ candidate: profile, remaining_quota: ctx.remaining });
}
