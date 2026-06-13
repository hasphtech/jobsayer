"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWindowWidth } from "@/lib/useWindowWidth";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { useSearchParams, useRouter } from "next/navigation";

/* ── Types ─────────────────────────────────────────────────── */
type DocType =
  | "offer_letter" | "salary_slip" | "experience_letter"
  | "appraisal" | "certificate" | "tax_doc" | "other";

type CloudProvider = "google_drive" | "dropbox" | "onedrive";

interface VaultDoc {
  id: string;
  type: DocType;
  title: string;
  company?: string;
  year?: number;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  verified: boolean;
  ai_summary?: string;
  tags: string[];
  shared_token?: string;
  source: "upload" | CloudProvider;
  cloud_file_url?: string;
  created_at: string;
}

interface CloudConnection {
  provider: CloudProvider;
  status: "connected" | "expired" | "revoked" | "error";
  account_email?: string;
  account_name?: string;
  last_synced?: string;
  files_imported?: number;
}

interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedAt?: string;
  webViewUrl?: string;
  provider: CloudProvider;
}

/* ── Config ─────────────────────────────────────────────────── */
const DOC_TYPES: { key: DocType; label: string; icon: string; color: string }[] = [
  { key: "offer_letter",       label: "Offer Letters",       icon: "ti-file-dollar",   color: "#6366f1" },
  { key: "salary_slip",        label: "Salary Slips",        icon: "ti-receipt",       color: "#22c55e" },
  { key: "experience_letter",  label: "Experience Letters",  icon: "ti-certificate",   color: "#f59e0b" },
  { key: "appraisal",          label: "Appraisals",          icon: "ti-award",         color: "#ec4899" },
  { key: "certificate",        label: "Certificates",        icon: "ti-rosette",       color: "#14b8a6" },
  { key: "tax_doc",            label: "Tax Documents",       icon: "ti-building-bank", color: "#8b5cf6" },
  { key: "other",              label: "Other",               icon: "ti-file",          color: "#94a3b8" },
];

const CLOUD_PROVIDERS: { key: CloudProvider; name: string; icon: string; color: string; bg: string }[] = [
  { key: "google_drive", name: "Google Drive",  icon: "ti-brand-google-drive", color: "#4285F4", bg: "rgba(66,133,244,.08)" },
  { key: "dropbox",      name: "Dropbox",       icon: "ti-brand-dropbox",      color: "#0061FF", bg: "rgba(0,97,255,.08)"  },
  { key: "onedrive",     name: "OneDrive",      icon: "ti-cloud",              color: "#0078D4", bg: "rgba(0,120,212,.08)" },
];

function docTypeConfig(type: DocType) {
  return DOC_TYPES.find(d => d.key === type) ?? DOC_TYPES[DOC_TYPES.length - 1];
}

function providerConfig(provider: CloudProvider) {
  return CLOUD_PROVIDERS.find(p => p.key === provider)!;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

/* ── Source badge ────────────────────────────────────────────── */
function SourceBadge({ source }: { source: VaultDoc["source"] }) {
  if (source === "upload") return null;
  const cfg = providerConfig(source as CloudProvider);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: "1px solid " + cfg.color + "30",
      flexShrink: 0,
    }}>
      <i className={"ti " + cfg.icon} style={{ fontSize: 10 }} />
      {cfg.name}
    </span>
  );
}

