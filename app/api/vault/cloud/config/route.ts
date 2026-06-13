/**
 * /api/vault/cloud/config
 *
 * GET  ?provider=google_drive|dropbox|onedrive
 *      Returns saved config for that provider:
 *        { configured: true, client_id: "...", app_name: "...", validated: bool }
 *      client_secret is NEVER returned to the client.
 *
 * POST { provider, client_id, client_secret, app_name? }
 *      Encrypts client_secret with AES-256 (server key) and upserts the row.
 *      Returns { ok: true, provider }
 *
 * DELETE ?provider=...
 *      Removes config + disconnects any active OAuth connection for that provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ── Encryption helpers ────────────────────────────────────────────
// VAULT_ENCRYPT_KEY must be a 32-char (256-bit) hex string in env.
// If not set, falls back to a deterministic dev key — NOT for production.
const RAW_KEY = process.env.VAULT_ENCRYPT_KEY ?? "00000000000000000000000000000000";
const ENC_KEY = Buffer.from(RAW_KEY.slice(0, 64).padEnd(64, "0"), "hex"); // 32 bytes

const ALGO = "aes-256-cbc";

export function encryptSecret(plain: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  // Prefix with IV so we can decrypt later: iv(32 hex) + ":" + ciphertext(hex)
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptSecret(enc: string): string {
  const [ivHex, dataHex] = enc.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv(ALGO, ENC_KEY, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

type Provider = "google_drive" | "dropbox" | "onedrive";
const VALID_PROVIDERS: Provider[] = ["google_drive", "dropbox", "onedrive"];

// ── GET ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = req.nextUrl.searchParams.get("provider") as Provider | null;
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    // Return all configs if no provider specified
    const { data } = await sb
      .from("vault_provider_configs")
      .select("provider,client_id,app_name,validated,validated_at,updated_at")
      .eq("user_id", user.id);
    return NextResponse.json({ configs: data ?? [] });
  }

  const { data } = await sb
    .from("vault_provider_configs")
    .select("provider,client_id,app_name,validated,validated_at,updated_at")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle();

  if (!data) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, ...data });
}

// ── POST — save credentials ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    provider: string; client_id: string; client_secret: string; app_name?: string;
  };

  const { provider, client_id, client_secret, app_name } = body;

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!client_id?.trim()) return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  if (!client_secret?.trim()) return NextResponse.json({ error: "client_secret is required" }, { status: 400 });

  // Encrypt secret before storing
  let encrypted: string;
  try {
    encrypted = encryptSecret(client_secret.trim());
  } catch {
    return NextResponse.json({ error: "Encryption failed" }, { status: 500 });
  }

  const { error: upsertErr } = await sb
    .from("vault_provider_configs")
    .upsert({
      user_id:           user.id,
      provider,
      client_id:         client_id.trim(),
      client_secret_enc: encrypted,
      app_name:          app_name?.trim() || null,
      validated:         false,   // reset — re-validate on next OAuth round trip
      updated_at:        new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

  if (upsertErr) {
    console.error("vault config upsert error:", upsertErr);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }

  // If there was an active connection, mark it expired so user re-connects with new creds
  await sb
    .from("vault_cloud_connections")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("provider", provider);

  return NextResponse.json({ ok: true, provider });
}

// ── DELETE — remove config + disconnect ──────────────────────────
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = req.nextUrl.searchParams.get("provider") as Provider | null;
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await Promise.all([
    sb.from("vault_provider_configs").delete().eq("user_id", user.id).eq("provider", provider),
    sb.from("vault_cloud_connections").delete().eq("user_id", user.id).eq("provider", provider),
  ]);

  return NextResponse.json({ ok: true });
}
