/**
 * BGV & Company Verification utilities
 *
 * ── GSTIN format ─────────────────────────────────────────────────────────────
 *  2-digit state code + 10-char PAN + 1 entity number + 1 letter (Z) + 1 checksum
 *  Example: 29ABCDE1234F1Z5
 *
 * ── CIN format ───────────────────────────────────────────────────────────────
 *  L/U + 5-digit NIC + 2-char state + 4-digit year + company type + 6 digits
 *  Example: L17110MH1973PLC019786
 *
 * ── PAN format ───────────────────────────────────────────────────────────────
 *  5 letters + 4 digits + 1 letter
 *  Example: ABCDE1234F
 */

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const CIN_REGEX   = /^([LUu]{1})([0-9]{5})([A-Z]{2})([0-9]{4})([A-Z]{3})([0-9]{6})$/;
export const PAN_REGEX   = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function validateGSTIN(gstin: string): { valid: boolean; error?: string; stateCode?: string; pan?: string } {
  const g = gstin.trim().toUpperCase();
  if (!g) return { valid: false, error: "GSTIN is required" };
  if (g.length !== 15) return { valid: false, error: "GSTIN must be exactly 15 characters" };
  if (!GSTIN_REGEX.test(g)) return { valid: false, error: "Invalid GSTIN format" };

  const stateCode = parseInt(g.slice(0, 2));
  if (stateCode < 1 || stateCode > 38) return { valid: false, error: "Invalid state code in GSTIN" };

  return {
    valid: true,
    stateCode: g.slice(0, 2),
    pan: g.slice(2, 12),
  };
}

export function validateCIN(cin: string): { valid: boolean; error?: string; companyType?: string; state?: string; year?: string } {
  const c = cin.trim().toUpperCase();
  if (!c) return { valid: false, error: "CIN is required" };
  if (!CIN_REGEX.test(c)) return { valid: false, error: "Invalid CIN format (e.g. L17110MH1973PLC019786)" };

  const match = c.match(CIN_REGEX)!;
  return {
    valid: true,
    companyType: match[1] === "L" ? "Listed" : "Unlisted",
    state: match[3],
    year:  match[4],
  };
}

export function validatePAN(pan: string): { valid: boolean; error?: string; entityType?: string } {
  const p = pan.trim().toUpperCase();
  if (!p) return { valid: false, error: "PAN is required" };
  if (!PAN_REGEX.test(p)) return { valid: false, error: "Invalid PAN format (e.g. ABCDE1234F)" };

  // 4th character indicates entity type
  const entityMap: Record<string, string> = {
    P: "Individual", C: "Company", H: "HUF", F: "Firm",
    A: "AOP", T: "Trust", B: "BOI", L: "Local Authority",
    J: "Artificial Juridical Person", G: "Government",
  };
  const entityChar = p[3];
  return { valid: true, entityType: entityMap[entityChar] ?? "Unknown" };
}

export function gstinStateLabel(stateCode: string): string {
  const states: Record<string, string> = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh",      "05": "Uttarakhand",      "06": "Haryana",
    "07": "Delhi",           "08": "Rajasthan",         "09": "Uttar Pradesh",
    "10": "Bihar",           "11": "Sikkim",            "12": "Arunachal Pradesh",
    "13": "Nagaland",        "14": "Manipur",           "15": "Mizoram",
    "16": "Tripura",         "17": "Meghalaya",         "18": "Assam",
    "19": "West Bengal",     "20": "Jharkhand",         "21": "Odisha",
    "22": "Chhattisgarh",    "23": "Madhya Pradesh",    "24": "Gujarat",
    "25": "Daman & Diu",     "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "28": "Andhra Pradesh",  "29": "Karnataka",         "30": "Goa",
    "31": "Lakshadweep",     "32": "Kerala",            "33": "Tamil Nadu",
    "34": "Puducherry",      "35": "Andaman & Nicobar", "36": "Telangana",
    "37": "Andhra Pradesh (New)", "38": "Ladakh",
  };
  return states[stateCode] ?? stateCode;
}

/**
 * Live GSTIN verification via the GST portal.
 * Uses the public MCA / GST Suvidha approach.
 * Falls back to format-only validation if API is unavailable.
 */
export async function verifyGSTINLive(gstin: string): Promise<{
  found: boolean;
  tradeName?: string;
  legalName?: string;
  status?: string;
  registrationDate?: string;
  businessType?: string;
  error?: string;
}> {
  const fmt = validateGSTIN(gstin);
  if (!fmt.valid) return { found: false, error: fmt.error };

  try {
    // Use the public GST search API (no key required for search)
    const res = await fetch(
      `https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=${encodeURIComponent(gstin.toUpperCase())}`,
      { headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        found:            true,
        tradeName:        data.tradeNam    ?? "",
        legalName:        data.lgnm        ?? "",
        status:           data.sts         ?? "",
        registrationDate: data.rgdt        ?? "",
        businessType:     data.ctb         ?? "",
      };
    }
  } catch { /* fall through to format-only */ }

  // Fallback: format validated, mark as needs-manual-review
  return {
    found:  true,
    status: "format_valid_manual_review",
    error:  "Live API unavailable — format is valid. Admin will verify manually.",
  };
}

/**
 * MCA company lookup by CIN.
 * Official MCA21 portal doesn't have a free public REST API,
 * so we validate CIN format and return the MCA portal deep-link for admin review.
 */
export function mcaPortalLink(cin: string): string {
  return `https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do`;
}

export function mcaSearchLink(companyName: string): string {
  return `https://www.mca.gov.in/mcafoportal/showSearchResults.do?company=${encodeURIComponent(companyName)}`;
}

/** Compute BGV score from individual checks */
export function computeBgvScore(checks: {
  idVerified: boolean;
  eduVerified: boolean;
  empVerified: boolean;
  addressVerified: boolean;
}): number {
  let score = 0;
  if (checks.idVerified)      score += 35;
  if (checks.empVerified)     score += 30;
  if (checks.eduVerified)     score += 25;
  if (checks.addressVerified) score += 10;
  return score;
}

/** Compute company trust score */
export function computeCompanyTrustScore(checks: {
  mcaVerified: boolean;
  gstVerified: boolean;
  panVerified: boolean;
}): number {
  let score = 0;
  if (checks.mcaVerified) score += 50;
  if (checks.gstVerified) score += 35;
  if (checks.panVerified) score += 15;
  return score;
}
