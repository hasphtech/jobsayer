"use client";
/**
 * /applications — Job Application Tracker
 * Kanban-style board: Saved → Applied → Screening → Interview → Offer / Rejected
 * Stored in localStorage (guests) and synced to Supabase (signed-in users).
 */
import React, { useState, useEffect, useCallback } from "react";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
type Stage = "saved" | "applied" | "screening" | "interview" | "offer" | "rejected";

interface Application {
  id:           string;
  company:      string;
  role:         string;
  location:     string;
  salary:       string;
  url:          string;
  stage:        Stage;
  notes:        string;
  appliedDate:  string;       // ISO date string
  updatedAt:    string;
  noticePeriod: string;       // "Immediate" | "15 days" | "30 days" | "45 days" | "60 days" | "90 days" | "3 months+"
  offerDate:    string;       // ISO date — when offer was received (for countdown)
}

const NOTICE_OPTS = ["Immediate", "15 days", "30 days", "45 days", "60 days", "90 days", "3 months+"] as const;

function noticeDays(period: string): number {
  if (!period || period === "Immediate") return 0;
  if (period === "3 months+") return 90;
  return parseInt(period) || 0;
}

/* ── Config ─────────────────────────────────────────────────── */
const STAGES: { key: Stage; label: string; icon: string; color: string; bg: string }[] = [
  { key: "saved",       label: "Saved",      icon: "🔖", color: "var(--text2)",    bg: "rgba(255,255,255,.04)" },
  { key: "applied",     label: "Applied",    icon: "📤", color: "var(--accent)",   bg: "rgba(99,102,241,.08)"  },
  { key: "screening",   label: "Screening",  icon: "📞", color: "var(--warn)",     bg: "rgba(234,179,8,.08)"   },
  { key: "interview",   label: "Interview",  icon: "🎤", color: "#a78bfa",         bg: "rgba(167,139,250,.08)" },
  { key: "offer",       label: "Offer 🎉",   icon: "✅", color: "var(--success)",  bg: "rgba(34,197,94,.08)"   },
  { key: "rejected",    label: "Rejected",   icon: "✗",  color: "var(--danger)",   bg: "rgba(239,68,68,.08)"   },
];

const STORAGE_KEY = "jobsayer-applications";

const emptyApp = (): Omit<Application, "id" | "updatedAt"> => ({
  company: "", role: "", location: "", salary: "",
  url: "", stage: "saved", notes: "",
  appliedDate: new Date().toISOString().split("T")[0],
  noticePeriod: "30 days", offerDate: "",
});

