/**
 * BGV Automated Check Engine — jobSayer
 *
 * Runs logical / format checks on candidate BGV data immediately
 * on submission. Results are stored as JSONB in candidate_bgv.auto_check_results
 * and surfaced to admins for final manual approval.
 *
 * Checks performed (no paid APIs required):
 *   Identity   — PAN format, entity type, Aadhaar presence, DOB/age, full name
 *   Education  — year plausibility, known institution pattern, completeness
 *   Employment — date ordering, future-date guard, gap detection, reference email
 *   Completeness — overall profile fill %
 */

import { validatePAN } from "./bgvUtils";

/* ── Types ──────────────────────────────────────────────────── */

export type CheckStatus = "pass" | "fail" | "warn" | "skip";
export type CheckCategory = "identity" | "education" | "employment" | "completeness";

export interface AutoCheckResult {
  category: CheckCategory;
  check: string;
  status: CheckStatus;
  detail: string;
}

export interface AutoCheckSummary {
  checks: AutoCheckResult[];
  autoScore: number;          // 0–100 preliminary score
  idAutoVerified: boolean;    // can be auto-approved
  eduAutoVerified: boolean;   // can be auto-approved
  empAutoVerified: boolean;   // always false — needs manual reference check
  requiresManualReview: string[]; // specific items needing human eyes
  runAt: string;              // ISO timestamp
}

interface EduEntry {
  degree: string;
  institution: string;
  year: string;
  result: string;
}

interface EmpEntry {
  company: string;
  role: string;
  from_date: string;
  to_date: string;
  manager_name: string;
  manager_email: string;
}

/* ── Known institution keywords (Indian universities / institutes) ── */
const UNI_KEYWORDS = [
  "university", "univeristy", "institute", "institution", "college",
  "iit", "nit", "bits", "iim", "iiser", "iiit", "aiims",
  "anna", "mumbai", "delhi", "bangalore", "bengaluru", "calcutta", "madras",
  "vtu", "pune", "osmania", "andhra", "kerala", "jadavpur",
  "amity", "manipal", "vellore", "vit", "srm", "sastra",
  "tamilnadu", "gujarat", "rajasthan", "jnu", "du ", " du", "bhu",
  "engineering", "technology", "science", "management", "commerce",
  "polytechnic", "school of", "faculty of", "academy",
];

function isKnownInstitution(name: string): boolean {
  const lower = name.toLowerCase();
  return UNI_KEYWORDS.some(k => lower.includes(k));
}

/* ── Date helpers ────────────────────────────────────────────── */
function parseYearMonth(ym: string): Date | null {
  if (!ym) return null;
  const parts = ym.split("-").map(Number);
  const year  = parts[0];
  const month = parts[1] ?? 1;
  if (!year || isNaN(year)) return null;
  return new Date(year, month - 1, 1);
}

