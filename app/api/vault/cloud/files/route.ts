/**
 * GET /api/vault/cloud/files?provider=google_drive|dropbox|onedrive&folder=...
 *
 * Lists files from the connected cloud provider that look like career docs
 * (PDFs and images). Filters by name patterns common for offer letters,
 * salary slips, certificates, etc. so the picker isn't overwhelming.
 *
 * Returns: { files: CloudFile[], nextPageToken?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getServiceSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export interface CloudFile {
  id:           string;
  name:         string;
  mimeType:     string;
  size?:        number;
  modifiedAt?:  string;
  thumbnailUrl?:string;
  webViewUrl?:  string;
  provider:     "google_drive" | "dropbox" | "onedrive";
}

type Provider = "google_drive" | "dropbox" | "onedrive";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// ── Token refresh helpers ─────────────────────────────────────────

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_DRIVE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "",
      grant_type:    "refresh_token",
    }),
  });
  const d = await res.json() as { access_token?: string };
  if (!d.access_token) throw new Error("Google refresh failed");
  return d.access_token;
}

async function refreshDropboxToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.DROPBOX_CLIENT_ID ?? "",
      client_secret: process.env.DROPBOX_CLIENT_SECRET ?? "",
      grant_type:    "refresh_token",
    }),
  });
  const d = await res.json() as { access_token?: string };
  if (!d.access_token) throw new Error("Dropbox refresh failed");
  return d.access_token;
}

async function refreshOnedriveToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.ONEDRIVE_CLIENT_ID ?? "",
      client_secret: process.env.ONEDRIVE_CLIENT_SECRET ?? "",
      grant_type:    "refresh_token",
      scope:         "files.read offline_access",
    }),
  });
  const d = await res.json() as { access_token?: string };
  if (!d.access_token) throw new Error("OneDrive refresh failed");
  return d.access_token;
}

// ── File listing helpers ──────────────────────────────────────────

async function listGoogleDriveFiles(accessToken: string, pageToken?: string): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    q:        "mimeType='application/pdf' or mimeType='image/jpeg' or mimeType='image/png'",
    fields:   "nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink)",
    pageSize: "50",
    orderBy:  "modifiedTime desc",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as {
    files?: Array<{ id: string; name: string; mimeType: string; size?: string; modifiedTime?: string; thumbnailLink?: string; webViewLink?: string }>;
    nextPageToken?: string;
  };

  const files: CloudFile[] = (data.files ?? [])
    .filter(f => ALLOWED_MIME.has(f.mimeType))
    .map(f => ({
      id:           f.id,
      name:         f.name,
      mimeType:     f.mimeType,
      size:         f.size ? parseInt(f.size) : undefined,
      modifiedAt:   f.modifiedTime,
      thumbnailUrl: f.thumbnailLink,
      webViewUrl:   f.webViewLink,
      provider:     "google_drive",
    }));

  return { files, nextPageToken: data.nextPageToken };
}

async function listDropboxFiles(accessToken: string): Promise<{ files: CloudFile[] }> {
  const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: "", recursive: true, limit: 100 }),
  });
  const data = await res.json() as {
    entries?: Array<{ ".tag": string; id: string; name: string; size?: number; server_modified?: string; path_display?: string }>;
  };

  const files: CloudFile[] = (data.entries ?? [])
    .filter(e => e[".tag"] === "file" && (
      e.name.endsWith(".pdf") || e.name.endsWith(".jpg") ||
      e.name.endsWith(".jpeg") || e.name.endsWith(".png")
    ))
    .map(e => ({
      id:          e.id,
      name:        e.name,
      mimeType:    e.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      size:        e.size,
      modifiedAt:  e.server_modified,
      webViewUrl:  undefined,
      provider:    "dropbox",
    }));

  return { files };
}

async function listOnedriveFiles(accessToken: string): Promise<{ files: CloudFile[] }> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/drive/root/search(q='pdf')?$select=id,name,size,lastModifiedDateTime,file,webUrl&$top=50",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json() as {
    value?: Array<{ id: string; name: string; size?: number; lastModifiedDateTime?: string; file?: { mimeType?: string }; webUrl?: string }>;
  };

  const files: CloudFile[] = (data.value ?? [])
    .filter(f => {
      const mime = f.file?.mimeType ?? "";
      return ALLOWED_MIME.has(mime);
    })
    .map(f => ({
      id:          f.id,
      name:        f.name,
      mimeType:    f.file?.mimeType ?? "application/pdf",
      size:        f.size,
      modifiedAt:  f.lastModifiedDateTime,
      webViewUrl:  f.webUrl,
      provider:    "onedrive",
    }));

  return { files };
}

// ── Route handler ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const provider = req.nextUrl.searchParams.get("provider") as Provider | null;
    if (!provider || !["google_drive", "dropbox", "onedrive"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Fetch stored tokens
    const { data: conn } = await sb
      .from("vault_cloud_connections")
      .select("access_token,refresh_token,token_expiry,status")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (!conn) return NextResponse.json({ error: "Provider not connected" }, { status: 404 });
    if (conn.status === "revoked") return NextResponse.json({ error: "Connection revoked. Please reconnect." }, { status: 401 });

    // Refresh token if expired
    let accessToken = conn.access_token;
    const isExpired = conn.token_expiry && new Date(conn.token_expiry) < new Date(Date.now() + 60_000);

    if (isExpired && conn.refresh_token) {
      try {
        if (provider === "google_drive") accessToken = await refreshGoogleToken(conn.refresh_token);
        else if (provider === "dropbox") accessToken = await refreshDropboxToken(conn.refresh_token);
        else                             accessToken = await refreshOnedriveToken(conn.refresh_token);

        // Persist fresh token
        await getServiceSupabase()
          .from("vault_cloud_connections")
          .update({ access_token: accessToken, token_expiry: new Date(Date.now() + 3600_000).toISOString() })
          .eq("user_id", user.id)
          .eq("provider", provider);
      } catch {
        return NextResponse.json({ error: "Session expired. Please reconnect.", code: "token_expired" }, { status: 401 });
      }
    }

    const pageToken = req.nextUrl.searchParams.get("pageToken") ?? undefined;

    let result: { files: CloudFile[]; nextPageToken?: string };
    if      (provider === "google_drive") result = await listGoogleDriveFiles(accessToken, pageToken);
    else if (provider === "dropbox")      result = await listDropboxFiles(accessToken);
    else                                  result = await listOnedriveFiles(accessToken);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Vault cloud files error:", err);
    return NextResponse.json({ error: "Failed to fetch cloud files" }, { status: 500 });
  }
}
