/**
 * GET /api/jobs/import?q=software+engineer&country=in&page=1
 *
 * Pulls live job listings from Adzuna API and upserts them into Supabase.
 * Requires ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local
 *
 * Adzuna free tier: 1000 API calls/day
 * Sign up at: https://developer.adzuna.com/
 *
 * Alternative free APIs:
 *   - Jooble:     https://jooble.org/api/about   (POST, 1000 calls/day)
 *   - The Muse:   https://www.themuse.com/developers/api/v2
 *   - RemoteOK:   https://remoteok.com/api        (GET, no auth needed)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  description: string;
  redirect_url: string;
  created: string;
  category?: { tag: string };
}

export async function GET(req: NextRequest) {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json(
      {
        error: "ADZUNA_APP_ID and ADZUNA_APP_KEY not set",
        setup: "1. Sign up at https://developer.adzuna.com/  2. Add to .env.local  3. Retry",
      },
      { status: 503 }
    );
  }

  const { searchParams } = req.nextUrl;
  const q       = searchParams.get("q") ?? "software engineer";
  const country = searchParams.get("country") ?? "in";
  const page    = searchParams.get("page") ?? "1";

  try {
    const url = `${ADZUNA_BASE}/${country}/search/${page}?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${encodeURIComponent(q)}&content-type=application/json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Adzuna ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const results: AdzunaResult[] = data.results ?? [];

    // Map to our Job schema
    const mapped = results.map(r => ({
      id:          `adzuna-${r.id}`,
      title:       r.title,
      company:     r.company.display_name,
      location:    r.location.display_name,
      mode:        "hybrid" as const,       // Adzuna doesn't reliably expose this
      exp:         "Not specified",
      salary:      r.salary_min && r.salary_max
        ? `₹${Math.round(r.salary_min / 100000)}–${Math.round(r.salary_max / 100000)}L`
        : "Not disclosed",
      salary_num:  r.salary_min ?? 0,
      skills:      extractSkills(r.description),
      description: r.description.slice(0, 500),
      jd_text:     r.description,
      apply_url:   r.redirect_url,
      source:      "adzuna",
      source_url:  r.redirect_url,
      posted_at:   r.created,
      is_active:   true,
      is_approved: true,
    }));

    // Upsert to Supabase if credentials available
    let saved = 0;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { error } = await sb.from("jobs").upsert(mapped, { onConflict: "id" });
      if (!error) saved = mapped.length;
    }

    return NextResponse.json({
      fetched:  mapped.length,
      saved,
      total:    data.count ?? 0,
      query:    q,
      country,
      message: saved
        ? `Imported ${saved} jobs into Supabase`
        : `Fetched ${mapped.length} jobs (Supabase upsert skipped — SUPABASE_SERVICE_ROLE_KEY not set)`,
      jobs: mapped.slice(0, 5).map(j => ({ id: j.id, title: j.title, company: j.company })),
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/* ── Skill extractor ─────────────────────────────────────────────── */
const KNOWN_SKILLS = [
  "react", "node.js", "python", "java", "typescript", "javascript",
  "go", "golang", "c++", "c#", ".net", "ruby", "php", "kotlin",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
  "postgresql", "mysql", "mongodb", "redis", "kafka",
  "machine learning", "deep learning", "nlp", "pytorch", "tensorflow",
  "spark", "hadoop", "bigquery", "airflow", "dbt",
  "react native", "flutter", "android", "ios", "swift",
  "graphql", "rest api", "microservices", "sql",
  "figma", "ux", "ui design", "product management",
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter(s => lower.includes(s)).slice(0, 8);
}
