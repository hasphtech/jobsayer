/**
 * POST /api/alerts/digest
 *
 * Cron-invoked digest runner — matches active job alerts against recent jobs
 * and emails users their matched results.
 *
 * Authentication: Bearer CRON_SECRET header (set in env + Vercel cron config)
 *
 * Vercel cron.json example:
 *   { "crons": [{ "path": "/api/alerts/digest", "schedule": "0 8 * * *" }] }
 *
 * Also callable via POST { frequency: "weekly" } to run weekly digest.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendJobAlertEmail } from "@/lib/email";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Auth via CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { frequency?: string } = {};
  try { body = await req.json(); } catch {}
  const frequency = body.frequency ?? "daily";

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Fetch alerts due for this frequency
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (frequency === "weekly" ? 7 : 1));

  const { data: alerts } = await sb
    .from("job_alerts")
    .select("*, profiles(email, full_name)")
    .eq("active", true)
    .eq("frequency", frequency)
    .or(`last_sent_at.is.null,last_sent_at.lt.${cutoff.toISOString()}`);

  if (!alerts?.length) {
    return NextResponse.json({ sent: 0, message: "No alerts due" });
  }

  // Fetch recent jobs (last 24h or 7d)
  const jobCutoff = new Date();
  jobCutoff.setDate(jobCutoff.getDate() - (frequency === "weekly" ? 7 : 1));

  const { data: recentJobs } = await sb
    .from("job_listings")
    .select("id, title, company, location, url, job_type, created_at")
    .gte("created_at", jobCutoff.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  const jobs = recentJobs ?? [];
  let sent   = 0;
  const now  = new Date().toISOString();

  for (const alert of alerts) {
    const profile = alert.profiles as { email?: string; full_name?: string } | null;
    if (!profile?.email) continue;

    // Simple keyword match (case-insensitive)
    const keywords = alert.keywords.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const matched  = jobs.filter(job => {
      const haystack = `${job.title} ${job.company} ${job.location} ${job.job_type}`.toLowerCase();
      return keywords.some((kw: string) => haystack.includes(kw));
    }).filter(job => {
      // Location filter
      if (!alert.location) return true;
      return job.location.toLowerCase().includes(alert.location.toLowerCase());
    }).slice(0, 10);

    if (!matched.length) {
      // Update last_sent_at even if no matches (avoid re-running immediately)
      await sb.from("job_alerts").update({ last_sent_at: now }).eq("id", alert.id);
      continue;
    }

    await sendJobAlertEmail({
      email:    profile.email,
      name:     profile.full_name ?? undefined,
      jobs:     matched.map(j => ({
        title:    j.title,
        company:  j.company,
        location: j.location,
        url:      j.url ?? `https://jobsayer.com/jobs`,
      })),
      keywords: alert.keywords,
    });

    await sb.from("job_alerts").update({ last_sent_at: now }).eq("id", alert.id);
    sent++;
  }

  return NextResponse.json({ sent, total: alerts.length, frequency });
}
