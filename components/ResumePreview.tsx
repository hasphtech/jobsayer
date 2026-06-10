"use client";
import { createContext, useContext } from "react";
import type { ResumeData, ProjectEntry, CertEntry, LanguageEntry, AwardEntry, ReferenceEntry } from "@/lib/types";

/** Default extra-section rendering order (step indices 5–10) */
const DEFAULT_SECTION_ORDER = [5, 6, 7, 8, 9, 10];
const SectionOrderCtx = createContext<number[]>(DEFAULT_SECTION_ORDER);

function useExtraSectionOrder(): number[] {
  const order = useContext(SectionOrderCtx);
  const extra = order.filter(i => i >= 5 && i <= 10);
  // Only add missing sections back when using the default (no custom order passed).
  // When the builder passes an explicit order, omitted indices are intentionally hidden.
  if (extra.length === DEFAULT_SECTION_ORDER.length) return extra; // all present
  const isDefault = order === DEFAULT_SECTION_ORDER ||
    (order.length === DEFAULT_SECTION_ORDER.length &&
     order.every((v, i) => v === DEFAULT_SECTION_ORDER[i]));
  if (isDefault) {
    DEFAULT_SECTION_ORDER.forEach(i => { if (!extra.includes(i)) extra.push(i); });
  }
  return extra;
}

export const TEMPLATE_ACCENT: Record<string, string> = {
  Classic:      "#1a1a2e",
  Minimal:      "#374151",
  Bold:         "#111827",
  Compact:      "#1d4ed8",
  Slate:        "#334155",
  Crisp:        "#18181b",
  Modern:       "#2563eb",
  Creative:     "#7c3aed",
  "Sidebar Pro": "#0f766e",
  Executive:    "#1e3a5f",
  Tech:         "#0f172a",
  Nordic:       "#4f46e5",
  Timeline:     "#0369a1",
  Horizon:      "#be185d",
  Orbit:        "#6366f1",
  Apex:         "#0c4a6e",
  Canvas:       "#c2410c",
  Luxe:         "#292524",
  Vega:         "#065f46",
  Folio:        "#7b2d8b",
  Stripe:       "#0891b2",
  Mono:         "#1e1e2e",
  Prism:        "#e11d48",
  Ivy:          "#5c4033",
  Onyx:         "#18181b",
  // ── International ATS templates ──────────────────────────
  Zurich:       "#1d4040",
  Berlin:       "#92400e",
  Paris:        "#be123c",
  Harvard:      "#7f1d1d",
  Geneva:       "#1a4731",
  Pacific:      "#0e7490",
  Milano:       "#881337",
  Sydney:       "#14532d",
  Metro:        "#1c1917",
  Sage:         "#3f6212",
};

export const BASIC_TEMPLATES    = ["Classic", "Minimal", "Bold", "Compact", "Slate", "Crisp"];
export const PREMIUM_TEMPLATES  = [
  "Modern", "Creative", "Sidebar Pro", "Executive", "Tech",
  "Nordic", "Timeline", "Horizon",
  "Orbit", "Apex", "Canvas", "Luxe", "Vega",
  "Folio", "Stripe", "Mono", "Prism", "Ivy", "Onyx",
  // International ATS
  "Zurich", "Berlin", "Paris", "Harvard", "Geneva",
  "Pacific", "Milano", "Sydney", "Metro", "Sage",
];

/** Templates that feature a photo slot — show photo upload UI for these. */
export const PHOTO_TEMPLATES = new Set([
  "Classic", "Minimal", "Bold", "Compact", "Slate", "Crisp",
  "Modern", "Creative", "Sidebar Pro", "Executive", "Tech",
  "Nordic", "Timeline", "Horizon",
  "Orbit", "Apex", "Canvas", "Luxe", "Vega",
  "Folio", "Stripe", "Prism", "Onyx",
  // EU-standard templates include photo slot
  "Paris", "Milano",
]);
// Mono, Ivy — terminal/academic aesthetic; photo omitted by design
// Zurich, Berlin, Harvard, Geneva, Pacific, Sydney, Metro, Sage — US/international ATS; no photo

/** Context for photo shape — avoids threading through every template. */
const PhotoShapeCtx = createContext<"round" | "square">("round");

/* ── Shared helpers ──────────────────────────────────────── */
const PAGE: React.CSSProperties = {
  width: 794, minHeight: 1123,
  background: "#fff", color: "#1a1a2e",
  fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontSize: 12, lineHeight: 1.55,
  boxShadow: "0 8px 48px rgba(0,0,0,.5)",
  borderRadius: 4, overflow: "hidden",
};

const PAGE_THUMB: React.CSSProperties = {
  ...PAGE,
  boxShadow: "none",
  borderRadius: 0,
  minHeight: 1123,
  height: 1123,
  overflow: "hidden",
};

function SecTitle({ label, accent, style }: { label: string; accent: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "1.2px",
      textTransform: "uppercase" as const, color: accent,
      borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10,
      ...style,
    }}>{label}</div>
  );
}

/* ── Contact SVG icons (currentColor — inherit colour from container) ── */
function MailIcon()     { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>; }
function PhoneIcon()    { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>; }
function MapPinIcon()   { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>; }
function GlobeIcon()    { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>; }
function LinkedInIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>; }
function GitHubIcon()   { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>; }

/** Contact fields with icon + display text for visual templates. */
function contactFields(data: ResumeData): { icon: React.ReactNode; text: string }[] {
  return [
    data.email    && { icon: <MailIcon/>,     text: data.email },
    data.phone    && { icon: <PhoneIcon/>,    text: data.phone },
    data.location && { icon: <MapPinIcon/>,   text: data.location },
    data.website  && { icon: <GlobeIcon/>,    text: data.website },
    data.linkedin && { icon: <LinkedInIcon/>, text: data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "") },
    data.github   && { icon: <GitHubIcon/>,   text: data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "") },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];
}

/**
 * ATS-safe contact fields: SVG icon (visual, not parsed by ATS) + plain text.
 * ATS parsers read the text node; SVG elements are ignored in text extraction.
 */
function atsContactFields(data: ResumeData): { icon: React.ReactNode; text: string }[] {
  return [
    data.email    && { icon: <MailIcon/>,     text: data.email },
    data.phone    && { icon: <PhoneIcon/>,    text: data.phone },
    data.location && { icon: <MapPinIcon/>,   text: data.location },
    data.website  && { icon: <GlobeIcon/>,    text: data.website },
    data.linkedin && { icon: <LinkedInIcon/>, text: data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "linkedin.com/in/") },
    data.github   && { icon: <GitHubIcon/>,   text: data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "github.com/") },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];
}

/** @deprecated use contactFields() */
function contactItems(data: ResumeData): string[] {
  return [
    data.email    && data.email,
    data.phone    && data.phone,
    data.location && data.location,
    data.website  && data.website,
    data.linkedin && data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, ""),
    data.github   && data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, ""),
  ].filter(Boolean) as string[];
}

function ContactRow({ data, style }: { data: ResumeData; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 10, ...style }}>
      {contactFields(data).map(({ icon, text }, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>
      ))}
    </div>
  );
}

function Photo({ src, size = 68, style }: { src: string; size?: number; style?: React.CSSProperties }) {
  const shape = useContext(PhotoShapeCtx);
  if (!src) return null;
  return (
    <img src={src} alt="Profile"
      style={{ width: size, height: size, objectFit: "cover", flexShrink: 0, ...style,
        borderRadius: shape === "round" ? "50%" : "8px" }} />
  );
}

function LEVEL_DOT({ level, accent }: { level: LanguageEntry["level"]; accent: string }) {
  const filled = level === "Native" ? 4 : level === "Fluent" ? 3 : level === "Conversational" ? 2 : 1;
  return (
    <span style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }}>
      {[1,2,3,4].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block",
          background: i <= filled ? accent : `${accent}30` }} />
      ))}
    </span>
  );
}

/* Shared extra-sections block — renders in the order from SectionOrderCtx */
function ExtraSections({ data, accent, dark = false }: { data: ResumeData; accent: string; dark?: boolean }) {
  const text1 = dark ? "#e6edf3" : "#111827";
  const text2 = dark ? "#8b949e" : "#4b5563";
  const text3 = dark ? "#6e7681" : "#9ca3af";
  const order = useContext(SectionOrderCtx);

  const hasProjects   = data.projects?.some(p => p.name || p.desc);
  const hasCerts      = data.certifications?.some(c => c.name);
  const hasLangs      = data.languages?.some(l => l.name);
  const hasAwards     = data.awards?.some(a => a.title);
  const hasInterests  = !!(data.interests?.trim());
  const hasRefs       = data.references?.some(r => r.name);

  if (!hasProjects && !hasCerts && !hasLangs && !hasAwards && !hasInterests && !hasRefs) return null;

  function renderSection(idx: number) {
    switch (idx) {
      case 5: return !hasProjects ? null : (
        <section key={5} style={{ marginBottom: 20 }}>
          <SecTitle label="Projects" accent={accent} />
          {data.projects.map((p: ProjectEntry) => (p.name || p.desc) && (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 4 }}>
                <strong style={{ fontSize: 12, color: text1 }}>
                  {p.name}
                  {p.url  && <a href={p.url}  style={{ marginLeft: 6, fontSize: 10, color: accent, fontWeight: 400 }} target="_blank" rel="noopener noreferrer">↗ {p.url}</a>}
                  {p.repo && <a href={p.repo} style={{ marginLeft: 6, fontSize: 10, color: text3, fontWeight: 400 }} target="_blank" rel="noopener noreferrer">⎇ {p.repo.replace(/^https?:\/\/(www\.)?(github|gitlab)\.com\//i, "")}</a>}
                </strong>
                <span style={{ fontSize: 10, color: text3 }}>{[p.from, p.to].filter(Boolean).join(" – ")}</span>
              </div>
              {p.desc && <p style={{ color: text2, fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
            </div>
          ))}
        </section>
      );
      case 6: return !hasCerts ? null : (
        <section key={6} style={{ marginBottom: 20 }}>
          <SecTitle label="Certifications" accent={accent} />
          {data.certifications.map((c: CertEntry) => c.name && (
            <div key={c.id} style={{ marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 7 }}>
              {c.logo && <img src={c.logo} alt={c.issuer} style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 3, flexShrink: 0, marginTop: 1, background: "#fff", padding: 1 }} />}
              <div>
                <strong style={{ fontSize: 11, color: text1 }}>{c.name}</strong>
                <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
              </div>
            </div>
          ))}
        </section>
      );
      case 7: return !hasLangs ? null : (
        <section key={7} style={{ marginBottom: 20 }}>
          <SecTitle label="Languages" accent={accent} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px" }}>
            {data.languages.map((l: LanguageEntry) => l.name && (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                <span style={{ fontSize: 11, color: text1 }}>{l.name}</span>
                <LEVEL_DOT level={l.level} accent={accent} />
              </div>
            ))}
          </div>
        </section>
      );
      case 8: return !hasAwards ? null : (
        <section key={8} style={{ marginBottom: 20 }}>
          <SecTitle label="Awards & Honours" accent={accent} />
          {(data.awards ?? []).map((a: AwardEntry) => a.title && (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 12, color: text1 }}>{a.title}</strong>
                <span style={{ fontSize: 10, color: text3 }}>{a.year}</span>
              </div>
              {a.issuer && <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{a.issuer}</div>}
              {a.desc && <p style={{ color: text2, fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{a.desc}</p>}
            </div>
          ))}
        </section>
      );
      case 9: return !hasInterests ? null : (
        <section key={9} style={{ marginBottom: 20 }}>
          <SecTitle label="Interests" accent={accent} />
          <p style={{ fontSize: 11, color: text2, lineHeight: 1.55 }}>{data.interests}</p>
        </section>
      );
      case 10: return (
        <section key={10}>
          <SecTitle label="References" accent={accent} />
          {hasRefs
            ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                {(data.references ?? []).map((r: ReferenceEntry) => r.name && (
                  <div key={r.id} style={{ minWidth: 180, flex: 1 }}>
                    <strong style={{ fontSize: 11, color: text1 }}>{r.name}</strong>
                    <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{r.title}{r.company ? `, ${r.company}` : ""}</div>
                    {r.email && <div style={{ fontSize: 10, color: text3 }}>{r.email}</div>}
                    {r.phone && <div style={{ fontSize: 10, color: text3 }}>{r.phone}</div>}
                  </div>
                ))}
              </div>
            )
            : <p style={{ fontSize: 11, color: text3, fontStyle: "italic" }}>Available on request</p>
          }
        </section>
      );
      default: return null;
    }
  }

  // Only render extra-section indices (5–10) in the user-specified order
  const extraOrder = order.filter(i => i >= 5 && i <= 10);
  // Append any that are missing from the order (safety fallback)
  DEFAULT_SECTION_ORDER.forEach(i => { if (!extraOrder.includes(i)) extraOrder.push(i); });

  const customSections = data.customSections?.filter(s => s.title.trim() || s.content.trim()) ?? [];

  return (
    <>
      {extraOrder.map(idx => renderSection(idx))}
      {customSections.map(cs => (
        <section key={cs.id} style={{ marginBottom: 20 }}>
          <SecTitle label={cs.title || "Custom Section"} accent={accent} />
          {cs.content.trim().split("\n").filter(Boolean).map((line, i) => (
            <p key={i} style={{ fontSize: 11, color: text2, lineHeight: 1.55, margin: "2px 0" }}>{line}</p>
          ))}
        </section>
      ))}
      {data.declaration?.trim() && (
        <section style={{ marginBottom: 20 }}>
          <SecTitle label="Declaration" accent={accent} />
          <p style={{ fontSize: 11, color: text2, lineHeight: 1.6, marginBottom: 8 }}>
            {data.declaration}
          </p>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontSize: 10, color: text3, marginBottom: 2 }}>Place: _____________</p>
              <p style={{ fontSize: 10, color: text3 }}>Date: _____________</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ borderTop: `1px solid ${text3}`, width: 100, marginBottom: 3 }} />
              <p style={{ fontSize: 10, color: text3 }}>Signature</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* Sidebar-variant extras: certifications + languages + awards + interests stacked */
function SidebarExtras({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const hasCerts     = data.certifications?.some(c => c.name);
  const hasLangs     = data.languages?.some(l => l.name);
  const hasAwards    = data.awards?.some(a => a.title);
  const hasInterests = !!(data.interests?.trim());
  const extraOrder   = useExtraSectionOrder();
  return (
    <>
      {extraOrder.filter(i => i === 6 || i === 7 || i === 8 || i === 9).map(idx => {
        if (idx === 6 && hasCerts) return (
          <div key={6}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10 }}>Certifications</div>
            {data.certifications.map((c: CertEntry) => c.name && (
              <div key={c.id} style={{ marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 7 }}>
                {c.logo && <img src={c.logo} alt={c.issuer} style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 3, flexShrink: 0, background: "#fff", padding: 1 }} />}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                </div>
              </div>
            ))}
          </div>
        );
        if (idx === 7 && hasLangs) return (
          <div key={7}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10 }}>Languages</div>
            {data.languages.map((l: LanguageEntry) => l.name && (
              <div key={l.id} style={{ marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                <LEVEL_DOT level={l.level} accent={accent} />
              </div>
            ))}
          </div>
        );
        if (idx === 8 && hasAwards) return (
          <div key={8}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10 }}>Awards</div>
            {(data.awards ?? []).map((a: AwardEntry) => a.title && (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{a.title}</div>
                <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{a.issuer}{a.year && ` · ${a.year}`}</div>
              </div>
            ))}
          </div>
        );
        if (idx === 9 && hasInterests && !thumbnail) return (
          <div key={9}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10 }}>Interests</div>
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.5 }}>{data.interests}</p>
          </div>
        );
        return null;
      })}
    </>
  );
}

