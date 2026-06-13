/**
 * GET /api/vault/docs
 * Returns all vault documents for the authenticated user,
 * ordered by created_at DESC.
 * Also returns connected cloud providers (status only — no tokens).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sb = createServerSupabase(cookieStore);

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [docsRes, connectionsRes] = await Promise.all([
      sb
        .from("vault_documents")
        .select("id,type,title,company,year,file_name,file_size,mime_type,verified,ai_summary,tags,shared_token,source,cloud_file_url,created_at,updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      sb
        .from("vault_cloud_connections")
        .select("provider,status,account_email,account_name,last_synced,files_imported")
        .eq("user_id", user.id),
    ]);

    if (docsRes.error) {
      console.error("Vault docs fetch error:", docsRes.error);
      return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
    }

    return NextResponse.json({
      docs: docsRes.data ?? [],
      connections: connectionsRes.data ?? [],
    });
  } catch (err) {
    console.error("Vault docs unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
