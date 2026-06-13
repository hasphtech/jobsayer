/**
 * POST /api/vault/upload
 * Accepts multipart/form-data with:
 *   file     — the document file (PDF, JPG, PNG, max 10 MB)
 *   type     — DocType (offer_letter | salary_slip | …)
 *   title    — user-given title
 *   company  — optional company name
 *   year     — optional year (number)
 *
 * Flow:
 *   1. Auth check
 *   2. Validate file size / mime
 *   3. Upload to Supabase Storage bucket "vault-docs/{userId}/{uuid}.ext"
 *   4. Insert row in vault_documents
 *   5. Trigger AI summary (non-blocking — fire and forget)
 *   6. Return the new document row
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const VALID_TYPES = new Set([
  "offer_letter", "salary_slip", "experience_letter",
  "appraisal", "certificate", "tax_doc", "other",
]);

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "other";
    const title = (formData.get("title") as string)?.trim();
    const company = (formData.get("company") as string)?.trim() || null;
    const yearRaw = formData.get("year") as string | null;
    const year = yearRaw ? parseInt(yearRaw) : null;

    // ── Validate ──────────────────────────────────────────────
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!VALID_TYPES.has(type)) return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Only PDF, JPG, PNG, or WebP files are accepted" }, { status: 400 });
    }

    // ── Upload to Supabase Storage ────────────────────────────
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const uuid = crypto.randomUUID();
    const storagePath = `${user.id}/${uuid}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await sb.storage
      .from("vault-docs")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error("Vault upload error:", uploadErr);
      return NextResponse.json({ error: "Storage upload failed. Please try again." }, { status: 500 });
    }

    // ── Insert DB row ─────────────────────────────────────────
    const { data: doc, error: dbErr } = await sb
      .from("vault_documents")
      .insert({
        user_id: user.id,
        type,
        title,
        company,
        year: year && !isNaN(year) ? year : null,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        verified: false,
        tags: [],
        source: "upload",
      })
      .select()
      .single();

    if (dbErr || !doc) {
      // Clean up orphaned storage file
      await sb.storage.from("vault-docs").remove([storagePath]);
      console.error("Vault DB insert error:", dbErr);
      return NextResponse.json({ error: "Failed to save document metadata" }, { status: 500 });
    }

    // ── Trigger AI summary (non-blocking) ────────────────────
    // Fire-and-forget: POST to internal AI route to parse and update ai_summary
    void triggerAiSummary(doc.id, storagePath, type, user.id).catch(console.error);

    return NextResponse.json({ doc }, { status: 201 });
  } catch (err) {
    console.error("Vault upload unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

async function triggerAiSummary(docId: string, storagePath: string, type: string, userId: string) {
  // This runs async after response is sent.
  // In production, replace with a Supabase Edge Function or background job.
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await fetch(`${base}/api/vault/summarise`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": process.env.INTERNAL_API_KEY || "" },
    body: JSON.stringify({ docId, storagePath, type, userId }),
  });
}
