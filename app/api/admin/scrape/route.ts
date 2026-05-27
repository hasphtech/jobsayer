/**
 * POST /api/admin/scrape
 * Triggers the scraper engine to scrape job listings.
 * Returns extracted jobs for admin review — nothing is saved to DB yet.
 *
 * Body: { url, source, keywords?, location?, max_pages? }
 * Source: "naukri" | "linkedin" | "internshala" | "career_page"
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, isError } from "@/lib/adminAuth";

const SCRAPER_URL = process.env.SCRAPER_ENGINE_URL ?? "http://localhost:8765";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url, source = "career_page", keywords = "", location = "India", max_pages = 1 } = body;
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  // Call the scraper engine
  let scraperRes: Response;
  try {
    scraperRes = await fetch(`${SCRAPER_URL}/scrape-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, source, keywords, location, max_pages }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(typeof (globalThis as any).AbortSignal?.timeout !== "undefined"
        ? { signal: (globalThis as any).AbortSignal.timeout(60_000) }
        : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Scraper engine unreachable at ${SCRAPER_URL}. Is it running? (${String(err)})` },
      { status: 503 }
    );
  }

  if (!scraperRes.ok) {
    const text = await scraperRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Scraper engine returned ${scraperRes.status}: ${text}` },
      { status: 502 }
    );
  }

  const data = await scraperRes.json();
  return NextResponse.json(data);
}