/* ── Cloud Provider Card ─────────────────────────────────────── */
function CloudProviderCard({
  provider, connection, onConnect, onDisconnect, onBrowse,
}: {
  provider: typeof CLOUD_PROVIDERS[0];
  connection?: CloudConnection;
  onConnect: (p: CloudProvider) => void;
  onDisconnect: (p: CloudProvider) => void;
  onBrowse: (p: CloudProvider) => void;
}) {
  const isConnected = connection?.status === "connected";
  const isExpired   = connection?.status === "expired";
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid " + (isConnected ? provider.color + "40" : "var(--border)"),
      borderRadius: 12, padding: 16, transition: "border-color .15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: provider.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={"ti " + provider.icon} style={{ fontSize: 18, color: provider.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{provider.name}</div>
          {isConnected && connection?.account_email && (
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{connection.account_email}</div>
          )}
          {isExpired && <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 1 }}>Session expired — reconnect</div>}
        </div>
        {isConnected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} title="Connected" />}
      </div>

      {isConnected && connection?.files_imported != null && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
          {connection.files_imported} file{connection.files_imported !== 1 ? "s" : ""} imported
          {connection.last_synced && " · Last synced " + new Date(connection.last_synced).toLocaleDateString()}
        </div>
      )}

      <div style={{ display: "flex", gap: 7 }}>
        {isConnected ? (
          <>
            <button onClick={() => onBrowse(provider.key)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: provider.bg, border: "1px solid " + provider.color + "30",
              color: provider.color, cursor: "pointer", fontFamily: "inherit",
            }}>
              <i className="ti ti-folder-open" style={{ marginRight: 5 }} />Browse files
            </button>
            <button onClick={() => onDisconnect(provider.key)} style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: "none", border: "1px solid var(--border)",
              color: "var(--text3)", cursor: "pointer", fontFamily: "inherit",
            }}>
              Disconnect
            </button>
          </>
        ) : (
          <button onClick={() => onConnect(provider.key)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: "var(--surface2)", border: "1px solid var(--border)",
            color: "var(--text2)", cursor: "pointer", fontFamily: "inherit",
          }}>
            <i className="ti ti-plug" style={{ marginRight: 5 }} />
            {isExpired ? "Reconnect" : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Cloud File Picker Modal ─────────────────────────────────── */
function CloudPickerModal({ provider, onClose, onImport }: {
  provider: CloudProvider;
  onClose: () => void;
  onImport: (file: CloudFile, meta: { type: DocType; title: string; company: string; year: string }) => Promise<void>;
}) {
  const cfg = providerConfig(provider);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CloudFile | null>(null);
  const [docType, setDocType] = useState<DocType>("offer_letter");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/vault/cloud/files?provider=" + provider)
      .then(r => r.json())
      .then((d: { files?: CloudFile[]; error?: string }) => {
        if (d.error) setError(d.error);
        else setFiles(d.files ?? []);
      })
      .catch(() => setError("Failed to load files"))
      .finally(() => setLoading(false));
  }, [provider]);

  function selectFile(f: CloudFile) {
    setSelected(f);
    setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    const name = f.name.toLowerCase();
    if (name.includes("offer"))                                           setDocType("offer_letter");
    else if (name.includes("salary") || name.includes("payslip"))         setDocType("salary_slip");
    else if (name.includes("exp") || name.includes("reliev"))             setDocType("experience_letter");
    else if (name.includes("apprais") || name.includes("increment"))      setDocType("appraisal");
    else if (name.includes("cert") || name.includes("degree"))            setDocType("certificate");
    else if (name.includes("form16") || name.includes("tax"))             setDocType("tax_doc");
  }

  async function handleImport() {
    if (!selected || !title) return;
    setImporting(true);
    await onImport(selected, { type: docType, title, company, year });
    setImporting(false);
  }

  const filteredFiles = files.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={"ti " + cfg.icon} style={{ fontSize: 16, color: cfg.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)" }}>Import from {cfg.name}</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>Select a PDF or image to add to your Vault</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18, padding: 4 }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* File list */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, borderRight: "1px solid var(--border)" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 12, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />

            {loading && [...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 6 }} />
            ))}
            {error && (
              <div style={{ padding: "12px 14px", background: "rgba(239,68,68,.08)", borderRadius: 8, fontSize: 12, color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)" }}>
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
              </div>
            )}
            {!loading && !error && filteredFiles.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)" }}>
                <i className="ti ti-files-off" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                <div style={{ fontSize: 12 }}>{search ? "No files match" : "No PDF or image files found"}</div>
              </div>
            )}
            {!loading && !error && filteredFiles.map(f => (
              <div key={f.id} onClick={() => selectFile(f)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                cursor: "pointer", marginBottom: 4,
                background: selected?.id === f.id ? "var(--accdim)" : "transparent",
                border: "1px solid " + (selected?.id === f.id ? "var(--accborder)" : "transparent"),
              }}>
                <i className="ti ti-file-type-pdf" style={{ fontSize: 20, color: f.mimeType === "application/pdf" ? "#ef4444" : "#6366f1", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>
                    {[formatBytes(f.size), f.modifiedAt ? new Date(f.modifiedAt).toLocaleDateString() : ""].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {selected?.id === f.id && <i className="ti ti-check" style={{ fontSize: 14, color: "var(--accent)", flexShrink: 0 }} />}
              </div>
            ))}
          </div>

          {/* Import settings panel */}
          <div style={{ width: 240, padding: 16, overflowY: "auto", flexShrink: 0 }}>
            {!selected ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text3)" }}>
                <i className="ti ti-arrow-left" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                <div style={{ fontSize: 11 }}>Select a file to configure</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Import settings</div>
                {[
                  { label: "Document Type", el: (
                    <select value={docType} onChange={e => setDocType(e.target.value as DocType)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit" }}>
                      {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                  )},
                  { label: "Title *", el: (
                    <input value={title} onChange={e => setTitle(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  )},
                  { label: "Company", el: (
                    <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  )},
                  { label: "Year", el: (
                    <input value={year} onChange={e => setYear(e.target.value)} type="number" min={1990} max={2030}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  )},
                ].map(({ label, el }) => (
                  <div key={label}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>{label}</label>
                    {el}
                  </div>
                ))}
                <button onClick={handleImport} disabled={!title || importing} style={{
                  marginTop: 4, padding: "10px 0", borderRadius: 9,
                  background: title ? cfg.color : "var(--border)", border: "none",
                  color: "#fff", fontSize: 12, fontWeight: 700,
                  cursor: title && !importing ? "pointer" : "not-allowed", fontFamily: "inherit",
                }}>
                  {importing ? "Importing…" : "Import from " + cfg.name}
                </button>
                {selected.webViewUrl && (
                  <a href={selected.webViewUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", display: "block" }}>
                    <i className="ti ti-external-link" style={{ marginRight: 4 }} />Preview in {cfg.name}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Upload Modal ────────────────────────────────────────────── */
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (doc: VaultDoc) => void }) {
  const [step, setStep] = useState<"drop" | "form" | "uploading" | "done">("drop");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [docType, setDocType] = useState<DocType>("offer_letter");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File) {
    if (f.size > 10 * 1024 * 1024) { setError("File too large (max 10 MB)"); return; }
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    setError(""); setStep("form");
  }

  async function handleUpload() {
    if (!file || !title) return;
    setStep("uploading"); setError("");
    const fd = new FormData();
    fd.append("file", file); fd.append("type", docType);
    fd.append("title", title);
    if (company) fd.append("company", company);
    if (year)    fd.append("year", year);
    try {
      const res = await fetch("/api/vault/upload", { method: "POST", body: fd });
      const data = await res.json() as { doc?: VaultDoc; error?: string };
      if (!res.ok || !data.doc) { setError(data.error ?? "Upload failed"); setStep("form"); return; }
      setStep("done");
      setTimeout(() => { onUploaded(data.doc!); onClose(); }, 900);
    } catch { setError("Network error"); setStep("form"); }
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 460, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)" }}>
            {step === "uploading" ? "Uploading…" : step === "done" ? "Saved ✓" : "Add to Vault"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}>✕</button>
        </div>

        {error && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,.08)", borderRadius: 8, fontSize: 12, color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)" }}>{error}</div>}

        {step === "drop" && (
          <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
            onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed " + (dragging ? "var(--accent)" : "var(--border)"), borderRadius: 12, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "var(--accdim)" : "transparent", transition: "all .15s" }}>
            <i className="ti ti-cloud-upload" style={{ fontSize: 36, color: "var(--accent)", display: "block", marginBottom: 12 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", marginBottom: 6 }}>Drag & drop or click to upload</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>PDF, JPG, PNG — max 10 MB</div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          </div>
        )}

        {step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ fontSize: 12, color: "var(--text2)", padding: "8px 12px", background: "var(--accdim)", borderRadius: 7, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--accborder)" }}>
              <i className="ti ti-file" style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file?.name}</span>
              <span style={{ flexShrink: 0, color: "var(--text3)" }}>{formatBytes(file?.size)}</span>
            </div>
            <div><label style={labelStyle}>Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value as DocType)} style={inputStyle}>
                {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Offer Letter — Razorpay" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Company</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" style={inputStyle} />
              </div>
              <div style={{ width: 80 }}><label style={labelStyle}>Year</label>
                <input value={year} onChange={e => setYear(e.target.value)} type="number" min={1990} max={2030} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setStep("drop")} style={{ padding: "10px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
              <button onClick={handleUpload} disabled={!title} style={{ flex: 1, padding: "10px 0", borderRadius: 9, background: title ? "var(--accent)" : "var(--border)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: title ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                Upload to Vault
              </button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>Uploading securely…</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>AI will summarise your document after upload</div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}><i className="ti ti-circle-check" style={{ color: "var(--success)" }} /></div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>Saved to your Vault</div>
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
    <div onClick={() => onSelect(doc)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "border-color .15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: cfg.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={"ti " + cfg.icon} style={{ fontSize: 17, color: cfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>{[doc.company, doc.year, formatBytes(doc.file_size)].filter(Boolean).join(" · ")}</div>
        </div>
        {doc.verified && (
          <div title="Verified" style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-check" style={{ fontSize: 10, color: "#22c55e" }} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
        <SourceBadge source={doc.source} />
        {doc.ai_summary && (
          <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
            {doc.ai_summary}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Detail Panel ────────────────────────────────────────────── */
function DetailPanel({ doc, onClose, onDelete, onDownload }: {
  doc: VaultDoc; onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onDownload: (id: string, fileName: string) => Promise<void>;
}) {
  const w = useWindowWidth(); const mobile = w < 640;
  const cfg = docTypeConfig(doc.type);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function copyShareLink() {
    setSharing(true);
    try {
      const res = await fetch("/api/vault/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docId: doc.id }) });
      const data = await res.json() as { url?: string };
      if (data.url) { await navigator.clipboard.writeText(data.url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    } finally { setSharing(false); }
  }

  async function handleDownload() { setDownloading(true); await onDownload(doc.id, doc.file_name); setDownloading(false); }
  async function handleDelete()   { setDeleting(true);   await onDelete(doc.id);                    setDeleting(false);   }

  const isCloud = doc.source !== "upload";
  const cloudCfg = isCloud ? providerConfig(doc.source as CloudProvider) : null;

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: mobile ? "100%" : 360, background: "var(--surface)", borderLeft: "1px solid var(--border)", zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: cfg.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={"ti " + cfg.icon} style={{ fontSize: 15, color: cfg.color }} />
        </div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: doc.verified ? "rgba(34,197,94,.12)" : "rgba(251,191,36,.1)", color: doc.verified ? "#22c55e" : "#f59e0b", border: "1px solid " + (doc.verified ? "rgba(34,197,94,.25)" : "rgba(251,191,36,.25)") }}>
            {doc.verified ? "✓ Verified" : "⟳ Pending"}
          </div>
          {doc.tags.includes("bgv-ready") && (
            <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "var(--accdim)", color: "var(--accent)", border: "1px solid var(--accborder)" }}>BGV Ready</div>
          )}
          <SourceBadge source={doc.source} />
        </div>

        {doc.ai_summary && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>AI Summary</div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, background: "var(--accdim)", border: "1px solid var(--accborder)", borderRadius: 8, padding: "10px 12px" }}>{doc.ai_summary}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>Details</div>
          {[
            ["Type",    docTypeConfig(doc.type).label],
            ["File",    doc.file_name],
            ["Size",    formatBytes(doc.file_size)],
            ["Company", doc.company],
            ["Year",    doc.year?.toString()],
            ["Source",  isCloud ? cloudCfg?.name : "Direct upload"],
            ["Added",   new Date(doc.created_at).toLocaleDateString()],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>{k}</span>
              <span style={{ color: "var(--text2)", fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={handleDownload} disabled={downloading} style={{ padding: "10px 0", borderRadius: 9, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-download" style={{ marginRight: 6 }} />{downloading ? "Getting file…" : isCloud ? "Open in " + cloudCfg?.name : "Download"}
          </button>
          <button onClick={copyShareLink} disabled={sharing} style={{ padding: "10px 0", borderRadius: 9, background: copied ? "rgba(34,197,94,.1)" : "var(--surface2)", border: "1px solid " + (copied ? "rgba(34,197,94,.25)" : "var(--border)"), color: copied ? "#22c55e" : "var(--text2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
            <i className={"ti " + (copied ? "ti-check" : "ti-link")} style={{ marginRight: 6 }} />
            {sharing ? "Generating…" : copied ? "Link copied!" : "Copy share link"}
          </button>
          {!doc.verified && (
            <button style={{ padding: "10px 0", borderRadius: 9, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-shield-check" style={{ marginRight: 6 }} />Request verification
            </button>
          )}
          {isCloud && doc.cloud_file_url && (
            <a href={doc.cloud_file_url} target="_blank" rel="noreferrer" style={{ padding: "10px 0", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "center", display: "block", textDecoration: "none" }}>
              <i className="ti ti-external-link" style={{ marginRight: 6 }} />View in {cloudCfg?.name}
            </a>
          )}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ padding: "9px 0", borderRadius: 9, background: "none", border: "1px solid var(--border)", color: "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
              <i className="ti ti-trash" style={{ marginRight: 5 }} />Delete from Vault
            </button>
          ) : (
            <div style={{ padding: 12, borderRadius: 9, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)" }}>
              <div style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600, marginBottom: 10 }}>Delete permanently?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: "var(--danger)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function VaultPage() {
  const w = useWindowWidth(); const mobile = w < 640;
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [docs,        setDocs]        = useState<VaultDoc[]>([]);
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeType,  setActiveType]  = useState<DocType | "all">("all");
  const [search,      setSearch]      = useState("");
  const [showUpload,  setShowUpload]  = useState(false);
  const [selected,    setSelected]    = useState<VaultDoc | null>(null);
  const [showBgvModal,    setShowBgvModal]    = useState(false);
  const [showCloudPanel,  setShowCloudPanel]  = useState(false);
  const [cloudPicker,     setCloudPicker]     = useState<CloudProvider | null>(null);
  const [toast,           setToast]           = useState("");

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vault/docs");
      if (!res.ok) return;
      const data = await res.json() as { docs: VaultDoc[]; connections: CloudConnection[] };
      setDocs(data.docs ?? []);
      setConnections(data.connections ?? []);
    } catch { /* empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) loadDocs(); }, [user, loadDocs]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error     = searchParams.get("error");
    if (connected) {
      const cfg = CLOUD_PROVIDERS.find(p => p.key === connected);
      showToast((cfg?.name ?? connected) + " connected successfully");
      loadDocs();
      router.replace("/vault", { scroll: false });
    }
    if (error) {
      const msgs: Record<string, string> = { access_denied: "Access denied.", state_mismatch: "Security check failed.", token_exchange_failed: "Connection failed." };
      showToast(msgs[error] ?? "Connection failed. Please try again.");
      router.replace("/vault", { scroll: false });
    }
  }, [searchParams, loadDocs, router]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  function handleConnect(provider: CloudProvider) { window.location.href = "/api/vault/cloud/connect?provider=" + provider; }

  async function handleDisconnect(provider: CloudProvider) {
    const { getSupabaseAsync } = await import("@/lib/supabase");
    const sb = await getSupabaseAsync();
    await sb.from("vault_cloud_connections").delete().eq("provider", provider);
    setConnections(prev => prev.filter(c => c.provider !== provider));
    showToast(providerConfig(provider).name + " disconnected");
  }

  async function handleCloudImport(file: CloudFile, meta: { type: DocType; title: string; company: string; year: string }) {
    const res = await fetch("/api/vault/cloud/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: file.provider, fileId: file.id, fileName: file.name, mimeType: file.mimeType, webViewUrl: file.webViewUrl, type: meta.type, title: meta.title, company: meta.company || undefined, year: meta.year ? parseInt(meta.year) : undefined }),
    });
    const data = await res.json() as { doc?: VaultDoc; error?: string };
    if (data.doc) {
      setDocs(prev => [data.doc!, ...prev]);
      setCloudPicker(null);
      showToast('"' + data.doc.title + '" imported to Vault');
      setConnections(prev => prev.map(c => c.provider === file.provider ? { ...c, files_imported: (c.files_imported ?? 0) + 1, last_synced: new Date().toISOString() } : c));
    } else { showToast(data.error ?? "Import failed"); }
  }

  async function handleDownload(id: string, fileName: string) {
    const res = await fetch("/api/vault/" + id);
    const data = await res.json() as { url?: string; type?: string; error?: string };
    if (data.url) {
      if (data.type === "cloud") { window.open(data.url, "_blank"); }
      else { const a = document.createElement("a"); a.href = data.url; a.download = fileName; a.click(); }
    } else { showToast(data.error ?? "Download failed"); }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/vault/" + id, { method: "DELETE" });
    if (res.ok) { setDocs(prev => prev.filter(d => d.id !== id)); setSelected(null); showToast("Document deleted"); }
  }

  const filtered = docs.filter(d => {
    const matchType   = activeType === "all" || d.type === activeType;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || (d.company ?? "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const verifiedCount  = docs.filter(d => d.verified).length;
  const bgvReadyCount  = docs.filter(d => d.tags.includes("bgv-ready")).length;
  const totalSize      = docs.reduce((s, d) => s + (d.file_size ?? 0), 0);
  const connectedCount = connections.filter(c => c.status === "connected").length;
  const grouped        = DOC_TYPES.map(dt => ({ ...dt, count: docs.filter(d => d.type === dt.key).length }));
  const bgvDocs        = docs.filter(d => d.verified || d.tags.includes("bgv-ready"));

  return (
    <AppShell>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--text1)", color: "var(--surface)", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "0 4px 24px rgba(0,0,0,.3)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)}
          onUploaded={doc => { setDocs(prev => [doc, ...prev]); showToast("Document added to Vault"); }} />
      )}
      {selected && <DetailPanel doc={selected} onClose={() => setSelected(null)} onDelete={handleDelete} onDownload={handleDownload} />}
      {cloudPicker && <CloudPickerModal provider={cloudPicker} onClose={() => setCloudPicker(null)} onImport={handleCloudImport} />}

      <div style={{ padding: "24px 24px 64px", maxWidth: selected && !mobile ? "calc(100% - 370px)" : "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)", margin: 0 }}>Career Vault</h1>
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4, margin: 0 }}>Your verified career documents — always ready for BGV, loans, and new roles</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowCloudPanel(p => !p)} style={{ padding: "9px 14px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: connectedCount > 0 ? "rgba(34,197,94,.1)" : "var(--surface2)", border: connectedCount > 0 ? "1px solid rgba(34,197,94,.25)" : "1px solid var(--border)", color: connectedCount > 0 ? "var(--success)" : "var(--text2)" }}>
              <i className="ti ti-cloud" style={{ marginRight: 6 }} />{connectedCount > 0 ? connectedCount + " Cloud" + (connectedCount > 1 ? "s" : "") + " connected" : "Connect Cloud"}
            </button>
            <button onClick={() => setShowBgvModal(true)} style={{ padding: "9px 14px", borderRadius: 9, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-shield-check" style={{ marginRight: 6 }} />BGV Pack
            </button>
            <button onClick={() => setShowUpload(true)} style={{ padding: "9px 16px", borderRadius: 9, background: "var(--accent)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-upload" style={{ marginRight: 6 }} />Upload Doc
            </button>
          </div>
        </div>

        {/* Cloud Storage Panel */}
        {showCloudPanel && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)" }}>
                  <i className="ti ti-cloud" style={{ marginRight: 8, color: "var(--accent)" }} />Cloud Storage
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>Connect your drives to import existing career documents</div>
              </div>
              <button onClick={() => setShowCloudPanel(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
              {CLOUD_PROVIDERS.map(provider => (
                <CloudProviderCard key={provider.key} provider={provider}
                  connection={connections.find(c => c.provider === provider.key)}
                  onConnect={handleConnect} onDisconnect={handleDisconnect} onBrowse={p => setCloudPicker(p)} />
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "10px 13px", background: "var(--surface2)", borderRadius: 8, fontSize: 11, color: "var(--text3)", border: "1px solid var(--border)" }}>
              <i className="ti ti-lock" style={{ marginRight: 6 }} />
              We request <strong>read-only</strong> access. Files you import are copied to your Vault — originals stay in your cloud storage and are never modified.
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total Docs",    value: loading ? "—" : String(docs.length),           icon: "ti-files",        color: "var(--accent)" },
            { label: "Verified",      value: loading ? "—" : String(verifiedCount),          icon: "ti-shield-check", color: "#22c55e"       },
            { label: "BGV Ready",     value: loading ? "—" : String(bgvReadyCount),          icon: "ti-certificate",  color: "#f59e0b"       },
            { label: "Storage Used",  value: loading ? "—" : formatBytes(totalSize),         icon: "ti-database",     color: "#8b5cf6"       },
            { label: "Cloud Sources", value: loading ? "—" : String(connectedCount),         icon: "ti-cloud",        color: "#14b8a6"       },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <i className={"ti " + s.icon} style={{ fontSize: 12, color: s.color }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18, flexWrap: "wrap" }}>
          <button onClick={() => setActiveType("all")} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid", background: activeType === "all" ? "var(--accent)" : "transparent", borderColor: activeType === "all" ? "var(--accent)" : "var(--border)", color: activeType === "all" ? "#fff" : "var(--text3)" }}>
            All ({docs.length})
          </button>
          {grouped.filter(g => g.count > 0).map(g => (
            <button key={g.key} onClick={() => setActiveType(activeType === g.key ? "all" : g.key)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid", background: activeType === g.key ? g.color : "transparent", borderColor: activeType === g.key ? g.color : "var(--border)", color: activeType === g.key ? "#fff" : "var(--text3)" }}>
              {g.label} ({g.count})
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", width: 170 }} />
        </div>

        {/* Doc grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
            <i className="ti ti-folder-open" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{docs.length === 0 ? "Your Vault is empty" : "No documents match"}</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>{docs.length === 0 ? "Upload a document or import from a connected cloud drive" : "Try a different filter"}</div>
            {docs.length === 0 && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setShowUpload(true)} style={{ padding: "10px 20px", borderRadius: 9, background: "var(--accent)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-upload" style={{ marginRight: 6 }} />Upload a document
                </button>
                <button onClick={() => setShowCloudPanel(true)} style={{ padding: "10px 20px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-cloud" style={{ marginRight: 6 }} />Import from cloud
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filtered.map(doc => <DocCard key={doc.id} doc={doc} onSelect={setSelected} />)}
          </div>
        )}

        {/* BGV Pack Modal */}
        {showBgvModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 26 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>
                  <i className="ti ti-shield-check" style={{ marginRight: 7, color: "var(--success)" }} />BGV Pack
                </div>
                <button onClick={() => setShowBgvModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}>✕</button>
              </div>
              <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16, lineHeight: 1.6 }}>
                Share all your verified documents in a single link — no more chasing old employers for letters.
              </p>
              {bgvDocs.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
                  <i className="ti ti-files-off" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                  No verified documents yet. Upload and request verification to build your BGV pack.
                </div>
              ) : bgvDocs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                  <i className={"ti " + docTypeConfig(d.type).icon} style={{ color: docTypeConfig(d.type).color, fontSize: 14 }} />
                  <span style={{ flex: 1, color: "var(--text2)" }}>{d.title}</span>
                  <SourceBadge source={d.source} />
                  <span style={{ color: "var(--success)", fontWeight: 700, fontSize: 11 }}>✓</span>
                </div>
              ))}
              {bgvDocs.length > 0 && (
                <button style={{ marginTop: 16, width: "100%", padding: "11px 0", borderRadius: 10, background: "var(--accent)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  onClick={async () => {
                    const res = await fetch("/api/vault/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docId: bgvDocs[0].id }) });
                    const data = await res.json() as { url?: string };
                    if (data.url) { await navigator.clipboard.writeText(data.url); setShowBgvModal(false); showToast("BGV Pack link copied!"); }
                  }}>
                  <i className="ti ti-link" style={{ marginRight: 6 }} />Copy BGV Pack Link
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
