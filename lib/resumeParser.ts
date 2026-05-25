/**
 * Best-effort text extraction from uploaded resume files.
 *
 * Supported: .txt, .md, .docx (text layer), .pdf (text layer).
 * Parses:    name, contact info, summary, work history, education,
 *            skills, projects, certifications, awards, languages, location.
 */
import type {
  ResumeData, WorkEntry, EduEntry, ProjectEntry,
  CertEntry, AwardEntry, LanguageEntry,
} from "./types";

export interface ParseResult {
  fields: Partial<ResumeData>;
  rawText: string;
  confidence: "high" | "low";
  hint?: string;
}

/* ─────────────────────────────────────────────────────────────
   TEXT EXTRACTION
   ───────────────────────────────────────────────────────────── */

async function extractText(file: File): Promise<string> {
  const isDocx =
    file.name.toLowerCase().endsWith(".docx") ||
    file.type.includes("wordprocessingml");

  if (isDocx) {
    try {
      const buf = await file.arrayBuffer();
      let raw = "";
      try { raw = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
      catch { raw = new TextDecoder("latin1").decode(buf); }

      const paragraphs: string[] = [];
      for (const para of raw.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
        const runs = [...para[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)];
        const line = runs.map(r => r[1]).join("").trim();
        if (line) paragraphs.push(line);
      }
      if (paragraphs.length) return paragraphs.join("\n");

      const runs = [...raw.matchAll(/<w:t(?:\s[^>]*)?>([^<]+)<\/w:t>/g)];
      if (runs.length) return runs.map(r => r[1]).join(" ").replace(/\s+/g, " ").trim();
    } catch { /* fall through */ }
    return "";
  }

  try {
    const text = await file.text();
    const np = (text.match(/[\x00-\x08\x0e-\x1f\x7f-\x9f]/g) ?? []).length;
    if (np / text.length > 0.15) return "";
    return text;
  } catch { return ""; }
}

/* ─────────────────────────────────────────────────────────────
   DATE UTILITIES
   ───────────────────────────────────────────────────────────── */

const _MONTH  = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const _YEAR   = "(?:19|20)\\d{2}";
const _PRES   = "(?:present|now|current|till\\s+date|to\\s+date|ongoing)";
const _DPART  = `(?:${_MONTH}[.,\\s]+${_YEAR}|${_YEAR}(?:[./]\\d{1,2})?|\\d{1,2}[/.]${_YEAR})`;

const DATE_RANGE_RE = new RegExp(
  `(${_DPART})\\s*(?:[-–—]|to)\\s*(${_DPART}|${_PRES})`,
  "gi",
);

function findDateRange(line: string): { from: string; to: string; current: boolean } | null {
  DATE_RANGE_RE.lastIndex = 0;
  const m = DATE_RANGE_RE.exec(line);
  if (!m) return null;
  const toRaw = m[2].toLowerCase();
  const current = /present|now|current|till|ongoing/.test(toRaw);
  return { from: fmtDate(m[1]), to: current ? "" : fmtDate(m[2]), current };
}

function fmtDate(s: string): string {
  return s.trim()
    .replace(/january/i, "Jan").replace(/february/i, "Feb").replace(/march/i, "Mar")
    .replace(/april/i, "Apr").replace(/june/i, "Jun").replace(/july/i, "Jul")
    .replace(/august/i, "Aug").replace(/september/i, "Sep").replace(/october/i, "Oct")
    .replace(/november/i, "Nov").replace(/december/i, "Dec");
}

/* ─────────────────────────────────────────────────────────────
   SECTION DETECTION
   ───────────────────────────────────────────────────────────── */

const SECTION_RE: Record<string, RegExp> = {
  summary:  /^(?:professional\s+)?(?:summary|profile|objective|about\s+me|career\s+objective|professional\s+statement)\s*:?\s*$/i,
  work:     /^(?:work\s+)?(?:experience|employment(?:\s+history)?|work\s+history|professional\s+experience|career\s+history|positions?\s+held)\s*:?\s*$/i,
  education:/^(?:education(?:al\s+(?:background|qualifications?))?|academic\s+(?:background|qualifications?|history)|qualifications?)\s*:?\s*$/i,
  skills:   /^(?:(?:technical\s+|core\s+|key\s+|professional\s+)?skills?(?:\s+&?\s*(?:competencies|expertise|tools))?|competencies|technologies|tech\s+stack|expertise)\s*:?\s*$/i,
  projects: /^(?:projects?|personal\s+projects?|side\s+projects?|key\s+projects?|portfolio)\s*:?\s*$/i,
  certs:    /^(?:certifications?|licen(?:s|c)es?(?:\s+&\s+certifications?)?|professional\s+certifications?|accreditations?|credentials?)\s*:?\s*$/i,
  awards:   /^(?:awards?(?:\s+[&+]\s*(?:honors?|recognition|achievements?))?|honors?|achievements?|recognition)\s*:?\s*$/i,
  languages:/^(?:languages?|language\s+(?:proficiency|skills?))\s*:?\s*$/i,
  interests:/^(?:interests?|hobbies?(?:\s+[&+]\s*interests?)?|extracurricular|activities|volunteering)\s*:?\s*$/i,
  references:/^references?\s*:?\s*$/i,
};

interface Section { key: string; content: string }

function splitSections(text: string): Section[] {
  const sections: Section[] = [];
  let key = "header";
  let buf: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    let matched: string | null = null;

    for (const [k, re] of Object.entries(SECTION_RE)) {
      if (re.test(t)) { matched = k; break; }
    }
    // All-caps headers (common in PDFs) — try after lowercasing
    if (!matched && /^[A-Z][A-Z\s&/+]{3,35}$/.test(t) && t.split(/\s+/).length <= 6) {
      for (const [k, re] of Object.entries(SECTION_RE)) {
        if (re.test(t.toLowerCase())) { matched = k; break; }
      }
    }

    if (matched) {
      sections.push({ key, content: buf.join("\n") });
      key = matched;
      buf = [];
    } else {
      buf.push(line);
    }
  }
  sections.push({ key, content: buf.join("\n") });
  return sections;
}

