/**
 * GET    /api/vault/[id]          — get signed download URL
 * DELETE /api/vault/[id]          — delete doc + storage file
 * PATCH  /api/vault/[id]          — update title/company/year/tags
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

type Ctx = { params: Promise<{ id: string }> };

// ── GET — signed download URL (60-minute expiry) ──────────────────
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch doc (RLS ensures user owns it)
    const { data: doc, error: docErr } = await sb
      .from("vault_documents")
      .select("id,file_path,file_name,source,cloud_file_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (docErr || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Cloud-imported docs: redirect to cloud link
    if (doc.source !== "upload" && doc.cloud_file_url) {
      return NextResponse.json({ url: doc.cloud_file_url, type: "cloud" });
    }

    // Supabase-stored docs: generate signed URL
    const { data: signed, error: signErr } = await sb.storage
      .from("vault-docs")
      .createSignedUrl(doc.file_path, 3600); // 1 hour

    if (signErr || !signed?.signedUrl) {
      console.error("Vault signed URL error:", signErr);
      return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl, type: "storage", fileName: doc.file_name });
  } catch (err) {
    console.error("Vault GET unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch to get storage path before deleting row (RLS guards ownership)
    const { data: doc } = await sb
      .from("vault_documents")
      .select("id,file_path,source")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Delete DB row first
    const { error: delErr } = await sb
      .from("vault_documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (delErr) return NextResponse.json({ error: "Delete failed" }, { status: 500 });

    // If stored in Supabase Storage, clean up the file
    if (doc.source === "upload" && doc.file_path) {
      await sb.storage.from("vault-docs").remove([doc.file_path]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Vault DELETE unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// ── PATCH — update editable metadata ─────────────────────────────
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;

    // Only allow safe fields to be updated
    const allowed: Record<string, unknown> = {};
    if (typeof body.title   === "string") allowed.title   = body.title.trim();
    if (typeof body.company === "string") allowed.company = body.company.trim() || null;
    if (typeof body.year    === "number") allowed.year    = body.year;
    if (Array.isArray(body.tags))        allowed.tags    = body.tags;

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: doc, error: updErr } = await sb
      .from("vault_documents")
      .update({ ...allowed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updErr) return NextResponse.json({ error: "Update failed" }, { status: 500 });

    return NextResponse.json({ doc });
  } catch (err) {
    console.error("Vault PATCH unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