/* ── 1. CLASSIC ──────────────────────────────────────────── */
function TemplateClassic({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  return (
    <div style={thumbnail ? PAGE_THUMB : PAGE}>
      <div style={{ background: accent, padding: "28px 36px 22px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Photo src={data.photo} size={68} style={{ border: "3px solid rgba(255,255,255,.35)" }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-.5px", marginBottom: 4 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 14, fontWeight: 500, opacity: .85 }}>{data.title || "Job Title"}</div>
            <div style={{ marginTop: 8, opacity: .75 }}><ContactRow data={data} /></div>
          </div>
        </div>
      </div>
      <div style={{ padding: "24px 36px 36px", display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && <section style={{ marginBottom: 20 }}><SecTitle label="Summary" accent={accent} /><p style={{ color: "#4b5563", lineHeight: 1.6 }}>{data.summary}</p></section>}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Experience" accent={accent} />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 13 }}>{w.role || "Role"}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {data.edu.some(e => e.school) && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: 12 }}>{e.degree || "Degree"}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}{e.gpa ? <span style={{ fontWeight: 400, color: "#9ca3af" }}> · {e.gpa}</span> : null}</div>
                </div>
              ))}
            </section>
          )}
          <ExtraSections data={data} accent={accent} />
        </div>
        {skills.length > 0 && (
          <div style={{ width: 165, flexShrink: 0 }}>
            <SecTitle label="Skills" accent={accent} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {skills.map((s, i) => <span key={i} style={{ background: `${accent}18`, color: accent, fontSize: 10, fontWeight: 600, borderRadius: 3, padding: "2px 7px" }}>{s}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 2. MINIMAL ──────────────────────────────────────────── */
function TemplateMinimal({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontFamily: "'Georgia','Times New Roman',serif" }}>
      <div style={{ padding: "40px 48px 20px", borderBottom: `1px solid #e5e7eb`, display: "flex", alignItems: "flex-start", gap: 20 }}>
        <Photo src={data.photo} size={72} style={{ marginTop: 4 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.3px", color: "#111827", marginBottom: 4 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 13, color: accent, fontWeight: 500, marginBottom: 10 }}>{data.title || "Job Title"}</div>
          <ContactRow data={data} style={{ color: "#6b7280" }} />
        </div>
      </div>
      <div style={{ padding: "24px 48px 40px" }}>
        {data.summary && <section style={{ marginBottom: 24 }}><SecTitle label="Summary" accent={accent} /><p style={{ color: "#374151", lineHeight: 1.7, fontSize: 12 }}>{data.summary}</p></section>}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 24 }}>
            <SecTitle label="Experience" accent={accent} />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 16, display: "flex", gap: 16 }}>
                <div style={{ width: 90, flexShrink: 0, fontSize: 10, color: "#9ca3af", paddingTop: 2, textAlign: "right" as const }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13, color: "#111827" }}>{w.role || "Role"}</strong>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.55 }}>{w.desc}</p>}
                </div>
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 24 }}>
            <SecTitle label="Education" accent={accent} />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div style={{ width: 90, flexShrink: 0, fontSize: 10, color: "#9ca3af", textAlign: "right" as const }}>{e.year}</div>
                <div style={{ flex: 1 }}><strong style={{ fontSize: 12 }}>{e.degree}</strong><div style={{ fontSize: 11, color: accent }}>{e.school}</div></div>
              </div>
            ))}
          </section>
        )}
        {data.skills && <section style={{ marginBottom: 24 }}><SecTitle label="Skills" accent={accent} /><p style={{ color: "#374151", fontSize: 12 }}>{data.skills}</p></section>}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 3. BOLD ─────────────────────────────────────────────── */
function TemplateBold({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  return (
    <div style={thumbnail ? PAGE_THUMB : PAGE}>
      <div style={{ background: accent, padding: "36px 40px 28px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Photo src={data.photo} size={72} style={{ border: "3px solid rgba(255,255,255,.2)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 6 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,.7)", marginBottom: 14 }}>{data.title || "Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 11, color: "rgba(255,255,255,.6)" }}>
              {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
            </div>
          </div>
        </div>
      </div>
      {skills.length > 0 && (
        <div style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "12px 40px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.map((s, i) => <span key={i} style={{ background: accent, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 2, padding: "3px 9px" }}>{s}</span>)}
        </div>
      )}
      <div style={{ padding: "28px 40px 40px" }}>
        {data.summary && <section style={{ marginBottom: 24 }}><div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: accent, marginBottom: 10 }}>Summary</div><p style={{ color: "#4b5563", lineHeight: 1.65, borderLeft: `4px solid ${accent}`, paddingLeft: 14 }}>{data.summary}</p></section>}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: accent, marginBottom: 14 }}>Experience</div>
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 16, borderLeft: "4px solid #e5e7eb", paddingLeft: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 14, color: "#111827" }}>{w.role || "Role"}</strong>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: accent, borderRadius: 3, padding: "2px 8px" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>{w.company}</div>
                {w.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.5 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: accent, marginBottom: 14 }}>Education</div>
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ borderLeft: "4px solid #e5e7eb", paddingLeft: 14, marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>{e.degree}</strong>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{e.school}{e.year && ` · ${e.year}`}</div>
              </div>
            ))}
          </section>
        )}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 4. COMPACT ──────────────────────────────────────────── */
function TemplateCompact({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontSize: 11 }}>
      <div style={{ background: accent, padding: "14px 32px 12px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Photo src={data.photo} size={48} style={{ border: "2px solid rgba(255,255,255,.4)" }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>{data.title || "Job Title"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, opacity: .8, textAlign: "right" as const }}>
          {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
        </div>
      </div>
      <div style={{ padding: "16px 32px 32px" }}>
        {data.summary && (
          <section style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${accent}20` }}>
            <p style={{ color: "#374151", lineHeight: 1.6, fontSize: 11 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 14 }}>
            <SecTitle label="Experience" accent={accent} />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 100, flexShrink: 0, paddingTop: 1 }}>
                  <div style={{ fontSize: 10, color: accent, fontWeight: 700 }}>{w.company}</div>
                  <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{w.role || "Role"}</strong>
                  {w.desc && <p style={{ color: "#4b5563", fontSize: 10, lineHeight: 1.5, marginTop: 2 }}>{w.desc}</p>}
                </div>
              </div>
            ))}
          </section>
        )}
        <div style={{ display: "flex", gap: 28 }}>
          {data.edu.some(e => e.school) && (
            <section style={{ flex: 1 }}>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 11 }}>{e.degree}</strong>
                  <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</div>
                  {e.year && <div style={{ fontSize: 9, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {skills.length > 0 && (
            <section style={{ flex: 1 }}>
              <SecTitle label="Skills" accent={accent} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {skills.map((s, i) => <span key={i} style={{ background: `${accent}12`, color: accent, fontSize: 9, fontWeight: 600, borderRadius: 3, padding: "2px 6px" }}>{s}</span>)}
              </div>
            </section>
          )}
        </div>
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 5. MODERN ───────────────────────────────────────────── */
function TemplateModern({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasProjects = data.projects?.some(p => p.name || p.desc);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex" }}>
      <div style={{ width: 220, flexShrink: 0, background: accent, color: "#fff", padding: "36px 20px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        {data.photo && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Photo src={data.photo} size={80} style={{ border: "3px solid rgba(255,255,255,.35)" }} />
          </div>
        )}
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2, marginBottom: 5 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 12, opacity: .8, fontWeight: 500 }}>{data.title || "Job Title"}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.3)", paddingBottom: 4, marginBottom: 10 }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10, opacity: .85 }}>
            {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
          </div>
        </div>
        {skills.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.3)", paddingBottom: 4, marginBottom: 10 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {skills.map((s, i) => <span key={i} style={{ background: "rgba(255,255,255,.15)", fontSize: 10, fontWeight: 600, borderRadius: 3, padding: "2px 8px" }}>{s}</span>)}
            </div>
          </div>
        )}
        {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
          if (idx === 7 && data.languages?.some(l => l.name)) return (
            <div key={7}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.3)", paddingBottom: 4, marginBottom: 10 }}>Languages</div>
              {data.languages.map((l: LanguageEntry) => l.name && (
                <div key={l.id} style={{ marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, opacity: .9 }}>{l.name}</span>
                  <LEVEL_DOT level={l.level} accent="#fff" />
                </div>
              ))}
            </div>
          );
          if (idx === 6 && data.certifications?.some(c => c.name)) return (
            <div key={6}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.3)", paddingBottom: 4, marginBottom: 10 }}>Certifications</div>
              {data.certifications.map((c: CertEntry) => c.name && (
                <div key={c.id} style={{ marginBottom: 7 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: .9 }}>{c.name}</div>
                  <div style={{ fontSize: 9, opacity: .6 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                </div>
              ))}
            </div>
          );
          return null;
        })}
      </div>
      <div style={{ flex: 1, padding: "36px 28px 40px" }}>
        {data.summary && <section style={{ marginBottom: 22 }}><SecTitle label="Summary" accent={accent} /><p style={{ color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p></section>}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 22 }}>
            <SecTitle label="Experience" accent={accent} />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: 13, color: "#111827" }}>{w.role || "Role"}</strong>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{w.company}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                {w.desc && <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5, marginTop: 3 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: hasProjects ? 22 : 0 }}>
            <SecTitle label="Education" accent={accent} />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>{e.degree}</strong>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</span>
                </div>
              </div>
            ))}
          </section>
        )}
        {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
          if (idx === 5 && hasProjects) return (
            <section key={5}>
              <SecTitle label="Projects" accent={accent} />
              {data.projects.map((p: ProjectEntry) => (p.name || p.desc) && (
                <div key={p.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}
                      {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent, fontWeight: 400 }} target="_blank" rel="noopener noreferrer">↗</a>}
                    </strong>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{[p.from, p.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  {p.desc && <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                </div>
              ))}
            </section>
          );
          return null;
        })}
      </div>
    </div>
  );
}

/* ── 6. CREATIVE ─────────────────────────────────────────── */
function TemplateCreative({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex" }}>
      <div style={{ width: 8, flexShrink: 0, background: accent }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "32px 36px 20px", borderBottom: `3px solid ${accent}`, display: "flex", alignItems: "center", gap: 16 }}>
          <Photo src={data.photo} size={70} style={{ border: `3px solid ${accent}40` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#111827", letterSpacing: "-1px", marginBottom: 4 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: accent, marginBottom: 10 }}>{data.title || "Job Title"}</div>
            <ContactRow data={data} />
          </div>
        </div>
        <div style={{ display: "flex", flex: 1 }}>
          <div style={{ flex: 1, padding: "20px 24px 36px" }}>
            {data.summary && <section style={{ marginBottom: 20 }}><SecTitle label="Summary" accent={accent} /><p style={{ color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p></section>}
            {data.work.some(w => w.company || w.role) && (
              <section style={{ marginBottom: 20 }}>
                <SecTitle label="Experience" accent={accent} />
                {data.work.map(w => (w.company || w.role) && (
                  <div key={w.id} style={{ marginBottom: 14, paddingLeft: 12, borderLeft: `3px solid ${accent}30` }}>
                    <strong style={{ fontSize: 13, color: "#111827" }}>{w.role || "Role"}</strong>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{w.company}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                    </div>
                    {w.desc && <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5, marginTop: 3 }}>{w.desc}</p>}
                  </div>
                ))}
              </section>
            )}
            {data.edu.some(e => e.school) && (
              <section style={{ marginBottom: 20 }}>
                <SecTitle label="Education" accent={accent} />
                {data.edu.map(e => e.school && (
                  <div key={e.id} style={{ marginBottom: 8, paddingLeft: 12, borderLeft: `3px solid ${accent}30` }}>
                    <strong style={{ fontSize: 12 }}>{e.degree}</strong>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: accent }}>{e.school}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</span>
                    </div>
                  </div>
                ))}
              </section>
            )}
            {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
              if (idx === 5 && data.projects?.some(p => p.name || p.desc)) return (
                <section key={5}>
                  <SecTitle label="Projects" accent={accent} />
                  {data.projects.map((p: ProjectEntry) => (p.name || p.desc) && (
                    <div key={p.id} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: `3px solid ${accent}30` }}>
                      <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                      {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }} target="_blank" rel="noopener noreferrer">↗</a>}
                      {p.desc && <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                    </div>
                  ))}
                </section>
              );
              return null;
            })}
          </div>
          {(skills.length > 0 || data.certifications?.some(c => c.name) || data.languages?.some(l => l.name)) && (
            <div style={{ width: 160, flexShrink: 0, background: "#f9fafb", padding: "20px 16px", borderLeft: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 18 }}>
              {skills.length > 0 && (
                <div>
                  <SecTitle label="Skills" accent={accent} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {skills.map((s, i) => <div key={i} style={{ fontSize: 11, color: "#374151", paddingLeft: 8, borderLeft: `2px solid ${accent}` }}>{s}</div>)}
                  </div>
                </div>
              )}
              {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
                if (idx === 7 && data.languages?.some(l => l.name)) return (
                  <div key={7}>
                    <SecTitle label="Languages" accent={accent} />
                    {data.languages.map((l: LanguageEntry) => l.name && (
                      <div key={l.id} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: "#374151" }}>{l.name}</div>
                        <LEVEL_DOT level={l.level} accent={accent} />
                      </div>
                    ))}
                  </div>
                );
                if (idx === 6 && data.certifications?.some(c => c.name)) return (
                  <div key={6}>
                    <SecTitle label="Certs" accent={accent} />
                    {data.certifications.map((c: CertEntry) => c.name && (
                      <div key={c.id} style={{ marginBottom: 7 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#374151" }}>{c.name}</div>
                        <div style={{ fontSize: 9, color: "#9ca3af" }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                      </div>
                    ))}
                  </div>
                );
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 7. SIDEBAR PRO ──────────────────────────────────────── */
function TemplateSidebarPro({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex" }}>
      <div style={{ flex: 1, padding: "36px 28px 40px" }}>
        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${accent}` }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", marginBottom: 4 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 13, color: accent, fontWeight: 600 }}>{data.title || "Job Title"}</div>
        </div>
        {data.summary && <section style={{ marginBottom: 20 }}><SecTitle label="Summary" accent={accent} /><p style={{ color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p></section>}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 20 }}>
            <SecTitle label="Work Experience" accent={accent} />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 13, color: "#111827" }}>{w.role || "Role"}</strong>
                  <span style={{ fontSize: 10, background: `${accent}15`, color: accent, fontWeight: 700, borderRadius: 10, padding: "1px 8px" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 3 }}>{w.company}</div>
                {w.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.5 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.projects?.some(p => p.name || p.desc) && (
          <section>
            <SecTitle label="Projects" accent={accent} />
            {data.projects.map((p: ProjectEntry) => (p.name || p.desc) && (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}
                    {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }} target="_blank" rel="noopener noreferrer">↗</a>}
                  </strong>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{[p.from, p.to].filter(Boolean).join(" – ")}</span>
                </div>
                {p.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
      <div style={{ width: 200, flexShrink: 0, background: "#f8fafc", borderLeft: "1px solid #e2e8f0", padding: "36px 18px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        {data.photo && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Photo src={data.photo} size={72} style={{ border: `3px solid ${accent}30` }} />
          </div>
        )}
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10 }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 10, color: "#374151" }}>
            {data.email    && <span style={{ wordBreak: "break-all" as const }}>✉ {data.email}</span>}
            {data.phone    && <span>✆ {data.phone}</span>}
            {data.location && <span>⌖ {data.location}</span>}
            {data.website  && <span style={{ wordBreak: "break-all" as const }}><i className="ti ti-world"/> {data.website}</span>}
            {data.linkedin && <span style={{ wordBreak: "break-all" as const }}>in {data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")}</span>}
            {data.github   && <span style={{ wordBreak: "break-all" as const }}>⌥ {data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")}</span>}
          </div>
        </div>
        {skills.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {skills.map((s, i) => <span key={i} style={{ background: `${accent}15`, color: accent, fontSize: 10, fontWeight: 600, borderRadius: 3, padding: "2px 7px" }}>{s}</span>)}
            </div>
          </div>
        )}
        {data.edu.some(e => e.school) && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 10 }}>Education</div>
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{e.degree}</div>
                <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</div>
                {e.year && <div style={{ fontSize: 9, color: "#9ca3af" }}>{e.year}</div>}
              </div>
            ))}
          </div>
        )}
        <SidebarExtras data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 8. EXECUTIVE ────────────────────────────────────────── */
