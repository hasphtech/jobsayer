/**
 * POST /api/linkedin/tips
 *
 * Generates comprehensive, personalized LinkedIn optimization tips once
 * the user has connected their LinkedIn account.
 *
 * Body: {
 *   targetRole:   string   // e.g. "Senior Software Engineer"
 *   headline?:    string   // current headline (optional)
 *   about?:       string   // current about (optional)
 *   skills?:      string   // comma-separated skills (optional)
 *   linkedinUrl?: string   // their LinkedIn profile URL (optional)
 *   connections?: number   // approximate connection count (optional)
 * }
 *
 * Returns: {
 *   healthScore:    number          // 0-100 profile completeness estimate
 *   quickWins:      Tip[]           // top 5 actions to do today
 *   sectionGuide:   SectionTip[]    // per-section deep-dive
 *   growthPlaybook: Tip[]           // algorithm + network growth tips
 *   thirtyDayPlan:  WeekPlan[]      // week-by-week 30-day plan
 *   roleKeywords:   string[]        // top 15 keywords for their role
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { groqRewrite } from "@/lib/groq";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 3 tip generations per minute per user
  const { allowed } = await rateLimit(`linkedin-tips:${user.id}`, 3, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests — wait a moment." }, { status: 429 });

  let body: {
    targetRole?: string;
    headline?: string;
    about?: string;
    skills?: string;
    linkedinUrl?: string;
    connections?: number;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { targetRole, headline = "", about = "", skills = "", linkedinUrl = "", connections } = body;
  if (!targetRole?.trim()) {
    return NextResponse.json({ error: "targetRole is required" }, { status: 400 });
  }

  // Pull their onboarding data to enrich tips
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_job_role, target_role, location")
    .eq("id", user.id)
    .single();

  const currentRole = profile?.current_job_role ?? "professional";
  const location    = profile?.location ?? "";

  const systemPrompt = `You are a world-class LinkedIn growth expert and career coach with deep knowledge of LinkedIn's algorithm, recruiter behavior, and ATS systems. You help professionals dramatically improve their LinkedIn visibility and inbound opportunities.

Generate comprehensive, HIGHLY SPECIFIC optimization advice for this professional. Be concrete — no generic tips. Every recommendation must be actionable today.

Return ONLY a valid JSON object (no markdown, no explanation) in this exact shape:
{
  "healthScore": <number 0-100 based on how complete the profile appears>,
  "quickWins": [
    {
      "id": "qw1",
      "title": "short action title",
      "impact": "High|Medium",
      "effort": "5 min|15 min|30 min",
      "why": "one sentence explaining the business impact",
      "howTo": ["step 1", "step 2", "step 3"]
    }
    // exactly 5 items
  ],
  "sectionGuide": [
    {
      "section": "Photo",
      "score": <0-100>,
      "status": "Missing|Weak|Good|Strong",
      "tip": "specific tip for this section",
      "example": "concrete example or template"
    }
    // sections: Photo, Banner, Headline, About, Featured, Experience, Skills, Recommendations, Custom URL, Open to Work
  ],
  "growthPlaybook": [
    {
      "id": "gp1",
      "category": "Algorithm|Network|Content|Engagement",
      "title": "tip title",
      "description": "2-3 sentence detailed explanation",
      "frequency": "Daily|Weekly|Monthly|One-time"
    }
    // exactly 8 items
  ],
  "thirtyDayPlan": [
    {
      "week": 1,
      "theme": "Foundation",
      "tasks": ["task1", "task2", "task3", "task4"]
    },
    {
      "week": 2,
      "theme": "Content & Visibility",
      "tasks": ["task1", "task2", "task3", "task4"]
    },
    {
      "week": 3,
      "theme": "Network Growth",
      "tasks": ["task1", "task2", "task3", "task4"]
    },
    {
      "week": 4,
      "theme": "Inbound & Optimization",
      "tasks": ["task1", "task2", "task3", "task4"]
    }
  ],
  "roleKeywords": [<exactly 15 strings — top ATS/recruiter keywords for this role>]
}`;

  const userContent = `PROFESSIONAL CONTEXT:
- Target role: ${targetRole}
- Current role: ${currentRole}
- Location: ${location || "not specified"}
- Approximate connections: ${connections ?? "unknown"}
- LinkedIn URL: ${linkedinUrl || "not set (no custom URL yet)"}

CURRENT PROFILE CONTENT:
- Headline: ${headline || "(not provided — assume missing/weak)"}
- About: ${about ? about.slice(0, 800) : "(not provided — assume missing)"}
- Skills listed: ${skills || "(not provided — assume missing)"}

Generate tips that are SPECIFIC to transitioning from ${currentRole} to ${targetRole}${location ? ` in ${location}` : ""}. Focus on what will get them noticed by recruiters hiring for ${targetRole} roles.`;

  try {
    const raw     = await groqRewrite(systemPrompt, userContent);
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed  = JSON.parse(cleaned);

    // Persist the linkedin_connected_at timestamp (upsert so it only sets once)
    await supabase
      .from("profiles")
      .update({
        target_role: targetRole,
        ...(linkedinUrl ? { linkedin_url: linkedinUrl } : {}),
      })
      .eq("id", user.id);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[linkedin/tips] error:", err);
    return NextResponse.json({ error: "Tips generation failed. Please try again." }, { status: 500 });
  }
}
