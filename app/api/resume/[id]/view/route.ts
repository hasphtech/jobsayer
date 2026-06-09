/**
 * GET /api/resume/[id]/view
 *
 * 1×1 transparent GIF tracking pixel — embed in shared resume pages.
 * Records: resume_id, hashed viewer IP, referrer.
 * No PII stored — IP is SHA-256 hashed with a per-deploy salt.
 *
 * Usage (in shared resume page):
 *   <img src={`/api/resume/${id}/view`} width="1" height="1" alt="" />
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rateLimit";
import { createHash } from "crypto";

// 1×1 transparent GIF
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const SALT = process.env.VIEW_SALT ?? "jobsayer-view-salt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Rate limit per IP: 1 view per resume per 10 min
  const ip       = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed } = await rateLimit(`resume-view:${id}:${ip}`, 1, 600_000);

  if (allowed) {
    // Hash IP for storage (no PII)
    const viewerHash = createHash("sha256").update(SALT + ip).digest("hex").slice(0, 16);
    const referrer   = req.headers.get("referer")?.slice(0, 200) ?? null;

    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    // Fire-and-forget — don't block on insert
    sb.from("resume_views").insert({ resume_id: id, viewer_hash: viewerHash, referrer }).then();
  }

  return new NextResponse(GIF, {
    status: 200,
    headers: {
      "Content-Type":  "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma":        "no-cache",
    },
  });
}
