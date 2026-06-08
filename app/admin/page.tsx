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

type View = "add" | "scrape" | "queue" | "manage" | "bgv" | "companies";

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
        <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          {(["add", "scrape", "queue", "manage", "bgv", "companies"] as View[]).map(v => (
            <button key={v} onClick={() => { setView(v); if (v === "queue") loadJobs("pending"); if (v === "manage") loadJobs("all"); }}
              style={{ padding: "9px 16px", fontSize: 13, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                color: view === v ? "var(--accent)" : "var(--text3)",
                borderBottom: view === v ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              {{ add: "➕ Add Job", scrape: "🤖 Scrape", queue: `🔍 Queue ${pending > 0 ? `(${pending})` : ""}`, manage: "📋 Manage", bgv: "🛡 BGV", companies: "🏅 Companies" }[v]}
            </button>
          ))}
        </div>

        {/* Views */}
        {view === "add"       && <AddView       token={token!} onSaved={() => { loadJobs("all"); flash("✓ Job added — go to Review Queue to approve."); }} />}
        {view === "scrape"    && <ScrapeView    token={token!} onImported={() => { loadJobs("all"); flash("✓ Jobs added to review queue."); setView("queue"); loadJobs("pending"); }} />}
        {view === "queue"     && <QueueView     jobs={jobs.filter(j => !j.is_approved && j.is_active)} token={token!} loading={loading} onRefresh={() => loadJobs("pending")} flash={flash} />}
        {view === "manage"    && <ManageView    jobs={jobs} token={token!} loading={loading} onRefresh={() => loadJobs("all")} flash={flash} />}
        {view === "bgv"       && <BgvAdminView  token={token!} flash={flash} />}
        {view === "companies" && <CompanyVerifyAdminView token={token!} flash={flash} />}
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
                    color: j.is_approved && j.is_active ? "var(--success)" : "var(--danger)",
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

// ── BGV Admin View ────────────────────────────────────────────────────────────

interface AutoCheckResult {
  category: string; check: string; status: "pass" | "fail" | "warn" | "skip"; detail: string;
}
interface AutoCheckSummary {
  checks: AutoCheckResult[];
  autoScore: number;
  idAutoVerified: boolean;
  eduAutoVerified: boolean;
  empAutoVerified: boolean;
  requiresManualReview: string[];
  runAt: string;
}
interface EduEntry { degree: string; institution: string; year: string; result: string }
interface EmpEntry { company: string; role: string; from_date: string; to_date: string; manager_name: string; manager_email: string }

interface BgvRow {
  id: string; user_id: string; full_name: string; status: string;
  pan_number: string | null; aadhaar_last4: string | null; dob: string | null;
  verification_score: number | null;
  id_verified: boolean; edu_verified: boolean; emp_verified: boolean; address_verified: boolean;
  submitted_at: string; education: EduEntry[]; employment: EmpEntry[];
  auto_check_results: AutoCheckSummary | null;
  admin_notes: string | null; rejection_reason: string | null;
}

type BgvFilter = "all" | "pending" | "in_progress" | "verified" | "failed";

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:     { color: "var(--warn)",    bg: "rgba(234,179,8,.12)",   label: "Pending",     icon: "⏳" },
  in_progress: { color: "var(--accent)",  bg: "rgba(99,102,241,.12)",  label: "In Progress", icon: "🔍" },
  verified:    { color: "var(--success)", bg: "rgba(34,197,94,.12)",   label: "Verified",    icon: "✅" },
  partial:     { color: "var(--warn)",    bg: "rgba(234,179,8,.12)",   label: "Partial",     icon: "⚠" },
  failed:      { color: "var(--danger)",  bg: "rgba(239,68,68,.12)",   label: "Failed",      icon: "✗"  },
};

const CHECK_ICON: Record<string, string> = { pass: "✅", fail: "❌", warn: "⚠️", skip: "⏭" };
const CHECK_COLOR: Record<string, string> = {
  pass: "var(--success)", fail: "var(--danger)", warn: "var(--warn)", skip: "var(--text3)",
};

function BgvAdminView({ token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]         = useState<BgvRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<BgvFilter>("all");
  const [selected, setSelected] = useState<BgvRow | null>(null);
  const [notes, setNotes]       = useState("");
  const [rejReason, setRejReason] = useState("");
  const [score, setScore]       = useState(0);
  const [checks, setChecks]     = useState({ id: false, edu: false, emp: false });
  const [saving, setSaving]     = useState(false);
  const [running, setRunning]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bgv", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setRows(json.bgvRecords ?? []);
      else flash(json.error ?? "Failed to load BGV records");
    } catch { flash("Failed to load BGV records"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  function openReview(r: BgvRow) {
    setSelected(r);
    setNotes(r.admin_notes ?? "");
    setRejReason(r.rejection_reason ?? "");
    setScore(r.verification_score ?? (r.auto_check_results?.autoScore ?? 0));
    setChecks({ id: r.id_verified, edu: r.edu_verified, emp: r.emp_verified });
  }

  async function runAutoCheck(id: string) {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/bgv/run-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        flash("✓ Auto-checks complete");
        await load();
        // Re-open with fresh data
        setSelected(data.bgv);
        const acr = data.bgv?.auto_check_results as AutoCheckSummary | null;
        setChecks({ id: data.bgv?.id_verified ?? false, edu: data.bgv?.edu_verified ?? false, emp: data.bgv?.emp_verified ?? false });
        setScore(acr?.autoScore ?? 0);
      } else {
        flash(data.error ?? "Auto-check failed");
      }
    } catch { flash("Network error"); }
    setRunning(false);
  }

  async function approveBgv(newStatus: string) {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bgv", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: selected.id,
          status: newStatus,
          verification_score: score,
          id_verified:   checks.id,
          edu_verified:  checks.edu,
          emp_verified:  checks.emp,
          admin_notes:   notes || null,
          rejection_reason: newStatus === "failed" ? (rejReason || "Did not meet verification requirements") : null,
          reviewed_at:   new Date().toISOString(),
        }),
      });
      if (res.ok) { flash(`✓ BGV marked as ${newStatus}`); await load(); setSelected(null); }
      else flash("Update failed");
    } catch { flash("Network error"); }
    setSaving(false);
  }

  const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);
  const counts = Object.fromEntries(
    (["all", "pending", "in_progress", "verified", "partial", "failed"] as const).map(s => [
      s, s === "all" ? rows.length : rows.filter(r => r.status === s).length,
    ])
  );

  return (
    <div>
      {/* Header + filter tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>🛡 Candidate BGV Queue</h2>
        <button onClick={load} style={btn()}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all", "pending", "in_progress", "verified", "failed"] as BgvFilter[]).map(f => {
          const active = filter === f;
          const cfg = STATUS_CFG[f];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 12px", borderRadius: 99, border: `1px solid ${active ? (cfg?.color ?? "var(--accent)") : "var(--border)"}`,
              background: active ? (cfg?.bg ?? "var(--accdim)") : "none",
              color: active ? (cfg?.color ?? "var(--accent)") : "var(--text3)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              {f === "all" ? "All" : (STATUS_CFG[f]?.label ?? f)} ({counts[f] ?? 0})
            </button>
          );
        })}
      </div>

      {loading
        ? <div style={{ color: "var(--text3)", fontSize: 13, padding: 40, textAlign: "center" }}>Loading…</div>
        : filtered.length === 0
          ? <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>No BGV submissions in this category.</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(r => {
                const s = STATUS_CFG[r.status] ?? STATUS_CFG.pending;
                const acr = r.auto_check_results;
                const needsCheck = !acr;
                return (
                  <div key={r.id} style={{ ...card, padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>

                      {/* Status icon */}
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                        {s.icon}
                      </div>

                      {/* Main info */}
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{r.full_name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: s.color, padding: "2px 8px", borderRadius: 99, background: s.bg }}>
                            {s.label}
                          </span>
                          {needsCheck && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--warn)", padding: "2px 8px", borderRadius: 99, background: "rgba(234,179,8,.08)", border: "1px solid rgba(234,179,8,.2)" }}>
                              ⚡ Checks not run
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
                          PAN: {r.pan_number || "—"}
                          {r.dob ? ` · DOB: ${r.dob}` : ""}
                          {" · "}Submitted: {new Date(r.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        {/* Check pills */}
                        <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                          {[
                            { label: "ID",    done: r.id_verified  },
                            { label: "Edu",   done: r.edu_verified },
                            { label: "Emp",   done: r.emp_verified },
                          ].map(c => (
                            <span key={c.label} style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                              background: c.done ? "rgba(34,197,94,.1)" : "var(--surface2)",
                              color: c.done ? "var(--success)" : "var(--text3)",
                              border: `1px solid ${c.done ? "rgba(34,197,94,.2)" : "var(--border)"}`,
                            }}>{c.label} {c.done ? "✓" : "—"}</span>
                          ))}
                          {acr && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                              background: acr.autoScore >= 70 ? "rgba(34,197,94,.1)" : acr.autoScore >= 45 ? "rgba(234,179,8,.1)" : "rgba(239,68,68,.1)",
                              color: acr.autoScore >= 70 ? "var(--success)" : acr.autoScore >= 45 ? "var(--warn)" : "var(--danger)",
                            }}>
                              Auto Score: {acr.autoScore}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button onClick={() => openReview(r)} style={btn(true)}>Review →</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      }

      {/* ── Review drawer/modal ── */}
      {selected && (() => {
        const acr = selected.auto_check_results;
        const s   = STATUS_CFG[selected.status] ?? STATUS_CFG.pending;
        const edu = (selected.education ?? []) as EduEntry[];
        const emp = (selected.employment ?? []) as EmpEntry[];

        // Group auto-check results by category
        const grouped: Record<string, AutoCheckResult[]> = {};
        (acr?.checks ?? []).forEach(c => {
          if (!grouped[c.category]) grouped[c.category] = [];
          grouped[c.category].push(c);
        });

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div style={{ width: "100%", maxWidth: 600, height: "100vh", background: "var(--surface)", borderLeft: "1px solid var(--border)", overflowY: "auto", padding: "28px 28px 60px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{selected.full_name}</div>
                  <div style={{ fontSize: 12, color: s.color, marginTop: 3, fontWeight: 600 }}>{s.icon} {s.label}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 20, padding: 4 }}>✕</button>
              </div>

              {/* Identity summary */}
              <div style={{ background: "var(--surface2)", borderRadius: 12, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                {[
                  ["PAN",            selected.pan_number || "—"],
                  ["Aadhaar",        selected.aadhaar_last4 ? `XXXX XXXX XXXX ${selected.aadhaar_last4}` : "—"],
                  ["Date of Birth",  selected.dob || "—"],
                  ["Submitted",      new Date(selected.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                    <div style={{ color: "var(--text1)", fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Auto-check results */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>⚡ Automated Check Results</div>
                  <button
                    onClick={() => runAutoCheck(selected.id)}
                    disabled={running}
                    style={{ ...btn(), fontSize: 12, padding: "5px 12px" }}
                  >
                    {running ? "Running…" : acr ? "↻ Re-run Checks" : "▶ Run Checks"}
                  </button>
                </div>

                {!acr && (
                  <div style={{ padding: "14px", borderRadius: 10, background: "rgba(234,179,8,.06)", border: "1px solid rgba(234,179,8,.2)", fontSize: 13, color: "var(--warn)", textAlign: "center" }}>
                    Auto-checks haven&apos;t been run yet. Click <strong>▶ Run Checks</strong> to start.
                  </div>
                )}

                {acr && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Score bar */}
                    <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--text3)" }}>Auto Score</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: acr.autoScore >= 70 ? "var(--success)" : acr.autoScore >= 45 ? "var(--warn)" : "var(--danger)" }}>
                          {acr.autoScore}/100
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3 }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${acr.autoScore}%`, transition: "width .6s",
                          background: acr.autoScore >= 70 ? "var(--success)" : acr.autoScore >= 45 ? "var(--warn)" : "var(--danger)" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 5 }}>
                        Ran: {new Date(acr.runAt).toLocaleString("en-IN")}
                      </div>
                    </div>

                    {/* Items needing manual review */}
                    {acr.requiresManualReview.length > 0 && (
                      <div style={{ background: "rgba(234,179,8,.06)", border: "1px solid rgba(234,179,8,.2)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn)", marginBottom: 8 }}>⚠ Needs Manual Review</div>
                        {acr.requiresManualReview.map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>• {item}</div>
                        ))}
                      </div>
                    )}

                    {/* Check results grouped */}
                    {(["identity", "education", "employment", "completeness"] as const).map(cat => {
                      const catChecks = grouped[cat];
                      if (!catChecks?.length) return null;
                      const catLabel = { identity: "🪪 Identity", education: "🎓 Education", employment: "💼 Employment", completeness: "📋 Completeness" }[cat];
                      return (
                        <div key={cat} style={{ background: "var(--surface2)", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", padding: "8px 14px", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                            {catLabel}
                          </div>
                          {catChecks.map((c, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 14px", borderBottom: i < catChecks.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{CHECK_ICON[c.status]}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: CHECK_COLOR[c.status] }}>{c.check}</div>
                                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{c.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Education entries */}
              {edu.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🎓 Education ({edu.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {edu.map((e, i) => (
                      <div key={i} style={{ background: "var(--surface2)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                        <div style={{ fontWeight: 700, color: "var(--text1)" }}>{e.degree}</div>
                        <div style={{ color: "var(--text2)", marginTop: 2 }}>{e.institution}</div>
                        <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>{e.year}{e.result ? ` · ${e.result}` : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employment entries */}
              {emp.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💼 Employment ({emp.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {emp.map((e, i) => (
                      <div key={i} style={{ background: "var(--surface2)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                        <div style={{ fontWeight: 700, color: "var(--text1)" }}>{e.role} <span style={{ color: "var(--text3)", fontWeight: 400 }}>@ {e.company}</span></div>
                        <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>{e.from_date} → {e.to_date || "Present"}</div>
                        {e.manager_email && (
                          <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(99,102,241,.06)", borderRadius: 7, fontSize: 11, color: "var(--text2)" }}>
                            📧 Reference: {e.manager_name || "—"} · <a href={`mailto:${e.manager_email}`} style={{ color: "var(--accent)" }}>{e.manager_email}</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Final approval section ── */}
              <div style={{ background: "var(--bg)", borderRadius: 12, padding: "18px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>✍ Admin Decision</div>

                {/* Manual check overrides */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>Verification Checks</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[
                      { key: "id",  label: "🪪 Identity" },
                      { key: "edu", label: "🎓 Education" },
                      { key: "emp", label: "💼 Employment" },
                    ].map(({ key, label }) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", padding: "6px 12px", borderRadius: 8, border: `1px solid ${checks[key as keyof typeof checks] ? "var(--accborder)" : "var(--border)"}`, background: checks[key as keyof typeof checks] ? "var(--accdim)" : "none" }}>
                        <input type="checkbox"
                          checked={checks[key as keyof typeof checks]}
                          onChange={e => setChecks(p => ({ ...p, [key]: e.target.checked }))}
                          style={{ width: 14, height: 14 }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Score */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>Verification Score (0–100)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="range" min={0} max={100} value={score} onChange={e => setScore(Number(e.target.value))}
                      style={{ flex: 1 }} />
                    <span style={{ fontSize: 16, fontWeight: 800, minWidth: 40, color: score >= 70 ? "var(--success)" : score >= 45 ? "var(--warn)" : "var(--danger)" }}>
                      {score}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>Admin Notes (visible to candidate)</div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    style={{ ...input, resize: "vertical", fontSize: 13 }} placeholder="Optional note shown to candidate…" />
                </div>

                {/* Rejection reason — shown only for failed action */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>Rejection Reason (if rejecting)</div>
                  <input value={rejReason} onChange={e => setRejReason(e.target.value)}
                    style={{ ...input, fontSize: 13 }} placeholder="e.g. Could not verify employment at XYZ Corp" />
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button disabled={saving} onClick={() => approveBgv("verified")} style={{
                    ...btn(true), background: "var(--success)", flex: 1,
                  }}>
                    ✅ Approve & Verify
                  </button>
                  <button disabled={saving} onClick={() => approveBgv("partial")} style={{ ...btn(), flex: 1 }}>
                    ⚠ Partial
                  </button>
                  <button disabled={saving} onClick={() => approveBgv("in_progress")} style={{ ...btn(), flex: 1 }}>
                    🔍 Keep In Progress
                  </button>
                  <button disabled={saving} onClick={() => approveBgv("failed")} style={{
                    ...btn(), background: "rgba(239,68,68,.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)", flex: 1,
                  }}>
                    ✗ Reject
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Company Verify Admin View ─────────────────────────────────────────────────
interface CompanyRow {
  id: string; company_name: string; cin: string | null; gstin: string | null;
  verification_status: string; is_mca_verified: boolean; is_gst_verified: boolean;
  trust_score: number | null; gst_trade_name: string | null; gst_status: string | null;
  created_at: string; admin_notes: string | null;
}

function CompanyVerifyAdminView({ token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]       = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompanyRow | null>(null);
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb.from("company_verifications").select("*").order("created_at", { ascending: false });
      setRows(data ?? []);
    } catch { flash("Failed to load company verifications"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function updateCompany(id: string, patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/company-verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.ok) { flash("✓ Company verification updated"); await load(); setSelected(null); }
      else flash("Update failed");
    } catch { flash("Network error"); }
    setSaving(false);
  }

  const statusColor: Record<string, string> = {
    pending: "var(--warn)", in_progress: "var(--accent)", verified: "var(--success)",
    partially_verified: "var(--warn)", failed: "var(--danger)",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>🏅 Company Verifications ({rows.length})</h2>
        <button onClick={load} style={btn()}>↻ Refresh</button>
      </div>

      {loading ? <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.length === 0 && <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>No company verification requests yet.</div>}
          {rows.map(r => (
            <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{r.company_name}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                  CIN: {r.cin || "—"} · GSTIN: {r.gstin || "—"} · Submitted: {new Date(r.created_at).toLocaleDateString("en-IN")}
                </div>
                <div style={{ fontSize: 11, marginTop: 4, display: "flex", gap: 8 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: r.is_gst_verified ? "rgba(34,197,94,.1)" : "var(--surface2)", color: r.is_gst_verified ? "var(--success)" : "var(--text3)" }}>
                    GST {r.is_gst_verified ? "✓" : "⏳"}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: r.is_mca_verified ? "rgba(34,197,94,.1)" : "var(--surface2)", color: r.is_mca_verified ? "var(--success)" : "var(--text3)" }}>
                    MCA {r.is_mca_verified ? "✓" : "⏳"}
                  </span>
                  {r.gst_trade_name && <span style={{ fontSize: 10, color: "var(--text3)" }}>{r.gst_trade_name}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[r.verification_status] ?? "var(--text3)", padding: "3px 10px", borderRadius: 8, background: `${statusColor[r.verification_status]}22` }}>
                  {r.verification_status}
                </span>
                {r.cin && (
                  <a href={`https://www.mca.gov.in/mcafoportal/showSearchResults.do?company=${encodeURIComponent(r.company_name)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", padding: "4px 10px", border: "1px solid var(--accborder)", borderRadius: 6 }}>
                    MCA ↗
                  </a>
                )}
                <button onClick={() => { setSelected(r); setNotes(r.admin_notes ?? ""); }} style={btn(true)}>Review</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ ...card, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Review: {selected.company_name}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
              <div>CIN: {selected.cin || "—"}</div>
              <div style={{ marginTop: 4 }}>GSTIN: {selected.gstin || "—"} {selected.is_gst_verified ? "✅" : "⏳"}</div>
              {selected.gst_trade_name && <div style={{ marginTop: 4, color: "var(--success)" }}>GST Trade Name: {selected.gst_trade_name}</div>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Manual Checks</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" id="chk_mca" defaultChecked={selected.is_mca_verified} style={{ width: 14, height: 14 }} />
                  MCA / CIN Verified
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Trust Score (0–100)</label>
              <input type="number" min={0} max={100} id="co_score" defaultValue={selected.trust_score ?? 0} style={{ ...input, width: 100 }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Admin Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} placeholder="e.g. MCA check confirmed — active company, 5 directors" />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { status: "verified",           label: "✓ Fully Verified",     accent: true  },
                { status: "partially_verified",  label: "⚠ Partially Verified", accent: false },
                { status: "in_progress",         label: "🔍 In Progress",       accent: false },
                { status: "failed",              label: "✗ Failed",             accent: false },
              ].map(a => (
                <button key={a.status} disabled={saving} onClick={() => {
                  const score = parseInt((document.getElementById("co_score") as HTMLInputElement)?.value ?? "0");
                  const mcaV  = (document.getElementById("chk_mca") as HTMLInputElement)?.checked ?? false;
                  updateCompany(selected.id, {
                    verification_status: a.status, trust_score: score,
                    is_mca_verified: mcaV, admin_notes: notes,
                    verified_at: a.status === "verified" ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                  });
                }} style={btn(a.accent)}>{a.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
