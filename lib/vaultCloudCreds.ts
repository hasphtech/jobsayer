/**
 * vaultCloudCreds.ts
 *
 * Server-side helper: fetches and decrypts a user's cloud provider
 * OAuth credentials from vault_provider_configs.
 *
 * Usage (in any API route):
 *   const creds = await getUserCreds(sb, userId, "google_drive");
 *   if (!creds) return NextResponse.json({ error: "Google Drive not configured" }, { status: 412 });
 *   // creds.clientId, creds.clientSecret
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/app/api/vault/cloud/config/route";

export type CloudProvider = "google_drive" | "dropbox" | "onedrive";

export interface ProviderCreds {
  clientId:     string;
  clientSecret: string;
  appName?:     string;
}

/**
 * Returns decrypted credentials for a provider, or null if not configured.
 * Only call this SERVER-SIDE — never expose clientSecret to the browser.
 */
export async function getUserCreds(
  sb: SupabaseClient,
  userId: string,
  provider: CloudProvider,
): Promise<ProviderCreds | null> {
  const { data } = await sb
    .from("vault_provider_configs")
    .select("client_id,client_secret_enc,app_name")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (!data?.client_id || !data?.client_secret_enc) return null;

  let clientSecret: string;
  try {
    clientSecret = decryptSecret(data.client_secret_enc);
  } catch {
    console.error("vaultCloudCreds: decryption failed for", provider, userId);
    return null;
  }

  return {
    clientId:     data.client_id,
    clientSecret,
    appName:      data.app_name ?? undefined,
  };
}

/**
 * Marks credentials as validated after a successful OAuth round-trip.
 */
export async function markCredsValidated(
  sb: SupabaseClient,
  userId: string,
  provider: CloudProvider,
): Promise<void> {
  await sb
    .from("vault_provider_configs")
    .update({ validated: true, validated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);
}
