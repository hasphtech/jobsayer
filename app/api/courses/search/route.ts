/**
 * NOTE: Udemy affiliate API is deprecated.
 * Live course search is not available. Route returns empty.
 * Affiliate tracking is handled via /api/affiliate/tracking-link
 * once the impact.com Udemy campaign is approved.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ courses: [], total: 0, configured: false });
}
