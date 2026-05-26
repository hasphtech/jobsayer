/**
 * jobSayer Score Engine
 * Scores a resume across 4 dimensions (25 pts each = 100 total):
 *   1. ATS Compatibility   — section headings, format signals
 *   2. Keyword Strength    — tech skills breadth & relevance
 *   3. Experience Clarity  — quantified bullets, completeness
 *   4. Impact Statements   — strong action verbs vs weak filler
 */

import type { ResumeData } from "./types";

/* ── Types ────────────────────────────────────────────────────── */
export interface ScoreDimension {
  label: string;
  icon: string;
  score: number;       // 0–25
  max: number;         // always 25
  pct: number;         // 0–100
  status: "green" | "amber" | "red";
  hint: string;
}

export interface ScoreImprovement {
  severity: "critical" | "warning" | "suggestion";
  title: string;
  detail: string;
  points: number;      // potential gain
  fixRoute: "builder" | "skills";
}

export interface ScoreResult {
  total: number;       // 0–100
  dimensions: ScoreDimension[];
  improvements: ScoreImprovement[];
  matchedSkills: string[];
  missingSkills: string[];
  percentile: number;  // estimated top-X%
}

/* ── Constants ────────────────────────────────────────────────── */

const ATS_SECTIONS = ["experience", "education", "skills", "summary", "objective"];

const STRONG_VERBS = [
  "built","developed","designed","led","launched","delivered","reduced","increased",
  "improved","architected","implemented","automated","optimised","optimized","scaled",
  "created","engineered","deployed","integrated","migrated","refactored","mentored",
  "collaborated","owned","drove","spearheaded","achieved","boosted","accelerated",
];

const WEAK_VERBS = [
  "worked","helped","assisted","handled","did","used","was responsible",
  "involved","participated","supported","made","tried",
];

// Common Indian tech market skills
const MARKET_SKILLS: string[] = [
  "react","node.js","typescript","javascript","python","java","go","postgresql",
  "mysql","mongodb","redis","aws","docker","kubernetes","git","rest api","graphql",
  "system design","ci/cd","tailwind","next.js","express","django","fastapi",
  "microservices","linux","agile","scrum","sql","html","css","webpack","terraform",
];

/* ── Helpers ──────────────────────────────────────────────────── */
function norm(s: string) { return s.toLowerCase(); }

function countMetrics(text: string): number {
  // Matches numbers like "40%", "₹4.2Cr", "200K", "3x", "12 months"
  const matches = text.match(/\d+[\.,]?\d*\s*(%|cr|lpa|l|k|x|ms|s|hrs?|days?|months?|years?|users?|requests?)/gi);
  return matches ? matches.length : 0;
}

function extractSkills(data: ResumeData): Set<string> {
  const text = [
    data.skills ?? "",
    ...(data.work ?? []).map(w => w.desc ?? ""),
    ...(data.projects ?? []).map(p => p.desc ?? ""),
  ].join(" ").toLowerCase();

  return new Set(MARKET_SKILLS.filter(sk => text.includes(norm(sk))));
}

function scoreAtsSafety(data: ResumeData): ScoreDimension {
  let pts = 25;
  const issues: string[] = [];

  // Check for standard section labels in summary/work desc text
  const allText = [data.summary, ...(data.work ?? []).map(w => w.role)].join(" ").toLowerCase();
  const hasName   = (data.name ?? "").trim().length > 2;
  const hasEmail  = (data.email ?? "").includes("@");
  const hasPhone  = (data.phone ?? "").length > 6;
  const hasWork   = (data.work ?? []).filter(w => w.company).length >= 1;
  const hasEdu    = (data.edu  ?? []).filter(e => e.school).length >= 1;
  const hasSkills = (data.skills ?? "").trim().length > 10;
  const hasSummary = (data.summary ?? "").trim().length > 30;

  if (!hasName)    { pts -= 5; issues.push("missing name"); }
  if (!hasEmail)   { pts -= 3; issues.push("missing email"); }
  if (!hasPhone)   { pts -= 2; issues.push("missing phone"); }
  if (!hasWork)    { pts -= 5; issues.push("no work experience"); }
  if (!hasEdu)     { pts -= 4; issues.push("no education"); }
  if (!hasSkills)  { pts -= 4; issues.push("no skills section"); }
  if (!hasSummary) { pts -= 2; issues.push("no summary"); }

  const finalPts = Math.max(0, pts);
  const hint = issues.length === 0
    ? "All standard sections present — good ATS compatibility."
    : `Missing or incomplete: ${issues.slice(0, 2).join(", ")}.`;

  return {
    label: "ATS Compatibility", icon: "📋",
    score: finalPts, max: 25, pct: Math.round((finalPts / 25) * 100),
    status: finalPts >= 20 ? "green" : finalPts >= 13 ? "amber" : "red",
    hint,
  };
}

