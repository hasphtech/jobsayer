"use client";
import { useState, useEffect, useCallback } from "react";
import { getSupabaseAsync } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminJob {
  id: string;
  title: string;
  company: string;
  location: string;
  mode: string;
  type: string;
  exp: string;
  salary: string;
  salary_num: number;
  skills: string[];
  openings: number;
  logo: string;
  description: string;
  jd_text: string;
  apply_url: string;
  source: string;
  source_url: string;
  is_active: boolean;
  is_approved: boolean;
  posted_at: string;
}

type View = "add" | "scrape" | "queue" | "manage";

const EMPTY_FORM: Omit<AdminJob, "id" | "posted_at" | "is_active" | "is_approved"> = {
  title: "", company: "", location: "Bengaluru", mode: "hybrid",
  type: "Full-time", exp: "", salary: "", salary_num: 0,
  skills: [], openings: 1, logo: "🏢",
  description: "", jd_text: "", apply_url: "",
  source: "manual", source_url: "",
};

// ── Styles ────────────────────────────────────────────────────────────────────

const bg: React.CSSProperties    = { minHeight: "100vh", background: "var(--bg)", color: "var(--text1)", fontFamily: "system-ui, -apple-system, sans-serif" };
const card: React.CSSProperties  = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };
const input: React.CSSProperties = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text1)", padding: "9px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const };
const btn = (accent = false): React.CSSProperties => ({
  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
  background: accent ? "var(--accent)" : "var(--surface2)",
  color: accent ? "#fff" : "var(--text2)",
});
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text3)", marginBottom: 5 };
const row: React.CSSProperties   = { display: "flex", gap: 12, flexWrap: "wrap" as const };

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token,   setToken]   = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  const [view,    setView]    = useState<View>("add");
  const [jobs,    setJobs]    = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const sb = await getSupabaseAsync();
        const { data } = await sb.auth.getSession();
        const t = data.session?.access_token ?? null;
        setToken(t);
        if (!t) { setIsAdmin(false); return; }
        const res = await fetch("/api/admin/check", { headers: { Authorization: `Bearer ${t}` } });
        const json = await res.json();
        setIsAdmin(json.isAdmin === true);
      } catch { setIsAdmin(false); }
    })();
  }, []);

  // ── Load jobs ─────────────────────────────────────────────
  const loadJobs = useCallback(async (status: string = "all") => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs?status=${status}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setJobs(json.jobs ?? []);
    } catch { setMsg("Failed to load jobs"); }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (isAdmin) loadJobs("all");
  }, [isAdmin, loadJobs]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  // ── Loading / access denied ───────────────────────────────
  if (isAdmin === null) return (
    <div style={{ ...bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Verifying access…</div>
    </div>
  );

  if (!isAdmin) return (
    <div style={{ ...bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Admin access required</div>
      <div style={{ fontSize: 13, color: "var(--text3)" }}>
        {token ? "Your account is not in the admin list." : "Please sign in first."}
      </div>
      <a href="/" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>← Back to home</a>
    </div>
  );

  // ── Stats ─────────────────────────────────────────────────
  const pending  = jobs.filter(j => !j.is_approved && j.is_active).length;
  const active   = jobs.filter(j =>  j.is_approved && j.is_active).length;
  const sources  = [...new Set(jobs.map(j => j.source))].join(", ") || "—";

  return (
    <div style={bg}>
      {/* Top bar */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/" style={{ color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>← Home</a>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>🛠 Admin — Jobs</span>
        {msg && <span style={{ fontSize: 12, color: msg.startsWith("✓") ? "var(--success)" : "var(--danger)", marginLeft: "auto" }}>{msg}</span>}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total", val: jobs.length, color: "var(--accent)" },
            { label: "Pending review", val: pending, color: "var(--warn)" },
            { label: "Active / live", val: active, color: "var(--success)" },
            { label: "Sources", val: sources, color: "var(--text3)" },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: "12px 18px", minWidth: 130 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {(["add", "scrape", "queue", "manage"] as View[]).map(v => (
            <button key={v} onClick={() => { setView(v); if (v === "queue") loadJobs("pending"); if (v === "manage") loadJobs("all"); }}
              style={{ padding: "9px 18px", fontSize: 13, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                color: view === v ? "var(--accent)" : "var(--text3)",
                borderBottom: view === v ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              {{ add: "➕ Add Job", scrape: "🤖 Scrape", queue: `🔍 Review Queue ${pending > 0 ? `(${pending})` : ""}`, manage: "📋 Manage" }[v]}
            </button>
          ))}
        </div>

        {/* Views */}
        {view === "add"     && <AddView     token={token!} onSaved={() => { loadJobs("all"); flash("✓ Job added — go to Review Queue to approve."); }} />}
        {view === "scrape"  && <ScrapeView  token={token!} onImported={() => { loadJobs("all"); flash("✓ Jobs added to review queue."); setView("queue"); loadJobs("pending"); }} />}
        {view === "queue"   && <QueueView   jobs={jobs.filter(j => !j.is_approved && j.is_active)} token={token!} loading={loading} onRefresh={() => loadJobs("pending")} flash={flash} />}
        {view === "manage"  && <ManageView  jobs={jobs} token={token!} loading={loading} onRefresh={() => loadJobs("all")} flash={flash} />}
      </div>
    </div>
  );
}

// ── Add Job view ──────────────────────────────────────────────────────────────

function AddView({ token, onSaved }: { token: string; onSaved: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title || !form.company || !form.location) { setErr("Title, company and location are required."); return; }
    setSaving(true);
    setErr("");
    const body = {
      ...form,
      skills: typeof form.skills === "string" ? (form.skills as string).split(",").map((s: string) => s.trim()).filter(Boolean) : form.skills,
      salary_num: Number(form.salary_num) || 0,
      openings:   Number(form.openings)   || 1,
      is_active:   true,
      is_approved: false,
    };
    const res = await fetch("/api/admin/jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { setForm({ ...EMPTY_FORM }); onSaved(); }
    else { const j = await res.json(); setErr(j.error ?? "Save failed"); }
    setSaving(false);
  }

  const cols = (n: number): React.CSSProperties => ({ flex: `1 1 ${Math.floor(100 / n) - 2}%`, minWidth: 180 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>Add job manually</div>

      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Row 1 */}
        <div style={row}>
          <div style={cols(2)}><label style={label}>Job Title *</label><input style={input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Senior React Developer" /></div>
          <div style={cols(2)}><label style={label}>Company *</label><input style={input} value={form.company} onChange={e => set("company", e.target.value)} placeholder="e.g. Razorpay" /></div>
        </div>
        {/* Row 2 */}
        <div style={row}>
          <div style={cols(3)}><label style={label}>Location *</label><input style={input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Bengaluru" /></div>
          <div style={cols(3)}>
            <label style={label}>Work Mode</label>
            <select style={input} value={form.mode} onChange={e => set("mode", e.target.value)}>
              {["hybrid", "remote", "onsite"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={cols(3)}>
            <label style={label}>Type</label>
            <select style={input} value={form.type} onChange={e => set("type", e.target.value)}>
              {["Full-time", "Part-time", "Contract", "Internship"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {/* Row 3 */}
        <div style={row}>
          <div style={cols(3)}><label style={label}>Experience</label><input style={input} value={form.exp} onChange={e => set("exp", e.target.value)} placeholder="2–4 yrs" /></div>
          <div style={cols(3)}><label style={label}>Salary (display)</label><input style={input} value={form.salary} onChange={e => set("salary", e.target.value)} placeholder="₹18–26 LPA" /></div>
          <div style={cols(3)}><label style={label}>Salary mid-point (LPA)</label><input style={{ ...input, width: "100%" }} type="number" value={form.salary_num || ""} onChange={e => set("salary_num", e.target.value)} placeholder="22" /></div>
        </div>
        {/* Row 4 */}
        <div style={row}>
          <div style={cols(2)}><label style={label}>Skills (comma-separated)</label><input style={input} value={Array.isArray(form.skills) ? form.skills.join(", ") : form.skills} onChange={e => set("skills", e.target.value)} placeholder="React, TypeScript, Node.js" /></div>
          <div style={cols(4)}><label style={label}>Openings</label><input style={input} type="number" value={form.openings} onChange={e => set("openings", e.target.value)} /></div>
          <div style={cols(4)}><label style={label}>Logo emoji</label><input style={input} value={form.logo} onChange={e => set("logo", e.target.value)} /></div>
        </div>
        {/* Row 5 */}
        <div><label style={label}>Job Description / Summary</label><textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief summary shown on job card" /></div>
        <div><label style={label}>Full JD Text (for keyword matching)</label><textarea style={{ ...input, minHeight: 100, resize: "vertical" }} value={form.jd_text} onChange={e => set("jd_text", e.target.value)} placeholder="Paste the full job description here — used for JD match scoring" /></div>
        {/* Row 6 */}
        <div style={row}>
          <div style={cols(2)}><label style={label}>Apply URL</label><input style={input} value={form.apply_url} onChange={e => set("apply_url", e.target.value)} placeholder="https://..." /></div>
          <div style={cols(2)}><label style={label}>Source URL (if scraped)</label><input style={input} value={form.source_url} onChange={e => set("source_url", e.target.value)} placeholder="https://naukri.com/..." /></div>
        </div>

        {err && <div style={{ color: "var(--danger)", fontSize: 12 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button style={btn(true)} onClick={save} disabled={saving}>{saving ? "Saving…" : "Add to Review Queue"}</button>
          <button style={btn()} onClick={() => setForm({ ...EMPTY_FORM })}>Reset</button>
        </div>
      </div>
    </div>
  );
}

// ── Scrape view ───────────────────────────────────────────────────────────────

interface ScrapeResult {
  title: string; company: string; location: string; exp: string;
  salary: string; salary_num: number; skills: string[];
  description: string; apply_url: string; source: string;
}

function ScrapeView({ token, onImported }: { token: string; onImported: () => void }) {
  const [url,      setUrl]      = useState("");
  const [source,   setSource]   = useState("career_page");
  const [pages,    setPages]    = useState(1);
  const [scraping, setScraping] = useState(false);
  const [results,  setResults]  = useState<ScrapeResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [err,      setErr]      = useState("");
  const [importing, setImporting] = useState(false);

  async function scrape() {
    if (!url.trim()) { setErr("Enter a URL to scrape."); return; }
    setScraping(true); setErr(""); setResults([]); setSelected(new Set());
    const res = await fetch("/api/admin/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, source, max_pages: pages }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setErr(json.error ?? "Scrape failed");
    } else {
      setResults(json.jobs ?? []);
      setSelected(new Set((json.jobs ?? []).map((_: ScrapeResult, i: number) => i)));
    }
    setScraping(false);
  }

  async function importSelected() {
    const toImport = results.filter((_, i) => selected.has(i));
    if (!toImport.length) { setErr("Select at least one job."); return; }
    setImporting(true);
    let ok = 0;
    for (const job of toImport) {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...job, is_active: true, is_approved: false, source_url: url }),
      });
      if (res.ok) ok++;
    }
    setImporting(false);
    setResults([]); setSelected(new Set());
    if (ok) onImported();
    else setErr("Import failed — check console");
  }

  const toggle = (i: number) => setSelected(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Scrape job listings</div>

      <div style={card}>
        <div style={row}>
          <div style={{ flex: "2 1 300px" }}>
            <label style={label}>Job page URL</label>
            <input style={input} value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://www.naukri.com/react-developer-jobs-in-bengaluru  OR  https://razorpay.com/jobs/" />
          </div>
          <div style={{ flex: "0 1 160px" }}>
            <label style={label}>Source</label>
            <select style={input} value={source} onChange={e => setSource(e.target.value)}>
              <option value="naukri">Naukri.com</option>
              <option value="linkedin">LinkedIn Jobs</option>
              <option value="internshala">Internshala</option>
              <option value="career_page">Company career page</option>
            </select>
          </div>
          <div style={{ flex: "0 1 110px" }}>
            <label style={label}>Pages</label>
            <select style={input} value={pages} onChange={e => setPages(Number(e.target.value))}>
              {[1,2,3,5].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <button style={btn(true)} onClick={scrape} disabled={scraping}>{scraping ? "⏳ Scraping…" : "🤖 Scrape"}</button>
          {scraping && <span style={{ fontSize: 12, color: "var(--text3)" }}>This may take 15–30 seconds for JS-heavy sites…</span>}
        </div>

        {/* Source tips */}
        <div style={{ marginTop: 14, padding: 12, background: "var(--surface2)", borderRadius: 8, fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text2)" }}>Tips:</strong>
          {" "}Naukri: use a search URL like <code>naukri.com/react-developer-jobs-in-bengaluru</code>
          {" · "}LinkedIn: <code>linkedin.com/jobs/search/?keywords=react+developer&location=India</code>
          {" · "}Career page: paste any company's /jobs or /careers URL
        </div>
      </div>

      {err && <div style={{ color: "var(--danger)", fontSize: 13 }}>{err}</div>}

      {results.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Found {results.length} jobs — select to import</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn()} onClick={() => setSelected(new Set(results.map((_, i) => i)))}>All</button>
              <button style={btn()} onClick={() => setSelected(new Set())}>None</button>
              <button style={btn(true)} onClick={importSelected} disabled={importing || !selected.size}>
                {importing ? "Importing…" : `Import ${selected.size} →`}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((j, i) => (
              <div key={i} onClick={() => toggle(i)} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: 12,
                background: selected.has(i) ? "var(--accdim)" : "var(--surface2)",
                border: `1px solid ${selected.has(i) ? "var(--accborder)" : "var(--border)"}`,
                borderRadius: 8, cursor: "pointer",
              }}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ marginTop: 3 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text1)" }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{j.company} · {j.location} · {j.exp}</div>
                  {j.salary && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 1 }}>{j.salary}</div>}
                  {j.skills?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                      {j.skills.slice(0, 6).map(s => (
                        <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Review Queue view ─────────────────────────────────────────────────────────

function QueueView({ jobs, token, loading, onRefresh, flash }: {
  jobs: AdminJob[]; token: string; loading: boolean; onRefresh: () => void; flash: (m: string) => void;
}) {
  async function action(id: string, approve: boolean) {
    const body = approve ? { id, is_approved: true } : { id, is_active: false };
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { flash(approve ? "✓ Job approved and live" : "✓ Job rejected"); onRefresh(); }
    else flash("Action failed");
  }

  if (loading) return <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div>;
  if (!jobs.length) return (
    <div style={{ ...card, textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 700 }}>Queue is empty</div>
      <div style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>All jobs have been reviewed.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{jobs.length} jobs waiting for review</div>
        <button style={btn()} onClick={onRefresh}>↻ Refresh</button>
      </div>
      {jobs.map(j => (
        <div key={j.id} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 28 }}>{j.logo}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{j.title}</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{j.company} · {j.location} · {j.exp}</div>
            {j.salary && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 2 }}>{j.salary}</div>}
            {j.skills?.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {j.skills.slice(0, 8).map(s => <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{s}</span>)}
              </div>
            )}
            {j.description && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6, lineHeight: 1.5 }}>{j.description.slice(0, 200)}</div>}
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
              Source: <strong>{j.source}</strong>
              {j.apply_url && <> · <a href={j.apply_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>View original →</a></>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={{ ...btn(true) }} onClick={() => action(j.id, true)}>✓ Approve</button>
            <button style={{ ...btn(), color: "var(--danger)" }} onClick={() => action(j.id, false)}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Manage view ───────────────────────────────────────────────────────────────

function ManageView({ jobs, token, loading, onRefresh, flash }: {
  jobs: AdminJob[]; token: string; loading: boolean; onRefresh: () => void; flash: (m: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase())
  );

  async function toggle(j: AdminJob) {
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: j.id, is_active: !j.is_active }),
    });
    if (res.ok) { flash(`✓ ${j.is_active ? "Deactivated" : "Activated"}`); onRefresh(); }
  }

  async function del(id: string) {
    if (!confirm("Delete this job permanently?")) return;
    const res = await fetch(`/api/admin/jobs?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { flash("✓ Deleted"); onRefresh(); }
  }

  if (loading) return <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input style={{ ...input, maxWidth: 300 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or company…" />
        <button style={btn()} onClick={onRefresh}>↻ Refresh</button>
        <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: "auto" }}>{filtered.length} jobs</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)", textAlign: "left" }}>
              {["Title", "Company", "Location", "Source", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(j => (
              <tr key={j.id} style={{ borderBottom: "1px solid var(--border)", opacity: j.is_active ? 1 : 0.5 }}>
                <td style={{ padding: "10px 10px" }}><div style={{ fontWeight: 600 }}>{j.title}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{j.exp} · {j.salary}</div></td>
                <td style={{ padding: "10px 10px", color: "var(--text2)" }}>{j.company}</td>
                <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>{j.location}</td>
                <td style={{ padding: "10px 10px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface2)", color: "var(--text3)" }}>{j.source}</span>
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                    background: j.is_approved && j.is_active ? "#14532d" : "#7f1d1d",
                    color: j.is_approved && j.is_active ? "#4ade80" : "#f87171",
                  }}>
                    {j.is_approved && j.is_active ? "Live" : !j.is_active ? "Inactive" : "Pending"}
                  </span>
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...btn(), fontSize: 11, padding: "4px 10px" }} onClick={() => toggle(j)}>
                      {j.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button style={{ ...btn(), fontSize: 11, padding: "4px 10px", color: "var(--danger)" }} onClick={() => del(j.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No jobs found.</div>}
      </div>
    </div>
  );
}