/* ─────────────────────────────────────────────────────────────
   SIMPLE FIELD EXTRACTORS
   ───────────────────────────────────────────────────────────── */

function extractEmail(t: string) {
  return t.match(/[\w.+%\-]+@[\w.\-]+\.[a-z]{2,}/i)?.[0] ?? "";
}
function extractPhone(t: string) {
  return t.match(/(?:\+91[\s\-]?)?[6-9]\d{9}|\+?[\d][\d\s\-().]{9,13}/)?.[0]?.trim() ?? "";
}
function extractLinkedIn(t: string) {
  return t.match(/(?:linkedin\.com\/in\/[\w\-]+)/i)?.[0] ?? "";
}
function extractGitHub(t: string) {
  return t.match(/(?:github\.com\/[\w\-]+(?:\/[\w\-]+)?)/i)?.[0] ?? "";
}
function extractWebsite(t: string) {
  return t.match(/https?:\/\/(?!(?:www\.)?linkedin|(?:www\.)?github)([\w\-.]+\.(?:com|dev|io|me|net|org|co|in)[\w/\-?=.]*)/i)?.[0] ?? "";
}

function extractLocation(headerText: string): string {
  const CITIES = /\b(bengaluru|bangalore|mumbai|delhi|new\s+delhi|hyderabad|chennai|pune|kolkata|noida|gurugram|gurgaon|ahmedabad|jaipur|chandigarh|kochi|surat|indore|bhopal|nagpur|lucknow|visakhapatnam|coimbatore|patna|bhubaneswar)\b/i;
  const cm = headerText.match(CITIES);
  if (cm) {
    const idx = headerText.toLowerCase().indexOf(cm[0].toLowerCase());
    const around = headerText.slice(Math.max(0, idx - 5), idx + 50);
    const loc = around.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)/);
    if (loc) return loc[1].trim();
    return cm[0].charAt(0).toUpperCase() + cm[0].slice(1);
  }
  // Generic "City, State" or "City, Country"
  return headerText.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?,\s*[A-Z][a-zA-Z]{2,})\b/)?.[1] ?? "";
}

