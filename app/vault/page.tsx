"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";

/* ── Types ─────────────────────────────────────────────────── */
type DocType =
  | "offer_letter" | "salary_slip" | "experience_letter"
  | "appraisal" | "certificate" | "tax_doc" | "other";

interface VaultDoc {
  id: string;
  type: DocType;
  title: string;
  company?: string;
  year?: number;
  file_name: string;
  file_size?: number;
  verified: boolean;
  ai_summary?: string;
  tags: string[];
  created_at: string;
  shared_token?: string;
}

/* ── Config ─────────────────────────────────────────────────── */
const DOC_TYPES: { key: DocType; label: string; icon: string; color: string }[] = [
  { key: "offer_letter",       label: "Offer Letters",       icon: "ti-file-dollar",    color: "#6366f1" },
  { key: "salary_slip",        label: "Salary Slips",        icon: "ti-receipt",        color: "#22c55e" },
  { key: "experience_letter",  label: "Experience Letters",  icon: "ti-certificate",    color: "#f59e0b" },
  { key: "appraisal",          label: "Appraisals",          icon: "ti-award",          color: "#ec4899" },
  { key: "certificate",        label: "Certificates",        icon: "ti-rosette",        color: "#14b8a6" },
  { key: "tax_doc",            label: "Tax Documents",       icon: "ti-building-bank",  color: "#8b5cf6" },
  { key: "other",              label: "Other",               icon: "ti-file",           color: "#94a3b8" },
];

