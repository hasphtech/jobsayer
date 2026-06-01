/**
 * POST /api/ai  — @jobsayer/resume
 * Body:    { action: string; content: string }
 * Headers: Authorization: Bearer <supabase_access_token>
 * Returns: { result: string }
 *
 * Auth:       JWT verified server-side via Supabase; plan read from DB.
 *             Gold (pro_plus) only — never trusts tier from the client body.
 * Rate limit: 10 requests / IP / 60 s (checked before auth).
 */

import { NextRequest, NextResponse }     from "next/server";
import { groqRewrite, groqQuick }        from "@/lib/groq";
import { rateLimit }                     from "@/lib/rateLimit";
import { verifyAiAccess }                from "@/lib/aiAuth";

/* ── System prompts per action ───────────────────────────────── */
const SYSTEM_PROMPTS: Record<string, { prompt: string; quick?: boolean }> = {
  /* Summary */
  summary_concise: {
    prompt:
      "You are a professional resume writer. Rewrite the provided summary to be under 50 words. " +
      "Preserve all key metrics and impact. Return ONLY the rewritten text — no preamble, no explanation, no quotes.",
  },
  summary_metrics: {
    prompt:
      "You are a professional resume writer. Enhance the provided summary by adding or strengthening " +
      "quantifiable metrics (%, numbers, ₹ / $). Where real numbers are unavailable, use plausible ranges " +
      "like '20–30%'. Return ONLY the rewritten text.",
  },
  summary_jd: {
    prompt:
      "You are a professional resume writer. Rewrite the summary to sound action-oriented and impactful — " +
      "strong verbs, concrete outcomes, senior tone. Return ONLY the rewritten text.",
  },
  /* Bullets */
  bullet_impact: {
    prompt:
      "You are a professional resume writer. Rewrite these bullet points to lead with strong action verbs " +
      "and include quantifiable impact (%, ₹, numbers) wherever realistic. Each bullet must be under 20 words. " +
      "Return ONLY the rewritten bullets, one per line, each starting with •",
  },
  bullet_verbs: {
    prompt:
      "You are a professional resume writer. Replace weak verbs (helped, worked on, assisted, was responsible " +
      "for, handled, did) with strong action verbs (led, drove, reduced, increased, shipped, architected, scaled, " +
      "launched). Return ONLY the rewritten bullets, one per line, each starting with •",
  },
  /* JD tailoring — rewrites summary + returns keyword list */
  jd_tailor: {
    prompt:
      "You are a professional resume coach. The user will provide their current resume summary and a job description. " +
      "Your task:\n" +
      "1. Rewrite the summary (max 65 words) to naturally incorporate the most important keywords and tone from the JD. " +
      "Keep it first-person and factual — never invent experience the candidate doesn't have.\n" +
      "2. List up to 8 skills/keywords from the JD that are missing from the resume skills section — skills the candidate should consider adding if they have them.\n\n" +
      "Return ONLY this exact JSON format (no markdown, no explanation):\n" +
      "{\"summary\": \"...\", \"missingSkills\": [\"Skill A\", \"Skill B\", ...]}\n\n" +
      "If the existing summary is empty, write a compelling one based on the JD and any work experience context provided.",
  },
  /* Cover letter */
  cover_letter: {
    prompt:
      "You are a professional cover letter writer. Given the candidate context provided, write a compelling " +
      "cover letter body in 3 short paragraphs (under 300 words total). Opening: connect the candidate to " +
      "this specific company and role. Middle: highlight one concrete achievement with metrics or impact. " +
      "Closing: express enthusiasm and request an interview. Use a professional but warm tone. " +
      "Return ONLY the letter body text — no 'Dear...' greeting, no closing signature, no Subject line, " +
      "no 'Sincerely' or 'Best regards'. Start directly with the first paragraph.",
  },
  /* Generate bullets from job title + company */
  bullet_generate: {
    prompt:
      "You are a professional resume writer. Given a job title and company name, write 4 strong resume bullet points " +
      "the candidate can use as a starting point. Each bullet must: start with a powerful action verb, include a " +
      "realistic metric or outcome (%, ₹, numbers, timeframes), and be under 20 words. " +
      "Tailor the seniority and domain to the title (e.g. senior roles get strategic bullets, junior roles get execution bullets). " +
      "Return ONLY the 4 bullets, one per line, each starting with •",
  },
  /* Generate summary from scratch using title + work experience */
  summary_generate: {
    prompt:
      "You are a professional resume writer specialising in the Indian job market. " +
      "Given the candidate's job title and work experience details, write a compelling professional " +
      "summary in 3–4 sentences (50–70 words). Lead with years of experience and specialisation. " +
      "Include 1–2 concrete achievements or impact metrics. End with what they bring to their next role. " +
      "Tone: confident, factual, no fluff. India-focused: mention ₹ if salary context is given. " +
      "Return ONLY the summary text — no preamble, no quotes.",
  },
  /* Quick chip suggestions */
  suggest_skills: {
    prompt:
      "You are a resume skills advisor. Given the job title and existing skills, suggest 5 additional relevant " +
      "skills to add. Return a comma-separated list only — no explanation.",
    quick: true,
  },
};

const RATE_LIMIT  = 10;
const RATE_WINDOW = 60_000;

export async function POST(req: NextRequest) {
  try {
    /* ── 1. IP rate limit — before auth or body parsing ─────── */
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? req.headers.get("x-real-ip")
            ?? "unknown";
    const { allowed: ipAllowed, retryAfter } = await rateLimit(`ai-resume:${ip}`, RATE_LIMIT, RATE_WINDOW);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${retryAfter}s before trying again.` },
        {
          status: 429,
          headers: {
            "Retry-After":           String(retryAfter),
            "X-RateLimit-Limit":     String(RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset":     String(Math.floor(Date.now() / 1000) + retryAfter),
          },
        },
      );
    }

    /* ── 2. Server-side auth + plan check ───────────────────── */
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim() ?? "";
    const { allowed, reason } = await verifyAiAccess(token);
    if (!allowed) {
      return NextResponse.json({ error: reason ?? "Access denied" }, { status: 403 });
    }

    /* ── 3. Parse and validate body ─────────────────────────── */
    const body = await req.json() as { action?: string; content?: string };
    const { action, content } = body;

    if (!action || !content?.trim()) {
      return NextResponse.json({ error: "Missing action or content" }, { status: 400 });
    }

    const spec = SYSTEM_PROMPTS[action];
    if (!spec) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    /* ── 4. Call Groq ────────────────────────────────────────── */
    const result = spec.quick
      ? await groqQuick(`${spec.prompt}\n\nContent: ${content}`)
      : await groqRewrite(spec.prompt, content);

    return NextResponse.json({ result: result.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[resume/api/ai]", msg);
    return NextResponse.json({ error: "AI service unavailable. Try again shortly." }, { status: 503 });
  }
}