function extractName(lines: string[], email: string): string {
  const SKIP = /^(summary|experience|education|skills|profile|contact|objective|about|work|employment)/i;
  const emailUser = email.replace(/@.*/, "").replace(/[.\-_+\d]/g, " ").toLowerCase();

  for (const l of lines.slice(0, 8)) {
    const t = l.trim();
    const w = t.split(/\s+/);
    if (w.length < 2 || w.length > 4 || t.includes("@") || /\d/.test(t) || SKIP.test(t)) continue;
    if (w.every(word => /^[A-Z][a-z]/.test(word))) return t; // Title Case name
    if (emailUser && w.some(p => p.length > 2 && emailUser.includes(p.toLowerCase()))) return t;
  }
  for (const l of lines.slice(0, 4)) {
    const t = l.trim();
    if (!t.includes("@") && !/^\+?\d/.test(t) && t.length > 3 && t.length < 50) return t;
  }
  return lines[0]?.trim() ?? "";
}

/* ─────────────────────────────────────────────────────────────
   WORK HISTORY PARSER
   ───────────────────────────────────────────────────────────── */

const ROLE_WORDS =
  /\b(?:engineer|developer|manager|director|analyst|designer|architect|consultant|intern|lead|head|officer|executive|specialist|associate|coordinator|scientist|researcher|writer|editor|strategist|vp|cto|ceo|cfo|president|founder|co-founder)\b/i;

function parseWork(text: string): WorkEntry[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: WorkEntry[] = [];
  let id = 1;
  let i = 0;

  while (i < lines.length) {
    // Scan ahead up to 3 lines for a date range
    let dateInfo: ReturnType<typeof findDateRange> = null;
    let dateLineIdx = -1;
    for (let k = 0; k <= 2 && i + k < lines.length; k++) {
      dateInfo = findDateRange(lines[i + k]);
      if (dateInfo) { dateLineIdx = i + k; break; }
    }
    if (!dateInfo || dateLineIdx < 0) { i++; continue; }

    // Lines before the date carry company / role info
    const preDateLines = lines.slice(i, dateLineIdx).filter(Boolean);
    // Strip the date text itself from that line to recover inline company/role
    const dateLine = lines[dateLineIdx];
    const strippedDateLine = dateLine
      .replace(DATE_RANGE_RE, "")
      .replace(/[-–—|,·]+$/g, "")
      .trim();

    const meta = [...preDateLines, strippedDateLine].filter(Boolean);

    let company = "";
    let role = "";

    if (meta.length === 0) { i = dateLineIdx + 1; continue; }

    if (meta.length === 1) {
      const p = meta[0];
      if (/\s+at\s+/i.test(p)) {
        [role, company] = p.split(/\s+at\s+/i).map(s => s.trim());
      } else if (/[|·–—]/.test(p)) {
        const parts = p.split(/[|·–—]/).map(s => s.trim()).filter(Boolean);
        role = parts[0]; company = parts[1] ?? "";
      } else {
        // Single line — treat as company unless it looks like a title
        if (ROLE_WORDS.test(p)) { role = p; }
        else { company = p; }
      }
    } else {
      // Multiple lines: use role-keyword heuristic to tell apart role vs company
      if (ROLE_WORDS.test(meta[0]) && !ROLE_WORDS.test(meta[1])) {
        role = meta[0]; company = meta[1];
      } else if (!ROLE_WORDS.test(meta[0]) && ROLE_WORDS.test(meta[1])) {
        company = meta[0]; role = meta[1];
      } else {
        company = meta[0];
        role = meta.slice(1).join(", ");
      }
    }

    // Collect bullet / description lines that follow
    const descLines: string[] = [];
    let j = dateLineIdx + 1;
    while (j < lines.length) {
      const dl = lines[j];
      if (findDateRange(dl)) break;                          // next entry starts
      if (/^[A-Z][A-Z\s&/+]{5,35}$/.test(dl)) break;      // section header
      const isBullet = /^[•\-*·▪►▸]/.test(dl);
      const isPlain  = /^\w/.test(dl) && dl.length > 10;
      if (isBullet || isPlain) {
        descLines.push(dl.replace(/^[•\-*·▪►▸]\s*/, "").trimStart());
      }
      j++;
    }

    company = clean(company);
    role    = clean(role);

    if (company || role) {
      entries.push({
        id: `w${id++}`,
        company: company || role,
        role:    role !== company ? role : "",
        from:    dateInfo.from,
        to:      dateInfo.to,
        current: dateInfo.current,
        desc:    descLines.slice(0, 8).map(l => `• ${l}`).join("\n"),
      });
    }
    i = j;
  }

  return entries;
}

