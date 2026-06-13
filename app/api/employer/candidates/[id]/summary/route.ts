/**
 * POST /api/employer/candidates/[id]/summary
 *
 * AI-generated candidate fit narrative for a specific JD.
 * Requires valid employer API key.
 *
 * Body: { jobTitle: string, jobDescription: string, requiredSkills?: string[] }
 * Returns: { summary: string, fitScore: number, strengths: string[], gaps: string[] }
 */
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyApiKey } from "@/lib/employerAuth";
import { rateLimitAi } from "@/lib/rateLimit";
import { groqJSON } from "@/lib/groq";

interface SummaryBody {
  jobTitle:        string;
  jobDescription?: string;
  requiredSkills?: string[];
}

interface AiSummaryResult {
  summary:   string;    // 2-3 sentence fit narrative
  fitScore:  number;    // 0–100 AI-assessed fit
  strengths: string[];  // 3-4 bullet points
  gaps:      string[];  // 1-3 skill/experience gaps
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limit per employer IP
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimitAi(ip);
  if (!rl.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const ctx = await verifyApiKey(req);
  if (!ctx.ok) return ctx.response;

  const { id: candidateUserId } = await params;
  const sb = supabaseAdmin();

  // Fetch candidate profile
  const { data: row, error } = await sb
    .from("resume_saves")
    .select("data, updated_at")
    .eq("user_id", candidateUserId)
    .eq("discoverable", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !row) {
    return Response.json({ error: "Candidate not found or not discoverable" }, { status: 404 });
  }

  const body = await req.json() as SummaryBody;
  const { jobTitle, jobDescription = "", requiredSkills = [] } = body;

  if (!jobTitle?.trim()) {
    return Response.json({ error: "jobTitle is required" }, { status: 400 });
  }

  const d = row.data as Record<string, unknown> ?? {};
  const skills: string[] = typeof d.skills === "string"
    ? d.skills.split(/[\s,;]+/).filter(Boolean)
    : [];

  const work = (Array.isArray(d.work) ? d.work as Record<string, unknown>[] : [])
    .map((w) => `${w.role ?? ""} at ${w.company ?? ""} (${w.from ?? "?"} – ${w.current ? "Present" : (w.to ?? "?")}): ${String(w.desc ?? "").slice(0, 150)}`)
    .join("\n");

  const edu = (Array.isArray(d.edu) ? d.edu as Record<string, unknown>[] : [])
    .map((e) => `${e.degree ?? ""}, ${e.school ?? ""} (${e.year ?? ""})`)
    .join("; ");

  const systemPrompt = `You are an expert technical recruiter assistant. Assess candidate fit for a job role and return ONLY valid JSON.`;

  const userPrompt = `Candidate profile:
- Title: ${(d.title as string | undefined) ?? "Not specified"}
- Skills: ${skills.join(", ") || "None listed"}
- Experience:\n${work || "No work history"}
- Education: ${edu || "Not specified"}
- Summary: ${((d.summary as string | undefined) ?? "").slice(0, 300)}

Job being hired for:
- Role: ${jobTitle}
${requiredSkills.length ? `- Required skills: ${requiredSkills.join(", ")}` : ""}
${jobDescription ? `- JD excerpt: ${jobDescription.slice(0, 400)}` : ""}

Return a JSON object:
{
  "summary": "<2-3 sentences: overall fit narrative written for a hiring manager — be specific about WHY this candidate does/doesn't fit this exact role>",
  "fitScore": <integer 0–100 representing AI-assessed overall fit>,
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "gaps": ["<specific gap 1 if any>", "<gap 2 if any>"]
}

Rules:
- fitScore must be a plain integer, not a string
- strengths should be specific (cite skills, years, or achievements visible in the data)
- gaps is [] if the candidate is a strong fit with no gaps
- summary must be honest — if it's a weak fit, say so diplomatically`;

  try {
    const result = await groqJSON<AiSummaryResult>(systemPrompt, userPrompt, 800);

    // Sanitise
    result.fitScore  = Math.min(100, Math.max(0, Number(result.fitScore) || 50));
    result.strengths = Array.isArray(result.strengths) ? result.strengths.slice(0, 4) : [];
    result.gaps      = Array.isArray(result.gaps)      ? result.gaps.slice(0, 3)      : [];

    // Audit log (non-critical)
    void sb.from("employer_access_log").insert({
      api_key_id:   ctx.keyId,
      employer_id:  ctx.employerId,
      candidate_id: candidateUserId,
      action:       "ai_summary",
    });

    return Response.json({ ...result, remaining_quota: ctx.remaining });
  } catch (err) {
    console.error("employer/candidates/[id]/summary error:", err);
    return Response.json({ error: "AI service error. Try again." }, { status: 500 });
  }
}
