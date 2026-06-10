/**
 * /api/cron/expire-jobs — Nightly job expiry cron
 *
 * Sets is_active = false for all jobs where expires_at < now().
 * Called by Vercel cron at midnight UTC.
 *
 * Security: must include Authorization: Bearer <CRON_SECRET> header.
 * Set CRON_SECRET env var in Vercel (any long random string).
 *
 * Vercel cron automatically sends this header when CRON_SECRET is set
 * in the project — no manual config needed for production.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/adminAuth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  // ── Auth: verify cron secret ──────────────────────────────────────────────
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Misconfigured — fail closed
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Expire jobs ───────────────────────────────────────────────────────────
  const db = createServiceClient();

  const { data, error } = await db
    .from("jobs")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("is_active", true)
    .lt("expires_at", new Date().toISOString())
    .select("id, title, company");

  if (error) {
    console.error("[expire-jobs] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const expired = data ?? [];
  console.log(`[expire-jobs] Expired ${expired.length} job(s):`, expired.map(j => `${j.title} @ ${j.company}`).join(", ") || "none");

  return NextResponse.json({
    ok: true,
    expired: expired.length,
    jobs: expired.map(j => ({ id: j.id, title: j.title, company: j.company })),
  });
}
