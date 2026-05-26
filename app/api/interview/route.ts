/**
 * /api/interview — AI Interview Prep endpoint
 * Actions:
 *   generate_questions : company + role → 6 interview questions (JSON array)
 *   evaluate_answer    : question + answer → structured feedback
 *
 * Rate-limited but open-access (no Pro gate).
 */
import { NextRequest, NextResponse } from "next/server";
import { groqRewrite } from "@/lib/groq";

/* ── Simple in-memory rate limiter (5 req / min per IP) ── */
const RL = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RL.get(ip);
  if (!entry || now > entry.reset) {
    RL.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

/* ── POST handler ── */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, company, role, question, answer, skills } = body;

  /* ── Action: generate_questions ── */
  if (action === "generate_questions") {
    if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 });

    const systemPrompt = `You are an expert technical interviewer at top Indian tech companies.
Generate exactly 6 interview questions for the given role and company.
Return ONLY a valid JSON array of strings — no markdown, no explanation, no extra text.
Mix question types: 1-2 technical, 1-2 behavioural, 1 system design, 1 role-specific.
Questions should be realistic and commonly asked at ${company || "tech companies"} in India.`;

    const userContent = `Role: ${role}
Company: ${company || "a tech company"}
Candidate skills: ${skills || "not specified"}

Return a JSON array of 6 interview questions.`;

    try {
      const raw = await groqRewrite(systemPrompt, userContent);
      // Extract JSON array from response
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array found");
      const questions: string[] = JSON.parse(match[0]);
      return NextResponse.json({ questions: questions.slice(0, 6) });
    } catch (err) {
      console.error("generate_questions error:", err);
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
    }
  }

  /* ── Action: evaluate_answer ── */
  if (action === "evaluate_answer") {
    if (!question || !answer) {
      return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    }
    if (answer.trim().length < 10) {
      return NextResponse.json({ error: "Answer too short to evaluate" }, { status: 400 });
    }

    const systemPrompt = `You are a senior technical interviewer evaluating a candidate's interview answer.
Provide constructive, specific feedback in this exact JSON format:
{
  "score": <number 1-10>,
  "verdict": "<Excellent|Good|Needs Work|Poor>",
  "strengths": ["<point 1>", "<point 2>"],
  "improvements": ["<point 1>", "<point 2>"],
  "betterAnswer": "<A concise example of a stronger answer (2-4 sentences)>"
}
Return ONLY the JSON object, no markdown, no extra text.
Be direct, honest, and constructive. Focus on clarity, specificity, and impact.`;

    const userContent = `Question: ${question}
Candidate's answer: ${answer}`;

    try {
      const raw = await groqRewrite(systemPrompt, userContent);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found");
      const feedback = JSON.parse(match[0]);
      return NextResponse.json({ feedback });
    } catch (err) {
      console.error("evaluate_answer error:", err);
      return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