function TemplateExecutive({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontFamily: "'Georgia','Times New Roman',serif" }}>
      <div style={{ padding: "48px 56px 24px", textAlign: "center" as const, borderBottom: `1px solid ${accent}` }}>
        {data.photo && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <Photo src={data.photo} size={80} style={{ border: `4px solid ${accent}30` }} />
          </div>
        )}
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, color: "#111827", marginBottom: 8 }}>{data.name || "Your Name"}</div>
        <div style={{ fontSize: 13, color: accent, letterSpacing: "1px", fontStyle: "italic", marginBottom: 14 }}>{data.title || "Job Title"}</div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "4px 20px", fontSize: 10, color: "#6b7280" }}>
          {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
        </div>
      </div>
      <div style={{ padding: "28px 56px 48px" }}>
        {data.summary && <section style={{ marginBottom: 24, textAlign: "center" as const }}><p style={{ color: "#374151", lineHeight: 1.8, fontStyle: "italic", fontSize: 12, maxWidth: 560, margin: "0 auto" }}>{data.summary}</p></section>}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 24 }}>
            <SecTitle label="Professional Experience" accent={accent} style={{ textAlign: "center" as const }} />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 13, color: "#111827", fontFamily: "Georgia,serif" }}>{w.role || "Role"}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                <div style={{ fontSize: 12, color: accent, marginBottom: 4 }}>{w.company}</div>
                {w.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.65 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
          if (idx === 5 && data.projects?.some(p => p.name)) return (
            <section key={5} style={{ marginBottom: 24 }}>
              <SecTitle label="Key Projects" accent={accent} style={{ textAlign: "center" as const }} />
              {data.projects.map((p: ProjectEntry) => p.name && (
                <div key={p.id} style={{ marginBottom: 10 }}>
                  <strong style={{ fontSize: 12, fontFamily: "Georgia,serif" }}>{p.name}</strong>
                  {p.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.65 }}>{p.desc}</p>}
                </div>
              ))}
            </section>
          );
          return null;
        })}
        <div style={{ display: "flex", gap: 32 }}>
          {data.edu.some(e => e.school) && (
            <section style={{ flex: 1 }}>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 12, fontFamily: "Georgia,serif" }}>{e.degree}</strong>
                  <div style={{ fontSize: 11, color: accent }}>{e.school}{e.year && ` · ${e.year}`}</div>
                </div>
              ))}
            </section>
          )}
          {data.skills && <section style={{ flex: 1 }}><SecTitle label="Core Competencies" accent={accent} /><p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7 }}>{data.skills}</p></section>}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && data.certifications?.some(c => c.name)) return (
              <section key={6} style={{ flex: 1 }}>
                <SecTitle label="Certifications" accent={accent} />
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 6 }}>
                    <strong style={{ fontSize: 11 }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: accent }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && data.languages?.some(l => l.name)) return (
              <section key={7} style={{ flex: 1 }}>
                <SecTitle label="Languages" accent={accent} />
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {data.languages.map((l: LanguageEntry) => l.name && (
                    <span key={l.id} style={{ fontSize: 11, color: "#374151" }}>
                      {l.name} <span style={{ color: accent, fontStyle: "italic", fontSize: 10 }}>({l.level})</span>
                    </span>
                  ))}
                </div>
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 9. TECH ─────────────────────────────────────────────── */
function TemplateTech({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontFamily: "'JetBrains Mono','Courier New',monospace" }}>
      <div style={{ background: "#0d1117", padding: "28px 36px 20px", color: "#e6edf3", display: "flex", alignItems: "center", gap: 20 }}>
        <Photo src={data.photo} size={64} style={{ border: `2px solid ${accent}60` }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", color: accent, marginBottom: 4 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 10 }}># {data.title || "Job Title"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 10, color: "#6e7681" }}>
            {data.email && <span>@ {data.email}</span>}{data.phone && <span>$ {data.phone}</span>}
            {data.location && <span>~ {data.location}</span>}
            {data.website  && <span>// {data.website}</span>}
            {data.linkedin && <span>// in/{data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")}</span>}
            {data.github   && <span>// {data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")}</span>}
          </div>
        </div>
      </div>
      {skills.length > 0 && (
        <div style={{ background: "#161b22", padding: "10px 36px", borderBottom: `1px solid ${accent}40` }}>
          <span style={{ fontSize: 10, color: "#6e7681", marginRight: 8 }}>skills:</span>
          <span style={{ fontSize: 10, color: accent }}>[{skills.map((s, i) => <span key={i}>"{s}"{i < skills.length - 1 ? ", " : ""}</span>)}]</span>
        </div>
      )}
      <div style={{ padding: "24px 36px 40px", fontFamily: "'Inter',sans-serif" }}>
        {data.summary && <section style={{ marginBottom: 22 }}><div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, fontFamily: "monospace", marginBottom: 10 }}>/* Summary */</div><p style={{ color: "#374151", lineHeight: 1.65 }}>{data.summary}</p></section>}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, fontFamily: "monospace", marginBottom: 12 }}>/* Experience */</div>
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 14, borderLeft: `2px solid ${accent}`, paddingLeft: 12 }}>
                <strong style={{ fontSize: 13, color: "#111827" }}>{w.role || "Role"}</strong>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: accent, fontFamily: "monospace" }}>{w.company}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" <i className="ti ti-arrow-right"/> ")}</span>
                </div>
                {w.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.5, marginTop: 3 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
          if (idx === 5 && data.projects?.some(p => p.name || p.desc)) return (
            <section key={5} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, fontFamily: "monospace", marginBottom: 12 }}>/* Projects */</div>
              {data.projects.map((p: ProjectEntry) => (p.name || p.desc) && (
                <div key={p.id} style={{ marginBottom: 12, borderLeft: `2px solid ${accent}60`, paddingLeft: 12 }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                  {p.url && <a href={p.url} style={{ marginLeft: 8, fontSize: 10, color: accent, fontFamily: "monospace" }} target="_blank" rel="noopener noreferrer"><i className="ti ti-arrow-right"/> {p.url}</a>}
                  {p.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                </div>
              ))}
            </section>
          );
          return null;
        })}
        <div style={{ display: "flex", gap: 28 }}>
          {data.edu.some(e => e.school) && (
            <section style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, fontFamily: "monospace", marginBottom: 12 }}>/* Education */</div>
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 12, marginBottom: 8 }}>
                  <strong style={{ fontSize: 12 }}>{e.degree}</strong>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{e.school}{e.year && ` · ${e.year}`}</div>
                </div>
              ))}
            </section>
          )}
          {(data.certifications?.some(c => c.name) || data.languages?.some(l => l.name)) && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
                if (idx === 6 && data.certifications?.some(c => c.name)) return (
                  <section key={6}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, fontFamily: "monospace", marginBottom: 10 }}>/* Certs */</div>
                    {data.certifications.map((c: CertEntry) => c.name && (
                      <div key={c.id} style={{ marginBottom: 6 }}>
                        <strong style={{ fontSize: 11 }}>{c.name}</strong>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                      </div>
                    ))}
                  </section>
                );
                if (idx === 7 && data.languages?.some(l => l.name)) return (
                  <section key={7}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, fontFamily: "monospace", marginBottom: 10 }}>/* Lang */</div>
                    {data.languages.map((l: LanguageEntry) => l.name && (
                      <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                        <LEVEL_DOT level={l.level} accent={accent} />
                      </div>
                    ))}
                  </section>
                );
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 10. SLATE ───────────────────────────────────────────── */
function TemplateSlate({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={thumbnail ? PAGE_THUMB : PAGE}>
      {/* Full-width accent header */}
      <div style={{ background: accent, padding: "26px 40px 22px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.4px", lineHeight: 1.1, marginBottom: 4 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: .82 }}>{data.title || "Job Title"}</div>
          </div>
          <Photo src={data.photo} size={60} style={{ border: "2px solid rgba(255,255,255,.35)", marginTop: 2 }} />
        </div>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "3px 16px", fontSize: 10, opacity: .78 }}>
          {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ display: "flex", padding: "24px 40px 36px", gap: 28 }}>
        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Summary" accent={accent} />
              <p style={{ color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Experience" accent={accent} />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <SecTitle label="Projects" accent={accent} />
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                    {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗ {p.url}</a>}
                    {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>

        {/* Right sidebar */}
        <div style={{ width: 170, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {skills.length > 0 && (
            <section>
              <SecTitle label="Skills" accent={accent} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {skills.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#374151" }}>{s}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.edu.some(e => e.school) && (
            <section>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && hasCerts) return (
              <section key={6}>
                <SecTitle label="Certifications" accent={accent} />
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && hasLangs) return (
              <section key={7}>
                <SecTitle label="Languages" accent={accent} />
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={accent} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 11. CRISP ───────────────────────────────────────────── */
function TemplateCrisp({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontFamily: "'Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ padding: "40px 48px 36px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, paddingBottom: 18, borderBottom: `2.5px solid #0a0a0a` }}>
          <Photo src={data.photo} size={68} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-.5px", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 4 }}>{data.title || "Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: 10, color: "#6b7280", marginTop: 7 }}>
              {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: "flex", gap: 36, marginTop: 20 }}>
          {/* Left — main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {data.summary && (
              <section style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#0a0a0a", marginBottom: 8 }}>Summary</div>
                <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.65 }}>{data.summary}</p>
              </section>
            )}
            {data.work.some(w => w.company || w.role) && (
              <section style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#0a0a0a", marginBottom: 8 }}>Experience</div>
                {data.work.map(w => (w.company || w.role) && (
                  <div key={w.id} style={{ marginBottom: 15, paddingLeft: 12, borderLeft: `3px solid ${accent}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                      <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                    </div>
                    <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                    {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                  </div>
                ))}
              </section>
            )}
            {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
              if (idx === 5 && data.projects?.some(p => p.name)) return (
                <section key={5}>
                  <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#0a0a0a", marginBottom: 8 }}>Projects</div>
                  {data.projects.map((p: ProjectEntry) => p.name && (
                    <div key={p.id} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: `3px solid ${accent}` }}>
                      <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                      {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗</a>}
                      {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                    </div>
                  ))}
                </section>
              );
              return null;
            })}
          </div>

          {/* Right — sidebar */}
          <div style={{ width: 158, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            {data.edu.some(e => e.school) && (
              <section>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#0a0a0a", marginBottom: 8 }}>Education</div>
                {data.edu.map(e => e.school && (
                  <div key={e.id} style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                    <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                    {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                  </div>
                ))}
              </section>
            )}
            {skills.length > 0 && (
              <section>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#0a0a0a", marginBottom: 8 }}>Skills</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {skills.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, color: "#374151", padding: "3px 0", borderBottom: "1px solid #f3f4f6" }}>{s}</span>
                  ))}
                </div>
              </section>
            )}
            {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
              if (idx === 6 && hasCerts) return (
                <section key={6}>
                  <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#0a0a0a", marginBottom: 8 }}>Certifications</div>
                  {data.certifications.map((c: CertEntry) => c.name && (
                    <div key={c.id} style={{ marginBottom: 7 }}>
                      <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                      <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                    </div>
                  ))}
                </section>
              );
              if (idx === 7 && hasLangs) return (
                <section key={7}>
                  <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#0a0a0a", marginBottom: 8 }}>Languages</div>
                  {data.languages.map((l: LanguageEntry) => l.name && (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                      <LEVEL_DOT level={l.level} accent={accent} />
                    </div>
                  ))}
                </section>
              );
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 12. NORDIC ──────────────────────────────────────────── */
function TemplateNordic({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const shape  = useContext(PhotoShapeCtx);
  const photoR = shape === "round" ? "50%" : "10px";
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex" }}>
      {/* Left sidebar — light slate */}
      <div style={{ width: 218, background: "#f1f5f9", padding: "36px 18px 36px 20px", display: "flex", flexDirection: "column", gap: 22, flexShrink: 0 }}>
        {/* Photo + name */}
        <div style={{ textAlign: "center" }}>
          {data.photo
            ? <img src={data.photo} alt="Profile" style={{ width: 88, height: 88, borderRadius: photoR, objectFit: "cover", border: `3px solid ${accent}` }} />
            : <div style={{ width: 88, height: 88, borderRadius: photoR, background: `${accent}1a`, border: `3px solid ${accent}40`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: accent }}>
                {(data.name || "?")[0]}
              </div>
          }
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", letterSpacing: "-.3px", marginTop: 10, lineHeight: 1.2 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 3 }}>{data.title || "Job Title"}</div>
        </div>

        {/* Contact */}
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.1px", textTransform: "uppercase" as const, color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 4, marginBottom: 9 }}>Contact</div>
          {[
            { icon: "✉", val: data.email },
            { icon: "✆", val: data.phone },
            { icon: "⌖", val: data.location },
            { icon: "ti-world", val: data.website },
            { icon: "in", val: data.linkedin ? data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "") : "" },
            { icon: "⌥",  val: data.github   ? data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")   : "" },
          ].filter(item => Boolean(item.val)).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 7, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, color: accent, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 10, color: "#374151", lineHeight: 1.4, wordBreak: "break-all" as const }}>{item.val}</span>
            </div>
          ))}
        </div>

        {skills.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.1px", textTransform: "uppercase" as const, color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 4, marginBottom: 9 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {skills.map((s, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: accent, background: `${accent}18`, borderRadius: 3, padding: "2px 7px" }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        <SidebarExtras data={data} accent={accent} />
      </div>

      {/* Right main content */}
      <div style={{ flex: 1, padding: "36px 30px", overflowY: "hidden" as const }}>
        {data.summary && (
          <section style={{ marginBottom: 22 }}>
            <SecTitle label="About" accent={accent} />
            <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 22 }}>
            <SecTitle label="Experience" accent={accent} />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ fontSize: 12, color: "#111827", display: "block" }}>{w.role}</strong>
                    <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{w.company}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0, marginTop: 2 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 4 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 22 }}>
            <SecTitle label="Education" accent={accent} />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}</div>
              </div>
            ))}
          </section>
        )}
        {data.projects?.some(p => p.name) && (
          <section>
            <SecTitle label="Projects" accent={accent} />
            {data.projects.map((p: ProjectEntry) => p.name && (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗ {p.url}</a>}
                {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/* ── 13. TIMELINE ────────────────────────────────────────── */
function TemplateTimeline({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={thumbnail ? PAGE_THUMB : PAGE}>
      {/* Header with bottom accent rule */}
      <div style={{ padding: "30px 44px 20px", borderBottom: `3px solid ${accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Photo src={data.photo} size={72} style={{ border: `3px solid ${accent}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", letterSpacing: "-.5px", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 3 }}>{data.title || "Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: 10, color: "#6b7280", marginTop: 7 }}>
              {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
            </div>
          </div>
          {skills.length > 0 && (
            <div style={{ width: 156, flexShrink: 0, background: `${accent}0f`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, marginBottom: 7 }}>Core Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {skills.slice(0, 12).map((s, i) => (
                  <span key={i} style={{ fontSize: 10, color: accent, fontWeight: 600, background: "#fff", borderRadius: 3, padding: "1px 6px", border: `1px solid ${accent}30` }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "22px 44px 32px", display: "flex", gap: 28 }}>
        {/* Main — timeline layout */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 22 }}>
              <SecTitle label="Summary" accent={accent} />
              <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}

          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 22 }}>
              <SecTitle label="Experience" accent={accent} />
              {/* Timeline track */}
              <div style={{ position: "relative", paddingLeft: 22 }}>
                <div style={{ position: "absolute", left: 5, top: 6, bottom: 4, width: 2, background: `${accent}28` }} />
                {data.work.map(w => (w.company || w.role) && (
                  <div key={w.id} style={{ position: "relative", marginBottom: 16 }}>
                    {/* Timeline dot */}
                    <div style={{ position: "absolute", left: -22 + 2, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#fff", border: `2.5px solid ${accent}`, boxShadow: `0 0 0 3px ${accent}22` }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                      <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                    </div>
                    <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                    {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <SecTitle label="Projects" accent={accent} />
                <div style={{ position: "relative", paddingLeft: 22 }}>
                  <div style={{ position: "absolute", left: 5, top: 6, bottom: 4, width: 2, background: `${accent}28` }} />
                  {data.projects.map((p: ProjectEntry) => p.name && (
                    <div key={p.id} style={{ position: "relative", marginBottom: 12 }}>
                      <div style={{ position: "absolute", left: -22 + 2, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#fff", border: `2.5px solid ${accent}`, boxShadow: `0 0 0 3px ${accent}22` }} />
                      <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                      {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗ {p.url}</a>}
                      {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                    </div>
                  ))}
                </div>
              </section>
            );
            return null;
          })}
        </div>

        {/* Right sidebar */}
        <div style={{ width: 162, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 11 }}>
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && hasCerts) return (
              <section key={6}>
                <SecTitle label="Certifications" accent={accent} />
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && hasLangs) return (
              <section key={7}>
                <SecTitle label="Languages" accent={accent} />
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={accent} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 14. HORIZON ─────────────────────────────────────────── */
function TemplateHorizon({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const shape  = useContext(PhotoShapeCtx);
  const photoR = shape === "round" ? "50%" : "10px";
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex" }}>
      {/* Dark left panel */}
      <div style={{ width: 226, background: accent, color: "#fff", padding: "36px 18px 36px 22px", display: "flex", flexDirection: "column", gap: 24, flexShrink: 0 }}>
        {/* Avatar */}
        {data.photo
          ? <img src={data.photo} alt="Profile" style={{ width: 80, height: 80, borderRadius: photoR, objectFit: "cover", border: "3px solid rgba(255,255,255,.35)", margin: "0 auto", display: "block" }} />
          : <div style={{ width: 80, height: 80, borderRadius: photoR, background: "rgba(255,255,255,.15)", border: "3px solid rgba(255,255,255,.35)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>
              {(data.name || "?")[0]}
            </div>
        }

        {/* Contact */}
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.25)", paddingBottom: 4, marginBottom: 9 }}>Contact</div>
          {[
            { icon: "✉", val: data.email },
            { icon: "✆", val: data.phone },
            { icon: "⌖", val: data.location },
            { icon: "ti-world", val: data.website },
            { icon: "in", val: data.linkedin ? data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "") : "" },
            { icon: "⌥",  val: data.github   ? data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")   : "" },
          ].filter(item => Boolean(item.val)).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 7, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, opacity: .7, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 10, opacity: .88, lineHeight: 1.4, wordBreak: "break-all" as const }}>{item.val}</span>
            </div>
          ))}
        </div>

        {skills.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.25)", paddingBottom: 4, marginBottom: 9 }}>Skills</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {skills.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,.5)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, opacity: .88 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.edu.some(e => e.school) && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.25)", paddingBottom: 4, marginBottom: 9 }}>Education</div>
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 11, display: "block", opacity: .95 }}>{e.degree}</strong>
                <span style={{ fontSize: 10, opacity: .7 }}>{e.school}{e.year && ` · ${e.year}`}</span>
              </div>
            ))}
          </div>
        )}

        {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
          if (idx === 7 && hasLangs) return (
            <div key={7}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.25)", paddingBottom: 4, marginBottom: 9 }}>Languages</div>
              {data.languages.map((l: LanguageEntry) => l.name && (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, opacity: .88 }}>{l.name}</span>
                  <LEVEL_DOT level={l.level} accent="rgba(255,255,255,.8)" />
                </div>
              ))}
            </div>
          );
          if (idx === 6 && hasCerts) return (
            <div key={6}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, opacity: .6, borderBottom: "1px solid rgba(255,255,255,.25)", paddingBottom: 4, marginBottom: 9 }}>Certifications</div>
              {data.certifications.map((c: CertEntry) => c.name && (
                <div key={c.id} style={{ marginBottom: 7 }}>
                  <strong style={{ fontSize: 11, opacity: .95, display: "block" }}>{c.name}</strong>
                  <span style={{ fontSize: 10, opacity: .65 }}>{c.issuer}{c.year && ` · ${c.year}`}</span>
                </div>
              ))}
            </div>
          );
          return null;
        })}
      </div>

      {/* White right panel */}
      <div style={{ flex: 1, padding: "0 0 32px 0", display: "flex", flexDirection: "column", overflowY: "hidden" as const }}>
        {/* Name band */}
        <div style={{ padding: "30px 30px 18px", borderBottom: `1px solid #e5e7eb` }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", letterSpacing: "-.4px", lineHeight: 1.15 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 3 }}>{data.title || "Job Title"}</div>
        </div>

        <div style={{ padding: "20px 30px", flex: 1 }}>
          {data.summary && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Summary" accent={accent} />
              <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Experience" accent={accent} />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <SecTitle label="Projects" accent={accent} />
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                    {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗ {p.url}</a>}
                    {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 15. ORBIT ─── sidebar + skill-bar (Novoresume-style) ── */
function TemplateOrbit({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const shape  = useContext(PhotoShapeCtx);
  const photoR = shape === "round" ? "50%" : "10px";
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex" }}>
      {/* Tinted left sidebar */}
      <div style={{ width: 215, background: `${accent}0c`, borderRight: `3px solid ${accent}`, padding: "32px 18px", display: "flex", flexDirection: "column", gap: 22, flexShrink: 0 }}>
        {/* Photo + name */}
        <div style={{ textAlign: "center" }}>
          {data.photo
            ? <img src={data.photo} alt="P" style={{ width: 86, height: 86, borderRadius: photoR, objectFit: "cover", border: `3px solid ${accent}`, display: "block", margin: "0 auto" }} />
            : <div style={{ width: 86, height: 86, borderRadius: photoR, background: `${accent}20`, border: `3px solid ${accent}50`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: accent }}>
                {(data.name || "?")[0]}
              </div>
          }
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginTop: 10, lineHeight: 1.2 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 3 }}>{data.title || "Job Title"}</div>
        </div>

        {/* Contact */}
        <div>
          <SecTitle label="Contact" accent={accent} />
          {[
            { icon: "✉", val: data.email },
            { icon: "✆", val: data.phone },
            { icon: "⌖", val: data.location },
            { icon: "ti-world", val: data.website },
            { icon: "in", val: data.linkedin ? data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "") : "" },
            { icon: "⌥",  val: data.github   ? data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")   : "" },
          ].filter(item => Boolean(item.val)).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, color: accent, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.4, wordBreak: "break-all" as const }}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* Skills with progress bars */}
        {skills.length > 0 && (
          <div>
            <SecTitle label="Skills" accent={accent} />
            {skills.map((s, i) => {
              const fill = 58 + (s.charCodeAt(0) + s.length * 7) % 38;
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>{s}</span>
                  <div style={{ height: 5, borderRadius: 99, background: `${accent}20`, overflow: "hidden", marginTop: 3 }}>
                    <div style={{ height: "100%", width: `${fill}%`, borderRadius: 99, background: accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SidebarExtras data={data} accent={accent} />
      </div>

      {/* Right content */}
      <div style={{ flex: 1, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {data.summary && (
          <section>
            <SecTitle label="Summary" accent={accent} />
            <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section>
            <SecTitle label="Experience" accent={accent} />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section>
            <SecTitle label="Education" accent={accent} />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}</div>
              </div>
            ))}
          </section>
        )}
        {data.projects?.some(p => p.name) && (
          <section>
            <SecTitle label="Projects" accent={accent} />
            {data.projects.map((p: ProjectEntry) => p.name && (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗ {p.url}</a>}
                {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/* ── 16. APEX ─── tri-split header (APAC / corporate) ─────── */
function TemplateApex({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  return (
    <div style={thumbnail ? PAGE_THUMB : PAGE}>
      {/* Three-panel header */}
      <div style={{ display: "flex", background: accent, color: "#fff", minHeight: 130 }}>
        {/* Photo panel */}
        <div style={{ width: 118, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "rgba(0,0,0,.18)", padding: "20px 14px" }}>
          {data.photo
            ? <img src={data.photo} alt="P" style={{ width: 78, height: 78, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,.45)" }} />
            : <div style={{ width: 78, height: 78, borderRadius: "50%", background: "rgba(255,255,255,.18)", border: "2px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>
                {(data.name || "?")[0]}
              </div>
          }
        </div>
        {/* Name + title */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "22px 22px" }}>
          <div style={{ fontSize: 25, fontWeight: 900, letterSpacing: "-.4px", lineHeight: 1.15 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 12, fontWeight: 500, opacity: .8, marginTop: 5, letterSpacing: ".3px" }}>{data.title || "Job Title"}</div>
        </div>
        {/* Contact panel */}
        <div style={{ width: 192, display: "flex", flexDirection: "column", justifyContent: "center", padding: "22px 20px", background: "rgba(0,0,0,.12)", gap: 6 }}>
          {contactFields(data).map(({ icon, text }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, opacity: .84, lineHeight: 1.4 }}>{icon}{text}</div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", padding: "22px 36px 32px", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Professional Summary" accent={accent} />
              <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Work Experience" accent={accent} />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          <ExtraSections data={data} accent={accent} />
        </div>
        <div style={{ width: 168, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 11 }}>
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {skills.length > 0 && (
            <section>
              <SecTitle label="Skills" accent={accent} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {skills.map((s, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 600, color: accent, background: `${accent}12`, borderRadius: 3, padding: "2px 7px" }}>{s}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 17. CANVAS ── bold header + skill pills (Canva-inspired) */
function TemplateCanvas({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={thumbnail ? PAGE_THUMB : PAGE}>
      {/* Bold full-color header */}
      <div style={{ background: accent, padding: "34px 44px 28px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {data.photo && (
            <img src={data.photo} alt="P" style={{ width: 88, height: 88, borderRadius: 12, objectFit: "cover", border: "3px solid rgba(255,255,255,.35)", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-.5px", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: .8, marginTop: 5, marginBottom: 11 }}>{data.title || "Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {contactFields(data).map(({ icon, text }, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, background: "rgba(255,255,255,.2)", borderRadius: 20, padding: "3px 10px", fontWeight: 500 }}>{icon}{text}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Skills pill strip */}
      {skills.length > 0 && (
        <div style={{ background: `${accent}0a`, borderBottom: `1px solid ${accent}20`, padding: "11px 44px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.map((s, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: accent, background: "#fff", borderRadius: 20, padding: "3px 11px", border: `1px solid ${accent}28` }}>{s}</span>
          ))}
        </div>
      )}

      {/* Two-column body */}
      <div style={{ display: "flex", padding: "22px 44px 32px", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Summary" accent={accent} />
              <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Experience" accent={accent} />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <SecTitle label="Projects" accent={accent} />
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                    {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗</a>}
                    {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
        <div style={{ width: 168, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && hasCerts) return (
              <section key={6}>
                <SecTitle label="Certifications" accent={accent} />
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && hasLangs) return (
              <section key={7}>
                <SecTitle label="Languages" accent={accent} />
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={accent} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 18. LUXE ─── dark luxury with gold (finance / law) ────── */
function TemplateLuxe({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const gold = "#c9a84c";
  const extraOrder = useExtraSectionOrder();
  const SecL = ({ label }: { label: string }) => (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: gold, borderBottom: `1px solid ${gold}55`, paddingBottom: 4, marginBottom: 10 }}>{label}</div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), background: "#fafaf9", fontFamily: "Georgia,'Times New Roman',serif" }}>
      {/* Dark header */}
      <div style={{ background: accent, padding: "30px 44px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Photo src={data.photo} size={70} style={{ border: `2px solid ${gold}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: ".5px", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 11, color: gold, fontWeight: 400, marginTop: 5, letterSpacing: "1.8px", textTransform: "uppercase" as const }}>{data.title || "Job Title"}</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${gold}45`, marginTop: 16, paddingTop: 12, display: "flex", flexWrap: "wrap", gap: "3px 18px" }}>
          {contactFields(data).map(({ icon, text }, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "rgba(255,255,255,.72)", letterSpacing: ".3px" }}>{icon}{text}</span>
          ))}
        </div>
      </div>
      {/* Gold bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg,${gold},${gold}55)` }} />

      {/* Body */}
      <div style={{ display: "flex", padding: "24px 44px 36px", gap: 30 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 22 }}>
              <SecL label="Summary" />
              <p style={{ fontSize: 12, color: "#44403c", lineHeight: 1.7, fontStyle: "italic" }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 22 }}>
              <SecL label="Experience" />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#1c1917" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#a8a29e", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: gold, fontWeight: 600, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#57534e", lineHeight: 1.6 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <SecL label="Notable Projects" />
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 11 }}>
                    <strong style={{ fontSize: 12, color: "#1c1917" }}>{p.name}</strong>
                    {p.desc && <p style={{ fontSize: 11, color: "#57534e", lineHeight: 1.6, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
        <div style={{ width: 168, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <SecL label="Education" />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 11 }}>
                  <strong style={{ fontSize: 11, color: "#1c1917", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: gold, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#a8a29e" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {skills.length > 0 && (
            <section>
              <SecL label="Expertise" />
              {skills.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 5, height: 5, background: gold, transform: "rotate(45deg)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#44403c" }}>{s}</span>
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && data.certifications?.some(c => c.name)) return (
              <section key={6}>
                <SecL label="Credentials" />
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 11, color: "#1c1917" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: gold }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && data.languages?.some(l => l.name)) return (
              <section key={7}>
                <SecL label="Languages" />
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#44403c" }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={gold} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 19. VEGA ─── skills-first combination format ─────────── */
function TemplateVega({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={thumbnail ? PAGE_THUMB : PAGE}>
      {/* Header */}
      <div style={{ padding: "30px 44px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
          <Photo src={data.photo} size={70} style={{ borderRadius: 8, border: `2px solid ${accent}30` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 27, fontWeight: 900, color: "#111827", letterSpacing: "-.4px", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 4 }}>{data.title || "Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: 10, color: "#6b7280", marginTop: 7 }}>
              {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* ★ SKILLS FIRST — the combination-format differentiator */}
      {skills.length > 0 && (
        <div style={{ margin: "0 44px 18px", padding: "14px 18px", background: `${accent}08`, borderRadius: 10, border: `1px solid ${accent}1e` }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: accent, marginBottom: 9 }}>Core Competencies</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {skills.map((s, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#fff", borderRadius: 5, padding: "4px 10px", border: `1px solid ${accent}22` }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {data.summary && (
        <section style={{ margin: "0 44px 18px", paddingBottom: 18, borderBottom: "1px solid #e5e7eb" }}>
          <SecTitle label="Professional Summary" accent={accent} />
          <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
        </section>
      )}

      {/* Two-column body */}
      <div style={{ display: "flex", padding: "0 44px 32px", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <SecTitle label="Work Experience" accent={accent} />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <SecTitle label="Key Projects" accent={accent} />
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                    {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗</a>}
                    {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
        <div style={{ width: 168, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <SecTitle label="Education" accent={accent} />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 11 }}>
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && hasCerts) return (
              <section key={6}>
                <SecTitle label="Certifications" accent={accent} />
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && hasLangs) return (
              <section key={7}>
                <SecTitle label="Languages" accent={accent} />
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={accent} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 20. FOLIO ─── wide dark sidebar + photo, suits designers ── */
function TemplateFolio({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  const SH = ({ label }: { label: string }) => (
    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#fff", opacity: .5, borderBottom: "1px solid rgba(255,255,255,.18)", paddingBottom: 4, marginBottom: 10 }}>{label}</div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex", fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif" }}>
      {/* LEFT SIDEBAR */}
      <div style={{ width: 210, background: accent, flexShrink: 0, padding: "32px 22px", display: "flex", flexDirection: "column", gap: 22, color: "#fff" }}>
        <Photo src={data.photo} size={78} style={{ border: "3px solid rgba(255,255,255,.3)", alignSelf: "center" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-.2px" }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 10, opacity: .75, marginTop: 5, letterSpacing: ".8px", textTransform: "uppercase" as const }}>{data.title || "Job Title"}</div>
        </div>
        {/* Contact */}
        <div>
          <SH label="Contact" />
          {contactFields(data).map(({ icon, text }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, opacity: .82, marginBottom: 5 }}>{icon}{text}</div>
          ))}
        </div>
        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <SH label="Skills" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {skills.map((s, i) => (
                <span key={i} style={{ fontSize: 9, fontWeight: 600, background: "rgba(255,255,255,.18)", borderRadius: 4, padding: "3px 8px" }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {/* Education in sidebar */}
        {data.edu.some(e => e.school) && (
          <div>
            <SH label="Education" />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{e.degree}</div>
                <div style={{ fontSize: 10, opacity: .75 }}>{e.school}</div>
                {e.year && <div style={{ fontSize: 10, opacity: .55 }}>{e.year}</div>}
              </div>
            ))}
          </div>
        )}
        {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
          if (idx === 7 && hasLangs) return (
            <div key={7}>
              <SH label="Languages" />
              {data.languages.map((l: LanguageEntry) => l.name && (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, opacity: .85 }}>{l.name}</span>
                  <LEVEL_DOT level={l.level} accent="#fff" />
                </div>
              ))}
            </div>
          );
          if (idx === 6 && hasCerts) return (
            <div key={6}>
              <SH label="Certifications" />
              {data.certifications.map((c: CertEntry) => c.name && (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 9, opacity: .65 }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                </div>
              ))}
            </div>
          );
          return null;
        })}
      </div>
      {/* RIGHT BODY */}
      <div style={{ flex: 1, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {data.summary && (
          <section>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 9 }}>Profile</div>
            <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.7 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 9 }}>Experience</div>
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 16, paddingLeft: 12, borderLeft: `3px solid ${accent}25` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.55 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
          if (idx === 5 && data.projects?.some(p => p.name)) return (
            <section key={5}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase" as const, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 9 }}>Projects</div>
              {data.projects.map((p: ProjectEntry) => p.name && (
                <div key={p.id} style={{ marginBottom: 11, paddingLeft: 12, borderLeft: `3px solid ${accent}25` }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                  {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗</a>}
                  {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                </div>
              ))}
            </section>
          );
          return null;
        })}
      </div>
    </div>
  );
}

/* ── 21. STRIPE ─── accent left-border, ultra-scannable ────── */
function TemplateStripe({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ borderLeft: `6px solid ${accent}`, padding: "28px 44px 22px 38px", borderBottom: `1px solid #e5e7eb` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Photo src={data.photo} size={64} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#111827", letterSpacing: "-.5px", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 4 }}>{data.title || "Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 16px", fontSize: 10, color: "#6b7280", marginTop: 6 }}>
              {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Skills bar */}
      {skills.length > 0 && (
        <div style={{ borderLeft: `6px solid ${accent}`, padding: "10px 44px 10px 38px", background: `${accent}08`, display: "flex", flexWrap: "wrap", gap: 6, borderBottom: `1px solid ${accent}22` }}>
          {skills.map((s, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: accent, background: "#fff", border: `1px solid ${accent}33`, borderRadius: 4, padding: "3px 9px" }}>{s}</span>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ display: "flex", padding: "22px 44px 32px 44px", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Summary</div>
              </div>
              <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65, paddingLeft: 12 }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Experience</div>
              </div>
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14, paddingLeft: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Projects</div>
                </div>
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 10, paddingLeft: 12 }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                    {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗</a>}
                    {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
        <div style={{ width: 162, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Education</div>
              </div>
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 11, paddingLeft: 12 }}>
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && hasCerts) return (
              <section key={6}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Certs</div>
                </div>
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8, paddingLeft: 12 }}>
                    <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: accent }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && hasLangs) return (
              <section key={7}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Languages</div>
                </div>
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, paddingLeft: 12 }}>
                    <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={accent} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 22. MONO ─── dark terminal / developer aesthetic ──────── */
function TemplateMono({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  const bg = "#1e1e2e";
  const surface = "#2a2a3e";
  const dimText = "#a6adc8";
  const muted = "#6c7086";
  const green = "#a6e3a1";
  const yellow = "#f9e2af";

  // ASCII-safe contact items for monospace rendering
  const monoContact = [
    data.email    && `mail: ${data.email}`,
    data.phone    && `tel:  ${data.phone}`,
    data.location && `loc:  ${data.location}`,
    data.website  && `web:  ${data.website}`,
    data.linkedin && `li:   ${data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")}`,
    data.github   && `gh:   ${data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, "")}`,
  ].filter(Boolean) as string[];

  const SecM = ({ label }: { label: string }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: green, fontFamily: "'Courier New',monospace", marginBottom: 10, letterSpacing: ".5px" }}>
      <span style={{ color: muted }}>// </span>{label.toUpperCase()}
    </div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), background: bg, color: dimText, fontFamily: "'Courier New',Courier,monospace" }}>
      {/* Header */}
      <div style={{ background: surface, padding: "28px 40px 22px", borderBottom: `1px solid #313244` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Photo src={data.photo} size={64} style={{ borderRadius: 4, border: `2px solid ${green}55` }} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ color: muted, fontSize: 13 }}>$</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#cdd6f4", letterSpacing: "-.2px" }}>{data.name || "Your Name"}</span>
            </div>
            <div style={{ fontSize: 11, color: green, marginTop: 5 }}>{data.title || "// Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 20px", fontSize: 10, color: muted, marginTop: 7 }}>
              {monoContact.map((v, i) => <span key={i}>{v}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div style={{ padding: "12px 40px", background: "#181825", borderBottom: "1px solid #313244", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.map((s, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: yellow, background: `${yellow}15`, border: `1px solid ${yellow}33`, borderRadius: 3, padding: "2px 8px" }}>{s}</span>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ display: "flex", padding: "22px 40px 32px", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 20 }}>
              <SecM label="About" />
              <p style={{ fontSize: 11, color: dimText, lineHeight: 1.7, borderLeft: `2px solid ${green}40`, paddingLeft: 12 }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <SecM label="Experience" />
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14, paddingLeft: 12, borderLeft: `2px solid #313244` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#cdd6f4" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: green, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: dimText, lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <SecM label="Projects" />
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: `2px solid #313244` }}>
                    <strong style={{ fontSize: 12, color: "#cdd6f4" }}>
                      <span style={{ color: muted }}>&gt; </span>{p.name}
                      {p.url  && <a href={p.url}  style={{ marginLeft: 8, fontSize: 10, color: green, fontWeight: 400 }}>[link]</a>}
                      {p.repo && <a href={p.repo} style={{ marginLeft: 6, fontSize: 10, color: muted, fontWeight: 400 }}>[repo]</a>}
                    </strong>
                    {p.desc && <p style={{ fontSize: 11, color: dimText, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
        <div style={{ width: 162, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <SecM label="Education" />
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 11 }}>
                  <strong style={{ fontSize: 11, color: "#cdd6f4", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: green }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: muted }}>{e.year}</div>}
                  {e.gpa  && <div style={{ fontSize: 10, color: muted }}>GPA: {e.gpa}</div>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && hasCerts) return (
              <section key={6}>
                <SecM label="Certs" />
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 11, color: "#cdd6f4" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: green }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && hasLangs) return (
              <section key={7}>
                <SecM label="Languages" />
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: dimText }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={green} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 23. PRISM ─── bold angled gradient header, modern ─────── */
function TemplatePrism({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const light = `${accent}18`;
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif" }}>
      {/* Angled header */}
      <div style={{ position: "relative", background: `linear-gradient(135deg, ${accent} 60%, ${accent}cc 100%)`, padding: "32px 44px 52px", overflow: "hidden" }}>
        {/* Geometric accent circle */}
        <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <div style={{ position: "absolute", right: 30, bottom: -50, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative", zIndex: 1 }}>
          <Photo src={data.photo} size={72} style={{ border: "3px solid rgba(255,255,255,.4)", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-.4px", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.82)", fontWeight: 500, marginTop: 5, letterSpacing: ".5px" }}>{data.title || "Job Title"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 10, color: "rgba(255,255,255,.68)", marginTop: 8 }}>
              {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
            </div>
          </div>
        </div>
      </div>
      {/* Angled cutout */}
      <div style={{ height: 0, borderLeft: "794px solid transparent", borderTop: `28px solid ${accent}cc`, marginTop: -1 }} />

      {/* Skills chips */}
      {skills.length > 0 && (
        <div style={{ padding: "4px 44px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.map((s, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: accent, background: light, borderRadius: 20, padding: "3px 11px", border: `1px solid ${accent}33` }}>{s}</span>
          ))}
        </div>
      )}

      {/* Two-column body */}
      <div style={{ display: "flex", padding: "10px 44px 32px", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.summary && (
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                <div style={{ width: 18, height: 3, background: accent, borderRadius: 2 }} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>About</div>
              </div>
              <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>{data.summary}</p>
            </section>
          )}
          {data.work.some(w => w.company || w.role) && (
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                <div style={{ width: 18, height: 3, background: accent, borderRadius: 2 }} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Experience</div>
              </div>
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{w.desc}</p>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
            if (idx === 5 && data.projects?.some(p => p.name)) return (
              <section key={5}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                  <div style={{ width: 18, height: 3, background: accent, borderRadius: 2 }} />
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Projects</div>
                </div>
                {data.projects.map((p: ProjectEntry) => p.name && (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{p.name}</strong>
                    {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗</a>}
                    {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
        <div style={{ width: 162, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {data.edu.some(e => e.school) && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                <div style={{ width: 18, height: 3, background: accent, borderRadius: 2 }} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Education</div>
              </div>
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 11, padding: "8px 10px", background: light, borderRadius: 6 }}>
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                  {e.year && <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</div>}
                </div>
              ))}
            </section>
          )}
          {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
            if (idx === 6 && hasCerts) return (
              <section key={6}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                  <div style={{ width: 18, height: 3, background: accent, borderRadius: 2 }} />
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Certs</div>
                </div>
                {data.certifications.map((c: CertEntry) => c.name && (
                  <div key={c.id} style={{ marginBottom: 8, padding: "6px 10px", background: light, borderRadius: 6 }}>
                    <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                    <div style={{ fontSize: 10, color: accent }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                  </div>
                ))}
              </section>
            );
            if (idx === 7 && hasLangs) return (
              <section key={7}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                  <div style={{ width: 18, height: 3, background: accent, borderRadius: 2 }} />
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#111827" }}>Languages</div>
                </div>
                {data.languages.map((l: LanguageEntry) => l.name && (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                    <LEVEL_DOT level={l.level} accent={accent} />
                  </div>
                ))}
              </section>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 24. IVY ─── academic serif, centered header, single-col ─ */
function TemplateIvy({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const Rule = () => <div style={{ height: 1, background: `${accent}40`, margin: "0 0 14px" }} />;
  const extraOrder = useExtraSectionOrder();
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), fontFamily: "Georgia,'Times New Roman',serif", padding: "36px 54px 48px" }}>
      {/* Centered header */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <Photo src={data.photo} size={60} style={{ border: `2px solid ${accent}55`, margin: "0 auto 12px" }} />
        <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e", letterSpacing: ".5px", lineHeight: 1.15 }}>{data.name || "Your Name"}</div>
        <div style={{ fontSize: 11, color: accent, fontWeight: 400, marginTop: 5, letterSpacing: "2px", textTransform: "uppercase" as const, fontFamily: "'Inter',Arial,sans-serif" }}>{data.title || "Job Title"}</div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "3px 16px", fontSize: 10, color: "#6b7280", marginTop: 8, fontFamily: "'Inter',Arial,sans-serif" }}>
          {contactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{icon}{text}</span>)}
        </div>
      </div>

      {/* Double rule */}
      <div style={{ borderTop: `2px solid ${accent}`, borderBottom: `1px solid ${accent}55`, padding: "3px 0", margin: "16px 0" }} />

      {data.summary && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: accent, fontFamily: "'Inter',Arial,sans-serif", marginBottom: 8 }}>Abstract</div>
          <Rule />
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, fontStyle: "italic" }}>{data.summary}</p>
        </section>
      )}

      {data.work.some(w => w.company || w.role) && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: accent, fontFamily: "'Inter',Arial,sans-serif", marginBottom: 8 }}>Academic & Professional Experience</div>
          <Rule />
          {data.work.map(w => (w.company || w.role) && (
            <div key={w.id} style={{ marginBottom: 14, display: "flex", gap: 16 }}>
              <div style={{ width: 80, flexShrink: 0, textAlign: "right", fontSize: 10, color: "#9ca3af", paddingTop: 2, fontFamily: "'Inter',Arial,sans-serif" }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join("–")}</div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, color: "#111827", display: "block" }}>{w.role}</strong>
                <div style={{ fontSize: 11, color: accent, fontStyle: "italic", marginBottom: 2 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.6 }}>{w.desc}</p>}
              </div>
            </div>
          ))}
        </section>
      )}

      {data.edu.some(e => e.school) && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: accent, fontFamily: "'Inter',Arial,sans-serif", marginBottom: 8 }}>Education</div>
          <Rule />
          {data.edu.map(e => e.school && (
            <div key={e.id} style={{ marginBottom: 12, display: "flex", gap: 16 }}>
              <div style={{ width: 80, flexShrink: 0, textAlign: "right", fontSize: 10, color: "#9ca3af", paddingTop: 2, fontFamily: "'Inter',Arial,sans-serif" }}>{e.year}</div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, color: "#111827", display: "block" }}>{e.degree}</strong>
                <div style={{ fontSize: 11, color: accent, fontStyle: "italic" }}>{e.school}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Skills + Certs + Languages in a two-column footer */}
      {(skills.length > 0 || hasCerts || hasLangs) && (
        <div style={{ display: "flex", gap: 32, marginTop: 4 }}>
          {skills.length > 0 && (
            <section style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: accent, fontFamily: "'Inter',Arial,sans-serif", marginBottom: 8 }}>Research Interests & Skills</div>
              <Rule />
              <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8 }}>{skills.join(" · ")}</p>
            </section>
          )}
          {(hasCerts || hasLangs) && (
            <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
                if (idx === 6 && hasCerts) return (
                  <section key={6}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: accent, fontFamily: "'Inter',Arial,sans-serif", marginBottom: 8 }}>Credentials</div>
                    <Rule />
                    {data.certifications.map((c: CertEntry) => c.name && (
                      <div key={c.id} style={{ marginBottom: 7 }}>
                        <strong style={{ fontSize: 11, color: "#111827" }}>{c.name}</strong>
                        <div style={{ fontSize: 10, color: accent, fontStyle: "italic" }}>{c.issuer}{c.year && `, ${c.year}`}</div>
                      </div>
                    ))}
                  </section>
                );
                if (idx === 7 && hasLangs) return (
                  <section key={7}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: accent, fontFamily: "'Inter',Arial,sans-serif", marginBottom: 8 }}>Languages</div>
                    <Rule />
                    {data.languages.map((l: LanguageEntry) => l.name && (
                      <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: "#374151" }}>{l.name}</span>
                        <LEVEL_DOT level={l.level} accent={accent} />
                      </div>
                    ))}
                  </section>
                );
                return null;
              })}
            </div>
          )}
        </div>
      )}

      {data.projects?.some(p => p.name) && (
        <section style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: accent, fontFamily: "'Inter',Arial,sans-serif", marginBottom: 8 }}>Publications & Projects</div>
          <Rule />
          {data.projects.map((p: ProjectEntry) => p.name && (
            <div key={p.id} style={{ marginBottom: 10, display: "flex", gap: 16 }}>
              <div style={{ width: 80, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, color: "#111827", display: "block" }}>{p.name}</strong>
                {p.url && <a href={p.url} style={{ fontSize: 10, color: accent }}>{p.url}</a>}
                {p.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.6, marginTop: 2 }}>{p.desc}</p>}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/* ── 25. ONYX ─── full dark luxury, split sidebar ───────────── */
function TemplateOnyx({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasCerts = data.certifications?.some(c => c.name);
  const hasLangs = data.languages?.some(l => l.name);
  const extraOrder = useExtraSectionOrder();
  const bg = "#18181b";
  const sidebar = "#27272a";
  const border = "#3f3f46";
  const textMain = "#f4f4f5";
  const textMuted = "#a1a1aa";
  const SH = ({ label }: { label: string }) => (
    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.8px", textTransform: "uppercase" as const, color: accent, borderBottom: `1px solid ${accent}40`, paddingBottom: 4, marginBottom: 10 }}>{label}</div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex", background: bg, fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif" }}>
      {/* LEFT SIDEBAR */}
      <div style={{ width: 200, background: sidebar, flexShrink: 0, padding: "32px 20px", display: "flex", flexDirection: "column", gap: 22, borderRight: `1px solid ${border}` }}>
        <div>
          <Photo src={data.photo} size={72} style={{ border: `2px solid ${accent}55`, margin: "0 auto 14px", display: "block" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: textMain, lineHeight: 1.2 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 10, color: accent, marginTop: 5, letterSpacing: ".8px", textTransform: "uppercase" as const }}>{data.title || "Job Title"}</div>
          </div>
        </div>

        <div>
          <SH label="Contact" />
          {contactFields(data).map(({ icon, text }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: textMuted, marginBottom: 5 }}>{icon}{text}</div>
          ))}
        </div>

        {skills.length > 0 && (
          <div>
            <SH label="Skills" />
            {skills.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: textMuted }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {extraOrder.filter(i => i === 6 || i === 7).map(idx => {
          if (idx === 7 && hasLangs) return (
            <div key={7}>
              <SH label="Languages" />
              {data.languages.map((l: LanguageEntry) => l.name && (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: textMuted }}>{l.name}</span>
                  <LEVEL_DOT level={l.level} accent={accent} />
                </div>
              ))}
            </div>
          );
          if (idx === 6 && hasCerts) return (
            <div key={6}>
              <SH label="Certifications" />
              {data.certifications.map((c: CertEntry) => c.name && (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: textMain }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: accent }}>{c.issuer}{c.year && ` · ${c.year}`}</div>
                </div>
              ))}
            </div>
          );
          return null;
        })}
      </div>

      {/* RIGHT BODY */}
      <div style={{ flex: 1, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {data.summary && (
          <section>
            <SH label="Summary" />
            <p style={{ fontSize: 12, color: textMuted, lineHeight: 1.7 }}>{data.summary}</p>
          </section>
        )}

        {data.work.some(w => w.company || w.role) && (
          <section>
            <SH label="Experience" />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: textMain }}>{w.role}</strong>
                  <span style={{ fontSize: 10, color: textMuted, flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" – ")}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 3 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: textMuted, lineHeight: 1.55 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}

        {data.edu.some(e => e.school) && (
          <section>
            <SH label="Education" />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 11 }}>
                <strong style={{ fontSize: 11, color: textMain, display: "block" }}>{e.degree}</strong>
                <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{e.school}</span>
                {e.year && <div style={{ fontSize: 10, color: textMuted }}>{e.year}</div>}
              </div>
            ))}
          </section>
        )}

        {extraOrder.filter(i => i === 5 || i >= 8).map(idx => {
          if (idx === 5 && data.projects?.some(p => p.name)) return (
            <section key={5}>
              <SH label="Projects" />
              {data.projects.map((p: ProjectEntry) => p.name && (
                <div key={p.id} style={{ marginBottom: 11 }}>
                  <strong style={{ fontSize: 12, color: textMain }}>{p.name}</strong>
                  {p.url && <a href={p.url} style={{ marginLeft: 6, fontSize: 10, color: accent }}>↗</a>}
                  {p.desc && <p style={{ fontSize: 11, color: textMuted, lineHeight: 1.5, marginTop: 2 }}>{p.desc}</p>}
                </div>
              ))}
            </section>
          );
          return null;
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INTERNATIONAL ATS TEMPLATES  (26-35)
   ATS score 85+ design rules applied throughout:
   • atsContactItems() — no emoji/Unicode that confuse parsers
   • Standard headings: "Summary", "Work Experience", "Education", "Skills"
   • Strict single-column body — no side-by-side content blocks
   • Table-free, text-box-free, parseable linear reading order
   ══════════════════════════════════════════════════════════ */

/* ── 26. ZURICH ── Swiss clean, left accent strip, ATS-safe ─ */
function TemplateZurich({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" as const,
      color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 3, marginBottom: 12 }}>{label}</div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), display: "flex" }}>
      <div style={{ width: 5, background: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "38px 44px" }}>
        {/* Header — name left, contact right; both plain text for ATS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 20 }}>
          <div>
            <div style={{ fontSize: 31, fontWeight: 300, letterSpacing: "-1px", color: "#111827", lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginTop: 5, letterSpacing: ".3px" }}>{data.title || "Job Title"}</div>
          </div>
          <div style={{ textAlign: "right" as const, paddingTop: 4 }}>
            {atsContactFields(data).map(({ icon, text }, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#6b7280", marginBottom: 2 }}>{icon}{text}</div>)}
          </div>
        </div>
        {data.summary && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Summary" />
            <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.75, margin: 0 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Work Experience" />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                    {w.company && <span style={{ fontSize: 11, color: accent, fontWeight: 600, marginLeft: 8 }}>{w.company}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
                </div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, marginTop: 4, marginBottom: 0 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Education" />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{e.year}{e.gpa ? ` | ${e.gpa}` : ""}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 500 }}>{e.school}</div>
              </div>
            ))}
          </section>
        )}
        {skills.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Skills" />
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0 }}>{skills.join(", ")}</p>
          </section>
        )}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 27. BERLIN ── Bauhaus bold, ATS single-column body ───── */
function TemplateBerlin({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ background: `${accent}14`, borderLeft: `4px solid ${accent}`, padding: "5px 12px",
      fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" as const,
      color: accent, marginBottom: 12 }}>{label}</div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE) }}>
      <div style={{ background: "#1c1917", padding: "30px 40px 24px" }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#fafaf9", letterSpacing: "-1px", lineHeight: 1 }}>{data.name || "Your Name"}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginTop: 7, letterSpacing: "1px", textTransform: "uppercase" as const }}>{data.title || "Job Title"}</div>
        {/* ATS-safe contact — plain text, no emoji */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "3px 18px" }}>
          {atsContactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#a8a29e" }}>{icon}{text}</span>)}
        </div>
      </div>
      <div style={{ padding: "28px 40px" }}>
        {data.summary && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Summary" />
            <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.7, margin: 0, paddingLeft: 16 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Work Experience" />
            <div style={{ paddingLeft: 16 }}>
              {data.work.map(w => (w.company || w.role) && (
                <div key={w.id} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 13, color: "#111827" }}>{w.role}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 4 }}>{w.company}</div>
                  {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{w.desc}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {/* Single-column education — no side-by-side with skills */}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Education" />
            <div style={{ paddingLeft: 16 }}>
              {data.edu.map(e => e.school && (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}{e.gpa ? ` | ${e.gpa}` : ""}</span>
                  </div>
                  <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {skills.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Skills" />
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>{skills.join(", ")}</p>
          </section>
        )}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 28. PARIS ── French elegant, centered, EU photo slot ─── */
function TemplateParis({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ height: 1, flex: 1, background: `${accent}40` }} />
      <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase" as const, color: accent }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: `${accent}40` }} />
    </div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), padding: "36px 48px" }}>
      <div style={{ textAlign: "center" as const, marginBottom: 22 }}>
        {data.photo && <Photo src={data.photo} size={72} style={{ margin: "0 auto 14px", border: `2px solid ${accent}40` }} />}
        <div style={{ fontSize: 29, fontWeight: 300, letterSpacing: "2.5px", color: "#111827", textTransform: "uppercase" as const }}>{data.name || "Your Name"}</div>
        <div style={{ fontSize: 12, fontStyle: "italic" as const, color: accent, marginTop: 6, fontWeight: 500 }}>{data.title || "Job Title"}</div>
        {/* ATS-safe contacts — plain text, inline */}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "3px 14px" }}>
          {atsContactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, color: "#6b7280" }}>{icon}{text}</span>)}
        </div>
        <div style={{ marginTop: 16, height: 1, background: `${accent}30` }} />
      </div>
      {data.summary && (
        <section style={{ marginBottom: 20 }}>
          <SH label="Summary" />
          <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.75, margin: 0 }}>{data.summary}</p>
        </section>
      )}
      {data.work.some(w => w.company || w.role) && (
        <section style={{ marginBottom: 20 }}>
          <SH label="Work Experience" />
          {data.work.map(w => (w.company || w.role) && (
            <div key={w.id} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px dashed ${accent}25` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <strong style={{ fontSize: 12.5, color: "#111827" }}>{w.role}</strong>
                  {w.company && <span style={{ fontSize: 11, color: accent, fontStyle: "italic" as const, marginLeft: 8 }}>{w.company}</span>}
                </div>
                <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
              </div>
              {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, marginTop: 5, marginBottom: 0 }}>{w.desc}</p>}
            </div>
          ))}
        </section>
      )}
      {data.edu.some(e => e.school) && (
        <section style={{ marginBottom: 20 }}>
          <SH label="Education" />
          {data.edu.map(e => e.school && (
            <div key={e.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}{e.gpa ? ` | ${e.gpa}` : ""}</span>
              </div>
              <span style={{ fontSize: 11, color: accent, fontStyle: "italic" as const }}>{e.school}</span>
            </div>
          ))}
        </section>
      )}
      {skills.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <SH label="Skills" />
          <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0 }}>{skills.join(", ")}</p>
        </section>
      )}
      <ExtraSections data={data} accent={accent} />
    </div>
  );
}

/* ── 29. HARVARD ── US academic, traditional, education first ─ */
function TemplateHarvard({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: ".5px", textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ height: 1.5, background: accent, marginTop: 3 }} />
    </div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), padding: "44px 56px" }}>
      <div style={{ textAlign: "center" as const, marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${accent}` }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "1px", textTransform: "uppercase" as const }}>{data.name || "Your Name"}</div>
        {data.title && <div style={{ fontSize: 12.5, fontWeight: 400, color: accent, marginTop: 5, fontStyle: "italic" as const }}>{data.title}</div>}
        {/* ATS-safe: plain text contacts, no emoji */}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "3px 18px" }}>
          {atsContactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: "#374151" }}>{icon}{text}</span>)}
        </div>
      </div>
      {data.summary && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Summary" />
          <p style={{ fontSize: 11.5, color: "#1f2937", lineHeight: 1.8, margin: "8px 0 0" }}>{data.summary}</p>
        </section>
      )}
      {/* Education before experience — standard for academic CVs */}
      {data.edu.some(e => e.school) && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Education" />
          {data.edu.map(e => e.school && (
            <div key={e.id} style={{ marginBottom: 14, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 12.5, color: "#111827" }}>{e.school}</strong>
                <span style={{ fontSize: 10.5, color: "#6b7280" }}>{e.year}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#374151", fontStyle: "italic" as const }}>{e.degree}{e.gpa ? ` - GPA: ${e.gpa}` : ""}</div>
            </div>
          ))}
        </section>
      )}
      {data.work.some(w => w.company || w.role) && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Work Experience" />
          {data.work.map(w => (w.company || w.role) && (
            <div key={w.id} style={{ marginBottom: 16, marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <strong style={{ fontSize: 12.5, color: "#111827" }}>{w.role}</strong>
                  {w.company && <span style={{ fontSize: 11.5, color: "#374151" }}> - {w.company}</span>}
                </div>
                <span style={{ fontSize: 10.5, color: "#6b7280", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
              </div>
              {w.desc && <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.65, marginTop: 5, marginBottom: 0 }}>{w.desc}</p>}
            </div>
          ))}
        </section>
      )}
      {skills.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Skills" />
          <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.7, margin: "8px 0 0" }}>{skills.join(", ")}</p>
        </section>
      )}
      <ExtraSections data={data} accent={accent} />
    </div>
  );
}

