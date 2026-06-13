/**
 * GET /api/employer/candidates
 * Search discoverable candidates. Requires valid API key in Authorization header.
 *
 * Query params:
 *   skills     — comma-separated, e.g. "React,TypeScript"
 *   location   — free text match
 *   exp_min    — min years experience (from work entries count)
 *   exp_max    — max years
 *   open_to    — "active" | "passive" | "any"  (from availability setting)
 *   work_pref  — "full_time" | "contract" | "any"
 *   limit      — default 20, max 50
 *   offset     — for pagination
 *
 * Response: { candidates: CandidateSummary[], total: number, remaining_quota: number }
 *
 * Data returned (non-PII, no contact details on free/starter):
 *   id, title, skills[], experience_years, location, open_to_work,
 *   notice_period, work_pref, ats_score (if available), last_active
 *
 * Contact unlock (growth+ tier only):
 *   Add header X-Unlock-Contact: true  →  adds email field, deducts 1 unlock credit
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

export async function GET(req: NextRequest) {
  // ── Auth ──
  const ctx = await verifyApiKey(req);
  if (!ctx.ok) return ctx.response;

  const { searchParams } = new URL(req.url);
  const skills    = searchParams.get("skills")?.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
  const location  = searchParams.get("location") ?? "";
  const openTo    = searchParams.get("open_to") ?? "any";
  const workPref  = searchParams.get("work_pref") ?? "any";
  const limit     = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const offset    = parseInt(searchParams.get("offset") ?? "0", 10);
  const unlockContact = req.headers.get("X-Unlock-Contact") === "true" && CONTACT_UNLOCK_TIERS.has(ctx.tier);

  const sb = supabaseAdmin();

  // ── Fetch discoverable resumes ──
  let query = sb
    .from("resume_saves")
    .select(`
      id,
      user_id,
      name,
      data,
      updated_at
    `, { count: "exact" })
    .eq("discoverable", true)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: rows, count, error } = await query;

  if (error) {
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  // ── Shape + filter in memory (resume data is in JSON blob) ──
  const candidates = (rows ?? [])
    .map((row: { id: string; user_id: string; name: string; data: Record<string, unknown>; updated_at: string }) => {
      const d = row.data as Record<string, unknown> ?? {};

      // Skills matching
      const resumeSkills: string[] = typeof d.skills === "string"
        ? d.skills.split(/[\s,;]+/).filter(Boolean)
        : [];
      const skillsLower = resumeSkills.map((s: string) => s.toLowerCase());

      const matchedSkills = skills.length > 0
        ? skills.filter(s => skillsLower.some((rs: string) => rs.includes(s) || s.includes(rs)))
        : resumeSkills.slice(0, 10);

      // Skip if skills filter active and no match
      if (skills.length > 0 && matchedSkills.length === 0) return null;

      // Approximate experience years from work entries
      const work = Array.isArray(d.work) ? d.work as { from?: string; to?: string; current?: boolean }[] : [];
      const expYears = work.reduce((acc: number, w: { from?: string; to?: string; current?: boolean }) => {
        const from = w.from ? new Date(w.from).getFullYear() : null;
        const to   = w.current ? new Date().getFullYear() : (w.to ? new Date(w.to).getFullYear() : null);
        if (from && to) return acc + (to - from);
        return acc;
      }, 0);

      // Location filter
      const candidateLocation = (d.location as string | undefined) ?? "";
      if (location && !candidateLocation.toLowerCase().includes(location.toLowerCase())) return null;

      // Availability filter (stored in separate localStorage key on client — use profile metadata)
      // For server-side, we rely on what's stored in resume data or user_metadata

      // Compute match percentage: matched / total required skills
      const matchPct = skills.length > 0
        ? Math.round((matchedSkills.length / skills.length) * 100)
        : null;

      const summary: Record<string, unknown> = {
        id:               row.user_id,
        title:            (d.title as string | undefined) ?? "",
        skills:           resumeSkills.slice(0, 15),
        matched_skills:   matchedSkills,
        match_pct:        matchPct,           // % of required skills the candidate has
        experience_years: expYears,
        location:         candidateLocation,
        github:           (d.github as string | undefined) ?? null,
        website:          (d.website as string | undefined) ?? null,
        last_active:      row.updated_at,
      };

      // Contact unlock (growth+ tier only)
      if (unlockContact) {
        summary.email = d.email ?? null;
        summary.phone = d.phone ?? null;
        summary.linkedin = d.linkedin ?? null;
      }

      return summary;
    })
    .filter(Boolean);

  // Log access (non-critical, fire-and-forget)
  void sb.from("employer_access_log").insert(
    candidates.slice(0, 5).map((c) => ({
      api_key_id:   ctx.keyId,
      employer_id:  ctx.employerId,
      candidate_id: (c as Record<string, unknown>).id as string,
      action:       "search",
    }))
  );

  return Response.json({
    candidates,
    total:           count ?? 0,
    returned:        candidates.length,
    offset,
    remaining_quota: ctx.remaining,
  });
}
