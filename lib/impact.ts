/**
 * impact.com Publisher API client
 * Docs: https://developer.impact.com/default#
 *
 * Auth: HTTP Basic — AccountSID:AuthToken
 * Base: https://api.impact.com/Mediapartners/{AccountSID}/
 */

const BASE = "https://api.impact.com";
const SID  = process.env.IMPACT_ACCOUNT_SID!;
const TOKEN = process.env.IMPACT_AUTH_TOKEN!;
const MEDIA_PROPERTY_ID = process.env.IMPACT_MEDIA_PROPERTY_ID!;

// Campaign IDs — populated once brands approve
const CAMPAIGN_IDS: Record<string, string | undefined> = {
  udemy:    process.env.IMPACT_UDEMY_CAMPAIGN_ID,
  coursera: process.env.IMPACT_COURSERA_CAMPAIGN_ID,
};

function authHeader(): string {
  return "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
}

async function impactFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}/Mediapartners/${SID}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Accept":        "application/json",
      "Content-Type":  "application/json",
      "Authorization": authHeader(),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`impact.com API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/* ── Tracking Links ──────────────────────────────────────────────
 * Generate an affiliate tracking URL for a given course URL.
 * If the campaign is not yet approved, returns the original URL
 * so the page still works — tracking kicks in automatically once
 * the env var is populated.
 * ──────────────────────────────────────────────────────────────── */
export interface TrackingLinkResult {
  trackingUrl: string;
  tracked: boolean;   // false = campaign pending, direct URL returned
}

export async function generateTrackingLink(
  destinationUrl: string,
  brand: "udemy" | "coursera",
  subId?: string,       // optional sub-tracking label (e.g. course ID)
): Promise<TrackingLinkResult> {
  const campaignId = CAMPAIGN_IDS[brand];

  // Campaign not yet approved — return direct URL as fallback
  if (!campaignId) {
    return { trackingUrl: destinationUrl, tracked: false };
  }

  try {
    const body = JSON.stringify({
      CampaignId:      campaignId,
      MediaPropertyId: MEDIA_PROPERTY_ID,
      Uri:             destinationUrl,
      ...(subId ? { SubId1: subId } : {}),
    });

    const data = await impactFetch<{ Uri?: string; TrackingLink?: string }>(
      "/TrackingLinks",
      { method: "POST", body },
    );

    const url = data.TrackingLink ?? data.Uri ?? destinationUrl;
    return { trackingUrl: url, tracked: true };
  } catch {
    // On API error still return usable URL
    return { trackingUrl: destinationUrl, tracked: false };
  }
}

/* ── Ads ─────────────────────────────────────────────────────────
 * Fetch text/banner ads from a brand's campaign.
 * ──────────────────────────────────────────────────────────────── */
export interface ImpactAd {
  Id:          string;
  Name:        string;
  Type:        string;   // "TEXT_LINK" | "BANNER" | ...
  TrackingLink: string;
  Description?: string;
}

export async function getAds(brand: "udemy" | "coursera"): Promise<ImpactAd[]> {
  const campaignId = CAMPAIGN_IDS[brand];
  if (!campaignId) return [];

  const data = await impactFetch<{ Ads?: ImpactAd[] }>(
    `/Ads?CampaignId=${campaignId}&PageSize=50`,
  );
  return data.Ads ?? [];
}

/* ── Actions (Conversions) ───────────────────────────────────────
 * List conversion actions (purchases credited to your account).
 * ──────────────────────────────────────────────────────────────── */
export interface ImpactAction {
  Id:           string;
  CampaignId:   string;
  ActionDate:   string;
  Payout:       string;
  Currency:     string;
  Status:       string;
  Sku?:         string;
  ReferringUrl?: string;
}

export async function getActions(params?: {
  startDate?: string;  // ISO date
  endDate?:   string;
  pageSize?:  number;
}): Promise<ImpactAction[]> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set("StartDate",  params.startDate);
  if (params?.endDate)   qs.set("EndDate",    params.endDate);
  qs.set("PageSize", String(params?.pageSize ?? 100));

  const data = await impactFetch<{ Actions?: ImpactAction[] }>(
    `/Actions?${qs.toString()}`,
  );
  return data.Actions ?? [];
}

/* ── Reports ─────────────────────────────────────────────────────
 * Aggregate performance report: clicks, actions, payout.
 * ──────────────────────────────────────────────────────────────── */
export interface ImpactReport {
  CampaignName:  string;
  CampaignId:    string;
  Clicks:        number;
  Actions:       number;
  Payout:        number;
  Currency:      string;
  Epc:           number;
}

export async function getReport(params?: {
  startDate?: string;
  endDate?:   string;
}): Promise<ImpactReport[]> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set("StartDate", params.startDate);
  if (params?.endDate)   qs.set("EndDate",   params.endDate);
  qs.set("PageSize", "50");

  const data = await impactFetch<{ Reports?: ImpactReport[] }>(
    `/Reports/performance/campaigns?${qs.toString()}`,
  );
  return data.Reports ?? [];
}

/* ── Clicks ──────────────────────────────────────────────────────
 * Raw click log.
 * ──────────────────────────────────────────────────────────────── */
export interface ImpactClick {
  Id:          string;
  CampaignId:  string;
  ClickDate:   string;
  ReferrerUrl?: string;
  SubId1?:     string;
}

export async function getClicks(params?: {
  startDate?: string;
  endDate?:   string;
  pageSize?:  number;
}): Promise<ImpactClick[]> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set("StartDate", params.startDate);
  if (params?.endDate)   qs.set("EndDate",   params.endDate);
  qs.set("PageSize", String(params?.pageSize ?? 100));

  const data = await impactFetch<{ Clicks?: ImpactClick[] }>(
    `/Clicks?${qs.toString()}`,
  );
  return data.Clicks ?? [];
}
