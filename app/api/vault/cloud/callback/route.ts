/**
 * GET /api/vault/cloud/callback?provider=...&code=...&state=...
 *
 * OAuth callback handler for all three cloud providers.
 * Uses per-user credentials from vault_provider_configs (BYOA pattern).
 * Exchanges the auth code for access + refresh tokens, stores them
 * in vault_cloud_connections, then redirects to /vault?connected=<provider>.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getUserCreds, markCredsValidated } from "@/lib/vaultCloudCreds";
import type { ProviderCreds } from "@/lib/vaultCloudCreds";
import { cookies } from "next/headers";

const REDIRECT_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const CALLBACK_URL  = `${REDIRECT_BASE}/api/vault/cloud/callback`;

type Provider = "google_drive" | "dropbox" | "onedrive";

interface TokenResponse {
  access_token:  string;
  refresh_token?: string;
  expires_in?:   number;
  token_type?:   string;
}

async function exchangeGoogleCode(code: string, creds: ProviderCreds): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri:  `${CALLBACK_URL}?provider=google_drive`,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

async function exchangeDropboxCode(code: string, creds: ProviderCreds): Promise<TokenResponse> {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri:  `${CALLBACK_URL}?provider=dropbox`,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Dropbox token exchange failed: ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

async function exchangeOnedriveCode(code: string, creds: ProviderCreds): Promise<TokenResponse> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri:  `${CALLBACK_URL}?provider=onedrive`,
      grant_type:    "authorization_code",
      scope:         "files.read offline_access",
    }),
  });
  if (!res.ok) throw new Error(`OneDrive token exchange failed: ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

async function fetchGoogleProfile(accessToken: string): Promise<{ email: string; name: string; id: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const d = await res.json() as { email?: string; name?: string; id?: string };
  return { email: d.email ?? "", name: d.name ?? "", id: d.id ?? "" };
}

async function fetchDropboxProfile(accessToken: string): Promise<{ email: string; name: string; id: string }> {
  const res = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
    method:  "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body:    "null",
  });
  const d = await res.json() as { email?: string; name?: { display_name?: string }; account_id?: string };
  return { email: d.email ?? "", name: d.name?.display_name ?? "", id: d.account_id ?? "" };
}

async function fetchOnedriveProfile(accessToken: string): Promise<{ email: string; name: string; id: string }> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const d = await res.json() as { mail?: string; displayName?: string; id?: string };
  return { email: d.mail ?? "", name: d.displayName ?? "", id: d.id ?? "" };
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sb          = createServerSupabase(cookieStore);

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.redirect(`${REDIRECT_BASE}/login`);
  }

  const searchParams = req.nextUrl.searchParams;
  const provider     = searchParams.get("provider") as Provider | null;
  const code         = searchParams.get("code");
  const state        = searchParams.get("state");
  const error        = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${REDIRECT_BASE}/vault?error=access_denied`);
  }
  if (!provider || !code || !state) {
    return NextResponse.redirect(`${REDIRECT_BASE}/vault?error=invalid_callback`);
  }

  // ── Verify CSRF state cookie ──────────────────────────────────────
  const storedState = req.cookies.get("vault_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${REDIRECT_BASE}/vault?error=state_mismatch`);
  }

  try {
    const stateData = JSON.parse(
      Buffer.from(state, "base64url").toString()
    ) as { userId: string; provider: string };

    if (stateData.userId !== user.id || stateData.provider !== provider) {
      return NextResponse.redirect(`${REDIRECT_BASE}/vault?error=state_mismatch`);
    }
  } catch {
    return NextResponse.redirect(`${REDIRECT_BASE}/vault?error=invalid_state`);
  }

  // ── Load user's OAuth app credentials (BYOA) ─────────────────────
  const creds = await getUserCreds(sb, user.id, provider);
  if (!creds) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/vault?error=not_configured&provider=${provider}`
    );
  }

  try {
    let tokens:  TokenResponse;
    let profile: { email: string; name: string; id: string };

    if (provider === "google_drive") {
      tokens  = await exchangeGoogleCode(code, creds);
      profile = await fetchGoogleProfile(tokens.access_token);
    } else if (provider === "dropbox") {
      tokens  = await exchangeDropboxCode(code, creds);
      profile = await fetchDropboxProfile(tokens.access_token);
    } else {
      tokens  = await exchangeOnedriveCode(code, creds);
      profile = await fetchOnedriveProfile(tokens.access_token);
    }

    const tokenExpiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert connection row (one per user per provider)
    const { error: upsertErr } = await sb
      .from("vault_cloud_connections")
      .upsert({
        user_id:       user.id,
        provider,
        status:        "connected",
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry:  tokenExpiry,
        account_email: profile.email,
        account_name:  profile.name,
        account_id:    profile.id,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "user_id,provider" });

    if (upsertErr) {
      console.error("Vault cloud connection upsert error:", upsertErr);
      return NextResponse.redirect(`${REDIRECT_BASE}/vault?error=save_failed`);
    }

    // Mark credentials as validated (first successful round-trip)
    await markCredsValidated(sb, user.id, provider);

    const response = NextResponse.redirect(`${REDIRECT_BASE}/vault?connected=${provider}`);
    response.cookies.delete("vault_oauth_state");
    return response;
  } catch (err) {
    console.error("Vault OAuth callback error:", err);
    return NextResponse.redirect(`${REDIRECT_BASE}/vault?error=token_exchange_failed`);
  }
}
