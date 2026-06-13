/**
 * POST /api/salary/negotiate
 *
 * AI-powered salary negotiation coach.
 * Takes the user's role, location, current salary, offer amount, experience,
 * and any extra context, and returns:
 *   - recommendedCounter  (number — in USD)
 *   - rationale           (string)
 *   - scripts             (3-element string array)
 *   - tactics             (string array)
 *   - redFlags            (string array)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { rateLimitAi } from "@/lib/rateLimit";
import { groqJSON } from "@/lib/groq";

interface NegotiateBody {
  role?:          string;
  location?:      string;
  currentSalary?: number;
  offerAmount?:   number;
  yearsExp?:      number;
  industry?:      string;
  context?:       string;
  currency?:      string;
}

interface NegotiateResult {
  recommendedCounter: number;
  rationale:          string;
  scripts:            string[];
  tactics:            string[];
  redFlags:           string[];
}

export async function POST(req: NextRequest) {
  // Rate limit: use the shared AI preset (10 req / 60 s per IP)
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimitAi(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as NegotiateBody;
  const { role, location, currentSalary, offerAmount, yearsExp, industry, context, currency = "USD" } = body;

  if (!role?.trim()) {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }
  if (!offerAmount || offerAmount <= 0) {
    return NextResponse.json({ error: "offerAmount is required" }, { status: 400 });
  }

  const systemPrompt = `You are an expert salary negotiation coach with deep knowledge of global compensation benchmarks. Respond with valid JSON only — no markdown fences.`;

  const userPrompt = `The professional needs negotiation guidance:
- Role: ${role}
- Location: ${location || "Not specified"}
- Industry: ${industry || "Not specified"}
- Years of experience: ${yearsExp ?? "Not specified"}
- Current salary: ${currentSalary ? `${currency} ${currentSalary.toLocaleString()}` : "Not disclosed"}
- Offer received: ${currency} ${offerAmount.toLocaleString()}
${context ? `- Additional context: ${context}` : ""}

Return a JSON object with exactly these fields:
{
  "recommendedCounter": <integer — the specific counter-offer amount in ${currency}, no commas, no symbol>,
  "rationale": "<2-3 sentence justification citing market data, experience, and role demands>",
  "scripts": [
    "<complete email/message script — formal professional tone>",
    "<complete script — warmer conversational tone>",
    "<complete script — for a verbal or phone negotiation>"
  ],
  "tactics": [
    "<specific negotiation tactic with WHY it works for this exact situation>",
    "<tactic 2>",
    "<tactic 3>",
    "<tactic 4>"
  ],
  "redFlags": [
    "<concern or red flag if applicable — empty array [] if none>"
  ]
}

Rules:
- recommendedCounter must be a plain integer
- Scripts must be complete and ready to send
- Tactics must be specific to this role/location/situation
- redFlags is [] if none apply`;

  try {
    const result = await groqJSON<NegotiateResult>(systemPrompt, userPrompt, 1800);

    // Sanitise types
    result.recommendedCounter = Number(result.recommendedCounter) || offerAmount;
    result.scripts  = Array.isArray(result.scripts)   ? result.scripts   : [];
    result.tactics  = Array.isArray(result.tactics)   ? result.tactics   : [];
    result.redFlags = Array.isArray(result.redFlags)  ? result.redFlags  : [];

    return NextResponse.json(result);
  } catch (err) {
    console.error("salary/negotiate error:", err);
    return NextResponse.json({ error: "AI service error. Try again." }, { status: 500 });
  }
}
