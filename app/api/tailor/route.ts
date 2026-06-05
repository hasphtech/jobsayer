/**
 * POST /api/tailor
 * Tailors resume bullets to match a job description.
 * Body: { resumeText: string; jdText: string; bullets: string[] }
 * Returns: { tailored: { original: string; rewritten: string; keywords: string[] }[]; newKeywords: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { groqRewrite } from "@/lib/groq";
import { rateLimit }   from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Rate limit: 5 tailoring requests per IP per minute
  const ip  = req.headers.get("x-forwarded-for") ?? "unknown";
  const lim = await rateLimit(ip, 5, 60);
  if (!lim.allowed) return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });

  const { resumeText, jdText, bullets } = await req.json().catch(() => ({}));
  if (!jdText?.trim()) return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  if (!bullets?.length) return NextResponse.json({ error: "No resume bullets provided." }, { status: 400 });

  const systemPrompt = `You are an expert resume writer and ATS specialist.
Given a job description and a list of resume bullet points, rewrite each bullet to:
1. Incorporate relevant keywords from the JD naturally
2. Strengthen impact with the STAR method where applicable
3. Use strong action verbs that match the JD's language
4. Preserve all real metrics and numbers — never fabricate them
5. Keep each bullet under 25 words

Return ONLY a JSON object (no markdown, no explanation) in this exact shape:
{
  "tailored": [
    { "original": "...", "rewritten": "...", "keywords": ["kw1","kw2"] }
  ],
  "newKeywords": ["top missing keyword 1", "top missing keyword 2", "...up to 8"]
}`;

  const userContent = `JOB DESCRIPTION:\n${jdText.slice(0, 3000)}\n\nRESUME BULLETS:\n${bullets.slice(0, 20).map((b: string, i: number) => `${i + 1}. ${b}`).join("\n")}`;

  try {
    const raw = await groqRewrite(systemPrompt, userContent);
    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed  = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "AI tailoring failed. Please try again." }, { status: 500 });
  }
}