/* ─────────────────────────────────────────────────────────────
   EDUCATION PARSER
   ───────────────────────────────────────────────────────────── */

const DEGREE_RE =
  /\b(?:b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?sc|m\.?sc|b\.?com|m\.?com|b\.?a\.?|m\.?a\.?|ph\.?d|m\.?b\.?a|b\.?b\.?a|diploma|bachelor|master|doctor|associate|hsc|ssc|12th|10th|pgdm|pgdba|llb|llm|intermediate|matriculation|senior\s+secondary)\b/i;

function parseEducation(text: string): EduEntry[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: EduEntry[] = [];
  let id = 1;
  let i = 0;

  while (i < lines.length) {
    // Find year in current or next 2 lines
    let yearStr = "";
    let yearOffset = -1;
    for (let k = 0; k <= 2 && i + k < lines.length; k++) {
      const ym = lines[i + k].match(/\b((?:19|20)\d{2})\b/);
      if (ym) { yearStr = ym[1]; yearOffset = k; break; }
    }
    if (!yearStr) { i++; continue; }

    const block = lines.slice(i, Math.min(i + 4, lines.length));

    let school = "";
    let degree = "";
    let gpa    = "";

    for (const bl of block) {
      // GPA / CGPA / percentage
      if (!gpa) {
        const gm = bl.match(/(?:gpa|cgpa|percentage|score|grade)[:\s]+([0-9.]+\s*(?:\/\s*[0-9.]+|%)?)/i)
                ?? bl.match(/([0-9.]+)\s*(?:cgpa|gpa|%)/i);
        if (gm) gpa = gm[1].trim();
      }
      // Degree line
      if (!degree && DEGREE_RE.test(bl)) {
        degree = clean(bl.replace(/\b(?:19|20)\d{2}\b.*/, "").replace(/[-–—|,]+$/, ""));
      } else if (!school && bl.length > 5 && !/^\d/.test(bl)) {
        school = clean(bl.replace(/\b(?:19|20)\d{2}\b.*/, "").replace(/[-–—|,]+$/, ""));
      }
    }

    if (!school && !degree) { i++; continue; }
    if (!school) { school = degree; degree = ""; }

    entries.push({ id: `e${id++}`, school, degree, year: yearStr, gpa });
    i += (yearOffset >= 0 ? yearOffset : 0) + 1;
  }

  return entries;
}

/* ─────────────────────────────────────────────────────────────
   PROJECTS PARSER
   ───────────────────────────────────────────────────────────── */

