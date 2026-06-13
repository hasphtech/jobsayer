/**
 * POST /api/vault/cloud/import
 *
 * Imports a file from a connected cloud provider into the Career Vault.
 * Downloads the file content from the provider → uploads to Supabase Storage
 * → inserts a vault_documents row with source=<provider>.
 *
 * Body:
 *   provider   — "google_drive" | "dropbox" | "onedrive"
 *   fileId     — provider file ID
 *   fileName   — original file name
 *   mimeType   — file MIME type
 *   webViewUrl — cloud view link (stored for quick reference)
 *   type       — DocType
 *   title      — user-given title
 *   company    — optional
 *   year       — optional
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

type Provider = "google_drive" | "dropbox" | "onedrive";

const MAX_BYTES = 10 * 1024 * 1024;

const VALID_TYPES = new Set([
  "offer_letter", "salary_slip", "experience_letter",
  "appraisal", "certificate", "tax_doc", "other",
]);

async function downloadGoogleFile(fileId: string, accessToken: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Google Drive download failed: ${res.status}`);
  return res.arrayBuffer();
}

async function downloadDropboxFile(fileId: string, accessToken: string): Promise<ArrayBuffer> {
  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: fileId }),
    },
  });
  if (!res.ok) throw new Error(`Dropbox download failed: ${res.status}`);
  return res.arrayBuffer();
}

async function downloadOnedriveFile(fileId: string, accessToken: string): Promise<ArrayBuffer> {
  // Get the download URL first
  const metaRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}?$select=@microsoft.graph.downloadUrl`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const meta = await metaRes.json() as { "@microsoft.graph.downloadUrl"?: string };
  const downloadUrl = meta["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) throw new Error("Could not get OneDrive download URL");

  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`OneDrive download failed: ${res.status}`);
  return res.arrayBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      provider: Provider; fileId: string; fileName: string; mimeType: string;
      webViewUrl?: string; type: string; title: string; company?: string; year?: number;
    };

    const { provider, fileId, fileName, mimeType, webViewUrl, type, title, company, year } = body;

    if (!["google_drive", "dropbox", "onedrive"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!fileId || !fileName || !title) {
      return NextResponse.json({ error: "fileId, fileName and title are required" }, { status: 400 });
    }
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    // Check provider is connected & get access token
    const { data: conn } = await sb
      .from("vault_cloud_connections")
      .select("access_token,status")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (!conn || conn.status !== "connected") {
      return NextResponse.json({ error: `${provider} not connected` }, { status: 401 });
    }

    // Check for duplicate import (same cloud file already in vault)
    const { data: existing } = await sb
      .from("vault_documents")
      .select("id,title")
      .eq("user_id", user.id)
      .eq("cloud_file_id", fileId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "This file is already in your Vault", existingId: existing.id }, { status: 409 });
    }

    // Download file from provider
    let fileBuffer: ArrayBuffer;
    try {
      if (provider === "google_drive") fileBuffer = await downloadGoogleFile(fileId, conn.access_token);
      else if (provider === "dropbox") fileBuffer = await downloadDropboxFile(fileId, conn.access_token);
      else                             fileBuffer = await downloadOnedriveFile(fileId, conn.access_token);
    } catch (err) {
      console.error("Cloud download error:", err);
      return NextResponse.json({ error: "Failed to download file from cloud provider" }, { status: 502 });
    }

    if (fileBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const ext = fileName.split(".").pop()?.toLowerCase() || "pdf";
    const uuid = crypto.randomUUID();
    const storagePath = `${user.id}/${uuid}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from("vault-docs")
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Vault cloud import storage error:", uploadErr);
      return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
    }

    // Insert vault_documents row
    const { data: doc, error: dbErr } = await sb
      .from("vault_documents")
      .insert({
        user_id:       user.id,
        type,
        title:         title.trim(),
        company:       company?.trim() || null,
        year:          year && !isNaN(year) ? year : null,
        file_name:     fileName,
        file_path:     storagePath,
        file_size:     fileBuffer.byteLength,
        mime_type:     mimeType,
        verified:      false,
        tags:          [],
        source:        provider,
        cloud_file_id: fileId,
        cloud_file_url: webViewUrl ?? null,
      })
      .select()
      .single();

    if (dbErr || !doc) {
      await sb.storage.from("vault-docs").remove([storagePath]);
      console.error("Vault cloud import DB error:", dbErr);
      return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
    }

    // Update import counter (service role to bypass RLS on update)
    await getServiceSupabase()
      .from("vault_cloud_connections")
      .update({
        files_imported: (conn as unknown as { files_imported?: number }).files_imported ?? 0 + 1,
        last_synced: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", provider);

    // Trigger AI summary async
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    void fetch(`${base}/api/vault/summarise`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": process.env.INTERNAL_API_KEY || "" },
      body: JSON.stringify({ docId: doc.id, storagePath, type, userId: user.id }),
    }).catch(console.error);

    return NextResponse.json({ doc }, { status: 201 });
  } catch (err) {
    console.error("Vault cloud import unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