/* ── Helpers ─────────────────────────────────────────────────── */
function newId() { return `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function load(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function save(apps: Application[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(apps)); } catch { /* ignore */ }
}

/* ── Add/Edit Modal ──────────────────────────────────────────── */
function AppModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Application;
  onSave: (app: Application) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial ?? { ...emptyApp(), id: newId(), updatedAt: new Date().toISOString() });
  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text1)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "var(--text3)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 24px", width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}>✕</button>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
          {initial ? "Edit Application" : "Add Application"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Company *</label>
              <input style={inp} placeholder="Razorpay" value={form.company} onChange={e => set("company", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Role *</label>
              <input style={inp} placeholder="Senior Engineer" value={form.role} onChange={e => set("role", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Location</label>
              <input style={inp} placeholder="Bangalore" value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Salary (LPA)</label>
              <input style={inp} placeholder="18–24 LPA" value={form.salary} onChange={e => set("salary", e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>Job URL</label>
            <input style={inp} placeholder="https://..." value={form.url} onChange={e => set("url", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Stage</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)}
                style={{ ...inp, appearance: "none" as React.CSSProperties["appearance"] }}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Applied Date</label>
              <input type="date" style={inp} value={form.appliedDate} onChange={e => set("appliedDate", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Notice period required</label>
              <select value={form.noticePeriod} onChange={e => set("noticePeriod", e.target.value)}
                style={{ ...inp, appearance: "none" as React.CSSProperties["appearance"] }}>
                {NOTICE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Offer received date</label>
              <input type="date" style={inp} value={form.offerDate} onChange={e => set("offerDate", e.target.value)}
                placeholder="Only if offer received" />
            </div>
          </div>

          <div>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} placeholder="Recruiter name, next steps, anything useful…"
              style={{ ...inp, resize: "vertical" as React.CSSProperties["resize"] }} />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: "9px 20px", background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button
              onClick={() => {
                if (!form.company.trim() || !form.role.trim()) return;
                onSave({ ...form, updatedAt: new Date().toISOString() });
              }}
              style={{ padding: "9px 24px", background: "var(--accent)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {initial ? "Save changes" : "Add application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Ghosting probability ────────────────────────────────────── */
function ghostSignal(stage: Stage, daysSince: number): { pct: number; label: string; color: string } | null {
  if (stage === "offer" || stage === "rejected" || stage === "saved") return null;
  const thresholds: Record<Exclude<Stage, "offer" | "rejected" | "saved">, number> = {
    applied: 14, screening: 10, interview: 7,
  };
  const threshold = thresholds[stage as "applied" | "screening" | "interview"];
  if (!threshold || daysSince < threshold) return null;
  const overdue = Math.min(daysSince - threshold, threshold * 2);
  const pct = Math.min(40 + Math.round((overdue / (threshold * 2)) * 55), 92);
  const label = pct >= 80 ? "Likely ghosted" : pct >= 60 ? "Probably ghosted" : "Possibly ghosted";
  const color = pct >= 80 ? "var(--danger)" : pct >= 60 ? "var(--warn)" : "var(--text3)";
  return { pct, label, color };
}

/* ── Follow-up email template ────────────────────────────────── */
function buildFollowUp(app: Application, daysSince: number): string {
  return `Subject: Follow-up — ${app.role} Application

Hi [Hiring Manager / Recruiter name],

I hope you're doing well. I applied for the ${app.role} position at ${app.company} ${daysSince === 1 ? "yesterday" : `${daysSince} days ago`} and wanted to follow up to reiterate my strong interest in the role.

I'm genuinely excited about the opportunity to contribute to ${app.company} and believe my background aligns well with what your team is looking for. I'd love to learn about the next steps in the process when you have a moment.

Thank you for your time and consideration. I look forward to hearing from you.

Warm regards,
[Your Name]
[Phone] | [Email] | [LinkedIn]`;
}

/* ── Application Card ────────────────────────────────────────── */
function AppCard({ app, onEdit, onDelete, onStageChange }: {
  app: Application;
  onEdit: () => void;
  onDelete: () => void;
  onStageChange: (s: Stage) => void;
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [showEmail,   setShowEmail]   = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const stage = STAGES.find(s => s.key === app.stage)!;
  const daysSince = Math.floor((Date.now() - new Date(app.appliedDate).getTime()) / 86400000);
  const ghost = ghostSignal(app.stage, daysSince);
  const followUpEmail = buildFollowUp(app, daysSince);

  // Joining countdown: if offer received, when should candidate give notice?
  const joiningInfo = (() => {
    if (app.stage !== "offer" || !app.offerDate) return null;
    const nd = noticeDays(app.noticePeriod);
    if (nd === 0) return { label: "Can join immediately", color: "var(--success)", urgent: false };
    const offerMs   = new Date(app.offerDate).getTime();
    const noticeEnd = new Date(offerMs + nd * 86400000);
    const daysLeft  = Math.ceil((noticeEnd.getTime() - Date.now()) / 86400000);
    const dateStr   = noticeEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    if (daysLeft < 0) return { label: `Notice period ended ${Math.abs(daysLeft)}d ago`, color: "var(--danger)", urgent: true };
    if (daysLeft === 0) return { label: "Last day of notice today!", color: "var(--danger)", urgent: true };
    return {
      label: `Notice ends ${dateStr} (${daysLeft}d left)`,
      color: daysLeft <= 7 ? "var(--warn)" : "var(--success)",
      urgent: daysLeft <= 7,
    };
  })();

  async function copyEmail() {
    await navigator.clipboard.writeText(followUpEmail);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "14px 16px",
      borderLeft: `3px solid ${stage.color}`,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 2 }}>{app.company}</div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>{app.role}</div>
          {(app.location || app.salary) && (
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
              {[app.location, app.salary].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {app.url && (
            <a href={app.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text3)", textDecoration: "none" }}>
              <ExternalLink size={12} />
            </a>
          )}
          <button onClick={onEdit} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text3)", cursor: "pointer", fontSize: 13 }}>✏</button>
          <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "none", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Stage + date + ghost signal */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: stage.bg, color: stage.color }}>
          {stage.icon} {stage.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          {daysSince === 0 ? "Today" : daysSince === 1 ? "1 day ago" : `${daysSince} days ago`}
        </span>
        {ghost && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${ghost.color}15`, border: `1px solid ${ghost.color}40`, color: ghost.color }}>
            👻 {ghost.pct}% — {ghost.label}
          </span>
        )}
        {app.noticePeriod && app.stage !== "offer" && (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>
            🕐 {app.noticePeriod}
          </span>
        )}
      </div>

      {/* Joining countdown — shown only on offer stage */}
      {joiningInfo && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: `${joiningInfo.color}10`, border: `1px solid ${joiningInfo.color}35` }}>
          <span style={{ fontSize: 14 }}>{joiningInfo.urgent ? "⚠️" : "📅"}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: joiningInfo.color }}>{joiningInfo.label}</div>
            {app.noticePeriod && app.noticePeriod !== "Immediate" && (
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>Notice required: {app.noticePeriod}</div>
            )}
          </div>
        </div>
      )}

      {/* Quick stage mover */}
      <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
        {STAGES.filter(s => s.key !== app.stage).map(s => (
          <button key={s.key} onClick={() => onStageChange(s.key)} style={{
            fontSize: 10, fontWeight: 600, padding: "2px 9px", borderRadius: 99,
            border: "1px solid var(--border)", background: "none", color: "var(--text3)",
            cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = s.bg; e.currentTarget.style.color = s.color; e.currentTarget.style.borderColor = s.color + "44"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            → {s.label}
          </button>
        ))}
      </div>

      {/* Follow-up email generator */}
      {ghost && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setShowEmail(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
            borderRadius: 7, border: `1px solid ${ghost.color}40`,
            background: `${ghost.color}08`, color: ghost.color,
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>
            ✉️ {showEmail ? "Hide" : "Generate follow-up email"}
          </button>
          {showEmail && (
            <div style={{ marginTop: 8, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
              <pre style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
                {followUpEmail}
              </pre>
              <button onClick={copyEmail} style={{
                marginTop: 8, padding: "6px 14px", borderRadius: 7,
                border: `1px solid ${emailCopied ? "var(--success)" : "var(--border)"}`,
                background: emailCopied ? "rgba(34,197,94,.1)" : "none",
                color: emailCopied ? "var(--success)" : "var(--text2)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
                {emailCopied ? "✓ Copied!" : "📋 Copy email"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes toggle */}
      {app.notes && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, fontFamily: "inherit" }}>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Notes
          </button>
          {expanded && (
            <div style={{ marginTop: 6, padding: "8px 10px", background: "rgba(255,255,255,.03)", borderRadius: 8, fontSize: 12, color: "var(--text2)", lineHeight: 1.6, border: "1px solid var(--border)" }}>
              {app.notes}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function ApplicationsPage() {
  const { user } = useAuth();
  const [apps, setApps]         = useState<Application[]>([]);
  const [modal, setModal]       = useState<"add" | Application | null>(null);
  const [filterStage, setFilter] = useState<Stage | "all">("all");
  const [search, setSearch]     = useState("");

  useEffect(() => { setApps(load()); }, []);

  const persist = useCallback((next: Application[]) => {
    setApps(next);
    save(next);
  }, []);

  function addApp(app: Application)    { persist([app, ...apps]); setModal(null); }
  function editApp(app: Application)   { persist(apps.map(a => a.id === app.id ? app : a)); setModal(null); }
  function deleteApp(id: string)       { persist(apps.filter(a => a.id !== id)); }
  function moveStage(id: string, s: Stage) { persist(apps.map(a => a.id === id ? { ...a, stage: s, updatedAt: new Date().toISOString() } : a)); }

  const filtered = apps
    .filter(a => filterStage === "all" || a.stage === filterStage)
    .filter(a => !search || [a.company, a.role, a.location].some(v => v.toLowerCase().includes(search.toLowerCase())));

  const counts = Object.fromEntries(STAGES.map(s => [s.key, apps.filter(a => a.stage === s.key).length]));

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav actions={
        <button onClick={() => setModal("add")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--accent)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Plus size={12} /> Add Application
        </button>
      } />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Application Tracker</h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              {apps.length === 0 ? "Start tracking your job applications" : `${apps.length} application${apps.length !== 1 ? "s" : ""} tracked`}
              {!user && <span> · <span style={{ color: "var(--warn)" }}>Sign in to sync across devices</span></span>}
            </p>
          </div>
        </div>

        {/* Stage summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 24 }}>
          {STAGES.map(s => (
            <button key={s.key} onClick={() => setFilter(f => f === s.key ? "all" : s.key)}
              style={{
                padding: "10px 8px", borderRadius: 10, border: `1px solid ${filterStage === s.key ? s.color + "44" : "var(--border)"}`,
                background: filterStage === s.key ? s.bg : "var(--surface)",
                cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                transition: "all .15s",
              }}>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{counts[s.key] ?? 0}</div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2, whiteSpace: "nowrap" }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company, role…"
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
          {filterStage !== "all" && (
            <button onClick={() => setFilter("all")} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              ✕ Clear filter
            </button>
          )}
        </div>

        {/* Empty state */}
        {apps.length === 0 && (
          <div style={{ ...card, padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No applications yet</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24, lineHeight: 1.7 }}>
              Start tracking your job applications to stay organised.<br />
              Save jobs, track stages, and never lose a follow-up again.
            </p>
            <button onClick={() => setModal("add")} style={{ padding: "11px 28px", background: "var(--accent)", border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <Plus size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              Add your first application
            </button>
          </div>
        )}

        {/* Application list */}
        {filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {filtered.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onEdit={() => setModal(app)}
                onDelete={() => deleteApp(app.id)}
                onStageChange={s => moveStage(app.id, s)}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 && apps.length > 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text3)", fontSize: 13 }}>
            No applications match your filter.
          </div>
        )}

        {/* Tips */}
        {apps.length > 0 && (
          <div style={{ ...card, marginTop: 28, padding: "16px 20px", background: "rgba(99,102,241,.04)", borderColor: "var(--accborder)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>💡 Tracker tips</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
              {[
                "Follow up after 5–7 days of no response",
                "Move to Rejected early — it clears mental load",
                "Add the recruiter's name in Notes",
                "Track the offer deadline in Notes",
              ].map(tip => (
                <div key={tip} style={{ fontSize: 12, color: "var(--text3)", display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0 }}>✦</span> {tip}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <AppModal
          initial={modal === "add" ? undefined : modal}
          onSave={modal === "add" ? addApp : editApp}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
