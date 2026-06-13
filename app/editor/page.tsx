"use client";
/**
 * /editor — Direct Resume Editor
 *
 * Edit your existing resume inline — no templates, no wizard.
 * Left panel: all sections as editable fields.
 * Right panel: live PDF-style preview.
 *
 * Supports:
 *  - Load from saved cloud resumes
 *  - Upload & parse an existing resume file
 *  - Save back to cloud
 *  - Export PDF (print) / DOCX
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, Save, Download, Upload, FolderOpen,
  ChevronDown, ChevronUp, X, FileText, Loader2, Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import { exportDocx } from "@/lib/docxExport";
import {
  saveDraft, loadDraft,
  saveNamedResume, listResumes, loadResumeSave,
  type ResumeRecord,
} from "@/lib/resumeDb";
import { parseResumeFile } from "@/lib/resumeParser";
import { canUpload, recordUpload } from "@/lib/uploadUsage";
import ResumePreview from "@/components/ResumePreview";
import AppShell from "@/components/AppShell";
import type {
  ResumeData, WorkEntry, EduEntry, ProjectEntry,
  CertEntry, LanguageEntry, AwardEntry, CustomSection,
} from "@/lib/types";

/* ── Empty resume ───────────────────────────────────────────── */
const EMPTY: ResumeData = {
  name: "", title: "", email: "", phone: "", location: "",
  website: "", linkedin: "", github: "", photo: "", summary: "",
  work: [], edu: [], skills: "", projects: [],
  certifications: [], languages: [], awards: [],
  interests: "", references: [], customSections: [], declaration: "",
};

function uid() { return crypto.randomUUID(); }

/* ── Section collapse state ─────────────────────────────────── */
type SectionKey = "personal" | "summary" | "work" | "edu" | "skills"
  | "projects" | "certs" | "languages" | "awards" | "interests"
  | "custom" | "declaration";

