import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import groq from "@/lib/groq";

export async function POST(req: NextRequest) {
  // Rate limiting — 8 cover letters per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const limited = await rateLimit(`cover-letter:${ip}`, 8, "1m");
  if (limited) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await req.json();
  const {
    jobTitle     = "",
    company      = "",
    jobDesc      = "",
    skills       = "",
    experience   = "",
    name         = "",
    tone         = "professional",  // professional | enthusiastic | concise
    targetLength = "medium",        // short | medium | long
  } = body;

  if (!jobTitle || !company) {
    return NextResponse.json({ error: "Job title and company are required." }, { status: 400 });
  }

  const wordCount =
    targetLength === "short"  ? "150–200 words" :
    targetLength === "long"   ? "350–400 words" :
                                "250–300 words";

  const toneGuide =
    tone === "enthusiastic" ? "warm, energetic, and genuinely excited about the opportunity" :
    tone === "concise"      ? "direct, crisp, and efficient — no filler words" :
                              "polished, professional, and confident";

  const prompt = `You are an expert career coach writing a tailored cover letter for an Indian job seeker.

Candidate info:
- Name: ${name || "the candidate"}
- Skills: ${skills || "not specified"}
- Relevant experience: ${experience || "not specified"}

Target role:
- Job title: ${jobTitle}
- Company: ${company}
- Job description / key requirements: ${jobDesc || "not provided"}

Instructions:
- Tone: ${toneGuide}
- Length: ${wordCount}
- Structure: Opening paragraph (hook + role fit), 1–2 middle paragraphs (specific value + relevant skills/achievements), closing paragraph (call to action + gratitude)
- Opening line must be specific and compelling — NOT "I am writing to apply for..."
- Reference the company name naturally at least once
- Do NOT use generic phrases like "team player", "fast learner", "passionate"
- Do NOT add a subject line, date, or address block
- Output ONLY the cover letter body text, nothing else

Write the cover letter now:`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.72,
      max_tokens: 600,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ letter: text });
  } catch (err) {
    console.error("Cover letter generation error:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
