/**
 * GET /api/vault/cloud/connect?provider=google_drive|dropbox|onedrive
 *
 * Initiates OAuth flow using the user's own OAuth app credentials
 * (stored in vault_provider_configs — BYOA pattern).
 *
 * If the user hasn't configured credentials yet, redirects to
 * /vault?error=not_configured&provider=<provider> so the UI can
 * open the Configure modal.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getUserCreds } from "@/lib/vaultCloudCreds";
import { cookies } from "next/headers";

type Provider = "google_drive" | "dropbox" | "onedrive";

const REDIRECT_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const CALLBACK_URL  = `${REDIRECT_BASE}/api/vault/cloud/callback`;

function googleAuthUrl(state: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  `${CALLBACK_URL}?provider=google_drive`,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/drive.readonly",
    access_type:   "offline",
    prompt:        "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function dropboxAuthUrl(state: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id:         clientId,
    redirect_uri:      `${CALLBACK_URL}?provider=dropbox`,
    response_type:     "code",
    token_access_type: "offline",
    state,
  });
  return `https://www.dropbox.com/oauth2/authorize?${params}`;
}

function onedriveAuthUrl(state: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  `${CALLBACK_URL}?provider=onedrive`,
    response_type: "code",
    scope:         "files.read offline_access",
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sb          = createServerSupabase(cookieStore);

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.redirect(`${REDIRECT_BASE}/login`);
  }

  const provider = req.nextUrl.searchParams.get("provider") as Provider | null;
  const validProviders: Provider[] = ["google_drive", "dropbox", "onedrive"];
  if (!provider || !validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // ── Load user's own OAuth app credentials ────────────────────────
  const creds = await getUserCreds(sb, user.id, provider);
  if (!creds) {
    // User hasn't configured credentials yet — send them back to configure
    return NextResponse.redirect(
      `${REDIRECT_BASE}/vault?error=not_configured&provider=${provider}`
    );
  }

  // ── Build CSRF state token ────────────────────────────────────────
  const statePayload = Buffer.from(JSON.stringify({
    userId:   user.id,
    provider,
    nonce:    crypto.randomUUID(),
    ts:       Date.now(),
  })).toString("base64url");

  const authUrl =
    provider === "google_drive" ? googleAuthUrl(statePayload, creds.clientId) :
    provider === "dropbox"      ? dropboxAuthUrl(statePayload, creds.clientId) :
                                  onedriveAuthUrl(statePayload, creds.clientId);

  // Store state in a short-lived HttpOnly cookie for callback verification
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("vault_oauth_state", statePayload, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    maxAge:   600, // 10 minutes
    path:     "/api/vault/cloud/callback",
    sameSite: "lax",
  });

  return response;
}
