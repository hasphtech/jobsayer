import { NextRequest, NextResponse } from "next/server";
import { getReport, getActions, getClicks } from "@/lib/impact";
import { getServiceSupabase } from "@/lib/supabase";

/**
 * GET /api/affiliate/report
 * Query params: startDate (ISO), endDate (ISO)
 * Returns: { campaigns, totalPayout, totalClicks, totalActions, recentConversions }
 * Admin-only — requires service role via internal header.
 */
export async function GET(req: NextRequest) {
  // Basic admin guard — check for internal secret header
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") ?? thirtyDaysAgo();
  const endDate   = searchParams.get("endDate")   ?? today();

  try {
    const [campaigns, actions, clicks, dbConversions] = await Promise.allSettled([
      getReport({ startDate, endDate }),
      getActions({ startDate, endDate, pageSize: 50 }),
      getClicks({ startDate, endDate, pageSize: 50 }),
      fetchDbConversions(startDate, endDate),
    ]);

    const campaignData = campaigns.status === "fulfilled" ? campaigns.value : [];
    const actionData   = actions.status   === "fulfilled" ? actions.value   : [];
    const clickData    = clicks.status    === "fulfilled" ? clicks.value    : [];
    const dbData       = dbConversions.status === "fulfilled" ? dbConversions.value : [];

    const totalPayout  = campaignData.reduce((s, r) => s + (r.Payout ?? 0), 0);
    const totalClicks  = campaignData.reduce((s, r) => s + (r.Clicks ?? 0), 0);
    const totalActions = campaignData.reduce((s, r) => s + (r.Actions ?? 0), 0);

    return NextResponse.json({
      period:    { startDate, endDate },
      summary: {
        totalPayout:  Math.round(totalPayout * 100) / 100,
        totalClicks,
        totalActions,
        epc: totalClicks > 0 ? Math.round((totalPayout / totalClicks) * 1000) / 1000 : 0,
      },
      campaigns:           campaignData,
      recentActions:       actionData.slice(0, 20),
      recentClicks:        clickData.slice(0, 20),
      dbConversions:       dbData,
    });
  } catch (err) {
    console.error("[affiliate/report]", err);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

async function fetchDbConversions(startDate: string, endDate: string) {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("affiliate_conversions")
    .select("*")
    .gte("action_date", startDate)
    .lte("action_date", endDate)
    .order("action_date", { ascending: false })
    .limit(50);
  return data ?? [];
}

function today() {
  return new Date().toISOString().split("T")[0];
}
function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}
