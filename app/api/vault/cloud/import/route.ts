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
import { getUserCreds } from "@/lib/vaultCloudCreds";
import type { ProviderCreds } from "@/lib/vaultCloudCreds";
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

// ── Token refresh helper ──────────────────────────────────────────
async function refreshToken(
  provider: Provider,
  refreshToken: string,
  creds: ProviderCreds,
): Promise<string> {
  const urls: Record<Provider, string> = {
    google_drive: "https://oauth2.googleapis.com/token",
    dropbox:      "https://api.dropboxapi.com/oauth2/token",
    onedrive:     "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  };
  const extraParams: Partial<Record<Provider, Record<string, string>>> = {
    onedrive: { scope: "files.read offline_access" },
  };
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    grant_type:    "refresh_token",
    ...(extraParams[provider] ?? {}),
  });
  const res = await fetch(urls[provider], {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const d = await res.json() as { access_token?: string };
  if (!d.access_token) throw new Error(`${provider} token refresh failed`);
  return d.access_token;
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

    // Load user's OAuth app credentials (BYOA — needed for token refresh)
    const creds = await getUserCreds(sb, user.id, provider);
    if (!creds) {
      return NextResponse.json(
        { error: "Provider credentials not configured", code: "not_configured" },
        { status: 412 }
      );
    }

    // Check provider is connected & get access token
    const { data: conn } = await sb
      .from("vault_cloud_connections")
      .select("access_token,refresh_token,token_expiry,status")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (!conn || conn.status !== "connected") {
      return NextResponse.json({ error: `${provider} not connected` }, { status: 401 });
    }

    // Refresh access token if expired before downloading
    let accessToken = conn.access_token as string;
    const isExpired = conn.token_expiry &&
      new Date(conn.token_expiry as string) < new Date(Date.now() + 60_000);

    if (isExpired && conn.refresh_token) {
      try {
        accessToken = await refreshToken(provider, conn.refresh_token as string, creds);
        await getServiceSupabase()
          .from("vault_cloud_connections")
          .update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + 3600_000).toISOString(),
            updated_at:   new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("provider", provider);
      } catch {
        return NextResponse.json(
          { error: "Session expired. Please reconnect.", code: "token_expired" },
          { status: 401 }
        );
      }
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

    // Download file from provider using (possibly refreshed) access token
    let fileBuffer: ArrayBuffer;
    try {
      if (provider === "google_drive") fileBuffer = await downloadGoogleFile(fileId, accessToken);
      else if (provider === "dropbox") fileBuffer = await downloadDropboxFile(fileId, accessToken);
      else                             fileBuffer = await downloadOnedriveFile(fileId, accessToken);
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

    // Update import counter via service role (bypasses RLS)
    const svc = getServiceSupabase();
    const { data: connCount } = await svc
      .from("vault_cloud_connections")
      .select("files_imported")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    await svc
      .from("vault_cloud_connections")
      .update({
        files_imported: ((connCount?.files_imported as number | null) ?? 0) + 1,
        last_synced:    new Date().toISOString(),
        updated_at:     new Date().toISOString(),
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