function docTypeConfig(type: DocType) {
  return DOC_TYPES.find(d => d.key === type) ?? DOC_TYPES[DOC_TYPES.length - 1];
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Mock data for demo ─────────────────────────────────────── */
const DEMO_DOCS: VaultDoc[] = [
  { id: "1", type: "offer_letter", title: "Offer Letter — Razorpay", company: "Razorpay", year: 2024, file_name: "razorpay_offer_2024.pdf", file_size: 248000, verified: true, ai_summary: "Senior Backend Engineer · ₹38 LPA · Joining bonus ₹2L · ESOP 500 units · 3-month notice · Joining date 15 Jan 2024", tags: ["verified", "bgv-ready"], created_at: "2024-01-10" },
  { id: "2", type: "experience_letter", title: "Experience Letter — Swiggy", company: "Swiggy", year: 2023, file_name: "swiggy_exp_letter.pdf", file_size: 185000, verified: true, ai_summary: "Backend Engineer · Duration: Aug 2021 – Dec 2023 · 2 years 4 months · Relieved in good standing", tags: ["verified", "bgv-ready"], created_at: "2023-12-28" },
  { id: "3", type: "salary_slip", title: "Salary Slip — Dec 2023", company: "Swiggy", year: 2023, file_name: "swiggy_salary_dec23.pdf", file_size: 112000, verified: false, ai_summary: "Gross: ₹2,41,667 · Net: ₹1,98,400 · PF deducted · TDS: ₹8,200", tags: [], created_at: "2023-12-31" },
  { id: "4", type: "appraisal", title: "Annual Appraisal 2023 — Swiggy", company: "Swiggy", year: 2023, file_name: "swiggy_appraisal_fy23.pdf", file_size: 320000, verified: false, ai_summary: "Rating: Exceeds Expectations · Increment: 22% · New CTC: ₹29 LPA · Manager: Kavitha S.", tags: [], created_at: "2023-04-01" },
  { id: "5", type: "certificate", title: "B.Tech CSE — IIT Bombay", company: "IIT Bombay", year: 2019, file_name: "iitb_btech_certificate.pdf", file_size: 890000, verified: true, ai_summary: "Bachelor of Technology in Computer Science · Graduation: May 2019 · CGPA: 8.4 / 10", tags: ["verified", "education"], created_at: "2019-06-01" },
  { id: "6", type: "tax_doc", title: "Form 16 — FY 2023-24", company: "Swiggy", year: 2024, file_name: "form16_fy2324.pdf", file_size: 156000, verified: false, ai_summary: "Gross salary: ₹29,00,000 · TDS deducted: ₹2,34,000 · Net taxable: ₹21,50,000", tags: [], created_at: "2024-06-15" },
];

/* ── Upload Modal ────────────────────────────────────────────── */
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (doc: VaultDoc) => void }) {
  const [step, setStep] = useState<"drop" | "form" | "parsing" | "done">("drop");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [docType, setDocType] = useState<DocType>("offer_letter");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, "").replace(/_/g, " ")); setStep("form"); }
  }

  async function handleSubmit() {
    if (!file || !title) return;
    setStep("parsing");
    await new Promise(r => setTimeout(r, 2200)); // Simulate AI parse
    const newDoc: VaultDoc = {
      id: Date.now().toString(),
      type: docType,
      title,
      company: company || undefined,
      year: year ? parseInt(year) : undefined,
      file_name: file.name,
      file_size: file.size,
      verified: false,
      ai_summary: "AI is analysing your document…",
      tags: [],
      created_at: new Date().toISOString().split("T")[0],
    };
    setStep("done");
    setTimeout(() => { onUploaded(newDoc); onClose(); }, 1200);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 480, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>
            {step === "parsing" ? "Analysing document…" : step === "done" ? "Saved to Vault ✓" : "Add to Vault"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}>✕</button>
        </div>

        {step === "drop" && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 12, padding: "40px 20px", textAlign: "center",
              cursor: "pointer", background: dragging ? "rgba(99,102,241,.05)" : "transparent",
              transition: "all .15s",
            }}
          >
            <i className="ti ti-cloud-upload" style={{ fontSize: 36, color: "var(--accent)", display: "block", marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text1)", marginBottom: 6 }}>Drag & drop or click to upload</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>PDF, JPG, PNG — max 10 MB</div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, "").replace(/_/g, " ")); setStep("form"); } }} />
          </div>
        )}

        {step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--text2)", padding: "8px 12px", background: "rgba(99,102,241,.08)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-file" style={{ color: "var(--accent)" }} />
              {file?.name} · {formatBytes(file?.size)}
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value as DocType)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2, var(--surface))", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Offer Letter — Razorpay"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2, var(--surface))", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Company</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2, var(--surface))", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              </div>
              <div style={{ width: 80 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Year</label>
                <input value={year} onChange={e => setYear(e.target.value)} type="number" min={1990} max={2030}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2, var(--surface))", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!title}
              style={{ marginTop: 4, padding: "11px 0", borderRadius: 10, background: title ? "var(--accent)" : "var(--border)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: title ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              Save to Vault — AI will parse & summarise
            </button>
          </div>
        )}

        {step === "parsing" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>Reading your document…</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Extracting company, dates, amounts, and key terms</div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>Saved to your Vault</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Document Card ───────────────────────────────────────────── */
function DocCard({ doc, onSelect }: { doc: VaultDoc; onSelect: (d: VaultDoc) => void }) {
  const cfg = docTypeConfig(doc.type);
  return (
    <div onClick={() => onSelect(doc)} style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "14px 16px", cursor: "pointer", transition: "border-color .15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, flexShrink: 0,
          background: `${cfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`ti ${cfg.icon}`} style={{ fontSize: 18, color: cfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>
            {[doc.company, doc.year].filter(Boolean).join(" · ")} {doc.file_size ? `· ${formatBytes(doc.file_size)}` : ""}
          </div>
        </div>
        {doc.verified && (
          <div title="Verified" style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-check" style={{ fontSize: 11, color: "#22c55e" }} />
          </div>
        )}
      </div>
      {doc.ai_summary && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text3)", lineHeight: 1.5, background: "rgba(255,255,255,.03)", borderRadius: 6, padding: "7px 10px" }}>
          {doc.ai_summary.length > 100 ? doc.ai_summary.slice(0, 100) + "…" : doc.ai_summary}
        </div>
      )}
    </div>
  );
}

/* ── Detail Panel ────────────────────────────────────────────── */
function DetailPanel({ doc, onClose }: { doc: VaultDoc; onClose: () => void }) {
  const cfg = docTypeConfig(doc.type);
  const [copied, setCopied] = useState(false);

  function copyShareLink() {
    navigator.clipboard.writeText(`https://jobsayer.com/vault/share/${doc.shared_token ?? doc.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
      background: "var(--surface)", borderLeft: "1px solid var(--border)",
      zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: `${cfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`ti ${cfg.icon}`} style={{ fontSize: 16, color: cfg.color }} />
        </div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{doc.title}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <div style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: doc.verified ? "rgba(34,197,94,.12)" : "rgba(251,191,36,.1)",
            color: doc.verified ? "#22c55e" : "#f59e0b",
            border: `1px solid ${doc.verified ? "rgba(34,197,94,.25)" : "rgba(251,191,36,.25)"}`,
          }}>
            {doc.verified ? "✓ Verified" : "⟳ Pending verification"}
          </div>
          {doc.tags.includes("bgv-ready") && (
            <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,.1)", color: "var(--accent)", border: "1px solid rgba(99,102,241,.25)" }}>
              BGV Ready
            </div>
          )}
        </div>

        {/* AI Summary */}
        {doc.ai_summary && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>AI Summary</div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 8, padding: "10px 12px" }}>
              {doc.ai_summary}
            </div>
          </div>
        )}

        {/* Details */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Document Details</div>
          {[
            ["Type", docTypeConfig(doc.type).label],
            ["File", doc.file_name],
            ["Size", formatBytes(doc.file_size)],
            ["Company", doc.company],
            ["Year", doc.year?.toString()],
            ["Added", doc.created_at],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>{k}</span>
              <span style={{ color: "var(--text2)", fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={copyShareLink} style={{
            padding: "10px 0", borderRadius: 9, background: copied ? "rgba(34,197,94,.15)" : "rgba(99,102,241,.12)",
            border: `1px solid ${copied ? "rgba(34,197,94,.3)" : "rgba(99,102,241,.25)"}`,
            color: copied ? "#22c55e" : "var(--accent)", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
          }}>
            <i className={`ti ${copied ? "ti-check" : "ti-link"}`} style={{ marginRight: 6 }} />
            {copied ? "Link copied!" : "Copy share link"}
          </button>
          <button style={{
            padding: "10px 0", borderRadius: 9, background: "rgba(255,255,255,.04)",
            border: "1px solid var(--border)", color: "var(--text2)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            <i className="ti ti-download" style={{ marginRight: 6 }} /> Download
          </button>
          {!doc.verified && (
            <button style={{
              padding: "10px 0", borderRadius: 9, background: "rgba(251,191,36,.1)",
              border: "1px solid rgba(251,191,36,.25)", color: "#f59e0b", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <i className="ti ti-shield-check" style={{ marginRight: 6 }} /> Request verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function VaultPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<VaultDoc[]>(DEMO_DOCS);
  const [activeType, setActiveType] = useState<DocType | "all">("all");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<VaultDoc | null>(null);
  const [showBgvModal, setShowBgvModal] = useState(false);

  const filtered = docs.filter(d => {
    const matchType = activeType === "all" || d.type === activeType;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.company?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const verifiedCount = docs.filter(d => d.verified).length;
  const bgvReady = docs.filter(d => d.tags.includes("bgv-ready")).length;
  const totalSize = docs.reduce((s, d) => s + (d.file_size ?? 0), 0);

  const grouped = DOC_TYPES.map(dt => ({
    ...dt,
    count: docs.filter(d => d.type === dt.key).length,
  }));

  return (
    <AppShell>
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={doc => setDocs(prev => [doc, ...prev])}
        />
      )}
      {selected && <DetailPanel doc={selected} onClose={() => setSelected(null)} />}

      <div style={{ padding: "24px 24px 48px", maxWidth: selected ? "calc(100% - 370px)" : "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)", margin: 0 }}>Career Vault</h1>
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4, margin: 0 }}>
              Your verified career documents — always ready for BGV, loans, and new roles
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowBgvModal(true)}
              style={{ padding: "9px 14px", borderRadius: 9, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-shield-check" style={{ marginRight: 6 }} />BGV Pack
            </button>
            <button
              onClick={() => setShowUpload(true)}
              style={{ padding: "9px 16px", borderRadius: 9, background: "var(--accent)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-plus" style={{ marginRight: 6 }} />Add Document
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total Docs", value: docs.length, icon: "ti-files", color: "var(--accent)" },
            { label: "Verified", value: verifiedCount, icon: "ti-shield-check", color: "#22c55e" },
            { label: "BGV Ready", value: bgvReady, icon: "ti-certificate", color: "#f59e0b" },
            { label: "Storage Used", value: formatBytes(totalSize), icon: "ti-database", color: "#8b5cf6" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 13, color: s.color }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Category pills + search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveType("all")}
            style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid",
              background: activeType === "all" ? "var(--accent)" : "transparent",
              borderColor: activeType === "all" ? "var(--accent)" : "var(--border)",
              color: activeType === "all" ? "#fff" : "var(--text3)",
            }}>
            All ({docs.length})
          </button>
          {grouped.filter(g => g.count > 0).map(g => (
            <button key={g.key}
              onClick={() => setActiveType(activeType === g.key ? "all" : g.key)}
              style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid",
                background: activeType === g.key ? g.color : "transparent",
                borderColor: activeType === g.key ? g.color : "var(--border)",
                color: activeType === g.key ? "#fff" : "var(--text3)",
              }}>
              {g.label} ({g.count})
            </button>
          ))}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", width: 200 }}
          />
        </div>

        {/* Document grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
            <i className="ti ti-folder-open" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No documents yet</div>
            <div style={{ fontSize: 12 }}>Upload your first career document to get started</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filtered.map(doc => (
              <DocCard key={doc.id} doc={doc} onSelect={setSelected} />
            ))}
          </div>
        )}

        {/* BGV Pack Modal */}
        {showBgvModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>🛡️ BGV Pack</div>
                <button onClick={() => setShowBgvModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}>✕</button>
              </div>
              <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 18, lineHeight: 1.6 }}>
                Your BGV pack bundles all verified documents into a single shareable link — no more chasing old employers for letters.
              </p>
              <div style={{ marginBottom: 18 }}>
                {docs.filter(d => d.verified || d.tags.includes("bgv-ready")).map(d => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                    <i className={`ti ${docTypeConfig(d.type).icon}`} style={{ color: docTypeConfig(d.type).color, fontSize: 14 }} />
                    <span style={{ flex: 1, color: "var(--text2)" }}>{d.title}</span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText("https://jobsayer.com/vault/bgv/share/demo123"); setShowBgvModal(false); }}
                style={{ width: "100%", padding: "11px 0", borderRadius: 10, background: "var(--accent)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-link" style={{ marginRight: 6 }} />Copy BGV Pack Link
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
