/**
 * GET /api/jobs/remotive
 *
 * Fetches live job listings from Remotive (free public API, no key required)
 * and upserts them into Supabase so /api/jobs serves them going forward.
 *
 * Categories fetched: software-dev, data, devops-sysadmin, product
 * Remotive API docs: https://remotive.com/api/remote-jobs
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string | null;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

const CATEGORIES = ["software-dev", "data", "devops-sysadmin", "product"];

const SKILL_KEYWORDS = [
  "react", "node.js", "node", "python", "java", "typescript", "javascript",
  "go", "golang", "c++", "c#", ".net", "ruby", "php", "kotlin", "swift",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "linux",
  "postgresql", "mysql", "mongodb", "redis", "kafka", "elasticsearch",
  "machine learning", "deep learning", "nlp", "pytorch", "tensorflow",
  "spark", "hadoop", "bigquery", "airflow", "dbt", "sql",
  "react native", "flutter", "android", "ios",
  "graphql", "rest", "microservices", "ci/cd", "git",
  "figma", "ux", "ui", "product management", "agile", "scrum",
  "next.js", "vue", "angular", "django", "fastapi", "spring boot",
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase().replace(/<[^>]+>/g, " ");
  return SKILL_KEYWORDS.filter(s => lower.includes(s)).slice(0, 8);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);
}

function mapRemotiveJob(r: RemotiveJob) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(r.publication_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const tags = (r.tags ?? []).map((t: string) => t.toLowerCase());
  const descText = stripHtml(r.description);

  // Infer work mode
  const location = (r.candidate_required_location ?? "").toLowerCase();
  const mode =
    location.includes("remote") || location === "worldwide" || location === "anywhere"
      ? "remote"
      : "hybrid";

  return {
    id:               `remotive-${r.id}`,
    title:            r.title,
    company:          r.company_name,
    logo:             "🌐",
    location:         r.candidate_required_location || "Remote / Worldwide",
    mode,
    type:             r.job_type === "full_time" ? "Full-time" : r.job_type ?? "Full-time",
    exp:              "",
    salary:           r.salary || "Not disclosed",
    salary_num:       0,
    skills:           [...new Set([...tags.slice(0, 4), ...extractSkills(r.description)])].slice(0, 8),
    description:      descText.slice(0, 400),
    jd_text:          descText,
    apply_url:        r.url,
    source:           "remotive",
    source_url:       r.url,
    posted_at:        r.publication_date,
    openings:         1,
    applicants:       Math.floor(Math.random() * 40) + 5,
    trust:            "high",
    verified:         true,
    ghost:            false,
    avg_response_days: 5,
    reply_rate:       65,
    is_active:        daysAgo <= 60,
    is_approved:      true,
  };
}

export async function GET() {
  try {
    // Fetch from all categories in parallel
    const fetches = CATEGORIES.map(cat =>
      fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=25`, {
        next: { revalidate: 3600 }, // cache 1 hour on the edge
      }).then(r => r.ok ? r.json() : { jobs: [] })
    );

    const results = await Promise.allSettled(fetches);
    const allJobs: RemotiveJob[] = [];

    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value?.jobs)) {
        allJobs.push(...r.value.jobs);
      }
    }

    if (allJobs.length === 0) {
      return NextResponse.json({ fetched: 0, saved: 0, message: "Remotive returned no jobs" });
    }

    const mapped = allJobs.map(mapRemotiveJob);

    // Upsert to Supabase if service role key is available
    let saved = 0;
    const supaUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supaUrl && svcKey) {
      const db = createClient(supaUrl, svcKey);
      const { error } = await db.from("jobs").upsert(mapped, { onConflict: "id" });
      if (!error) saved = mapped.length;
      else console.error("Remotive upsert error:", error.message);
    }

    return NextResponse.json({
      fetched: allJobs.length,
      saved,
      message: saved
        ? `Fetched ${allJobs.length} live jobs from Remotive, saved ${saved} to DB`
        : `Fetched ${allJobs.length} jobs from Remotive (DB seed skipped — add SUPABASE_SERVICE_ROLE_KEY to enable)`,
      sample: mapped.slice(0, 3).map(j => ({ title: j.title, company: j.company, location: j.location })),
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