/* ── 30. GENEVA ── Intl org, date-gutter, single-column ─────  */
function TemplateGeneva({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 18, height: 2, background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" as const, color: accent }}>{label}</span>
    </div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), padding: "44px 52px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10, paddingBottom: 16, borderBottom: `2px solid ${accent}` }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: accent, marginTop: 5 }}>{data.title || "Job Title"}</div>
        </div>
        {/* ATS-safe right-block contact */}
        <div style={{ textAlign: "right" as const }}>
          {atsContactFields(data).map(({ icon, text }, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#6b7280", marginBottom: 2 }}>{icon}{text}</div>)}
        </div>
      </div>
      {data.summary && (
        <section style={{ marginBottom: 26 }}>
          <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.8, margin: 0 }}>{data.summary}</p>
        </section>
      )}
      {data.work.some(w => w.company || w.role) && (
        <section style={{ marginBottom: 26 }}>
          <SH label="Work Experience" />
          {data.work.map(w => (w.company || w.role) && (
            /* Date gutter layout — still single-column, ATS reads date then content in order */
            <div key={w.id} style={{ marginBottom: 18, display: "flex", gap: 16 }}>
              <div style={{ width: 88, flexShrink: 0 }}>
                <div style={{ fontSize: 9.5, color: "#9ca3af", lineHeight: 1.4 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join("\n")}</div>
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{w.role}</strong>
                <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 4 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{w.desc}</p>}
              </div>
            </div>
          ))}
        </section>
      )}
      {data.edu.some(e => e.school) && (
        <section style={{ marginBottom: 26 }}>
          <SH label="Education" />
          {data.edu.map(e => e.school && (
            <div key={e.id} style={{ marginBottom: 12, display: "flex", gap: 16 }}>
              <div style={{ width: 88, flexShrink: 0 }}>
                <div style={{ fontSize: 9.5, color: "#9ca3af" }}>{e.year}</div>
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                <div style={{ fontSize: 11, color: accent, fontWeight: 500 }}>{e.school}{e.gpa ? ` | ${e.gpa}` : ""}</div>
              </div>
            </div>
          ))}
        </section>
      )}
      {skills.length > 0 && (
        <section style={{ marginBottom: 26 }}>
          <SH label="Skills" />
          <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0 }}>{skills.join(", ")}</p>
        </section>
      )}
      <ExtraSections data={data} accent={accent} />
    </div>
  );
}