function scoreKeywords(data: ResumeData): { dim: ScoreDimension; matched: string[]; missing: string[] } {
  const found = extractSkills(data);
  const matched = MARKET_SKILLS.filter(s => found.has(s));
  const missing = MARKET_SKILLS.filter(s => !found.has(s)).slice(0, 8);

  // Score based on breadth: 10+ skills = full marks, scaled below
  const raw = Math.min(matched.length, 14);
  const pts = Math.round((raw / 14) * 25);

  const hint = matched.length >= 10
    ? `Strong skill coverage — ${matched.length} relevant technologies detected.`
    : `Only ${matched.length} market-relevant skills found. Add more to improve visibility.`;

  return {
    dim: {
      label: "Keyword Strength", icon: "🎯",
      score: pts, max: 25, pct: Math.round((pts / 25) * 100),
      status: pts >= 20 ? "green" : pts >= 13 ? "amber" : "red",
      hint,
    },
    matched,
    missing,
  };
}

function scoreClarity(data: ResumeData): ScoreDimension {
  const entries = (data.work ?? []).filter(w => w.company && w.role);
  if (entries.length === 0) {
    return {
      label: "Experience Clarity", icon: "📝",
      score: 0, max: 25, pct: 0, status: "red",
      hint: "No work experience entries found.",
    };
  }

  let pts = 25;
  let totalBullets = 0;
  let bulletsWithMetrics = 0;

  for (const w of entries) {
    const lines = (w.desc ?? "").split("\n").filter(l => l.trim());
    totalBullets += lines.length;
    bulletsWithMetrics += lines.filter(l => countMetrics(l) > 0).length;

    if (!w.from) pts -= 2;
    if (lines.length < 2) pts -= 3;
  }

  // Reward quantified bullets: 50%+ bullets with metrics = full pts for this factor
  const metricRatio = totalBullets > 0 ? bulletsWithMetrics / totalBullets : 0;
  if (metricRatio < 0.2)  pts -= 6;
  else if (metricRatio < 0.4) pts -= 3;

  const finalPts = Math.max(0, Math.min(25, pts));
  const hint = metricRatio >= 0.4
    ? "Good use of quantified results in your experience."
    : `Only ${Math.round(metricRatio * 100)}% of bullets have numbers/metrics. Add impact data.`;

  return {
    label: "Experience Clarity", icon: "📝",
    score: finalPts, max: 25, pct: Math.round((finalPts / 25) * 100),
    status: finalPts >= 20 ? "green" : finalPts >= 13 ? "amber" : "red",
    hint,
  };
}

function scoreImpact(data: ResumeData): ScoreDimension {
  const allBullets = (data.work ?? [])
    .flatMap(w => (w.desc ?? "").split("\n"))
    .map(l => l.trim().toLowerCase())
    .filter(Boolean);

  if (allBullets.length === 0) {
    return {
      label: "Impact Statements", icon: "✨",
      score: 0, max: 25, pct: 0, status: "red",
      hint: "No experience bullets to analyse.",
    };
  }

  let strongCount = 0;
  let weakCount = 0;

  for (const bullet of allBullets) {
    if (STRONG_VERBS.some(v => bullet.startsWith(v) || bullet.startsWith(`• ${v}`))) strongCount++;
    if (WEAK_VERBS.some(v => bullet.includes(v))) weakCount++;
  }

  const strongRatio = strongCount / allBullets.length;
  const weakRatio   = weakCount   / allBullets.length;

  let pts = 25;
  if (strongRatio < 0.3) pts -= 8;
  else if (strongRatio < 0.5) pts -= 4;
  if (weakRatio > 0.3) pts -= 6;
  else if (weakRatio > 0.15) pts -= 3;

  const finalPts = Math.max(0, Math.min(25, pts));
  const hint = weakCount === 0 && strongRatio >= 0.5
    ? "Strong action verbs throughout — great impact language."
    : weakCount > 0
    ? `${weakCount} weak phrase${weakCount > 1 ? "s" : ""} detected (e.g. "worked on", "helped with"). Use stronger action verbs.`
    : "Add stronger action verbs to your bullets for more impact.";

  return {
    label: "Impact Statements", icon: "✨",
    score: finalPts, max: 25, pct: Math.round((finalPts / 25) * 100),
    status: finalPts >= 20 ? "green" : finalPts >= 13 ? "amber" : "red",
    hint,
  };
}

