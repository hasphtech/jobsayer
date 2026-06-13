/**
 * POST /api/vault/share
 * Generates (or re-uses) a shareable token for a vault document.
 * Returns a public URL: /vault/share/[token]
 *
 * Body: { docId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { docId } = await req.json() as { docId: string };
    if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });

    // Fetch doc (RLS ensures ownership)
    const { data: existing } = await sb
      .from("vault_documents")
      .select("id,shared_token")
      .eq("id", docId)
      .eq("user_id", user.id)
      .single();

    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Re-use existing token if already generated
    if (existing.shared_token) {
      const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/vault/share/${existing.shared_token}`;
      return NextResponse.json({ token: existing.shared_token, url: shareUrl });
    }

    // Generate a new 24-char random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 24);

    const { error: updErr } = await sb
      .from("vault_documents")
      .update({ shared_token: token, updated_at: new Date().toISOString() })
      .eq("id", docId)
      .eq("user_id", user.id);

    if (updErr) return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });

    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/vault/share/${token}`;
    return NextResponse.json({ token, url: shareUrl });
  } catch (err) {
    console.error("Vault share error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