/* ═══════════════════════════════════════════════════════════════
   Main auto-check function
══════════════════════════════════════════════════════════════════ */
export function runCandidateBgvAutoChecks(record: {
  full_name: string;
  dob?: string | null;
  pan_number?: string | null;
  aadhaar_last4?: string | null;
  education: EduEntry[];
  employment: EmpEntry[];
}): AutoCheckSummary {
  const checks: AutoCheckResult[] = [];
  const requiresManualReview: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  /* ── 1. Identity checks ────────────────────────────────────── */

  // Full name
  const nameParts = (record.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) {
    checks.push({ category: "identity", check: "Full Name", status: "warn",
      detail: "Single-word name — verify full legal name matches government ID" });
    requiresManualReview.push("Verify full legal name");
  } else {
    checks.push({ category: "identity", check: "Full Name", status: "pass",
      detail: record.full_name.trim() });
  }

  // PAN
  if (record.pan_number) {
    const pr = validatePAN(record.pan_number);
    if (pr.valid) {
      const individualEntity = pr.entityType === "Individual";
      checks.push({
        category: "identity", check: "PAN Format & Type",
        status: individualEntity ? "pass" : "warn",
        detail: `Valid PAN · Entity: ${pr.entityType}${!individualEntity ? " — expected Individual" : ""}`,
      });
      if (!individualEntity) requiresManualReview.push(`PAN entity type is "${pr.entityType}" — expected Individual`);
    } else {
      checks.push({ category: "identity", check: "PAN Format & Type",
        status: "fail", detail: pr.error ?? "Invalid PAN" });
      requiresManualReview.push("PAN format is invalid — collect correct PAN");
    }
  } else {
    checks.push({ category: "identity", check: "PAN Format & Type",
      status: "warn", detail: "PAN not provided — manual identity verification required" });
    requiresManualReview.push("PAN not provided — request from candidate");
  }

  // Aadhaar last 4
  if (record.aadhaar_last4 && /^\d{4}$/.test(record.aadhaar_last4)) {
    checks.push({ category: "identity", check: "Aadhaar (last 4)",
      status: "pass", detail: `Provided: XXXX XXXX XXXX ${record.aadhaar_last4}` });
  } else {
    checks.push({ category: "identity", check: "Aadhaar (last 4)",
      status: "warn", detail: "Aadhaar not provided — request for cross-verification" });
  }

  // DOB / Age
  if (record.dob) {
    const dob = new Date(record.dob);
    if (isNaN(dob.getTime())) {
      checks.push({ category: "identity", check: "Date of Birth", status: "fail",
        detail: "Invalid date format" });
    } else {
      const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 18) {
        checks.push({ category: "identity", check: "Date of Birth", status: "fail",
          detail: `Candidate appears under 18 (DOB: ${record.dob}) — verify` });
        requiresManualReview.push("Age appears under 18 — verify DOB");
      } else if (ageYears > 65) {
        checks.push({ category: "identity", check: "Date of Birth", status: "warn",
          detail: `Age: ~${Math.floor(ageYears)} years — please verify` });
      } else {
        checks.push({ category: "identity", check: "Date of Birth", status: "pass",
          detail: `Age: ${Math.floor(ageYears)} years (DOB: ${record.dob})` });
      }
    }
  } else {
    checks.push({ category: "identity", check: "Date of Birth", status: "skip",
      detail: "DOB not provided" });
  }

  /* ── 2. Education checks ───────────────────────────────────── */

  if (!record.education?.length) {
    checks.push({ category: "education", check: "Education Records", status: "warn",
      detail: "No education records submitted" });
    requiresManualReview.push("No education records — request from candidate");
  } else {
    record.education.forEach((ed, i) => {
      const lbl = `Edu ${i + 1}`;

      // Degree
      if (!ed.degree?.trim()) {
        checks.push({ category: "education", check: `${lbl}: Degree`, status: "fail",
          detail: "Degree not specified" });
      } else {
        checks.push({ category: "education", check: `${lbl}: Degree`, status: "pass",
          detail: ed.degree.trim() });
      }

      // Institution
      if (!ed.institution?.trim()) {
        checks.push({ category: "education", check: `${lbl}: Institution`, status: "fail",
          detail: "Institution not specified" });
      } else if (isKnownInstitution(ed.institution)) {
        checks.push({ category: "education", check: `${lbl}: Institution`, status: "pass",
          detail: `${ed.institution} — matches known institution pattern` });
      } else {
        checks.push({ category: "education", check: `${lbl}: Institution`, status: "warn",
          detail: `${ed.institution} — unrecognised pattern, verify manually` });
        requiresManualReview.push(`Verify institution: "${ed.institution}"`);
      }

      // Year
      const yr = parseInt(ed.year ?? "");
      if (!ed.year || isNaN(yr)) {
        checks.push({ category: "education", check: `${lbl}: Year`, status: "skip",
          detail: "Year not provided" });
      } else if (yr < 1970 || yr > currentYear) {
        checks.push({ category: "education", check: `${lbl}: Year`, status: "fail",
          detail: `Year ${yr} is outside plausible range (1970–${currentYear})` });
        requiresManualReview.push(`Education year ${yr} is out of range`);
      } else {
        checks.push({ category: "education", check: `${lbl}: Year`, status: "pass",
          detail: `Passed: ${yr}` });
      }
    });
  }

  /* ── 3. Employment checks ──────────────────────────────────── */

  if (!record.employment?.length) {
    checks.push({ category: "employment", check: "Employment Records", status: "warn",
      detail: "No employment records submitted" });
    requiresManualReview.push("No employment records — may be fresher or records missing");
  } else {
    // Sort by from_date descending (most recent first) for gap detection
    const sorted = [...record.employment].sort((a, b) => {
      const ad = parseYearMonth(a.from_date);
      const bd = parseYearMonth(b.from_date);
      return (bd?.getTime() ?? 0) - (ad?.getTime() ?? 0);
    });

    let prevFromDate: Date | null = null;

    sorted.forEach((em, i) => {
      const lbl = `Emp ${i + 1} (${em.company || "?"})`;

      // Company & Role presence
      if (!em.company?.trim()) {
        checks.push({ category: "employment", check: `${lbl}: Company`, status: "fail",
          detail: "Company name not specified" });
      } else {
        checks.push({ category: "employment", check: `${lbl}: Company`, status: "pass",
          detail: em.company.trim() });
      }

      // Date consistency
      const fromDate    = parseYearMonth(em.from_date);
      const toDate      = em.to_date ? parseYearMonth(em.to_date) : null;
      const effectiveEnd = toDate ?? now;

      if (!fromDate) {
        checks.push({ category: "employment", check: `${lbl}: Dates`, status: "skip",
          detail: "Start date not provided" });
      } else if (fromDate > now) {
        checks.push({ category: "employment", check: `${lbl}: Dates`, status: "fail",
          detail: "Start date is in the future" });
        requiresManualReview.push(`${em.company}: start date is in the future`);
      } else if (toDate && toDate < fromDate) {
        checks.push({ category: "employment", check: `${lbl}: Dates`, status: "fail",
          detail: "End date is before start date" });
        requiresManualReview.push(`${em.company}: end date before start date`);
      } else if (toDate && toDate > now) {
        checks.push({ category: "employment", check: `${lbl}: Dates`, status: "fail",
          detail: "End date is in the future (use blank for current role)" });
        requiresManualReview.push(`${em.company}: end date is in the future`);
      } else {
        const months = Math.round(
          (effectiveEnd.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        checks.push({ category: "employment", check: `${lbl}: Dates`, status: "pass",
          detail: `${months} months · ${em.from_date} → ${em.to_date || "Present"}` });

        // Employment gap check (against previous role's start date in sorted desc order)
        if (i > 0 && prevFromDate) {
          const gapMonths = Math.round(
            (prevFromDate.getTime() - effectiveEnd.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
          if (gapMonths > 12) {
            checks.push({ category: "employment", check: `${lbl}: Gap`, status: "warn",
              detail: `~${gapMonths} month gap before next role — ask candidate to explain` });
            requiresManualReview.push(`Unexplained employment gap (~${gapMonths} months) before ${sorted[i - 1].company}`);
          } else if (gapMonths > 0) {
            checks.push({ category: "employment", check: `${lbl}: Gap`, status: "pass",
              detail: `${gapMonths} month gap — within acceptable range` });
          }
        }
      }

      prevFromDate = fromDate;

      // Reference email
      if (em.manager_email?.includes("@") && em.manager_email.includes(".")) {
        checks.push({ category: "employment", check: `${lbl}: Reference Email`, status: "pass",
          detail: `Reference: ${em.manager_name || "—"} <${em.manager_email}>` });
      } else {
        checks.push({ category: "employment", check: `${lbl}: Reference Email`, status: "warn",
          detail: `No valid reference email — manual reference check needed for ${em.company}` });
        requiresManualReview.push(`Collect reference contact for ${em.company}`);
      }
    });
  }

  /* ── 4. Completeness score ─────────────────────────────────── */

  const completenessFlags = [
    { label: "Full Name",        done: nameParts.length >= 2 },
    { label: "DOB",              done: !!record.dob },
    { label: "PAN",              done: !!record.pan_number },
    { label: "Aadhaar last 4",   done: !!record.aadhaar_last4 },
    { label: "Education",        done: (record.education?.length ?? 0) > 0 },
    { label: "Employment",       done: (record.employment?.length ?? 0) > 0 },
    { label: "Reference emails", done: record.employment?.some(e => e.manager_email?.includes("@")) ?? false },
  ];
  const completePct = Math.round(
    (completenessFlags.filter(f => f.done).length / completenessFlags.length) * 100
  );
  const missing = completenessFlags.filter(f => !f.done).map(f => f.label);
  checks.push({
    category: "completeness",
    check: "Profile Completeness",
    status: completePct >= 71 ? "pass" : completePct >= 43 ? "warn" : "fail",
    detail: `${completePct}% complete · ${completenessFlags.filter(f => f.done).length}/${completenessFlags.length} fields${missing.length ? ` · Missing: ${missing.join(", ")}` : ""}`,
  });

  /* ── 5. Determine auto-verification flags ──────────────────── */

  const idChecks  = checks.filter(c => c.category === "identity");
  const eduChecks = checks.filter(c => c.category === "education");

  // Identity: auto-verified if no failures and at least PAN or Aadhaar present
  const idAutoVerified =
    idChecks.every(c => c.status !== "fail") &&
    idChecks.some(c => c.check.includes("PAN") && c.status === "pass");

  // Education: auto-verified if no failures and all institutions recognised
  const eduAutoVerified =
    eduChecks.length > 0 &&
    eduChecks.every(c => c.status !== "fail") &&
    !eduChecks.some(c => c.check.includes("Institution") && c.status === "warn");

  // Employment: ALWAYS requires manual reference confirmation
  const empAutoVerified = false;

  /* ── 6. Compute preliminary score ─────────────────────────── */

  const scoreable = checks.filter(c => c.status !== "skip");
  const passed    = scoreable.filter(c => c.status === "pass").length;
  const warned    = scoreable.filter(c => c.status === "warn").length;
  const total     = scoreable.length;

  // pass = full weight, warn = half weight
  const rawScore = total > 0
    ? Math.round(((passed + warned * 0.5) / total) * 100)
    : 0;

  // Bonus: completeness
  const completenessBonus = completePct >= 86 ? 5 : completePct >= 71 ? 3 : 0;
  const autoScore = Math.min(100, rawScore + completenessBonus);

  return {
    checks,
    autoScore,
    idAutoVerified,
    eduAutoVerified,
    empAutoVerified,
    requiresManualReview: [...new Set(requiresManualReview)],
    runAt: new Date().toISOString(),
  };
}
