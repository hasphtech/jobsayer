/**
 * DOCX export via Word-compatible HTML blob.
 * Opens correctly in Microsoft Word, LibreOffice, and Google Docs.
 * No additional npm packages required.
 */
import type { ResumeData } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportDocx(data: ResumeData): void {
  const name = data.name || "Resume";

  const contactParts = [
    data.email,
    data.phone,
    data.location,
    data.linkedin && `linkedin.com/in/${data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")}`,
    data.github   && `github.com/${data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")}`,
    data.website,
  ].filter(Boolean) as string[];

  const skillsList = data.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const hasProjects  = data.projects?.some(p => p.name || p.desc);
  const hasCerts     = data.certifications?.some(c => c.name);
  const hasLangs     = data.languages?.some(l => l.name);
  const hasAwards    = data.awards?.some(a => a.title);
  const hasInterests = !!(data.interests?.trim());
  const hasRefs      = data.references?.some(r => r.name);

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<style>
  body {
    font-family: Calibri, Arial, sans-serif;
    font-size: 11pt;
    color: #1a1a2e;
    margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    line-height: 1.4;
  }
  h1 {
    font-size: 22pt;
    font-weight: bold;
    color: #1a1a2e;
    margin: 0 0 2pt 0;
    border: none;
  }
  .subtitle {
    font-size: 12pt;
    color: #4b5563;
    margin: 0 0 6pt 0;
  }
  .contact {
    font-size: 9pt;
    color: #6b7280;
    margin-bottom: 14pt;
    border-bottom: 1pt solid #e5e7eb;
    padding-bottom: 8pt;
  }
  h2 {
    font-size: 10pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1pt;
    color: #1a1a2e;
    border-bottom: 1.5pt solid #1a1a2e;
    margin: 14pt 0 6pt 0;
    padding-bottom: 2pt;
  }
  .entry { margin-bottom: 10pt; }
  .entry-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1pt;
  }
  .role { font-weight: bold; font-size: 11pt; }
  .company { color: #374151; font-size: 10pt; font-weight: bold; }
  .dates { font-size: 9pt; color: #9ca3af; }
  .desc { font-size: 10pt; color: #4b5563; margin-top: 2pt; }
  .url  { font-size: 9pt; color: #2563eb; }
  .skill-tag {
    display: inline-block;
    background: #f3f4f6;
    border: 0.5pt solid #d1d5db;
    border-radius: 2pt;
    padding: 1pt 6pt;
    font-size: 9pt;
    margin: 2pt 3pt 2pt 0;
  }
  .lang-row { margin-bottom: 4pt; font-size: 10pt; }
  p { margin: 0 0 4pt 0; }
</style>
</head>
<body>
  <h1>${esc(name)}</h1>
  ${data.title ? `<p class="subtitle">${esc(data.title)}</p>` : ""}
  <p class="contact">${contactParts.map(esc).join("  ·  ")}</p>

  ${data.summary
    ? `<h2>Profile</h2>
       <p class="desc">${esc(data.summary)}</p>`
    : ""}

  ${data.work.some((w) => w.company || w.role)
    ? `<h2>Experience</h2>
       ${data.work
         .filter((w) => w.company || w.role)
         .map((w) => `
       <div class="entry">
         <table width="100%" style="border:none;"><tr>
           <td style="border:none;"><span class="role">${esc(w.role || "Role")}</span></td>
           <td align="right" style="border:none;"><span class="dates">${esc([w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – "))}</span></td>
         </tr></table>
         ${w.company ? `<p class="company">${esc(w.company)}</p>` : ""}
         ${w.desc    ? `<p class="desc">${esc(w.desc)}</p>`       : ""}
       </div>`).join("")}`
    : ""}

  ${data.edu.some((e) => e.school)
    ? `<h2>Education</h2>
       ${data.edu
         .filter((e) => e.school)
         .map((e) => `
       <div class="entry">
         <table width="100%" style="border:none;"><tr>
           <td style="border:none;"><span class="role">${esc(e.degree || "Degree")}</span></td>
           <td align="right" style="border:none;"><span class="dates">${esc(e.year)}</span></td>
         </tr></table>
         <p class="company">${esc(e.school)}${e.gpa ? ` &nbsp;·&nbsp; <span style="color:#6b7280;font-size:9pt;">GPA: ${esc(e.gpa)}</span>` : ""}</p>
       </div>`).join("")}`
    : ""}

  ${skillsList.length > 0
    ? `<h2>Skills</h2>
       <p>${skillsList.map((s) => `<span class="skill-tag">${esc(s)}</span>`).join(" ")}</p>`
    : ""}

  ${hasProjects
    ? `<h2>Projects</h2>
       ${(data.projects ?? [])
         .filter((p) => p.name || p.desc)
         .map((p) => `
       <div class="entry">
         <table width="100%" style="border:none;"><tr>
           <td style="border:none;"><span class="role">${esc(p.name)}</span>${p.url ? ` <span class="url">${esc(p.url)}</span>` : ""}${p.repo ? ` <span class="url" style="color:#6b7280;">${esc(p.repo)}</span>` : ""}</td>
           <td align="right" style="border:none;"><span class="dates">${esc([p.from, p.to].filter(Boolean).join(" – "))}</span></td>
         </tr></table>
         ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
       </div>`).join("")}`
    : ""}

  ${hasCerts
    ? `<h2>Certifications</h2>
       ${(data.certifications ?? [])
         .filter((c) => c.name)
         .map((c) => `
       <div class="entry">
         <span class="role">${esc(c.name)}</span>
         ${c.issuer || c.year
           ? `<p class="company">${esc([c.issuer, c.year].filter(Boolean).join(" · "))}</p>`
           : ""}
       </div>`).join("")}`
    : ""}

  ${hasLangs
    ? `<h2>Languages</h2>
       <p>${(data.languages ?? [])
         .filter((l) => l.name)
         .map((l) => `<span class="lang-row">${esc(l.name)} <span style="color:#6b7280;font-size:9pt;">(${esc(l.level)})</span></span>`)
         .join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</p>`
    : ""}

  ${hasAwards
    ? `<h2>Awards &amp; Honours</h2>
       ${(data.awards ?? [])
         .filter((a) => a.title)
         .map((a) => `
       <div class="entry">
         <table width="100%" style="border:none;"><tr>
           <td style="border:none;"><span class="role">${esc(a.title)}</span></td>
           <td align="right" style="border:none;"><span class="dates">${esc(a.year)}</span></td>
         </tr></table>
         ${a.issuer ? `<p class="company">${esc(a.issuer)}</p>` : ""}
         ${a.desc   ? `<p class="desc">${esc(a.desc)}</p>`     : ""}
       </div>`).join("")}`
    : ""}

  ${hasInterests
    ? `<h2>Interests</h2>
       <p class="desc">${esc(data.interests ?? "")}</p>`
    : ""}

  <h2>References</h2>
  ${hasRefs
    ? `<div style="display:flex;flex-wrap:wrap;gap:24pt;">
       ${(data.references ?? []).filter(r => r.name).map(r => `
         <div style="min-width:180pt;flex:1;">
           <p class="role">${esc(r.name)}</p>
           <p class="company">${esc([r.title, r.company].filter(Boolean).join(", "))}</p>
           ${r.email ? `<p class="desc">${esc(r.email)}</p>` : ""}
           ${r.phone ? `<p class="desc">${esc(r.phone)}</p>` : ""}
         </div>`).join("")}
       </div>`
    : `<p class="desc" style="font-style:italic;">Available on request</p>`
  }
</body>
</html>`;

  const blob = new Blob(["﻿", html], {
    type: "application/vnd.ms-word;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "_")}_Resume.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
