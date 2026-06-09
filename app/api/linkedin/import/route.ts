/**
 * POST /api/linkedin/import
 *
 * Parses pasted LinkedIn profile text (from the user's own profile page)
 * into a structured ResumeData JSON object using Groq AI.
 *
 * Body: { profileText: string }
 * Returns: Partial<ResumeData> — pre-fills the builder
 *
 * The user pastes the full text of their LinkedIn profile page.
 * No LinkedIn API key required — purely text-based AI extraction.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { groqRewrite } from "@/lib/groq";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
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

  const { allowed } = await rateLimit(`linkedin-import:${user.id}`, 5, 300_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests — wait a moment" }, { status: 429 });

  let body: { profileText?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const text = body.profileText?.trim();
  if (!text || text.length < 50) {
    return NextResponse.json({ error: "profileText too short — paste more content" }, { status: 400 });
  }

  const systemPrompt = `You are an expert resume parser. Extract professional information from a LinkedIn profile text into a structured JSON object.

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "name": "full name",
  "title": "current job title",
  "email": "",
  "phone": "",
  "location": "city, country",
  "website": "",
  "linkedin": "linkedin.com/in/username if found",
  "github": "",
  "summary": "the About section text",
  "skills": "comma-separated skills list",
  "work": [
    {
      "id": "w1",
      "company": "company name",
      "role": "job title",
      "from": "Month Year or YYYY",
      "to": "Month Year, YYYY, or Present",
      "current": false,
      "desc": "bullet points from the experience, joined with \\n"
    }
  ],
  "edu": [
    {
      "id": "e1",
      "school": "institution name",
      "degree": "degree and field of study",
      "year": "graduation year",
      "gpa": ""
    }
  ],
  "certifications": [
    {
      "id": "c1",
      "name": "certification name",
      "issuer": "issuing org",
      "year": "year"
    }
  ],
  "projects": [],
  "awards": [],
  "languages": [],
  "references": [],
  "interests": ""
}

Rules:
- If a field is not found, use empty string "" or empty array []
- Set current: true for the most recent role if "Present" is mentioned
- Extract ALL work experiences listed
- Preserve the original text of the About/Summary section verbatim
- For skills: extract ALL skills mentioned including in the Skills section and implied from experience`;

  try {
    const raw     = await groqRewrite(systemPrompt, text.slice(0, 8000));
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed  = JSON.parse(cleaned);

    return NextResponse.json({ resume: parsed });
  } catch (err) {
    console.error("[linkedin/import] parse error:", err);
    return NextResponse.json({ error: "Failed to parse profile — try pasting more text" }, { status: 500 });
  }
}