/* ── 31. PACIFIC ── US tech, gradient header, ATS body ──────  */
function TemplatePacific({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.8px", textTransform: "uppercase" as const,
      color: accent, marginBottom: 10, paddingBottom: 5, borderBottom: `2px solid ${accent}` }}>{label}</div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE) }}>
      <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`, padding: "32px 40px 26px" }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-.5px" }}>{data.name || "Your Name"}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.85)", marginTop: 5 }}>{data.title || "Job Title"}</div>
        {/* ATS-safe header contacts — plain text, no emoji */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "3px 18px" }}>
          {atsContactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "rgba(255,255,255,.85)" }}>{icon}{text}</span>)}
        </div>
      </div>
      <div style={{ padding: "28px 40px" }}>
        {data.summary && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Summary" />
            <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.75, margin: 0 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Work Experience" />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 13, color: "#111827" }}>{w.role}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 4 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Education" />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}{e.gpa ? ` | ${e.gpa}` : ""}</div>
              </div>
            ))}
          </section>
        )}
        {skills.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Skills" />
            {/* Inline comma-separated — most ATS-safe format for skills */}
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0 }}>{skills.join(", ")}</p>
          </section>
        )}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 32. MILANO ── Italian elegant, photo slot, ATS body ────  */
function TemplateMilano({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, marginRight: 8, flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" as const, color: accent }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `${accent}30`, marginLeft: 10 }} />
    </div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE), padding: "40px 48px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28, paddingBottom: 22, borderBottom: `1px solid ${accent}30` }}>
        {data.photo && <Photo src={data.photo} size={76} style={{ border: `3px solid ${accent}40`, flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 200, letterSpacing: "2.5px", color: "#111827", textTransform: "uppercase" as const, lineHeight: 1.1 }}>{data.name || "Your Name"}</div>
          <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginTop: 7, letterSpacing: ".5px" }}>{data.title || "Job Title"}</div>
          {/* ATS-safe contacts */}
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "3px 14px" }}>
            {atsContactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, color: "#6b7280" }}>{icon}{text}</span>)}
          </div>
        </div>
      </div>
      {data.summary && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Summary" />
          <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.75, margin: 0, paddingLeft: 15 }}>{data.summary}</p>
        </section>
      )}
      {data.work.some(w => w.company || w.role) && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Work Experience" />
          {data.work.map(w => (w.company || w.role) && (
            <div key={w.id} style={{ marginBottom: 16, paddingLeft: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <strong style={{ fontSize: 12.5, color: "#111827" }}>{w.role}</strong>
                  {w.company && <span style={{ fontSize: 11, color: accent, fontStyle: "italic" as const, marginLeft: 8 }}>{w.company}</span>}
                </div>
                <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
              </div>
              {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, marginTop: 4, marginBottom: 0 }}>{w.desc}</p>}
            </div>
          ))}
        </section>
      )}
      {data.edu.some(e => e.school) && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Education" />
          {data.edu.map(e => e.school && (
            <div key={e.id} style={{ marginBottom: 10, paddingLeft: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}{e.gpa ? ` | ${e.gpa}` : ""}</span>
              </div>
              <div style={{ fontSize: 11, color: accent, fontStyle: "italic" as const }}>{e.school}</div>
            </div>
          ))}
        </section>
      )}
      {skills.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <SH label="Skills" />
          <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0, paddingLeft: 15 }}>{skills.join(", ")}</p>
        </section>
      )}
      <ExtraSections data={data} accent={accent} />
    </div>
  );
}

/* ── 33. SYDNEY ── AU professional, contact chips, ATS body ── */
function TemplateSydney({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" as const,
      color: "#fff", background: accent, padding: "4px 10px", display: "inline-block",
      marginBottom: 12, borderRadius: 2 }}>{label}</div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE) }}>
      <div style={{ background: "#f8fafc", borderBottom: `3px solid ${accent}`, padding: "32px 44px 22px" }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: "#111827", letterSpacing: "-.5px" }}>{data.name || "Your Name"}</div>
        <div style={{ fontSize: 13, color: accent, fontWeight: 600, marginTop: 5 }}>{data.title || "Job Title"}</div>
        {/* ATS-safe contacts — plain text chips (still parseable) */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "5px 10px" }}>
          {atsContactFields(data).map(({ icon, text }, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#374151", background: "#fff",
              padding: "2px 10px", borderRadius: 20, border: "1px solid #e2e8f0" }}>{icon}{text}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: "26px 44px" }}>
        {data.summary && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Summary" />
            <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.75, margin: 0 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Work Experience" />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 13, color: "#111827" }}>{w.role}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 4 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {/* Single-column education — no side-by-side with skills */}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Education" />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}{e.gpa ? ` | ${e.gpa}` : ""}</span>
                </div>
                <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}</span>
              </div>
            ))}
          </section>
        )}
        {skills.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <SH label="Skills" />
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0 }}>{skills.join(", ")}</p>
          </section>
        )}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 34. METRO ── Bold urban, dark section bands, ATS body ─── */
function TemplateMetro({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const SH = ({ label }: { label: string }) => (
    <div style={{ background: "#1c1917", color: "#f5f5f4", fontSize: 9.5, fontWeight: 800,
      letterSpacing: "2.5px", textTransform: "uppercase" as const,
      padding: "6px 44px", margin: "0 -44px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 12, height: 2, background: accent, flexShrink: 0 }} />
      {label}
    </div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE) }}>
      <div style={{ background: "#111827", padding: "30px 44px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#f9fafb", letterSpacing: "-1px", lineHeight: 1 }}>{data.name || "Your Name"}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: accent, marginTop: 7, letterSpacing: ".8px" }}>{data.title || "Job Title"}</div>
          </div>
          <div style={{ width: 4, height: 50, background: accent }} />
        </div>
        {/* ATS-safe contacts — plain text, no emoji */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "3px 16px" }}>
          {atsContactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#9ca3af" }}>{icon}{text}</span>)}
        </div>
      </div>
      <div style={{ padding: "0 44px 36px" }}>
        {data.summary && (
          <section style={{ paddingTop: 20, marginBottom: 6 }}>
            <SH label="Summary" />
            <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.75, margin: 0 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ paddingTop: 20, marginBottom: 6 }}>
            <SH label="Work Experience" />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 13, color: "#111827" }}>{w.role}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 4 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ paddingTop: 20, marginBottom: 6 }}>
            <SH label="Education" />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}{e.gpa ? ` | ${e.gpa}` : ""}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.school}</div>
              </div>
            ))}
          </section>
        )}
        {skills.length > 0 && (
          <section style={{ paddingTop: 20, marginBottom: 6 }}>
            <SH label="Skills" />
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0 }}>{skills.join(", ")}</p>
          </section>
        )}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── 35. SAGE ── Calm professional, soft tinted header ──────── */
function TemplateSage({ data, accent, thumbnail = false }: { data: ResumeData; accent: string; thumbnail?: boolean }) {
  const skills = data.skills.split(",").map(s => s.trim()).filter(Boolean);
  const lightBg = `${accent}0f`;
  const SH = ({ label }: { label: string }) => (
    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" as const,
      color: accent, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      {label}
      <div style={{ flex: 1, height: 1.5, background: `${accent}25`, borderRadius: 99 }} />
    </div>
  );
  return (
    <div style={{ ...(thumbnail ? PAGE_THUMB : PAGE) }}>
      <div style={{ background: lightBg, padding: "36px 48px 26px", borderBottom: `2px solid ${accent}30` }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#111827", letterSpacing: "-.5px" }}>{data.name || "Your Name"}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: accent, marginTop: 5 }}>{data.title || "Job Title"}</div>
        {/* ATS-safe: plain text contacts, no emoji */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "3px 16px" }}>
          {atsContactFields(data).map(({ icon, text }, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#4b5563" }}>{icon}{text}</span>)}
        </div>
      </div>
      <div style={{ padding: "28px 48px" }}>
        {data.summary && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Professional Summary" />
            <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.8, margin: 0 }}>{data.summary}</p>
          </section>
        )}
        {data.work.some(w => w.company || w.role) && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Work Experience" />
            {data.work.map(w => (w.company || w.role) && (
              <div key={w.id} style={{ marginBottom: 18, paddingLeft: 14, borderLeft: `2px solid ${accent}40` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12.5, color: "#111827" }}>{w.role}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{[w.from, w.current ? "Present" : w.to].filter(Boolean).join(" - ")}</span>
                </div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 4 }}>{w.company}</div>
                {w.desc && <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{w.desc}</p>}
              </div>
            ))}
          </section>
        )}
        {data.edu.some(e => e.school) && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Education" />
            {data.edu.map(e => e.school && (
              <div key={e.id} style={{ marginBottom: 12, paddingLeft: 14, borderLeft: `2px solid ${accent}40` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#111827" }}>{e.degree}</strong>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.year}{e.gpa ? ` | ${e.gpa}` : ""}</span>
                </div>
                <span style={{ fontSize: 11, color: accent, fontWeight: 500 }}>{e.school}</span>
              </div>
            ))}
          </section>
        )}
        {skills.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <SH label="Skills" />
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0 }}>{skills.join(", ")}</p>
          </section>
        )}
        <ExtraSections data={data} accent={accent} />
      </div>
    </div>
  );
}

/* ── Router ─────────────────────────────────────────────── */
export default function ResumePreview({
  data, template, font, color, thumbnail = false, photoShape = "round", sectionOrder, density = "normal",
}: {
  data: ResumeData; template: string; font?: string; color?: string; thumbnail?: boolean;
  photoShape?: "round" | "square"; sectionOrder?: number[];
  density?: "compact" | "normal" | "spacious";
}) {
  const accent = color || (TEMPLATE_ACCENT[template] ?? "#1a1a2e");
  const inner =
    template === "Minimal"      ? <TemplateMinimal     data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Bold"         ? <TemplateBold        data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Compact"      ? <TemplateCompact     data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Slate"        ? <TemplateSlate       data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Crisp"        ? <TemplateCrisp       data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Modern"       ? <TemplateModern      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Creative"     ? <TemplateCreative    data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Sidebar Pro"  ? <TemplateSidebarPro  data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Executive"    ? <TemplateExecutive   data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Tech"         ? <TemplateTech        data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Nordic"       ? <TemplateNordic      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Timeline"     ? <TemplateTimeline    data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Horizon"      ? <TemplateHorizon     data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Orbit"        ? <TemplateOrbit       data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Apex"         ? <TemplateApex        data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Canvas"       ? <TemplateCanvas      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Luxe"         ? <TemplateLuxe        data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Vega"         ? <TemplateVega        data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Folio"        ? <TemplateFolio       data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Stripe"       ? <TemplateStripe      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Mono"         ? <TemplateMono        data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Prism"        ? <TemplatePrism       data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Ivy"          ? <TemplateIvy         data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Onyx"         ? <TemplateOnyx        data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Zurich"       ? <TemplateZurich      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Berlin"       ? <TemplateBerlin      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Paris"        ? <TemplateParis       data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Harvard"      ? <TemplateHarvard     data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Geneva"       ? <TemplateGeneva      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Pacific"      ? <TemplatePacific     data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Milano"       ? <TemplateMilano      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Sydney"       ? <TemplateSydney      data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Metro"        ? <TemplateMetro       data={data} accent={accent} thumbnail={thumbnail} /> :
    template === "Sage"         ? <TemplateSage        data={data} accent={accent} thumbnail={thumbnail} /> :
                                  <TemplateClassic     data={data} accent={accent} thumbnail={thumbnail} />;

  return (
    <PhotoShapeCtx.Provider value={photoShape}>
      <SectionOrderCtx.Provider value={sectionOrder ?? DEFAULT_SECTION_ORDER}>
        <div style={{ position: "relative" }}>
          {(font || density !== "normal") && (
            <style>{[
              font ? `#resume-preview, #resume-preview * { font-family: ${font} !important; }` : "",
              density === "compact"
                ? `#resume-preview section { margin-bottom: 10px !important; }
                   #resume-preview p { line-height: 1.35 !important; margin-top: 1px !important; margin-bottom: 1px !important; }
                   #resume-preview div[style] { line-height: 1.35 !important; }`
                : "",
              density === "spacious"
                ? `#resume-preview section { margin-bottom: 28px !important; }
                   #resume-preview p { line-height: 1.8 !important; margin-top: 4px !important; margin-bottom: 4px !important; }
                   #resume-preview div[style] { line-height: 1.8 !important; }`
                : "",
            ].join("\n")}</style>
          )}
          <div id="resume-preview">{inner}</div>
        </div>
      </SectionOrderCtx.Provider>
    </PhotoShapeCtx.Provider>
  );
}