function buildImprovements(
  dims: ScoreDimension[],
  data: ResumeData,
  missing: string[]
): ScoreImprovement[] {
  const list: ScoreImprovement[] = [];

  // ATS issues
  if (!(data.summary ?? "").trim()) {
    list.push({
      severity: "critical",
      title: "Add a professional summary",
      detail: "A 2–3 sentence summary dramatically improves ATS ranking and gives recruiters instant context.",
      points: 6, fixRoute: "builder",
    });
  }
  if (!(data.skills ?? "").trim()) {
    list.push({
      severity: "critical",
      title: "Skills section is empty",
      detail: "Add your technical and soft skills. This is the single most scanned section by ATS systems.",
      points: 8, fixRoute: "builder",
    });
  }

  // Clarity — check for metrics
  const allBullets = (data.work ?? []).flatMap(w => (w.desc ?? "").split("\n")).filter(Boolean);
  const withMetrics = allBullets.filter(l => countMetrics(l) > 0).length;
  if (allBullets.length > 0 && withMetrics / allBullets.length < 0.3) {
    list.push({
      severity: "critical",
      title: "Add numbers and metrics to experience bullets",
      detail: `${allBullets.length - withMetrics} of your ${allBullets.length} bullets lack measurable results. Add percentages, amounts, or scale (e.g. "reduced load time by 40%").`,
      points: 6, fixRoute: "builder",
    });
  }

  // Weak verbs
  const weakFound = allBullets.filter(b =>
    WEAK_VERBS.some(v => b.toLowerCase().includes(v))
  );
  if (weakFound.length > 0) {
    list.push({
      severity: "warning",
      title: `Replace ${weakFound.length} weak action verb${weakFound.length > 1 ? "s" : ""}`,
      detail: `Phrases like "worked on", "helped with", "was responsible for" reduce impact. Use "Built", "Led", "Delivered" instead.`,
      points: 4, fixRoute: "builder",
    });
  }

  // Missing skills
  if (missing.length > 0) {
    list.push({
      severity: "warning",
      title: `Add missing in-demand skills: ${missing.slice(0, 3).join(", ")}`,
      detail: `These skills appear in 60–80% of ${data.title || "developer"} job descriptions in India. Add them if you have the experience.`,
      points: 3, fixRoute: "skills",
    });
  }

  // Projects
  if ((data.projects ?? []).length === 0) {
    list.push({
      severity: "suggestion",
      title: "Add at least one project",
      detail: "Projects demonstrate initiative and are heavily weighted for candidates with <5 years experience.",
      points: 2, fixRoute: "builder",
    });
  }

  return list.slice(0, 5);
}

/* ── Main export ──────────────────────────────────────────────── */
export function computeScore(data: ResumeData): ScoreResult {
  const ats     = scoreAtsSafety(data);
  const { dim: kw, matched, missing } = scoreKeywords(data);
  const clarity = scoreClarity(data);
  const impact  = scoreImpact(data);

  const dims = [ats, kw, clarity, impact];
  const total = dims.reduce((s, d) => s + d.score, 0);

  // Rough percentile estimate based on score
  const percentile =
    total >= 85 ? 10 :
    total >= 75 ? 20 :
    total >= 65 ? 35 :
    total >= 55 ? 50 :
    total >= 45 ? 65 : 80;

  const improvements = buildImprovements(dims, data, missing);

  return { total, dimensions: dims, improvements, matchedSkills: matched, missingSkills: missing, percentile };
}
