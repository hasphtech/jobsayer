/**
 * POST /api/employer/candidates/ai-summary-preview
 *
 * Quick AI fit narrative for the employer dashboard preview panel.
 * Uses basic candidate info (name, role, match%) — no full resume needed.
 * Requires session auth (not API key) — for signed-in employer users.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { rateLimitAi } from "@/lib/rateLimit";
import { groqJSON } from "@/lib/groq";

interface PreviewBody {
  name:    string;
  role:    string;
  match:   number;    // match %
  skills?: string[];
}

interface PreviewResult {
  summary: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimitAi(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as PreviewBody;
  const { name, role, match, skills = [] } = body;

  const systemPrompt = `You are a concise recruiter assistant. Given a candidate's profile and their skill-match %, write a 2-sentence fit narrative for a hiring manager. Return ONLY valid JSON.`;

  const userPrompt = `Candidate: ${name || "Unknown"}
Role applied for: ${role || "Not specified"}
Skill match score: ${match}%
${skills.length ? `Known skills: ${skills.join(", ")}` : ""}

Return: { "summary": "<2 sentence fit narrative — mention the match score, highlight key strengths, note any concerns if match < 75%>" }`;

  try {
    const result = await groqJSON<PreviewResult>(systemPrompt, userPrompt, 200);
    return NextResponse.json({ summary: result.summary ?? "" });
  } catch {
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
