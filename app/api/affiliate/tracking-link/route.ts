import { NextRequest, NextResponse } from "next/server";
import { generateTrackingLink } from "@/lib/impact";

/**
 * POST /api/affiliate/tracking-link
 * Body: { url: string, brand: "udemy" | "coursera", subId?: string }
 * Returns: { trackingUrl: string, tracked: boolean }
 *
 * If campaign not yet approved → returns original URL (tracked: false).
 * Frontend works the same either way.
 */
export async function POST(req: NextRequest) {
  try {
    const { url, brand, subId } = await req.json() as {
      url:    string;
      brand:  "udemy" | "coursera";
      subId?: string;
    };

    if (!url || !brand) {
      return NextResponse.json({ error: "url and brand are required" }, { status: 400 });
    }
    if (!["udemy", "coursera"].includes(brand)) {
      return NextResponse.json({ error: "brand must be udemy or coursera" }, { status: 400 });
    }

    const result = await generateTrackingLink(url, brand, subId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[affiliate/tracking-link]", err);
    return NextResponse.json({ error: "Failed to generate tracking link" }, { status: 500 });
  }
}
