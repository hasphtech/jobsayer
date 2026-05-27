/**
 * GET /api/admin/check
 * Returns { isAdmin: true/false } for the current auth token.
 * Used by the admin page to gate the UI client-side.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, isError } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const result = await verifyAdmin(req);
  if (isError(result)) {
    return NextResponse.json({ isAdmin: false });
  }
  return NextResponse.json({ isAdmin: true, email: result.email });
}
