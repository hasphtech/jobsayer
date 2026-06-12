import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

/**
 * POST /api/webhooks/impact
 *
 * impact.com conversion postback — fires when a user completes a purchase
 * through one of your affiliate links.
 *
 * Configure the postback URL in impact.com:
 *   Settings → Postback URLs → Add URL → https://jobsayer.com/api/webhooks/impact
 *
 * impact.com sends form-encoded POST with these standard fields (among others):
 *   ActionId, CampaignId, ActionDate, Payout, Currency, OrderId, Sku, SubId1
 */
export async function POST(req: NextRequest) {
  try {
    // impact.com sends application/x-www-form-urlencoded
    let data: Record<string, string> = {};

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      data = await req.json();
    } else {
      // form-encoded
      const text = await req.text();
      for (const [k, v] of new URLSearchParams(text)) {
        data[k] = v;
      }
    }

    const actionId   = data.ActionId   ?? data.action_id   ?? "";
    const campaignId = data.CampaignId ?? data.campaign_id ?? "";
    const actionDate = data.ActionDate ?? data.action_date ?? new Date().toISOString();
    const payout     = parseFloat(data.Payout ?? data.payout ?? "0");
    const currency   = data.Currency   ?? data.currency     ?? "USD";
    const orderId    = data.OrderId    ?? data.order_id     ?? null;
    const sku        = data.Sku        ?? data.sku          ?? null;
    const subId1     = data.SubId1     ?? data.sub_id1      ?? null; // course ID we passed
    const status     = data.Status     ?? data.status       ?? "PENDING";

    // Determine brand from campaign ID
    const udemyCampaign    = process.env.IMPACT_UDEMY_CAMPAIGN_ID;
    const courseraCampaign = process.env.IMPACT_COURSERA_CAMPAIGN_ID;
    const brand =
      campaignId === udemyCampaign    ? "udemy"    :
      campaignId === courseraCampaign ? "coursera" : "other";

    const supabase = getServiceSupabase();
    const { error } = await supabase.from("affiliate_conversions").insert({
      action_id:   actionId,
      campaign_id: campaignId,
      brand,
      action_date: actionDate,
      payout,
      currency,
      order_id:    orderId,
      sku,
      course_id:   subId1,
      status,
      raw_payload: data,
    });

    if (error) {
      console.error("[impact webhook] DB insert error:", error);
      // Still return 200 so impact.com doesn't retry
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[impact webhook] Error:", err);
    // Return 200 to prevent impact.com from spamming retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
