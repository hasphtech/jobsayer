/**
 * /api/cron/sync-affiliate — Hourly affiliate conversion sync
 *
 * Pulls new Actions (conversions) from impact.com API and upserts
 * them into the affiliate_conversions Supabase table.
 *
 * Runs every hour via Vercel cron.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { getActions } from "@/lib/impact";
import { getServiceSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch last 2 hours of actions to catch any delayed postings
  const endDate   = new Date();
  const startDate = new Date(endDate.getTime() - 2 * 60 * 60 * 1000);

  const isoStart = startDate.toISOString().split("T")[0];
  const isoEnd   = endDate.toISOString().split("T")[0];

  try {
    const actions = await getActions({ startDate: isoStart, endDate: isoEnd, pageSize: 100 });

    if (actions.length === 0) {
      return NextResponse.json({ ok: true, synced: 0 });
    }

    const udemyCampaign    = process.env.IMPACT_UDEMY_CAMPAIGN_ID;
    const courseraCampaign = process.env.IMPACT_COURSERA_CAMPAIGN_ID;

    const rows = actions.map(a => ({
      action_id:   a.Id,
      campaign_id: a.CampaignId,
      brand:
        a.CampaignId === udemyCampaign    ? "udemy"    :
        a.CampaignId === courseraCampaign ? "coursera" : "other",
      action_date: a.ActionDate,
      payout:      parseFloat(a.Payout ?? "0"),
      currency:    a.Currency ?? "USD",
      sku:         a.Sku ?? null,
      status:      a.Status ?? "PENDING",
      raw_payload: a,
    }));

    const supabase = getServiceSupabase();
    const { error, count } = await supabase
      .from("affiliate_conversions")
      .upsert(rows, { onConflict: "action_id", ignoreDuplicates: false })
      .select("id");

    if (error) {
      console.error("[sync-affiliate] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[sync-affiliate] Synced ${count ?? rows.length} conversions`);
    return NextResponse.json({ ok: true, synced: count ?? rows.length });
  } catch (err) {
    console.error("[sync-affiliate] impact.com API error:", err);
    // Don't fail hard — campaigns may not be approved yet
    return NextResponse.json({ ok: true, synced: 0, note: "No data yet" });
  }
}