function parseProjects(text: string): ProjectEntry[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: ProjectEntry[] = [];
  let id = 1;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const isBullet = /^[•\-*·▪►▸]/.test(line);
    if (isBullet || line.length < 3) { i++; continue; }

    const name = clean(line.replace(/\s*[|:–—].*$/, "").replace(/https?:\/\/.*/, ""));
    const urlInLine = line.match(/https?:\/\/[\w\-./?=&#%+]+/)?.[0] ?? "";
    const repoInLine = line.match(/github\.com\/[\w\-/]+/)?.[0] ?? "";

    const descLines: string[] = [];
    let url  = urlInLine;
    let repo = repoInLine;
    let j = i + 1;

    while (j < lines.length) {
      const dl = lines[j];
      if (!dl.startsWith("•") && !dl.startsWith("-") && !dl.startsWith("*") &&
          !dl.startsWith("·") && dl.length < 120 && !/^[•\-*·▪►▸]/.test(dl)) {
        // Looks like the next project heading if it doesn't start with a bullet
        if (dl.length > 2 && !/^https?:/.test(dl)) break;
      }
      if (!url)  url  = dl.match(/https?:\/\/[\w\-./?=&#%+]+/)?.[0] ?? "";
      if (!repo) repo = dl.match(/github\.com\/[\w\-/]+/)?.[0] ?? "";
      const txt = dl.replace(/^[•\-*·▪►▸]\s*/, "").trim();
      if (txt) descLines.push(txt);
      j++;
    }

    if (name.length > 2) {
      entries.push({ id: `p${id++}`, name, url, repo, from: "", to: "", desc: descLines.slice(0, 6).join("\n") });
    }
    i = j;
  }

  return entries;
}

/* ─────────────────────────────────────────────────────────────
   CERTIFICATIONS PARSER
   ───────────────────────────────────────────────────────────── */

function parseCertifications(text: string): CertEntry[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: CertEntry[] = [];
  let id = 1;

  for (const line of lines) {
    const year = line.match(/\b((?:19|20)\d{2})\b/)?.[1] ?? "";
    let name = ""; let issuer = "";

    if (/[|·–—]/.test(line)) {
      const parts = line.split(/[|·–—]/).map(s => clean(s.replace(/\b(?:19|20)\d{2}\b/g, ""))).filter(Boolean);
      name = parts[0]; issuer = parts[1] ?? "";
    } else {
      name = clean(line.replace(/\b(?:19|20)\d{2}\b/g, "").replace(/,\s*$/, ""));
    }
    if (name.length > 3) entries.push({ id: `c${id++}`, name, issuer, year });
  }
  return entries;
}

/* ─────────────────────────────────────────────────────────────
   AWARDS PARSER
   ───────────────────────────────────────────────────────────── */

function parseAwards(text: string): AwardEntry[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: AwardEntry[] = [];
  let id = 1;

  for (const line of lines) {
    const year  = line.match(/\b((?:19|20)\d{2})\b/)?.[1] ?? "";
    const parts = line.split(/[|·–—,]/)
      .map(s => clean(s.replace(/\b(?:19|20)\d{2}\b/g, ""))).filter(Boolean);
    if (parts[0]?.length > 3) {
      entries.push({ id: `a${id++}`, title: parts[0], issuer: parts[1] ?? "", year, desc: parts.slice(2).join(" ") });
    }
  }
  return entries;
}

/* ─────────────────────────────────────────────────────────────
   LANGUAGE PARSER
   ───────────────────────────────────────────────────────────── */

const LEVEL_MAP: Record<string, LanguageEntry["level"]> = {
  native: "Native", mother: "Native", "first language": "Native",
  fluent: "Fluent", advanced: "Fluent", professional: "Fluent", proficient: "Fluent",
  conversational: "Conversational", intermediate: "Conversational", working: "Conversational",
  basic: "Basic", beginner: "Basic", elementary: "Basic", limited: "Basic",
};

function parseLanguages(text: string): LanguageEntry[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: LanguageEntry[] = [];
  let id = 1;

  for (const line of lines) {
    const tokens = line.split(/[–—,|()\s:]+/).filter(Boolean);
    let name = ""; let level: LanguageEntry["level"] = "Fluent";
    for (const tok of tokens) {
      const low = tok.toLowerCase();
      if (LEVEL_MAP[low]) { level = LEVEL_MAP[low]; }
      else if (/^[A-Z][a-z]{2,}$/.test(tok)) { name = name || tok; }
    }
    if (name) entries.push({ id: `l${id++}`, name, level });
  }
  return entries;
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */

function clean(s: string): string {
  return s.replace(/[•\-*·▪►▸|]+/g, " ").replace(/\s+/g, " ").trim();
}

function skillsFromText(text: string): string {
  const m = text.match(/(?:skills?)[:\s]*\n?([\s\S]{5,800}?)(?=\n\s*(?:experience|work|employment|education|certifications?|projects?|summary|profile|objective|awards?)|$)/i);
  if (!m) return "";
  return m[1].split(/[,\n•·|∙▪▸►\-]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50).join(", ");
}

/* ─────────────────────────────────────────────────────────────
   MAIN PARSE FUNCTION
   ───────────────────────────────────────────────────────────── */

export async function parseResumeFile(file: File): Promise<ParseResult> {
  const rawText = await extractText(file);

  if (!rawText || rawText.length < 20) {
    const isDocx = file.name.toLowerCase().endsWith(".docx") || file.type.includes("wordprocessingml");
    return {
      fields: {}, rawText: "", confidence: "low",
      ...(isDocx ? { hint: "DOCX parsing requires a text-layer file. Try saving as .txt or copy-pasting your content." } : {}),
    };
  }

  /* ── Section split ─────────────────────────────────────── */
  const secs      = splitSections(rawText);
  const getSection = (key: string) => secs.find(s => s.key === key)?.content ?? "";

  const headerText = getSection("header") || rawText.slice(0, 600);
  const workText   = getSection("work");
  const eduText    = getSection("education");
  const skillsText = getSection("skills");
  const projText   = getSection("projects");
  const certText   = getSection("certs");
  const awardText  = getSection("awards");
  const langText   = getSection("languages");
  const summaryText= getSection("summary");
  const interestText = getSection("interests");

  /* ── Basic fields ──────────────────────────────────────── */
  const lines    = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const email    = extractEmail(rawText);
  const phone    = extractPhone(rawText);
  const linkedin = extractLinkedIn(rawText);
  const github   = extractGitHub(rawText);
  const website  = extractWebsite(rawText);
  const location = extractLocation(headerText);
  const name     = extractName(lines, email);

  const nameIdx  = lines.findIndex(l => l === name);
  const title    = lines.slice(nameIdx + 1, nameIdx + 4).find(l =>
    !l.includes("@") && !/^\+?\d/.test(l) && l.length > 5 && l.length < 80 &&
    !/^(?:summary|experience|education|skills|profile)/i.test(l),
  ) ?? "";

  const summaryFallback = rawText.match(/(?:summary|profile|objective)[:\s]*\n?([\s\S]{30,600}?)(?=\n(?:experience|work|education|skills)|$)/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const summary  = summaryText.replace(/\s+/g, " ").trim().slice(0, 600) || summaryFallback;

  const skills   = skillsText
    ? skillsText.split(/[,\n•·|∙▪▸►\-]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50).join(", ")
    : skillsFromText(rawText);

  /* ── Structured sections ───────────────────────────────── */
  // Work: prefer dedicated section; fall back to scanning full text
  let work = workText ? parseWork(workText) : [];
  if (!work.length) work = parseWork(rawText);

  const edu            = eduText  ? parseEducation(eduText)         : [];
  const projects       = projText ? parseProjects(projText)         : [];
  const certifications = certText ? parseCertifications(certText)   : [];
  const awards         = awardText? parseAwards(awardText)          : [];
  const languages      = langText ? parseLanguages(langText)        : [];
  const interests      = interestText
    ? interestText.split(/[,\n•·|]/).map(s => s.trim()).filter(Boolean).join(", ")
    : "";

  /* ── Confidence ────────────────────────────────────────── */
  const confidence: "high" | "low" =
    name.length > 2 && (email || phone) && (work.length > 0 || edu.length > 0)
      ? "high" : "low";

  /* ── Build fields map (only non-empty) ─────────────────── */
  const fields: Partial<ResumeData> = {};
  if (name)                  fields.name     = name;
  if (title)                 fields.title    = title;
  if (email)                 fields.email    = email;
  if (phone)                 fields.phone    = phone;
  if (location)              fields.location = location;
  if (linkedin)              fields.linkedin = linkedin;
  if (github)                fields.github   = github;
  if (website)               fields.website  = website;
  if (summary)               fields.summary  = summary;
  if (skills)                fields.skills   = skills;
  if (work.length)           fields.work     = work;
  if (edu.length)            fields.edu      = edu;
  if (projects.length)       fields.projects = projects;
  if (certifications.length) fields.certifications = certifications;
  if (awards.length)         fields.awards   = awards;
  if (languages.length)      fields.languages = languages;
  if (interests)             fields.interests = interests;

  return { rawText, confidence, fields };
}
