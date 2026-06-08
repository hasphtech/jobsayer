/**
 * /api/interview — Career Path Builder + Interview Prep
 *
 * Actions:
 *   analyze_gaps        : currentRole + currentSkills + targetRole + company
 *                         → gap analysis JSON (readiness score, critical gaps, strengths)
 *   generate_questions  : focusSkill + targetRole + company + difficulty
 *                         → 5 targeted questions for that specific skill gap
 *   evaluate_answer     : question + answer + focusSkill
 *                         → structured feedback
 */
import { NextRequest, NextResponse } from "next/server";
import { groqRewrite } from "@/lib/groq";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const { allowed, retryAfter } = await rateLimit(`interview:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: Record<string, string>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { action, currentRole, currentSkills, targetRole, company, focusSkill, difficulty, question, answer, progLang } = body;

  // Language context injected into all prompts when a specific language is selected
  const langCtx = progLang && progLang !== "any"
    ? `\nProgramming language context: The candidate is specifically targeting ${progLang} roles. Include ${progLang}-specific questions, code snippets, and idioms where relevant.`
    : "";

  /* ══════════════════════════════════════════════════════════
     ACTION: analyze_gaps
     Returns: readiness score, current strengths, critical gaps,
              nice-to-haves, and a verdict.
  ══════════════════════════════════════════════════════════ */
  if (action === "analyze_gaps") {
    if (!targetRole) return NextResponse.json({ error: "targetRole is required" }, { status: 400 });

    const sys = `You are a senior engineering career coach specialising in the Indian tech job market.
Analyse the candidate's current profile against the target role and return a gap analysis in this EXACT JSON format — no markdown, no extra text:
{
  "readinessScore": <0-100 integer>,
  "verdict": "<2 sentences: how ready they are and the single most important thing to focus on>",
  "currentStrengths": ["<skill>", ...],
  "criticalGaps": [
    {
      "skill": "<skill name>",
      "why": "<1 sentence: why this matters for the target role>",
      "studyTime": "<e.g. 2–3 weeks>",
      "priority": <1-based integer>,
      "resources": ["<specific book/course/resource>", "<another resource>"]
    }
  ],
  "niceToHaves": ["<skill>", ...]
}

Rules:
- criticalGaps must be ordered by priority (1 = most important to close first)
- Include 3–6 critical gaps, 2–4 nice-to-haves
- currentStrengths: skills the candidate already has that are relevant to the target role
- Be specific to the Indian tech market and ${company || "top tech companies in India"}
- studyTime should be realistic for a working professional${langCtx}`;

    const usr = `Current role: ${currentRole || "Not specified"}
Current skills: ${currentSkills || "Not specified"}
Target role: ${targetRole}
Target company: ${company || "Top Indian tech companies"}`;

    try {
      const raw = await groqRewrite(sys, usr);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      const gaps = JSON.parse(match[0]);
      return NextResponse.json({ gaps });
    } catch (err) {
      console.error("analyze_gaps error:", err);
      return NextResponse.json({ error: "Failed to analyse gaps" }, { status: 500 });
    }
  }

  /* ══════════════════════════════════════════════════════════
     ACTION: generate_questions
     Returns 5 questions TARGETED at the focusSkill gap.
  ══════════════════════════════════════════════════════════ */
  if (action === "generate_questions") {
    if (!targetRole || !focusSkill) {
      return NextResponse.json({ error: "targetRole and focusSkill are required" }, { status: 400 });
    }

    const levelGuide =
      difficulty === "fresher" ? "entry-level, conceptual understanding focus" :
      difficulty === "senior"  ? "senior-level, depth + trade-offs expected"  :
                                  "mid-level, practical application focus";

    const sys = `You are an expert technical interviewer at top Indian tech companies.
Generate exactly 5 interview questions SPECIFICALLY testing "${focusSkill}" for a ${targetRole} candidate at ${company || "a top Indian tech company"}.
Level: ${levelGuide}${langCtx}

Return ONLY a valid JSON array of 5 strings — no markdown, no explanation.
Mix question types: 2 conceptual, 2 practical/scenario, 1 design/trade-off.
Questions must directly test "${focusSkill}" — not general questions.
${progLang && progLang !== "any" ? `At least 2 questions should involve ${progLang} code, syntax, or idioms.` : ""}`;

    const usr = `Role: ${targetRole}
Skill to test: ${focusSkill}
Company: ${company || "top Indian tech company"}`;

    try {
      const raw = await groqRewrite(sys, usr);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array found");
      const questions: string[] = JSON.parse(match[0]);
      return NextResponse.json({ questions: questions.slice(0, 5) });
    } catch (err) {
      console.error("generate_questions error:", err);
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
    }
  }

  /* ══════════════════════════════════════════════════════════
     ACTION: evaluate_answer
  ══════════════════════════════════════════════════════════ */
  if (action === "evaluate_answer") {
    if (!question || !answer) {
      return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    }
    if (answer.trim().length < 10) {
      return NextResponse.json({ error: "Answer too short to evaluate" }, { status: 400 });
    }

    const sys = `You are a senior technical interviewer evaluating a candidate's answer.
${focusSkill ? `This question tests the skill: "${focusSkill}". Evaluate specifically for depth of understanding of this skill.` : ""}
Return ONLY this exact JSON object — no markdown:
{
  "score": <1-10>,
  "verdict": "<Excellent|Good|Needs Work|Poor>",
  "strengths": ["<specific strength>", "<specific strength>"],
  "improvements": ["<specific improvement>", "<specific improvement>"],
  "betterAnswer": "<2-4 sentence example of a stronger answer>",
  "keyConceptMissed": "<the most important concept from ${focusSkill || "this topic"} that the answer missed, or null if none>"
}`;

    const usr = `Question: ${question}\nAnswer: ${answer}`;

    try {
      const raw = await groqRewrite(sys, usr);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      const feedback = JSON.parse(match[0]);
      return NextResponse.json({ feedback });
    } catch (err) {
      console.error("evaluate_answer error:", err);
      return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