/* ── Input helpers ──────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text1)", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--text3)",
  textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4,
  display: "block",
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: "vertical", minHeight: 90, lineHeight: 1.5,
};

function Field({
  label, value, onChange, placeholder, textarea, type,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean; type?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>
      {textarea
        ? <textarea style={textareaStyle} value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)} />
        : <input style={inputStyle} type={type ?? "text"} value={value}
            placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

/* ── Section wrapper ────────────────────────────────────────── */
function Section({
  title, icon, open, onToggle, children, onAdd, addLabel,
}: {
  title: string; icon: string; open: boolean; onToggle: () => void;
  children: React.ReactNode; onAdd?: () => void; addLabel?: string;
}) {
  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 12, marginBottom: 12,
      overflow: "hidden",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", padding: "12px 16px",
          background: open ? "var(--surface2)" : "var(--surface)",
          border: "none", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", display: "flex", alignItems: "center", gap: 8 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 15, color: "var(--accent)" }} />
          {title}
        </span>
        {open ? <ChevronUp size={15} color="var(--text3)" /> : <ChevronDown size={15} color="var(--text3)" />}
      </button>

      {open && (
        <div style={{ padding: "14px 16px" }}>
          {children}
          {onAdd && (
            <button onClick={onAdd} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "1px dashed var(--border)",
              background: "transparent", color: "var(--accent)", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600, marginTop: 8, width: "100%",
              justifyContent: "center",
            }}>
              <Plus size={13} /> {addLabel ?? "Add entry"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Entry card wrapper ─────────────────────────────────────── */
function EntryCard({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px",
      marginBottom: 10, background: "var(--surface)", position: "relative",
    }}>
      <button onClick={onDelete} style={{
        position: "absolute", top: 8, right: 8,
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text3)", padding: 4, borderRadius: 6,
        display: "flex", alignItems: "center",
      }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
      >
        <Trash2 size={13} />
      </button>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════ */
export default function EditorPage() {
  const { user } = useAuth();
  const { dark } = useTheme();

  /* ── Resume data ── */
  const [data, setData] = useState<ResumeData>(EMPTY);
  const [resumeName, setResumeName] = useState("My Resume");
  const [saveId, setSaveId] = useState<string | null>(null);

  /* ── UI state ── */
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    personal: true, summary: true, work: true, edu: true,
    skills: true, projects: false, certs: false, languages: false,
    awards: false, interests: false, custom: false, declaration: false,
  });
  const [saves, setSaves] = useState<ResumeRecord[]>([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [previewMode, setPreviewMode] = useState<"split" | "full">("split");
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Load draft on mount ── */
  useEffect(() => {
    const draft = loadDraft();
    if (draft?.data) {
      setData(draft.data);
      if ((draft as any).resumeName) setResumeName((draft as any).resumeName);
    }
  }, []);

  /* ── Auto-save draft to localStorage on change ── */
  useEffect(() => {
    saveDraft(data, "Classic", { resumeName });
  }, [data, resumeName]);

  /* ── Load cloud saves list ── */
  useEffect(() => {
    if (!user) return;
    listResumes(user.id).then(setSaves).catch(() => {});
  }, [user]);

  /* ── Helpers ── */
  function toggle(k: SectionKey) {
    setOpen(o => ({ ...o, [k]: !o[k] }));
  }
  function patch(fields: Partial<ResumeData>) {
    setData(d => ({ ...d, ...fields }));
  }

  /* ── Work entries ── */
  function addWork() {
    patch({ work: [...data.work, { id: uid(), company: "", role: "", from: "", to: "", current: false, desc: "" }] });
  }
  function updateWork(id: string, fields: Partial<WorkEntry>) {
    patch({ work: data.work.map(w => w.id === id ? { ...w, ...fields } : w) });
  }
  function removeWork(id: string) {
    patch({ work: data.work.filter(w => w.id !== id) });
  }

  /* ── Education entries ── */
  function addEdu() {
    patch({ edu: [...data.edu, { id: uid(), school: "", degree: "", year: "", gpa: "" }] });
  }
  function updateEdu(id: string, fields: Partial<EduEntry>) {
    patch({ edu: data.edu.map(e => e.id === id ? { ...e, ...fields } : e) });
  }
  function removeEdu(id: string) {
    patch({ edu: data.edu.filter(e => e.id !== id) });
  }

  /* ── Projects ── */
  function addProject() {
    patch({ projects: [...data.projects, { id: uid(), name: "", url: "", repo: "", from: "", to: "", desc: "" }] });
  }
  function updateProject(id: string, fields: Partial<ProjectEntry>) {
    patch({ projects: data.projects.map(p => p.id === id ? { ...p, ...fields } : p) });
  }
  function removeProject(id: string) {
    patch({ projects: data.projects.filter(p => p.id !== id) });
  }

  /* ── Certifications ── */
  function addCert() {
    patch({ certifications: [...data.certifications, { id: uid(), name: "", issuer: "", year: "" }] });
  }
  function updateCert(id: string, fields: Partial<CertEntry>) {
    patch({ certifications: data.certifications.map(c => c.id === id ? { ...c, ...fields } : c) });
  }
  function removeCert(id: string) {
    patch({ certifications: data.certifications.filter(c => c.id !== id) });
  }

  /* ── Languages ── */
  function addLang() {
    patch({ languages: [...data.languages, { id: uid(), name: "", level: "Conversational" }] });
  }
  function updateLang(id: string, fields: Partial<LanguageEntry>) {
    patch({ languages: data.languages.map(l => l.id === id ? { ...l, ...fields } : l) });
  }
  function removeLang(id: string) {
    patch({ languages: data.languages.filter(l => l.id !== id) });
  }

  /* ── Awards ── */
  function addAward() {
    patch({ awards: [...data.awards, { id: uid(), title: "", issuer: "", year: "", desc: "" }] });
  }
  function updateAward(id: string, fields: Partial<AwardEntry>) {
    patch({ awards: data.awards.map(a => a.id === id ? { ...a, ...fields } : a) });
  }
  function removeAward(id: string) {
    patch({ awards: data.awards.filter(a => a.id !== id) });
  }

  /* ── Custom sections ── */
  function addCustom() {
    patch({ customSections: [...(data.customSections ?? []), { id: uid(), title: "Section Title", content: "" }] });
  }
  function updateCustom(id: string, fields: Partial<CustomSection>) {
    patch({ customSections: (data.customSections ?? []).map(c => c.id === id ? { ...c, ...fields } : c) });
  }
  function removeCustom(id: string) {
    patch({ customSections: (data.customSections ?? []).filter(c => c.id !== id) });
  }

  /* ── Upload & parse ── */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (user) {
      const ok = await canUpload(user.id);
      if (!ok) { setUploadMsg("Monthly upload limit reached. Upgrade to upload more."); return; }
    }
    setUploadMsg("Parsing resume…");
    try {
      const parsed = await parseResumeFile(file);
      setData(d => ({ ...d, ...parsed }));
      if (user) await recordUpload(user.id);
      setUploadMsg("Resume imported successfully!");
      setTimeout(() => setUploadMsg(""), 3000);
    } catch {
      setUploadMsg("Could not parse this file. Try a .pdf or .docx.");
      setTimeout(() => setUploadMsg(""), 4000);
    }
    e.target.value = "";
  }

  /* ── Load saved resume ── */
  async function handleLoad(rec: ResumeRecord) {
    const full = await loadResumeSave(rec.id);
    if (!full) return;
    setData(full.data);
    setResumeName(full.name);
    setSaveId(full.id);
    setShowLoadMenu(false);
  }

  /* ── Save to cloud ── */
  async function handleSave() {
    if (!user) { alert("Sign in to save."); return; }
    setSaving(true);
    try {
      const id = await saveNamedResume(user.id, resumeName, data, "Classic", saveId ?? undefined);
      setSaveId(id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      listResumes(user.id).then(setSaves).catch(() => {});
    } catch (err) {
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Export DOCX ── */
  async function handleDocx() {
    setExporting(true);
    try {
      await exportDocx(data, "Classic");
    } finally {
      setExporting(false);
    }
  }

  /* ── Export PDF ── */
  function handlePdf() {
    window.print();
  }

  /* ── Two-col width detection ── */
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 900);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const showSplit = wide && previewMode === "split";

  /* ════════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════════ */
  return (
    <AppShell>
      {/* ── Top toolbar ── */}
      <div style={{
        position: "sticky", top: 56, zIndex: 50,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "10px 20px", display: "flex", alignItems: "center",
        gap: 10, flexWrap: "wrap",
      }}>
        {/* Resume name */}
        <input
          value={resumeName}
          onChange={e => setResumeName(e.target.value)}
          style={{
            ...inputStyle, width: 200, fontWeight: 700, fontSize: 14,
            border: "1px solid transparent", background: "var(--surface2)",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={e => (e.currentTarget.style.borderColor = "transparent")}
        />

        <div style={{ flex: 1 }} />

        {/* Upload */}
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={handleUpload} />
        <button onClick={() => fileRef.current?.click()} style={btnStyle("secondary")}>
          <Upload size={13} /> Import Resume
        </button>

        {/* Load saved */}
        {user && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowLoadMenu(m => !m)} style={btnStyle("secondary")}>
              <FolderOpen size={13} /> Load Saved
            </button>
            {showLoadMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, minWidth: 240, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                zIndex: 200, maxHeight: 280, overflowY: "auto",
              }}>
                {saves.length === 0
                  ? <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text3)" }}>No saved resumes yet.</div>
                  : saves.map(s => (
                    <button key={s.id} onClick={() => handleLoad(s)} style={{
                      width: "100%", padding: "11px 16px", border: "none",
                      background: "none", cursor: "pointer", textAlign: "left",
                      borderBottom: "1px solid var(--border)", fontFamily: "inherit",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                        {new Date(s.updated_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* Save */}
        {user && (
          <button onClick={handleSave} disabled={saving} style={btnStyle("accent")}>
            {saving ? <Loader2 size={13} className="spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
            {saved ? "Saved!" : "Save"}
          </button>
        )}

        {/* Export */}
        <button onClick={handleDocx} disabled={exporting} style={btnStyle("secondary")}>
          {exporting ? <Loader2 size={13} /> : <Download size={13} />} DOCX
        </button>
        <button onClick={handlePdf} style={btnStyle("secondary")}>
          <FileText size={13} /> PDF
        </button>

        {/* Preview toggle (mobile / narrow) */}
        {wide && (
          <button onClick={() => setPreviewMode(m => m === "split" ? "full" : "split")} style={btnStyle("secondary")}>
            {previewMode === "split" ? "Editor only" : "Split view"}
          </button>
        )}
      </div>

      {/* Upload message */}
      {uploadMsg && (
        <div style={{
          margin: "10px 20px 0", padding: "10px 16px", borderRadius: 10,
          background: uploadMsg.includes("success") ? "rgba(34,197,94,.1)" : "rgba(234,179,8,.1)",
          border: `1px solid ${uploadMsg.includes("success") ? "rgba(34,197,94,.3)" : "rgba(234,179,8,.3)"}`,
          color: uploadMsg.includes("success") ? "var(--success)" : "var(--warn)",
          fontSize: 13, fontWeight: 600,
        }}>
          {uploadMsg}
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: showSplit ? "440px 1fr" : "1fr",
        gap: 0, minHeight: "calc(100vh - 112px)",
        alignItems: "start",
      }}>

        {/* ── Left: Editor panels ── */}
        <div style={{
          padding: "20px 16px",
          overflowY: "auto",
          borderRight: showSplit ? "1px solid var(--border)" : "none",
          height: showSplit ? "calc(100vh - 112px)" : "auto",
          position: showSplit ? "sticky" : "static",
          top: 112,
        }}>

          {/* Personal Info */}
          <Section title="Personal Info" icon="ti-user" open={open.personal} onToggle={() => toggle("personal")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Full Name" value={data.name} onChange={v => patch({ name: v })} placeholder="Jane Doe" />
              <Field label="Job Title" value={data.title} onChange={v => patch({ title: v })} placeholder="Senior Engineer" />
              <Field label="Email" value={data.email} onChange={v => patch({ email: v })} placeholder="jane@email.com" type="email" />
              <Field label="Phone" value={data.phone} onChange={v => patch({ phone: v })} placeholder="+1 555 000 0000" />
              <Field label="Location" value={data.location} onChange={v => patch({ location: v })} placeholder="San Francisco, CA" />
              <Field label="Website" value={data.website} onChange={v => patch({ website: v })} placeholder="https://jane.dev" />
              <Field label="LinkedIn" value={data.linkedin} onChange={v => patch({ linkedin: v })} placeholder="linkedin.com/in/jane" />
              <Field label="GitHub" value={data.github} onChange={v => patch({ github: v })} placeholder="github.com/jane" />
            </div>
          </Section>

          {/* Summary */}
          <Section title="Professional Summary" icon="ti-align-left" open={open.summary} onToggle={() => toggle("summary")}>
            <Field label="Summary" value={data.summary} onChange={v => patch({ summary: v })}
              placeholder="3–4 sentences summarising your experience and value..." textarea />
          </Section>

          {/* Work Experience */}
          <Section title="Work Experience" icon="ti-briefcase" open={open.work} onToggle={() => toggle("work")}
            onAdd={addWork} addLabel="Add experience">
            {data.work.map(w => (
              <EntryCard key={w.id} onDelete={() => removeWork(w.id)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Company" value={w.company} onChange={v => updateWork(w.id, { company: v })} placeholder="Acme Corp" />
                  <Field label="Role" value={w.role} onChange={v => updateWork(w.id, { role: v })} placeholder="Software Engineer" />
                  <Field label="From" value={w.from} onChange={v => updateWork(w.id, { from: v })} placeholder="Jan 2021" />
                  <div>
                    <Field label="To" value={w.to} onChange={v => updateWork(w.id, { to: v })} placeholder="Present" />
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)", cursor: "pointer", marginTop: -4 }}>
                      <input type="checkbox" checked={w.current} onChange={e => updateWork(w.id, { current: e.target.checked, to: e.target.checked ? "Present" : w.to })} />
                      Currently working here
                    </label>
                  </div>
                </div>
                <Field label="Description / Achievements" value={w.desc}
                  onChange={v => updateWork(w.id, { desc: v })}
                  placeholder="• Led a team of 5 engineers...&#10;• Reduced load time by 40%..."
                  textarea />
              </EntryCard>
            ))}
          </Section>

          {/* Education */}
          <Section title="Education" icon="ti-school" open={open.edu} onToggle={() => toggle("edu")}
            onAdd={addEdu} addLabel="Add education">
            {data.edu.map(e => (
              <EntryCard key={e.id} onDelete={() => removeEdu(e.id)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="School / University" value={e.school} onChange={v => updateEdu(e.id, { school: v })} placeholder="MIT" />
                  <Field label="Degree" value={e.degree} onChange={v => updateEdu(e.id, { degree: v })} placeholder="B.S. Computer Science" />
                  <Field label="Year" value={e.year} onChange={v => updateEdu(e.id, { year: v })} placeholder="2018" />
                  <Field label="GPA / Grade" value={e.gpa} onChange={v => updateEdu(e.id, { gpa: v })} placeholder="3.8 / 4.0" />
                </div>
              </EntryCard>
            ))}
          </Section>

          {/* Skills */}
          <Section title="Skills" icon="ti-tool" open={open.skills} onToggle={() => toggle("skills")}>
            <Field label="Skills (comma or newline separated)"
              value={data.skills} onChange={v => patch({ skills: v })}
              placeholder="React, TypeScript, Node.js, PostgreSQL, Docker..." textarea />
          </Section>

          {/* Projects */}
          <Section title="Projects" icon="ti-rocket" open={open.projects} onToggle={() => toggle("projects")}
            onAdd={addProject} addLabel="Add project">
            {data.projects.map(p => (
              <EntryCard key={p.id} onDelete={() => removeProject(p.id)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Project Name" value={p.name} onChange={v => updateProject(p.id, { name: v })} placeholder="My SaaS App" />
                  <Field label="Live URL" value={p.url} onChange={v => updateProject(p.id, { url: v })} placeholder="https://myapp.com" />
                  <Field label="Repo" value={p.repo} onChange={v => updateProject(p.id, { repo: v })} placeholder="github.com/you/repo" />
                  <Field label="Duration" value={p.from} onChange={v => updateProject(p.id, { from: v })} placeholder="Jan 2023 – Mar 2023" />
                </div>
                <Field label="Description" value={p.desc} onChange={v => updateProject(p.id, { desc: v })}
                  placeholder="What it does, tech stack, your impact..." textarea />
              </EntryCard>
            ))}
          </Section>

          {/* Certifications */}
          <Section title="Certifications" icon="ti-certificate" open={open.certs} onToggle={() => toggle("certs")}
            onAdd={addCert} addLabel="Add certification">
            {data.certifications.map(c => (
              <EntryCard key={c.id} onDelete={() => removeCert(c.id)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Certification Name" value={c.name} onChange={v => updateCert(c.id, { name: v })} placeholder="AWS Solutions Architect" />
                  <Field label="Issuer" value={c.issuer} onChange={v => updateCert(c.id, { issuer: v })} placeholder="Amazon Web Services" />
                  <Field label="Year" value={c.year} onChange={v => updateCert(c.id, { year: v })} placeholder="2024" />
                </div>
              </EntryCard>
            ))}
          </Section>

          {/* Languages */}
          <Section title="Languages" icon="ti-language" open={open.languages} onToggle={() => toggle("languages")}
            onAdd={addLang} addLabel="Add language">
            {data.languages.map(l => (
              <EntryCard key={l.id} onDelete={() => removeLang(l.id)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Language" value={l.name} onChange={v => updateLang(l.id, { name: v })} placeholder="Spanish" />
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Proficiency</label>
                    <select value={l.level} onChange={e => updateLang(l.id, { level: e.target.value as LanguageEntry["level"] })}
                      style={{ ...inputStyle }}>
                      {["Basic", "Conversational", "Fluent", "Native"].map(lv => (
                        <option key={lv} value={lv}>{lv}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </EntryCard>
            ))}
          </Section>

          {/* Awards */}
          <Section title="Awards & Honours" icon="ti-trophy" open={open.awards} onToggle={() => toggle("awards")}
            onAdd={addAward} addLabel="Add award">
            {data.awards.map(a => (
              <EntryCard key={a.id} onDelete={() => removeAward(a.id)}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Award Title" value={a.title} onChange={v => updateAward(a.id, { title: v })} placeholder="Best Innovation Award" />
                  <Field label="Issuer" value={a.issuer} onChange={v => updateAward(a.id, { issuer: v })} placeholder="TechCorp" />
                  <Field label="Year" value={a.year} onChange={v => updateAward(a.id, { year: v })} placeholder="2023" />
                </div>
                <Field label="Description" value={a.desc} onChange={v => updateAward(a.id, { desc: v })}
                  placeholder="Brief description of what you achieved..." textarea />
              </EntryCard>
            ))}
          </Section>

          {/* Interests */}
          <Section title="Interests" icon="ti-heart" open={open.interests} onToggle={() => toggle("interests")}>
            <Field label="Interests / Hobbies (comma separated)"
              value={data.interests} onChange={v => patch({ interests: v })}
              placeholder="Photography, Open source, Rock climbing..." />
          </Section>

          {/* Custom sections */}
          <Section title="Custom Sections" icon="ti-layout-list" open={open.custom} onToggle={() => toggle("custom")}
            onAdd={addCustom} addLabel="Add custom section">
            {(data.customSections ?? []).map(c => (
              <EntryCard key={c.id} onDelete={() => removeCustom(c.id)}>
                <Field label="Section Title" value={c.title} onChange={v => updateCustom(c.id, { title: v })} placeholder="Volunteer Work" />
                <Field label="Content" value={c.content} onChange={v => updateCustom(c.id, { content: v })}
                  placeholder="Describe this section..." textarea />
              </EntryCard>
            ))}
          </Section>

          {/* Declaration */}
          <Section title="Declaration" icon="ti-pencil" open={open.declaration} onToggle={() => toggle("declaration")}>
            <Field label="Declaration text"
              value={data.declaration ?? ""} onChange={v => patch({ declaration: v })}
              placeholder="I hereby declare that the information provided is true to the best of my knowledge..." textarea />
          </Section>

        </div>

        {/* ── Right: Live preview ── */}
        {showSplit && (
          <div style={{
            padding: "20px",
            overflowY: "auto",
            height: "calc(100vh - 112px)",
            position: "sticky",
            top: 112,
            background: "var(--surface2)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 12 }}>
              Live Preview
            </div>
            <div style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 4px 24px rgba(0,0,0,.12)",
              overflow: "hidden",
              transformOrigin: "top center",
            }}>
              <ResumePreview
                data={data}
                template="Classic"
                styleFont="Inter"
                styleColor="#6366f1"
                photoShape="round"
                hiddenSections={[]}
              />
            </div>
          </div>
        )}

        {/* Full-width preview on mobile (below editor) */}
        {!showSplit && (
          <div style={{ padding: "0 16px 24px", background: "var(--surface2)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", margin: "16px 0 10px" }}>
              Preview
            </div>
            <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,.12)", overflow: "hidden" }}>
              <ResumePreview
                data={data}
                template="Classic"
                styleFont="Inter"
                styleColor="#6366f1"
                photoShape="round"
                hiddenSections={[]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          nav, [data-noprint], .sticky { display: none !important; }
          body { background: white !important; }
        }
        .spin { animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AppShell>
  );
}

/* ── Button style helper ────────────────────────────────────── */
function btnStyle(variant: "primary" | "secondary" | "accent"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 8, cursor: "pointer",
    fontFamily: "inherit", fontSize: 12, fontWeight: 700,
    whiteSpace: "nowrap", transition: "opacity .15s",
  };
  if (variant === "accent") return { ...base, background: "var(--accent)", color: "#fff", border: "none" };
  if (variant === "primary") return { ...base, background: "var(--accent)", color: "#fff", border: "none" };
  return { ...base, background: "var(--surface2)", color: "var(--text1)", border: "1px solid var(--border)" };
}
