/**
 * POST /api/linkedin
 * Scores and rewrites LinkedIn profile sections for a target role.
 * Body: { headline: string; about: string; skills: string; targetRole: string }
 * Returns: { scores, rewrites, missingKeywords, overallScore }
 */
import { NextRequest, NextResponse } from "next/server";
import { groqRewrite } from "@/lib/groq";
import { rateLimit }   from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip  = req.headers.get("x-forwarded-for") ?? "unknown";
  const lim = await rateLimit(ip, 5, 60);
  if (!lim.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const { headline, about, skills, targetRole } = await req.json().catch(() => ({}));
  if (!targetRole?.trim()) return NextResponse.json({ error: "Target role is required." }, { status: 400 });
  if (!headline?.trim() && !about?.trim()) return NextResponse.json({ error: "Provide at least your headline or about section." }, { status: 400 });

  const systemPrompt = `You are an expert LinkedIn profile optimizer and career coach.
Analyze the provided LinkedIn profile sections for a professional targeting the role: "${targetRole}".

Score each section (0-100) and rewrite it to maximize recruiter visibility and ATS ranking.

Rules for rewrites:
- Headline: under 220 characters, include target role title + 2-3 key skills + one differentiator
- About: 3 short paragraphs max (hook, experience proof, call-to-action), under 2,600 characters
- Skills: list the 10 most relevant skills for the target role, comma-separated

Return ONLY a JSON object (no markdown, no explanation) in this exact shape:
{
  "scores": {
    "headline": { "score": 0-100, "reason": "one sentence" },
    "about":    { "score": 0-100, "reason": "one sentence" },
    "skills":   { "score": 0-100, "reason": "one sentence" }
  },
  "rewrites": {
    "headline": "rewritten headline string",
    "about":    "rewritten about string",
    "skills":   "skill1, skill2, skill3, ..."
  },
  "missingKeywords": ["kw1","kw2","...up to 8 important missing keywords"],
  "overallScore": 0-100,
  "topTip": "single most impactful thing they can do right now"
}`;

  const userContent = `TARGET ROLE: ${targetRole}
CURRENT HEADLINE: ${headline || "(not provided)"}
CURRENT ABOUT: ${(about || "(not provided)").slice(0, 2600)}
CURRENT SKILLS: ${skills || "(not provided)"}`;

  try {
    const raw     = await groqRewrite(systemPrompt, userContent);
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed  = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "LinkedIn analysis failed. Please try again." }, { status: 500 });
  }
}
