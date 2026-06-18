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
  expires_at: string | null;
}

type View =
  | "add" | "scrape" | "queue" | "manage" | "taxonomy"
  | "employers" | "recruiter-levels" | "credits"
  | "bgv" | "companies" | "reports"
  | "users" | "subscriptions" | "promos" | "payments"
  | "interview-bank" | "salary-data"
  | "flags" | "notifications" | "support" | "rate-limits" | "health" | "audit" | "metrics";

const EMPTY_FORM: Omit<AdminJob, "id" | "posted_at" | "is_active" | "is_approved"> = {
  title: "", company: "", location: "Bengaluru", mode: "hybrid",
  type: "Full-time", exp: "", salary: "", salary_num: 0,
  skills: [], openings: 1, logo: "",
  description: "", jd_text: "", apply_url: "",
  source: "manual", source_url: "",
  expires_at: null,
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
      <div style={{ marginBottom: 4 }}><i className="ti ti-lock" style={{ fontSize: 32, color: "var(--text3)" }} /></div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Admin access required</div>
      <div style={{ fontSize: 13, color: "var(--text3)" }}>
        {token ? "Your account is not in the admin list." : "Please sign in first."}
      </div>
      {token && (
        <button
          onClick={async () => {
            const res = await fetch("/api/admin/debug", { headers: { Authorization: `Bearer ${token}` } });
            const j = await res.json();
            alert(JSON.stringify(j, null, 2));
          }}
          style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
          Debug info
        </button>
      )}
      <a href="/" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>← Back to home</a>
    </div>
  );

  const pending  = jobs.filter(j => !j.is_approved && j.is_active).length;

  // ── Sidebar nav definition ───────────────────────────────────
  type NavItem = { view: View; label: string; icon: string; badge?: number };
  type NavSection = { title: string; items: NavItem[] };

  const NAV: NavSection[] = [
    {
      title: "Jobs",
      items: [
        { view: "add",       label: "Add job",          icon: "ti-plus" },
        { view: "scrape",    label: "Scrape",           icon: "ti-robot" },
        { view: "queue",     label: "Review queue",     icon: "ti-list-search", badge: pending || undefined },
        { view: "manage",    label: "Manage",           icon: "ti-layout-list" },
        { view: "taxonomy",  label: "Skills & categories", icon: "ti-tag" },
      ],
    },
    {
      title: "Employers",
      items: [
        { view: "employers",        label: "Employer accounts",  icon: "ti-building-store" },
        { view: "recruiter-levels", label: "Recruiter levels",   icon: "ti-star" },
        { view: "credits",          label: "Job post credits",   icon: "ti-coin" },
      ],
    },
    {
      title: "Trust & Verification",
      items: [
        { view: "bgv",       label: "BGV queue",          icon: "ti-shield-check" },
        { view: "companies", label: "Companies",          icon: "ti-building" },
        { view: "reports",   label: "Content reports",    icon: "ti-flag-2" },
      ],
    },
    {
      title: "Users & Billing",
      items: [
        { view: "users",         label: "Users",         icon: "ti-users" },
        { view: "subscriptions", label: "Subscriptions", icon: "ti-credit-card" },
        { view: "promos",        label: "Promo codes",   icon: "ti-discount-2" },
        { view: "payments",      label: "Payments",      icon: "ti-receipt" },
      ],
    },
    {
      title: "Content",
      items: [
        { view: "interview-bank", label: "Interview bank", icon: "ti-brain" },
        { view: "salary-data",    label: "Salary data",    icon: "ti-chart-line" },
      ],
    },
    {
      title: "Platform",
      items: [
        { view: "flags",         label: "Feature flags",  icon: "ti-flag" },
        { view: "notifications", label: "Notifications",  icon: "ti-bell" },
        { view: "support",       label: "Support queue",  icon: "ti-headset" },
        { view: "rate-limits",   label: "Rate limits",    icon: "ti-shield-bolt" },
        { view: "health",        label: "System health",  icon: "ti-activity" },
        { view: "audit",         label: "Audit log",      icon: "ti-file-text" },
        { view: "metrics",       label: "Metrics",        icon: "ti-chart-bar" },
      ],
    },
  ];

  const navBtn = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 12px",
    borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
    fontSize: 13, fontWeight: active ? 700 : 500, textAlign: "left" as const,
    background: active ? "var(--accdim)" : "none",
    color: active ? "var(--accent)" : "var(--text2)",
  });

  function go(v: View) {
    setView(v);
    if (v === "queue")  loadJobs("pending");
    if (v === "manage") loadJobs("all");
  }

  return (
    <div style={{ ...bg, display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 210, flexShrink: 0, background: "var(--surface)",
        borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <i className="ti ti-settings" style={{ fontSize: 16, color: "var(--accent)" }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)" }}>Admin Panel</span>
          </div>
          <a href="/" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>← Back to app</a>
        </div>

        {/* Nav sections */}
        <div style={{ padding: "10px 8px", flex: 1 }}>
          {NAV.map(section => (
            <div key={section.title} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".07em", padding: "0 8px 6px" }}>
                {section.title}
              </div>
              {section.items.map(item => (
                <button key={item.view} onClick={() => go(item.view)} style={navBtn(view === item.view)}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 14, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, background: "var(--warn)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 50, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {NAV.flatMap(s => s.items).filter(i => i.view === view).map(i => (
            <span key={i.view} style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", display: "flex", alignItems: "center", gap: 7 }}>
              <i className={`ti ${i.icon}`} style={{ color: "var(--accent)" }} />{i.label}
            </span>
          ))}
          {msg && (
            <span style={{ fontSize: 12, fontWeight: 600, color: msg.startsWith("✓") ? "var(--success)" : "var(--danger)", marginLeft: "auto", padding: "4px 10px", borderRadius: 6, background: msg.startsWith("✓") ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)" }}>
              {msg}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {view === "add"            && <AddView         token={token!} onSaved={() => { loadJobs("all"); flash("✓ Job added — go to Review Queue to approve."); }} />}
          {view === "scrape"         && <ScrapeView      token={token!} onImported={() => { loadJobs("all"); flash("✓ Jobs added to review queue."); go("queue"); }} />}
          {view === "queue"          && <QueueView       jobs={jobs.filter(j => !j.is_approved && j.is_active)} token={token!} loading={loading} onRefresh={() => loadJobs("pending")} flash={flash} />}
          {view === "manage"         && <ManageView      jobs={jobs} token={token!} loading={loading} onRefresh={() => loadJobs("all")} flash={flash} />}
          {view === "taxonomy"       && <TaxonomyView    token={token!} flash={flash} />}
          {view === "employers"      && <EmployersView   token={token!} flash={flash} />}
          {view === "recruiter-levels" && <RecruiterVerifyView token={token!} flash={flash} />}
          {view === "credits"        && <JobPostCreditsView   token={token!} flash={flash} />}
          {view === "bgv"            && <BgvAdminView    token={token!} flash={flash} />}
          {view === "companies"      && <CompanyVerifyAdminView token={token!} flash={flash} />}
          {view === "reports"        && <ContentReportsView token={token!} flash={flash} />}
          {view === "users"          && <UsersAdminView  token={token!} flash={flash} />}
          {view === "subscriptions"  && <SubscriptionsView token={token!} flash={flash} />}
          {view === "promos"         && <PromosView      token={token!} flash={flash} />}
          {view === "payments"       && <PaymentsView    token={token!} flash={flash} />}
          {view === "interview-bank" && <InterviewBankView token={token!} flash={flash} />}
          {view === "salary-data"    && <SalaryDataView  token={token!} flash={flash} />}
          {view === "flags"          && <FeatureFlagsView token={token!} flash={flash} />}
          {view === "notifications"  && <NotificationsView token={token!} flash={flash} />}
          {view === "support"        && <SupportView     token={token!} flash={flash} />}
          {view === "rate-limits"    && <RateLimitsView  token={token!} />}
          {view === "health"         && <SystemHealthView token={token!} />}
          {view === "audit"          && <AuditLogView    token={token!} />}
          {view === "metrics"        && <MetricsView     token={token!} />}
        </div>
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
    // Manual posts get 60 days; scraped jobs default to 30 days (set by DB default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (form.source === "manual" ? 60 : 30));

    const body = {
      ...form,
      skills: typeof form.skills === "string" ? (form.skills as string).split(",").map((s: string) => s.trim()).filter(Boolean) : form.skills,
      salary_num: Number(form.salary_num) || 0,
      openings:   Number(form.openings)   || 1,
      is_active:   true,
      is_approved: false,
      expires_at: expiresAt.toISOString(),
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
          <button style={btn(true)} onClick={scrape} disabled={scraping}>{scraping ? "Scraping…" : <><i className="ti ti-robot" style={{ marginRight: 5 }} />Scrape</>}</button>
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
      <div style={{ marginBottom: 8 }}><i className="ti ti-circle-check" style={{ fontSize: 28, color: "var(--success)" }} /></div>
      <div style={{ fontWeight: 700 }}>Queue is empty</div>
      <div style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>All jobs have been reviewed.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{jobs.length} jobs waiting for review</div>
        <button style={btn()} onClick={onRefresh}><i className="ti ti-refresh" style={{marginRight:4}} />Refresh</button>
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
            <button style={{ ...btn(true) }} onClick={() => action(j.id, true)}><i className="ti ti-check" style={{marginRight:4}}/>Approve</button>
            <button style={{ ...btn(), color: "var(--danger)" }} onClick={() => action(j.id, false)}><i className="ti ti-x" style={{marginRight:4}}/>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Manage view ───────────────────────────────────────────────────────────────

/** Days until expires_at. Negative = already expired. */
function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return <span style={{ fontSize: 10, color: "var(--text3)" }}>—</span>;
  if (days < 0)  return <span style={{ fontSize: 10, fontWeight: 700, color: "var(--danger)", padding: "2px 7px", borderRadius: 4, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)" }}>Expired</span>;
  if (days <= 5) return <span style={{ fontSize: 10, fontWeight: 700, color: "var(--warn)",   padding: "2px 7px", borderRadius: 4, background: "rgba(234,179,8,.1)",  border: "1px solid rgba(234,179,8,.2)"  }}><i className="ti ti-alert-triangle" style={{marginRight:3}}/>{days}d left</span>;
  return <span style={{ fontSize: 10, color: "var(--text3)" }}>{days}d</span>;
}

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

  async function renew(id: string) {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, expires_at: newExpiry.toISOString(), is_active: true }),
    });
    if (res.ok) { flash("✓ Job renewed — expires in 30 days"); onRefresh(); }
    else flash("Renew failed");
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

  const expiringSoon = filtered.filter(j => { const d = daysUntilExpiry(j.expires_at); return d !== null && d <= 5; }).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 300 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or company…" />
        <button style={btn()} onClick={onRefresh}><i className="ti ti-refresh" style={{marginRight:4}} />Refresh</button>
        {expiringSoon > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--warn)", padding: "4px 10px", borderRadius: 6, background: "rgba(234,179,8,.08)", border: "1px solid rgba(234,179,8,.2)" }}>
            <i className="ti ti-alert-triangle" style={{marginRight:4}}/>{expiringSoon} job{expiringSoon > 1 ? "s" : ""} expiring soon
          </span>
        )}
        <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: "auto" }}>{filtered.length} jobs</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)", textAlign: "left" }}>
              {["Title", "Company", "Location", "Source", "Status", "Expires", "Actions"].map(h => (
                <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(j => {
              const days = daysUntilExpiry(j.expires_at);
              const isExpiredOrSoon = days !== null && days <= 5;
              return (
                <tr key={j.id} style={{ borderBottom: "1px solid var(--border)", opacity: j.is_active ? 1 : 0.5, background: isExpiredOrSoon ? "rgba(234,179,8,.03)" : "transparent" }}>
                  <td style={{ padding: "10px 10px" }}><div style={{ fontWeight: 600 }}>{j.title}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{j.exp} · {j.salary}</div></td>
                  <td style={{ padding: "10px 10px", color: "var(--text2)" }}>{j.company}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>{j.location}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface2)", color: "var(--text3)" }}>{j.source}</span>
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                      background: j.is_approved && j.is_active ? "rgba(22,163,74,.12)" : "rgba(239,68,68,.1)",
                      color: j.is_approved && j.is_active ? "var(--success)" : "var(--danger)",
                    }}>
                      {j.is_approved && j.is_active ? "Live" : !j.is_active ? "Inactive" : "Pending"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <ExpiryBadge expiresAt={j.expires_at} />
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button style={{ ...btn(), fontSize: 11, padding: "4px 10px" }} onClick={() => toggle(j)}>
                        {j.is_active ? "Deactivate" : "Activate"}
                      </button>
                      {(days === null || days <= 5) && (
                        <button style={{ ...btn(), fontSize: 11, padding: "4px 10px", color: "var(--accent)", border: "1px solid var(--accborder)" }} onClick={() => renew(j.id)}>
                          <i className="ti ti-refresh" style={{marginRight:4}}/>Renew
                        </button>
                      )}
                      <button style={{ ...btn(), fontSize: 11, padding: "4px 10px", color: "var(--danger)" }} onClick={() => del(j.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
  pending:     { color: "var(--warn)",    bg: "rgba(234,179,8,.12)",   label: "Pending",     icon: "ti-clock" },
  in_progress: { color: "var(--accent)",  bg: "rgba(99,102,241,.12)",  label: "In Progress", icon: "ti-search" },
  verified:    { color: "var(--success)", bg: "rgba(34,197,94,.12)",   label: "Verified",    icon: "ti-circle-check" },
  partial:     { color: "var(--warn)",    bg: "rgba(234,179,8,.12)",   label: "Partial",     icon: "ti-alert-triangle" },
  failed:      { color: "var(--danger)",  bg: "rgba(239,68,68,.12)",   label: "Failed",      icon: "ti-x" },
};

const CHECK_ICON: Record<string, string> = { pass: "ti-circle-check", fail: "ti-x", warn: "ti-alert-triangle", skip: "ti-player-skip-forward" };
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
        <h2 style={{ fontSize: 16, fontWeight: 700 }}><i className="ti ti-shield-check" style={{marginRight:6}}/>Candidate BGV Queue</h2>
        <button onClick={load} style={btn()}><i className="ti ti-refresh" style={{marginRight:4}} />Refresh</button>
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
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, color: s.color }}>
                        <i className={`ti ${s.icon}`}/>
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
                              <i className="ti ti-bolt" style={{marginRight:3}}/>Checks not run
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
                            }}>{c.label} {c.done ? <i className="ti ti-check" style={{marginLeft:2}}/> : "—"}</span>
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
                  <div style={{ fontSize: 12, color: s.color, marginTop: 3, fontWeight: 600 }}><><i className={`ti ${s.icon}`} style={{marginRight:3}}/>{s.label}</></div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 20, padding: 4 }}><i className="ti ti-x"/></button>
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
                  <div style={{ fontSize: 13, fontWeight: 700 }}><i className="ti ti-bolt" style={{marginRight:4}}/>Automated Check Results</div>
                  <button
                    onClick={() => runAutoCheck(selected.id)}
                    disabled={running}
                    style={{ ...btn(), fontSize: 12, padding: "5px 12px" }}
                  >
                    {running ? "Running…" : acr ? <><i className="ti ti-refresh" style={{marginRight:4}}/>Re-run Checks</> : <><i className="ti ti-player-play" style={{marginRight:4}}/>Run Checks</>}
                  </button>
                </div>

                {!acr && (
                  <div style={{ padding: "14px", borderRadius: 10, background: "rgba(234,179,8,.06)", border: "1px solid rgba(234,179,8,.2)", fontSize: 13, color: "var(--warn)", textAlign: "center" }}>
                    Auto-checks haven&apos;t been run yet. Click <strong><i className="ti ti-player-play" style={{marginRight:2}}/>Run Checks</strong> to start.
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
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn)", marginBottom: 8 }}><i className="ti ti-alert-triangle" style={{marginRight:4}}/>Needs Manual Review</div>
                        {acr.requiresManualReview.map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>• {item}</div>
                        ))}
                      </div>
                    )}

                    {/* Check results grouped */}
                    {(["identity", "education", "employment", "completeness"] as const).map(cat => {
                      const catChecks = grouped[cat];
                      if (!catChecks?.length) return null;
                      const catLabelText = { identity: "Identity", education: "Education", employment: "Employment", completeness: "Completeness" }[cat];
      const catLabelIcon = { identity: "ti-id-badge", education: "ti-school", employment: "ti-briefcase", completeness: "ti-list" }[cat];
                      return (
                        <div key={cat} style={{ background: "var(--surface2)", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", padding: "8px 14px", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                            <><i className={`ti ${catLabelIcon}`} style={{marginRight:4}}/>{catLabelText}</>
                          </div>
                          {catChecks.map((c, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 14px", borderBottom: i < catChecks.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}><i className={`ti ${CHECK_ICON[c.status]}`}/></span>
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
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}><i className="ti ti-school" style={{marginRight:4}}/>Education ({edu.length})</div>
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
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}><i className="ti ti-briefcase" style={{marginRight:4}}/>Employment ({emp.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {emp.map((e, i) => (
                      <div key={i} style={{ background: "var(--surface2)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                        <div style={{ fontWeight: 700, color: "var(--text1)" }}>{e.role} <span style={{ color: "var(--text3)", fontWeight: 400 }}>@ {e.company}</span></div>
                        <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>{e.from_date} → {e.to_date || "Present"}</div>
                        {e.manager_email && (
                          <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(99,102,241,.06)", borderRadius: 7, fontSize: 11, color: "var(--text2)" }}>
                            <i className="ti ti-mail" style={{marginRight:4}}/>Reference: {e.manager_name || "—"} · <a href={`mailto:${e.manager_email}`} style={{ color: "var(--accent)" }}>{e.manager_email}</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Final approval section ── */}
              <div style={{ background: "var(--bg)", borderRadius: 12, padding: "18px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-pencil" style={{marginRight:4}}/>Admin Decision</div>

                {/* Manual check overrides */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>Verification Checks</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[
                      { key: "id",  label: "Identity", icon: "ti-id-badge" },
                      { key: "edu", label: "Education", icon: "ti-school" },
                      { key: "emp", label: "Employment", icon: "ti-briefcase" },
                    ].map(({ key, label, icon }) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", padding: "6px 12px", borderRadius: 8, border: `1px solid ${checks[key as keyof typeof checks] ? "var(--accborder)" : "var(--border)"}`, background: checks[key as keyof typeof checks] ? "var(--accdim)" : "none" }}>
                        <input type="checkbox"
                          checked={checks[key as keyof typeof checks]}
                          onChange={e => setChecks(p => ({ ...p, [key]: e.target.checked }))}
                          style={{ width: 14, height: 14 }} />
                        <i className={`ti ${icon}`} style={{ fontSize: 13 }}/>{label}
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
                    <i className="ti ti-circle-check" style={{marginRight:4}}/>Approve & Verify
                  </button>
                  <button disabled={saving} onClick={() => approveBgv("partial")} style={{ ...btn(), flex: 1 }}>
                    <i className="ti ti-alert-triangle" style={{marginRight:4}}/>Partial
                  </button>
                  <button disabled={saving} onClick={() => approveBgv("in_progress")} style={{ ...btn(), flex: 1 }}>
                    <i className="ti ti-search" style={{marginRight:4}}/>Keep In Progress
                  </button>
                  <button disabled={saving} onClick={() => approveBgv("failed")} style={{
                    ...btn(), background: "rgba(239,68,68,.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)", flex: 1,
                  }}>
                    <i className="ti ti-x" style={{marginRight:4}}/>Reject
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
        <h2 style={{ fontSize: 16, fontWeight: 700 }}><i className="ti ti-building-store" style={{marginRight:6}}/>Company Verifications ({rows.length})</h2>
        <button onClick={load} style={btn()}><i className="ti ti-refresh" style={{marginRight:4}} />Refresh</button>
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
                    GST {r.is_gst_verified ? <i className="ti ti-circle-check" style={{color:"var(--success)"}}/> : <i className="ti ti-clock" style={{color:"var(--warn)"}}/>}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: r.is_mca_verified ? "rgba(34,197,94,.1)" : "var(--surface2)", color: r.is_mca_verified ? "var(--success)" : "var(--text3)" }}>
                    MCA {r.is_mca_verified ? <i className="ti ti-circle-check" style={{color:"var(--success)"}}/> : <i className="ti ti-clock" style={{color:"var(--warn)"}}/>}
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
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}><i className="ti ti-x"/></button>
            </div>

            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
              <div>CIN: {selected.cin || "—"}</div>
              <div style={{ marginTop: 4 }}>GSTIN: {selected.gstin || "—"} {selected.is_gst_verified ? <i className="ti ti-circle-check" style={{color:"var(--success)"}}/> : <i className="ti ti-clock" style={{color:"var(--warn)"}}/>}</div>
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
                { status: "verified",           label: "Fully Verified",     accent: true,  icon: "ti-circle-check"  },
                { status: "partially_verified",  label: "Partially Verified", accent: false, icon: "ti-alert-triangle" },
                { status: "in_progress",         label: "In Progress",       accent: false, icon: "ti-search" },
                { status: "failed",              label: "Failed",             accent: false, icon: "ti-x" },
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
                }} style={btn(a.accent)}>{a.icon && <i className={`ti ${a.icon}`} style={{marginRight:4}}/>}{a.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users Admin View ──────────────────────────────────────────────────────────

interface UserRow {
  id: string; email: string; full_name: string | null;
  plan: string; is_admin: boolean; is_suspended: boolean;
  onboarding_completed: boolean; created_at: string;
  current_job_role: string | null; target_role: string | null; location: string | null;
}

const PLANS = ["free", "pro", "team", "enterprise"];

function UsersAdminView({ token, flash }: { token: string; flash: (m: string) => void }) {
  const [users,     setUsers]     = useState<UserRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [selected,  setSelected]  = useState<UserRow | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [editPlan,  setEditPlan]  = useState("free");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setUsers(json.users ?? []);
      else flash(json.error ?? "Failed to load users");
    } catch { flash("Network error"); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.ok) { flash("✓ User updated"); await load(); setSelected(null); }
      else flash("Update failed");
    } catch { flash("Network error"); }
    setSaving(false);
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
    const matchPlan   = planFilter === "all" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const planColor: Record<string, string> = {
    free: "var(--text3)", pro: "var(--accent)", team: "var(--success)", enterprise: "#a855f7",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...input, maxWidth: 260 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email or name…" />
        <select style={{ ...input, width: 130 }} value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="all">All plans</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button style={btn()} onClick={load}><i className="ti ti-refresh" style={{marginRight:4}} />Refresh</button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}>{filtered.length} / {users.length} users</span>
      </div>

      {loading ? <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                {["Email", "Name", "Role", "Plan", "Status", "Joined", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", opacity: u.is_suspended ? 0.5 : 1 }}>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.email}</div>
                    {u.is_admin && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", padding: "1px 6px", borderRadius: 4 }}>ADMIN</span>}
                  </td>
                  <td style={{ padding: "10px 10px", color: "var(--text2)" }}>{u.full_name || "—"}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>{u.current_job_role || "—"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: planColor[u.plan] ?? "var(--text3)", background: "var(--surface2)" }}>
                      {u.plan}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                      color: u.is_suspended ? "var(--danger)" : u.onboarding_completed ? "var(--success)" : "var(--warn)",
                      background: u.is_suspended ? "rgba(239,68,68,.08)" : u.onboarding_completed ? "rgba(34,197,94,.08)" : "rgba(234,179,8,.08)",
                    }}>
                      {u.is_suspended ? "Suspended" : u.onboarding_completed ? "Active" : "Onboarding"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <button onClick={() => { setSelected(u); setEditPlan(u.plan); }} style={{ ...btn(), fontSize: 11, padding: "4px 10px" }}>Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No users found.</div>}
        </div>
      )}

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ ...card, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{selected.email}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{selected.full_name || "No name"} · Joined {new Date(selected.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}><i className="ti ti-x"/></button>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>Plan Override</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PLANS.map(p => (
                  <button key={p} onClick={() => setEditPlan(p)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${editPlan === p ? "var(--accent)" : "var(--border)"}`, background: editPlan === p ? "var(--accdim)" : "none", color: editPlan === p ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", marginBottom: 8 }}>Quick Actions</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => updateUser(selected.id, { plan: editPlan })} disabled={saving} style={btn(true)}>
                  Save Plan: {editPlan}
                </button>
                <button onClick={() => updateUser(selected.id, { is_suspended: !selected.is_suspended })} disabled={saving}
                  style={{ ...btn(), color: selected.is_suspended ? "var(--success)" : "var(--danger)" }}>
                  {selected.is_suspended ? <><i className="ti ti-arrow-back-up" style={{marginRight:4}}/>Unsuspend</> : <><i className="ti ti-ban" style={{marginRight:4}}/>Suspend</>}
                </button>
                {!selected.is_admin && (
                  <button onClick={() => { if (confirm(`Grant admin to ${selected.email}?`)) updateUser(selected.id, { is_admin: true }); }} disabled={saving}
                    style={{ ...btn(), color: "var(--warn)" }}>
                    <i className="ti ti-star" style={{marginRight:4}}/>Make Admin
                  </button>
                )}
              </div>
            </div>

            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 14px", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                ["Current role",  selected.current_job_role || "—"],
                ["Target role",   selected.target_role  || "—"],
                ["Location",      selected.location     || "—"],
                ["Onboarding",    selected.onboarding_completed ? "Complete" : "In progress"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase" }}>{k}</div>
                  <div style={{ color: "var(--text1)", marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feature Flags View ────────────────────────────────────────────────────────

interface FeatureFlag {
  id: string; key: string; enabled: boolean; description: string | null; updated_at: string;
}

function FeatureFlagsView({ token, flash }: { token: string; flash: (m: string) => void }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb.from("feature_flags").select("*").order("key");
      setFlags(data ?? []);
    } catch { flash("Failed to load flags"); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function toggle(flag: FeatureFlag) {
    setToggling(flag.key);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
      });
      if (res.ok) { flash(`✓ ${flag.key} → ${!flag.enabled ? "enabled" : "disabled"}`); await load(); }
      else flash("Toggle failed");
    } catch { flash("Network error"); }
    setToggling(null);
  }

  const FLAG_ICONS: Record<string, string> = {
    bgv_live: "ti-shield-check", ai_cover_letter: "ti-mail", salary_predict: "ti-coin",
    python_ats: "ti-code", enterprise_sso: "ti-key", stripe_payments: "ti-credit-card",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}><i className="ti ti-flag" style={{marginRight:6}}/>Feature Flags</div>
        <button onClick={load} style={btn()}><i className="ti ti-refresh" style={{marginRight:4}} />Refresh</button>
      </div>

      {loading ? <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {flags.map(f => (
            <div key={f.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 22, color: "var(--accent)" }}><i className={`ti ${FLAG_ICONS[f.key] ?? "ti-flag"}`}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{f.key}</div>
                {f.description && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{f.description}</div>}
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>Updated: {new Date(f.updated_at).toLocaleDateString()}</div>
              </div>
              <button
                disabled={toggling === f.key}
                onClick={() => toggle(f)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                  background: f.enabled ? "var(--success)" : "var(--surface2)",
                  position: "relative", transition: "background .2s", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9,
                  background: "#fff", transition: "left .2s", left: f.enabled ? 23 : 3,
                }} />
              </button>
            </div>
          ))}
          {!flags.length && <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40, gridColumn: "1 / -1" }}>No feature flags configured.</div>}
        </div>
      )}

      <div style={{ marginTop: 20, padding: 14, background: "var(--surface2)", borderRadius: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--text2)" }}>How flags work:</strong> Flags are read from the <code>feature_flags</code> Supabase table at runtime.
        Toggling here takes effect immediately — no deployment required.
        Seeded in <code>20260607_audit_logs_and_admin.sql</code>.
      </div>
    </div>
  );
}

// ── Audit Log View ────────────────────────────────────────────────────────────

interface AuditRow {
  id: string; action: string; resource: string | null;
  user_id: string | null; ip_address: string | null;
  meta: Record<string, unknown> | null; created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  "auth.login": "var(--accent)", "auth.signup": "var(--success)",
  "plan.upgrade": "var(--success)", "resume.export": "var(--text2)",
  "bgv.initiated": "var(--warn)", "vault.upload": "var(--text2)",
  "admin.suspend_user": "var(--danger)", "api.rate_limited": "var(--danger)",
};

function AuditLogView({ token }: { token: string }) {
  const [rows,    setRows]    = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(0);
  const PER_PAGE = 50;

  async function load() {
    setLoading(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb
        .from("audit_logs")
        .select("id, action, resource, user_id, ip_address, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows(data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.action.includes(q) || (r.resource ?? "").includes(q) || (r.user_id ?? "").includes(q);
  });
  const pageRows    = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages  = Math.ceil(filtered.length / PER_PAGE);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 280 }} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Filter by action, resource, user ID…" />
        <button style={btn()} onClick={load}><i className="ti ti-refresh" style={{marginRight:4}} />Refresh</button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}>{filtered.length} events</span>
      </div>

      {loading ? <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div> : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                  {["Time", "Action", "Resource", "User", "IP"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--text3)", whiteSpace: "nowrap", fontSize: 11 }}>
                      {new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ACTION_COLOR[r.action] ?? "var(--text2)", fontFamily: "monospace" }}>
                        {r.action}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text3)", fontSize: 11, fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.resource || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text3)", fontSize: 10, fontFamily: "monospace" }}>
                      {r.user_id ? r.user_id.slice(0, 8) + "…" : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text3)", fontSize: 11 }}>{r.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!pageRows.length && <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No events found.</div>}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={btn()}>← Prev</button>
              <span style={{ fontSize: 13, color: "var(--text3)", padding: "8px 12px" }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={btn()}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Metrics View ──────────────────────────────────────────────────────────────

interface MetricStat { label: string; value: number | string; sub?: string; color?: string; }

function MetricsView({ token }: { token: string }) {
  const [stats,    setStats]    = useState<MetricStat[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [planDist, setPlanDist] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

        const [
          { count: totalUsers },
          { count: activeUsers },
          { count: totalResumes },
          { data: planData },
          { count: auditCount },
        ] = await Promise.all([
          sb.from("profiles").select("*", { count: "exact", head: true }),
          sb.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_completed", true),
          sb.from("resumes").select("*", { count: "exact", head: true }),
          sb.from("profiles").select("plan"),
          sb.from("audit_logs").select("*", { count: "exact", head: true }),
        ]);

        const dist: Record<string, number> = {};
        (planData ?? []).forEach((r: { plan: string }) => { dist[r.plan] = (dist[r.plan] ?? 0) + 1; });
        setPlanDist(dist);

        setStats([
          { label: "Total Users",     value: totalUsers  ?? 0, color: "var(--accent)" },
          { label: "Onboarded Users", value: activeUsers ?? 0, sub: `${Math.round(((activeUsers ?? 0) / Math.max(totalUsers ?? 1, 1)) * 100)}% completion`, color: "var(--success)" },
          { label: "Resumes Created", value: totalResumes ?? 0, color: "var(--text1)" },
          { label: "Audit Events",    value: auditCount ?? 0, color: "var(--text1)" },
          { label: "Paying Users",    value: Object.entries(dist).filter(([k]) => k !== "free").reduce((a, [, v]) => a + v, 0), sub: "pro + team + enterprise", color: "var(--success)" },
          { label: "Free Users",      value: dist.free ?? 0, sub: "conversion opportunity", color: "var(--warn)" },
        ]);
      } catch {
        setStats([{ label: "Error", value: "Could not load metrics", color: "var(--danger)" }]);
      }
      setLoading(false);
    })();
  }, [token]);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}><i className="ti ti-chart-bar" style={{marginRight:6}}/>Platform Metrics</div>

      {loading ? <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            {stats.map(s => (
              <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color ?? "var(--text1)" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3, fontWeight: 600 }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Plan Distribution</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PLANS.map(p => {
                const n     = planDist[p] ?? 0;
                const total = Object.values(planDist).reduce((a, b) => a + b, 0) || 1;
                const pct   = Math.round((n / total) * 100);
                return (
                  <div key={p}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{p}</span>
                      <span style={{ color: "var(--text3)" }}>{n} users ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4,
                        background: p === "free" ? "var(--text3)" : p === "pro" ? "var(--accent)" : p === "team" ? "var(--success)" : "#a855f7",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: "var(--surface2)", borderRadius: 10, fontSize: 12, color: "var(--text3)" }}>
            Live metrics pulled from Supabase on each load. For time-series, connect Posthog or Grafana.
          </div>
        </>
      )}
    </div>
  );
}

// ── Taxonomy View ─────────────────────────────────────────────────────────────

function TaxonomyView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [skills, setSkills] = useState<{ id: string; name: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState({ name: "", category: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb.from("skill_taxonomy").select("id,name,category").order("category").order("name");
        setSkills(data ?? []);
      } catch { /* table may not exist yet */ }
      setLoading(false);
    })();
  }, []);

  async function addSkill() {
    if (!newSkill.name.trim()) { flash("Skill name required"); return; }
    setSaving(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error } = await sb.from("skill_taxonomy").insert({ name: newSkill.name.trim(), category: newSkill.category.trim() || "General" });
      if (error) throw error;
      flash("✓ Skill added");
      setNewSkill({ name: "", category: "" });
      const { data } = await sb.from("skill_taxonomy").select("id,name,category").order("category").order("name");
      setSkills(data ?? []);
    } catch { flash("Failed to add skill"); }
    setSaving(false);
  }

  const byCategory = skills.reduce<Record<string, typeof skills>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Add skill */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add skill / category</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...input, flex: "1 1 200px" }} placeholder="Skill name (e.g. React)" value={newSkill.name} onChange={e => setNewSkill(s => ({ ...s, name: e.target.value }))} />
          <input style={{ ...input, flex: "1 1 160px" }} placeholder="Category (e.g. Frontend)" value={newSkill.category} onChange={e => setNewSkill(s => ({ ...s, category: e.target.value }))} />
          <button style={btn(true)} onClick={addSkill} disabled={saving}>{saving ? "Saving…" : "Add"}</button>
        </div>
      </div>

      {/* Skill list */}
      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : skills.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <i className="ti ti-tag" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
          No skills yet. Create a <code>skill_taxonomy</code> table and add skills above.
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--accent)" }}>{cat} <span style={{ color: "var(--text3)", fontWeight: 400 }}>({items.length})</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {items.map(s => (
                <span key={s.id} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>{s.name}</span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Employers View ────────────────────────────────────────────────────────────

interface EmployerRow {
  id: string; email: string; full_name: string | null; plan: string;
  is_suspended: boolean; created_at: string;
  company_name: string | null; job_posts_used: number; job_posts_limit: number;
}

function EmployersView({ token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]       = useState<EmployerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb
          .from("profiles")
          .select("id, email, full_name, plan, is_suspended, created_at, company_name, job_posts_used, job_posts_limit")
          .eq("user_intent", "hire")
          .order("created_at", { ascending: false });
        setRows((data ?? []) as EmployerRow[]);
      } catch { flash("Failed to load employers"); }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.email.toLowerCase().includes(q) || (r.company_name ?? "").toLowerCase().includes(q) || (r.full_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 280 }} placeholder="Search name, company, email…" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}>{filtered.length} employers</span>
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>No employer accounts yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                {["Email", "Company", "Plan", "Posts used", "Status", "Joined"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", opacity: r.is_suspended ? 0.5 : 1 }}>
                  <td style={{ padding: "10px 10px", fontWeight: 600 }}>{r.email}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text2)" }}>{r.company_name || "—"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "var(--surface2)", color: r.plan === "free" ? "var(--text3)" : "var(--accent)" }}>{r.plan}</span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "var(--text2)" }}>{r.job_posts_used ?? 0} / {r.job_posts_limit ?? "∞"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600, background: r.is_suspended ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", color: r.is_suspended ? "var(--danger)" : "var(--success)" }}>
                      {r.is_suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Recruiter Verify View ─────────────────────────────────────────────────────

function RecruiterVerifyView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]       = useState<{ id: string; email: string; full_name: string | null; recruiter_level: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb
          .from("profiles")
          .select("id, email, full_name, recruiter_level, created_at")
          .eq("user_intent", "hire")
          .order("created_at", { ascending: false });
        setRows(data ?? []);
      } catch { flash("Failed to load recruiter data"); }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  const LEVELS = ["unverified", "basic", "verified", "premium", "agency"];
  const levelColor: Record<string, string> = {
    unverified: "var(--text3)", basic: "var(--text2)", verified: "var(--accent)",
    premium: "var(--success)", agency: "#a855f7",
  };

  async function setLevel(id: string, level: string) {
    setUpdating(id);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error } = await sb.from("profiles").update({ recruiter_level: level }).eq("id", id);
      if (error) throw error;
      setRows(r => r.map(u => u.id === id ? { ...u, recruiter_level: level } : u));
      flash(`✓ Level updated to ${level}`);
    } catch { flash("Update failed"); }
    setUpdating(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, color: "var(--text3)", padding: "10px 14px", background: "rgba(99,102,241,.06)", borderRadius: 10, border: "1px solid rgba(99,102,241,.15)" }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
        Recruiter levels control job post limits, badge visibility, and featured employer placement.
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.length === 0 && <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>No recruiter accounts yet.</div>}
          {rows.map(r => (
            <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.email}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{r.full_name || "—"} · Joined {new Date(r.created_at).toLocaleDateString("en-IN")}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LEVELS.map(l => (
                  <button key={l} disabled={updating === r.id} onClick={() => setLevel(r.id, l)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${r.recruiter_level === l ? levelColor[l] : "var(--border)"}`, background: r.recruiter_level === l ? `${levelColor[l]}22` : "none", color: r.recruiter_level === l ? levelColor[l] : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Job Post Credits View ─────────────────────────────────────────────────────

function JobPostCreditsView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]     = useState<{ id: string; email: string; company_name: string | null; job_posts_used: number; job_posts_limit: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb.from("profiles").select("id, email, company_name, job_posts_used, job_posts_limit").eq("user_intent", "hire").order("job_posts_used", { ascending: false });
        setRows(data ?? []);
      } catch { flash("Failed to load credits"); }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  async function saveLimit(id: string) {
    setSaving(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await sb.from("profiles").update({ job_posts_limit: newLimit }).eq("id", id);
      setRows(r => r.map(u => u.id === id ? { ...u, job_posts_limit: newLimit } : u));
      flash("✓ Limit updated");
      setEditId(null);
    } catch { flash("Update failed"); }
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                {["Employer", "Company", "Posts used", "Posts limit", "Usage", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const pct = r.job_posts_limit > 0 ? Math.min(100, Math.round((r.job_posts_used / r.job_posts_limit) * 100)) : 0;
                const color = pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warn)" : "var(--success)";
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 600 }}>{r.email}</td>
                    <td style={{ padding: "10px 10px", color: "var(--text2)" }}>{r.company_name || "—"}</td>
                    <td style={{ padding: "10px 10px", color: "var(--text1)", fontWeight: 700 }}>{r.job_posts_used ?? 0}</td>
                    <td style={{ padding: "10px 10px", color: "var(--text2)" }}>
                      {editId === r.id ? (
                        <input type="number" style={{ ...input, width: 80 }} value={newLimit} onChange={e => setNewLimit(Number(e.target.value))} />
                      ) : (r.job_posts_limit ?? "—")}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ width: 80, height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 10, color, marginTop: 2 }}>{pct}%</div>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      {editId === r.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={btn(true)} onClick={() => saveLimit(r.id)} disabled={saving}>Save</button>
                          <button style={btn()} onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button style={{ ...btn(), fontSize: 11, padding: "4px 10px" }} onClick={() => { setEditId(r.id); setNewLimit(r.job_posts_limit ?? 10); }}>Edit limit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No employer accounts yet.</div>}
        </div>
      )}
    </div>
  );
}

// ── Subscriptions View ────────────────────────────────────────────────────────

function SubscriptionsView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]       = useState<{ id: string; email: string; plan: string; plan_expires_at: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb.from("profiles").select("id, email, plan, plan_expires_at, created_at").neq("plan", "free").order("plan_expires_at", { ascending: false });
        setRows(data ?? []);
      } catch { flash("Failed to load subscriptions"); }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  const planColor: Record<string, string> = { pro: "var(--accent)", team: "var(--success)", enterprise: "#a855f7" };

  const now = Date.now();
  const active  = rows.filter(r => !r.plan_expires_at || new Date(r.plan_expires_at).getTime() > now).length;
  const expired = rows.length - active;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Paying users", val: rows.length, color: "var(--accent)" },
          { label: "Active",       val: active,       color: "var(--success)" },
          { label: "Expired",      val: expired,       color: "var(--warn)" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 18px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                {["Email", "Plan", "Expires", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isExp = r.plan_expires_at ? new Date(r.plan_expires_at).getTime() < now : false;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", opacity: isExp ? 0.6 : 1 }}>
                    <td style={{ padding: "10px 10px", fontWeight: 600 }}>{r.email}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "var(--surface2)", color: planColor[r.plan] ?? "var(--text3)" }}>{r.plan}</span>
                    </td>
                    <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>
                      {r.plan_expires_at ? new Date(r.plan_expires_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600, background: isExp ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", color: isExp ? "var(--danger)" : "var(--success)" }}>
                        {isExp ? "Expired" : "Active"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No paying users yet.</div>}
        </div>
      )}
    </div>
  );
}

// ── Promos View ───────────────────────────────────────────────────────────────

interface PromoRow { id: string; code: string; discount_pct: number; max_uses: number | null; used_count: number; expires_at: string | null; active: boolean; }

function PromosView({ token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]       = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ code: "", discount_pct: 20, max_uses: "" });
  const [saving, setSaving]   = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb.from("promo_codes").select("*").order("created_at", { ascending: false });
      setRows(data ?? []);
    } catch { /* table may not exist */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function create() {
    if (!form.code.trim()) { flash("Code required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: form.code.toUpperCase(), discount_pct: form.discount_pct, max_uses: form.max_uses ? Number(form.max_uses) : null }),
      });
      if (res.ok) { flash("✓ Promo created"); setForm({ code: "", discount_pct: 20, max_uses: "" }); await load(); }
      else flash("Failed to create promo");
    } catch { flash("Network error"); }
    setSaving(false);
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await sb.from("promo_codes").update({ active }).eq("id", id);
      setRows(r => r.map(p => p.id === id ? { ...p, active } : p));
      flash(`✓ Promo ${active ? "enabled" : "disabled"}`);
    } catch { flash("Failed"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Create promo code</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label style={label}>Code</label>
            <input style={input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="LAUNCH50" />
          </div>
          <div style={{ flex: "0 1 110px" }}>
            <label style={label}>Discount %</label>
            <input type="number" style={input} value={form.discount_pct} min={1} max={100} onChange={e => setForm(f => ({ ...f, discount_pct: Number(e.target.value) }))} />
          </div>
          <div style={{ flex: "0 1 110px" }}>
            <label style={label}>Max uses</label>
            <input type="number" style={input} value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="∞" />
          </div>
          <div style={{ flex: "0 1 auto", paddingTop: 21 }}>
            <button style={btn(true)} onClick={create} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                {["Code", "Discount", "Used", "Max uses", "Expires", "Active"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", opacity: p.active ? 1 : 0.5 }}>
                  <td style={{ padding: "10px 10px", fontWeight: 700, fontFamily: "monospace" }}>{p.code}</td>
                  <td style={{ padding: "10px 10px", color: "var(--success)", fontWeight: 700 }}>{p.discount_pct}%</td>
                  <td style={{ padding: "10px 10px", color: "var(--text2)" }}>{p.used_count}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)" }}>{p.max_uses ?? "∞"}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>{p.expires_at ? new Date(p.expires_at).toLocaleDateString("en-IN") : "Never"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <button onClick={() => toggleActive(p.id, !p.active)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: p.active ? "var(--success)" : "var(--surface2)", position: "relative", transition: "background .2s" }}>
                      <span style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .2s", left: p.active ? 20 : 2 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>No promo codes yet.</div>}
        </div>
      )}
    </div>
  );
}

// ── Notifications View ────────────────────────────────────────────────────────

function NotificationsView({ token, flash }: { token: string; flash: (m: string) => void }) {
  const [form, setForm]   = useState({ title: "", body: "", target: "all" });
  const [sending, setSending] = useState(false);
  const [sent, setSent]   = useState<{ title: string; body: string; target: string; sent_at: string }[]>([]);

  async function send() {
    if (!form.title.trim() || !form.body.trim()) { flash("Title and body required"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        flash("✓ Notification sent");
        setSent(s => [{ ...form, sent_at: new Date().toISOString() }, ...s]);
        setForm({ title: "", body: "", target: "all" });
      } else flash("Failed to send");
    } catch { flash("Network error"); }
    setSending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}><i className="ti ti-bell" style={{ marginRight: 6 }} />Broadcast notification</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label}>Target audience</label>
            <select style={input} value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
              <option value="all">All users</option>
              <option value="free">Free plan only</option>
              <option value="pro">Pro plan only</option>
              <option value="employers">Employers only</option>
            </select>
          </div>
          <div>
            <label style={label}>Title</label>
            <input style={input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New feature: AI Interview Coach" />
          </div>
          <div>
            <label style={label}>Message body</label>
            <textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Notification body text…" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btn(true)} onClick={send} disabled={sending}>{sending ? "Sending…" : <><i className="ti ti-send" style={{ marginRight: 5 }} />Send</>}</button>
          </div>
        </div>
      </div>

      {sent.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Sent this session</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sent.map((n, i) => (
              <div key={i} style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 700 }}>{n.title}</div>
                <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>→ {n.target} · {new Date(n.sent_at).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Support View ──────────────────────────────────────────────────────────────

interface SupportTicket {
  id: string; subject: string; email: string; status: string; priority: string; created_at: string; message: string;
}

function SupportView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]           = useState<SupportTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState("open");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb.from("support_tickets").select("*").order("created_at", { ascending: false });
        setRows(data ?? []);
      } catch { /* table may not exist */ }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  async function updateStatus(id: string, status: string) {
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await sb.from("support_tickets").update({ status }).eq("id", id);
      setRows(r => r.map(t => t.id === id ? { ...t, status } : t));
      if (selected?.id === id) setSelected(s => s ? { ...s, status } : s);
      flash(`✓ Ticket marked ${status}`);
    } catch { flash("Update failed"); }
  }

  const filtered = statusFilter === "all" ? rows : rows.filter(r => r.status === statusFilter);
  const open = rows.filter(r => r.status === "open").length;

  const priorityColor: Record<string, string> = { urgent: "var(--danger)", high: "var(--warn)", normal: "var(--text3)", low: "var(--text3)" };
  const statusBg: Record<string, string> = { open: "rgba(234,179,8,.1)", in_progress: "rgba(99,102,241,.1)", resolved: "rgba(34,197,94,.1)", closed: "var(--surface2)" };
  const statusCol: Record<string, string> = { open: "var(--warn)", in_progress: "var(--accent)", resolved: "var(--success)", closed: "var(--text3)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "open", "in_progress", "resolved", "closed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "5px 14px", borderRadius: 99, border: `1px solid ${statusFilter === s ? "var(--accent)" : "var(--border)"}`, background: statusFilter === s ? "var(--accdim)" : "none", color: statusFilter === s ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {s === "all" ? `All (${rows.length})` : `${s.replace("_", " ")} ${s === "open" ? `(${open})` : ""}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <i className="ti ti-headset" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
          {rows.length === 0 ? "No support tickets yet. Create a support_tickets table to enable this." : "No tickets in this category."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ ...card, display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap", cursor: "pointer" }} onClick={() => setSelected(t)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{t.subject}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor[t.priority] ?? "var(--text3)", textTransform: "uppercase" }}>{t.priority}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: statusBg[t.status], color: statusCol[t.status] }}>{t.status}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.email} · {new Date(t.created_at).toLocaleDateString("en-IN")}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {t.status === "open" && <button style={{ ...btn(true), fontSize: 11, padding: "4px 10px" }} onClick={e => { e.stopPropagation(); updateStatus(t.id, "in_progress"); }}>Take</button>}
                {t.status !== "resolved" && <button style={{ ...btn(), fontSize: 11, padding: "4px 10px" }} onClick={e => { e.stopPropagation(); updateStatus(t.id, "resolved"); }}>Resolve</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ ...card, width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{selected.subject}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{selected.email} · {new Date(selected.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}><i className="ti ti-x" /></button>
            </div>
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{selected.message}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["open", "in_progress", "resolved", "closed"].map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${selected.status === s ? "var(--accent)" : "var(--border)"}`, background: selected.status === s ? "var(--accdim)" : "none", color: selected.status === s ? "var(--accent)" : "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Health View ────────────────────────────────────────────────────────

function SystemHealthView({ token: _token }: { token: string }) {
  const [checks, setChecks] = useState<{ name: string; status: "ok" | "warn" | "error"; latencyMs?: number; detail?: string }[]>([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    (async () => {
      setRunning(true);
      const results: typeof checks = [];

      // Supabase ping
      try {
        const t0 = Date.now();
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await sb.from("profiles").select("id", { count: "exact", head: true });
        results.push({ name: "Supabase DB", status: "ok", latencyMs: Date.now() - t0 });
      } catch (e) {
        results.push({ name: "Supabase DB", status: "error", detail: String(e) });
      }

      // Groq API
      try {
        const t0 = Date.now();
        const res = await fetch("/api/health/groq");
        results.push({ name: "Groq AI", status: res.ok ? "ok" : "warn", latencyMs: Date.now() - t0, detail: res.ok ? undefined : `HTTP ${res.status}` });
      } catch {
        results.push({ name: "Groq AI", status: "warn", detail: "Ping endpoint not found" });
      }

      // Env vars check
      const missingEnv = [];
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push("SUPABASE_URL");
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingEnv.push("ANON_KEY");
      results.push({
        name: "Environment vars",
        status: missingEnv.length ? "error" : "ok",
        detail: missingEnv.length ? `Missing: ${missingEnv.join(", ")}` : "All required vars present",
      });

      setChecks(results);
      setRunning(false);
    })();
  }, []); // eslint-disable-line

  const iconFor = (s: string) => s === "ok" ? "ti-circle-check" : s === "warn" ? "ti-alert-triangle" : "ti-x";
  const colorFor = (s: string) => s === "ok" ? "var(--success)" : s === "warn" ? "var(--warn)" : "var(--danger)";
  const bgFor = (s: string) => s === "ok" ? "rgba(34,197,94,.08)" : s === "warn" ? "rgba(234,179,8,.08)" : "rgba(239,68,68,.08)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}><i className="ti ti-activity" style={{ marginRight: 6, color: "var(--accent)" }} />System Health</div>

      {running ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}><i className="ti ti-loader" style={{ marginRight: 6 }} />Running checks…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {checks.map(c => (
            <div key={c.name} style={{ ...card, display: "flex", alignItems: "center", gap: 14, background: bgFor(c.status) }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${iconFor(c.status)}`} style={{ fontSize: 20, color: colorFor(c.status) }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                {c.detail && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{c.detail}</div>}
              </div>
              {c.latencyMs != null && (
                <div style={{ fontSize: 13, fontWeight: 700, color: c.latencyMs < 200 ? "var(--success)" : c.latencyMs < 600 ? "var(--warn)" : "var(--danger)" }}>
                  {c.latencyMs}ms
                </div>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, color: colorFor(c.status), textTransform: "uppercase", letterSpacing: ".04em" }}>{c.status}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: 12, background: "var(--surface2)", borderRadius: 10, fontSize: 12, color: "var(--text3)" }}>
        Checks run on page load. Refresh to re-run. For continuous monitoring connect Grafana, Sentry, or UptimeRobot.
      </div>
    </div>
  );
}

// ── Content Reports View ──────────────────────────────────────────────────────

interface ContentReport {
  id: string; reporter_id: string | null; target_type: "job" | "profile" | "review" | "message";
  target_id: string; reason: string; detail: string | null; status: "open" | "reviewed" | "dismissed";
  created_at: string;
}

function ContentReportsView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]           = useState<ContentReport[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setFilter] = useState<"open" | "reviewed" | "dismissed" | "all">("open");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected]   = useState<ContentReport | null>(null);
  const [actioning, setActioning] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb.from("content_reports").select("*").order("created_at", { ascending: false });
      setRows((data ?? []) as ContentReport[]);
    } catch { /* table may not exist yet */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function act(id: string, status: "reviewed" | "dismissed") {
    setActioning(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await sb.from("content_reports").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      setRows(r => r.map(x => x.id === id ? { ...x, status } : x));
      if (selected?.id === id) setSelected(s => s ? { ...s, status } : s);
      flash(`✓ Report ${status}`);
    } catch { flash("Update failed"); }
    setActioning(false);
  }

  const filtered = rows.filter(r => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchType   = typeFilter   === "all" || r.target_type === typeFilter;
    return matchStatus && matchType;
  });

  const openCount = rows.filter(r => r.status === "open").length;

  const typeIcon: Record<string, string> = { job: "ti-briefcase", profile: "ti-user", review: "ti-star", message: "ti-message" };
  const reasonColors: Record<string, string> = {
    spam: "var(--warn)", harassment: "var(--danger)", misleading: "var(--warn)",
    inappropriate: "var(--danger)", fake: "var(--danger)", other: "var(--text3)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Open",      val: openCount,                                    color: "var(--danger)" },
          { label: "Reviewed",  val: rows.filter(r => r.status === "reviewed").length,  color: "var(--success)" },
          { label: "Dismissed", val: rows.filter(r => r.status === "dismissed").length, color: "var(--text3)" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 18px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", "open", "reviewed", "dismissed"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${statusFilter === s ? "var(--accent)" : "var(--border)"}`, background: statusFilter === s ? "var(--accdim)" : "none", color: statusFilter === s ? "var(--accent)" : "var(--text3)" }}>
            {s}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
        {(["all", "job", "profile", "review", "message"] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${typeFilter === t ? "var(--accent)" : "var(--border)"}`, background: typeFilter === t ? "var(--accdim)" : "none", color: typeFilter === t ? "var(--accent)" : "var(--text3)" }}>
            {t === "all" ? "All types" : t}
          </button>
        ))}
        <button style={{ ...btn(), marginLeft: "auto", fontSize: 12 }} onClick={load}><i className="ti ti-refresh" style={{ marginRight: 4 }} />Refresh</button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <i className="ti ti-flag-2" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
          {rows.length === 0 ? "No content reports yet. Create a content_reports table to enable this." : "No reports in this category."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer" }} onClick={() => setSelected(r)}>
              {/* Type icon */}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${typeIcon[r.target_type] ?? "ti-alert"}`} style={{ fontSize: 16, color: "var(--text3)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{r.target_type} reported</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: reasonColors[r.reason] ?? "var(--text3)", padding: "2px 7px", borderRadius: 6, background: `${reasonColors[r.reason] ?? "var(--surface2)"}18`, border: `1px solid ${reasonColors[r.reason] ?? "var(--border)"}44` }}>
                    {r.reason}
                  </span>
                  {r.status !== "open" && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: r.status === "reviewed" ? "rgba(34,197,94,.1)" : "var(--surface2)", color: r.status === "reviewed" ? "var(--success)" : "var(--text3)" }}>
                      {r.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
                  Target ID: <code style={{ fontFamily: "monospace", fontSize: 11 }}>{r.target_id.slice(0, 12)}…</code>
                  {" · "}{new Date(r.created_at).toLocaleDateString("en-IN")}
                </div>
                {r.detail && <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, fontStyle: "italic" }}>"{r.detail.slice(0, 100)}{r.detail.length > 100 ? "…" : ""}"</div>}
              </div>
              {r.status === "open" && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button disabled={actioning} onClick={e => { e.stopPropagation(); act(r.id, "reviewed"); }} style={{ ...btn(true), fontSize: 11, padding: "4px 10px" }}>Act</button>
                  <button disabled={actioning} onClick={e => { e.stopPropagation(); act(r.id, "dismissed"); }} style={{ ...btn(), fontSize: 11, padding: "4px 10px" }}>Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ ...card, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, textTransform: "capitalize" }}>{selected.target_type} report — {selected.reason}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{new Date(selected.created_at).toLocaleString("en-IN")}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 18 }}><i className="ti ti-x" /></button>
            </div>
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
              {[
                ["Target type",  selected.target_type],
                ["Target ID",    selected.target_id],
                ["Reason",       selected.reason],
                ["Reporter",     selected.reporter_id?.slice(0, 8) + "…" || "Anonymous"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</div>
                </div>
              ))}
            </div>
            {selected.detail && (
              <div style={{ background: "rgba(234,179,8,.06)", border: "1px solid rgba(234,179,8,.2)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--warn)", marginBottom: 6 }}>Reporter's note</div>
                {selected.detail}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={actioning || selected.status !== "open"} onClick={() => act(selected.id, "reviewed")} style={{ ...btn(true), flex: 1 }}>
                <i className="ti ti-check" style={{ marginRight: 5 }} />Mark reviewed
              </button>
              <button disabled={actioning || selected.status !== "open"} onClick={() => act(selected.id, "dismissed")} style={{ ...btn(), flex: 1 }}>
                <i className="ti ti-x" style={{ marginRight: 5 }} />Dismiss
              </button>
              <a href={`/jobs`} target="_blank" rel="noreferrer" style={{ ...btn(), textDecoration: "none", display: "flex", alignItems: "center" }}>
                View target ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payments View ─────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string; user_id: string; email: string | null; amount: number; currency: string;
  status: "captured" | "failed" | "refunded" | "pending"; plan: string;
  razorpay_order_id: string | null; razorpay_payment_id: string | null;
  created_at: string;
}

function PaymentsView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]           = useState<PaymentRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setFilter] = useState("all");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb
          .from("payments")
          .select("id, user_id, email, amount, currency, status, plan, razorpay_order_id, razorpay_payment_id, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        setRows((data ?? []) as PaymentRow[]);
      } catch { /* table may not exist */ }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || (r.email ?? "").toLowerCase().includes(q) || (r.razorpay_payment_id ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total    = rows.filter(r => r.status === "captured").reduce((a, r) => a + r.amount, 0);
  const refunded = rows.filter(r => r.status === "refunded").reduce((a, r) => a + r.amount, 0);
  const failed   = rows.filter(r => r.status === "failed").length;

  const statusColor: Record<string, string> = { captured: "var(--success)", failed: "var(--danger)", refunded: "var(--warn)", pending: "var(--text3)" };
  const statusBg:    Record<string, string> = { captured: "rgba(34,197,94,.1)", failed: "rgba(239,68,68,.1)", refunded: "rgba(234,179,8,.1)", pending: "var(--surface2)" };

  function fmtAmount(amt: number, cur: string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur.toUpperCase(), maximumFractionDigits: 0 }).format(amt / 100);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Total revenue",    val: fmtAmount(total, "INR"),    color: "var(--success)" },
          { label: "Refunded",         val: fmtAmount(refunded, "INR"), color: "var(--warn)" },
          { label: "Failed payments",  val: failed,                     color: "var(--danger)" },
          { label: "Total transactions", val: rows.length,              color: "var(--accent)" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 18px", minWidth: 140 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 260 }} placeholder="Search email or payment ID…" value={search} onChange={e => setSearch(e.target.value)} />
        {(["all", "captured", "failed", "refunded", "pending"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${statusFilter === s ? "var(--accent)" : "var(--border)"}`, background: statusFilter === s ? "var(--accdim)" : "none", color: statusFilter === s ? "var(--accent)" : "var(--text3)" }}>
            {s}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}>{filtered.length} transactions</span>
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <i className="ti ti-receipt" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
          {rows.length === 0 ? "No payments yet. Transactions will appear here once your Razorpay webhook writes to a payments table." : "No results for this filter."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                {["Date", "Email", "Plan", "Amount", "Status", "Payment ID"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                  <td style={{ padding: "10px 10px", fontWeight: 600 }}>{r.email || "—"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "var(--surface2)", color: "var(--accent)" }}>{r.plan}</span>
                  </td>
                  <td style={{ padding: "10px 10px", fontWeight: 700, color: "var(--text1)" }}>{fmtAmount(r.amount, r.currency)}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: statusBg[r.status], color: statusColor[r.status] }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 11, fontFamily: "monospace" }}>
                    {r.razorpay_payment_id ? (
                      <a href={`https://dashboard.razorpay.com/app/payments/${r.razorpay_payment_id}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                        {r.razorpay_payment_id.slice(0, 16)}… ↗
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Interview Bank View ───────────────────────────────────────────────────────

interface IQRow {
  id: string; question: string; category: string; difficulty: "easy" | "medium" | "hard";
  answer_hint: string | null; tags: string[]; active: boolean; created_at: string;
}

function InterviewBankView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]       = useState<IQRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCat]   = useState("all");
  const [diffFilter, setDiff] = useState("all");
  const [search, setSearch]   = useState("");
  const [form, setForm]       = useState({ question: "", category: "", difficulty: "medium" as IQRow["difficulty"], answer_hint: "", tags: "" });
  const [saving, setSaving]   = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb.from("interview_questions").select("*").order("category").order("difficulty");
      setRows((data ?? []) as IQRow[]);
    } catch { /* table may not exist */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function save() {
    if (!form.question.trim() || !form.category.trim()) { flash("Question and category required"); return; }
    setSaving(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error } = await sb.from("interview_questions").insert({
        question: form.question.trim(), category: form.category.trim(),
        difficulty: form.difficulty, answer_hint: form.answer_hint.trim() || null,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        active: true,
      });
      if (error) throw error;
      flash("✓ Question added");
      setForm({ question: "", category: "", difficulty: "medium", answer_hint: "", tags: "" });
      setShowAdd(false);
      await load();
    } catch { flash("Failed to save"); }
    setSaving(false);
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await sb.from("interview_questions").update({ active }).eq("id", id);
      setRows(r => r.map(q => q.id === id ? { ...q, active } : q));
    } catch { flash("Update failed"); }
  }

  async function del(id: string) {
    if (!confirm("Delete this question?")) return;
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await sb.from("interview_questions").delete().eq("id", id);
      setRows(r => r.filter(q => q.id !== id));
      flash("✓ Deleted");
    } catch { flash("Delete failed"); }
  }

  const cats = ["all", ...Array.from(new Set(rows.map(r => r.category)))];
  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return (catFilter === "all" || r.category === catFilter)
      && (diffFilter === "all" || r.difficulty === diffFilter)
      && (!q || r.question.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  });

  const diffColor: Record<string, string> = { easy: "var(--success)", medium: "var(--warn)", hard: "var(--danger)" };
  const diffBg:    Record<string, string> = { easy: "rgba(34,197,94,.1)", medium: "rgba(234,179,8,.1)", hard: "rgba(239,68,68,.1)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 240 }} placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...input, width: 150 }} value={catFilter} onChange={e => setCat(e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
        {(["all", "easy", "medium", "hard"] as const).map(d => (
          <button key={d} onClick={() => setDiff(d)} style={{ padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${diffFilter === d ? "var(--accent)" : "var(--border)"}`, background: diffFilter === d ? "var(--accdim)" : "none", color: diffFilter === d ? "var(--accent)" : "var(--text3)" }}>
            {d}
          </button>
        ))}
        <button style={{ ...btn(true), marginLeft: "auto" }} onClick={() => setShowAdd(s => !s)}>
          <i className="ti ti-plus" style={{ marginRight: 5 }} />{showAdd ? "Cancel" : "Add question"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>New question</div>
          <div style={row}>
            <div style={{ flex: "1 1 280px" }}>
              <label style={label}>Question *</label>
              <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="e.g. Explain the difference between useEffect and useLayoutEffect" />
            </div>
          </div>
          <div style={row}>
            <div style={{ flex: "1 1 160px" }}>
              <label style={label}>Category *</label>
              <input style={input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. React, System Design" />
            </div>
            <div style={{ flex: "0 1 130px" }}>
              <label style={label}>Difficulty</label>
              <select style={input} value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as IQRow["difficulty"] }))}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={label}>Tags (comma-separated)</label>
              <input style={input} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="hooks, lifecycle, performance" />
            </div>
          </div>
          <div>
            <label style={label}>Answer hint / model answer</label>
            <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={form.answer_hint} onChange={e => setForm(f => ({ ...f, answer_hint: e.target.value }))} placeholder="Brief answer guidance for interviewers…" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(true)} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save question"}</button>
            <button style={btn()} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text3)", flexWrap: "wrap" }}>
        {(["easy", "medium", "hard"] as const).map(d => (
          <span key={d} style={{ padding: "4px 10px", borderRadius: 6, background: diffBg[d], color: diffColor[d], fontWeight: 600 }}>
            {rows.filter(r => r.difficulty === d).length} {d}
          </span>
        ))}
        <span style={{ marginLeft: "auto" }}>{filtered.length} / {rows.length} questions</span>
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <i className="ti ti-brain" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
          {rows.length === 0 ? "No questions yet. Create an interview_questions table and add some." : "No questions match this filter."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(q => (
            <div key={q.id} style={{ ...card, opacity: q.active ? 1 : 0.5, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: diffBg[q.difficulty], color: diffColor[q.difficulty] }}>{q.difficulty}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", padding: "2px 8px", borderRadius: 6, background: "var(--accdim)" }}>{q.category}</span>
                    {(q.tags ?? []).slice(0, 3).map(t => <span key={t} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface2)", color: "var(--text3)" }}>{t}</span>)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", lineHeight: 1.5 }}>{q.question}</div>
                  {q.answer_hint && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6, lineHeight: 1.5, fontStyle: "italic" }}>{q.answer_hint.slice(0, 120)}{q.answer_hint.length > 120 ? "…" : ""}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(q.id, !q.active)} style={{ ...btn(), fontSize: 11, padding: "4px 10px" }}>{q.active ? "Disable" : "Enable"}</button>
                  <button onClick={() => del(q.id)} style={{ ...btn(), fontSize: 11, padding: "4px 10px", color: "var(--danger)" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Salary Data View ──────────────────────────────────────────────────────────

interface SalaryBenchmark {
  id: string; role: string; level: string; location: string; industry: string | null;
  min_lpa: number; median_lpa: number; max_lpa: number; sample_size: number;
  currency: string; source: string | null; updated_at: string;
}

function SalaryDataView({ token: _token, flash }: { token: string; flash: (m: string) => void }) {
  const [rows, setRows]       = useState<SalaryBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [form, setForm]       = useState({ role: "", level: "mid", location: "", industry: "", min_lpa: "", median_lpa: "", max_lpa: "", sample_size: "10", currency: "INR", source: "" });
  const [saving, setSaving]   = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb.from("salary_benchmarks").select("*").order("role").order("level");
      setRows((data ?? []) as SalaryBenchmark[]);
    } catch { /* table may not exist */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function save() {
    if (!form.role.trim() || !form.location.trim() || !form.median_lpa) { flash("Role, location, and median LPA required"); return; }
    setSaving(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const payload = {
        role: form.role.trim(), level: form.level, location: form.location.trim(),
        industry: form.industry.trim() || null, currency: form.currency,
        min_lpa: Number(form.min_lpa) || 0, median_lpa: Number(form.median_lpa),
        max_lpa: Number(form.max_lpa) || 0, sample_size: Number(form.sample_size) || 10,
        source: form.source.trim() || null, updated_at: new Date().toISOString(),
      };
      if (editing) {
        await sb.from("salary_benchmarks").update(payload).eq("id", editing);
        flash("✓ Benchmark updated");
        setEditing(null);
      } else {
        await sb.from("salary_benchmarks").insert(payload);
        flash("✓ Benchmark added");
      }
      setForm({ role: "", level: "mid", location: "", industry: "", min_lpa: "", median_lpa: "", max_lpa: "", sample_size: "10", currency: "INR", source: "" });
      setShowAdd(false);
      await load();
    } catch { flash("Save failed"); }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this benchmark?")) return;
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await sb.from("salary_benchmarks").delete().eq("id", id);
      setRows(r => r.filter(b => b.id !== id));
      flash("✓ Deleted");
    } catch { flash("Delete failed"); }
  }

  function editRow(b: SalaryBenchmark) {
    setForm({ role: b.role, level: b.level, location: b.location, industry: b.industry ?? "", min_lpa: String(b.min_lpa), median_lpa: String(b.median_lpa), max_lpa: String(b.max_lpa), sample_size: String(b.sample_size), currency: b.currency, source: b.source ?? "" });
    setEditing(b.id);
    setShowAdd(true);
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.role.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || (r.industry ?? "").toLowerCase().includes(q);
  });

  const levelColor: Record<string, string> = { junior: "var(--text3)", mid: "var(--accent)", senior: "var(--success)", lead: "#a855f7", director: "var(--warn)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 260 }} placeholder="Search role, location, industry…" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}>{filtered.length} benchmarks</span>
        <button style={btn(true)} onClick={() => { setEditing(null); setShowAdd(s => !s); }}>
          <i className="ti ti-plus" style={{ marginRight: 5 }} />{showAdd && !editing ? "Cancel" : "Add benchmark"}
        </button>
      </div>

      {/* Add / edit form */}
      {showAdd && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{editing ? "Edit benchmark" : "New salary benchmark"}</div>
          <div style={row}>
            <div style={{ flex: "1 1 180px" }}><label style={label}>Role *</label><input style={input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Senior React Developer" /></div>
            <div style={{ flex: "0 1 120px" }}>
              <label style={label}>Level</label>
              <select style={input} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                {["junior", "mid", "senior", "lead", "director"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 150px" }}><label style={label}>Location *</label><input style={input} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Bengaluru / Remote / Global" /></div>
            <div style={{ flex: "1 1 130px" }}><label style={label}>Industry</label><input style={input} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="SaaS, Fintech…" /></div>
          </div>
          <div style={row}>
            <div style={{ flex: "0 1 110px" }}><label style={label}>Min LPA</label><input type="number" style={input} value={form.min_lpa} onChange={e => setForm(f => ({ ...f, min_lpa: e.target.value }))} placeholder="8" /></div>
            <div style={{ flex: "0 1 120px" }}><label style={label}>Median LPA *</label><input type="number" style={input} value={form.median_lpa} onChange={e => setForm(f => ({ ...f, median_lpa: e.target.value }))} placeholder="18" /></div>
            <div style={{ flex: "0 1 110px" }}><label style={label}>Max LPA</label><input type="number" style={input} value={form.max_lpa} onChange={e => setForm(f => ({ ...f, max_lpa: e.target.value }))} placeholder="28" /></div>
            <div style={{ flex: "0 1 100px" }}><label style={label}>Sample size</label><input type="number" style={input} value={form.sample_size} onChange={e => setForm(f => ({ ...f, sample_size: e.target.value }))} /></div>
            <div style={{ flex: "0 1 90px" }}>
              <label style={label}>Currency</label>
              <select style={input} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                {["INR", "USD", "GBP", "EUR", "AED", "SGD"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 160px" }}><label style={label}>Source</label><input style={input} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Levels.fyi, Glassdoor…" /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(true)} onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Add"}</button>
            <button style={btn()} onClick={() => { setShowAdd(false); setEditing(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <i className="ti ti-chart-line" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
          {rows.length === 0 ? "No benchmarks yet. Create a salary_benchmarks table and add data." : "No results."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                {["Role", "Level", "Location", "Min", "Median", "Max", "n", "Source", ""].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 10px", fontWeight: 600 }}>{b.role}{b.industry && <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>{b.industry}</span>}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: levelColor[b.level] ?? "var(--text3)" }}>{b.level}</span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "var(--text2)", fontSize: 12 }}>{b.location}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>{b.min_lpa > 0 ? `${b.min_lpa}L` : "—"}</td>
                  <td style={{ padding: "10px 10px", fontWeight: 700, color: "var(--success)" }}>{b.median_lpa}L</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>{b.max_lpa > 0 ? `${b.max_lpa}L` : "—"}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>{b.sample_size}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 11 }}>{b.source || "—"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => editRow(b)} style={{ ...btn(), fontSize: 11, padding: "4px 10px" }}>Edit</button>
                      <button onClick={() => del(b.id)} style={{ ...btn(), fontSize: 11, padding: "4px 10px", color: "var(--danger)" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Rate Limits View ──────────────────────────────────────────────────────────

function RateLimitsView({ token: _token }: { token: string }) {
  const [rows, setRows]       = useState<{ user_id: string | null; ip_address: string | null; action: string; meta: Record<string, unknown> | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow]   = useState<"1h" | "24h" | "7d">("24h");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const since = new Date(Date.now() - (window === "1h" ? 3600000 : window === "24h" ? 86400000 : 604800000)).toISOString();
        const { data } = await sb
          .from("audit_logs")
          .select("user_id, ip_address, action, meta, created_at")
          .eq("action", "api.rate_limited")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500);
        setRows(data ?? []);
      } catch { /* audit_logs may not have rate limit events */ }
      setLoading(false);
    })();
  }, [window]); // eslint-disable-line

  // Aggregate by IP or user
  const byIp = rows.reduce<Record<string, { count: number; lastSeen: string; endpoints: Set<string> }>>((acc, r) => {
    const key = r.ip_address ?? r.user_id ?? "unknown";
    if (!acc[key]) acc[key] = { count: 0, lastSeen: r.created_at, endpoints: new Set() };
    acc[key].count++;
    if (r.created_at > acc[key].lastSeen) acc[key].lastSeen = r.created_at;
    const ep = (r.meta as { endpoint?: string } | null)?.endpoint;
    if (ep) acc[key].endpoints.add(ep);
    return acc;
  }, {});

  const sorted = Object.entries(byIp).sort((a, b) => b[1].count - a[1].count);
  const totalHits = rows.length;
  const uniqueIPs = sorted.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header + window selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}><i className="ti ti-shield-bolt" style={{ marginRight: 6, color: "var(--accent)" }} />Rate limit hits</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["1h", "24h", "7d"] as const).map(w => (
            <button key={w} onClick={() => setWindow(w)} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${window === w ? "var(--accent)" : "var(--border)"}`, background: window === w ? "var(--accdim)" : "none", color: window === w ? "var(--accent)" : "var(--text3)" }}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Total hits",  val: totalHits,  color: totalHits > 100 ? "var(--danger)" : totalHits > 20 ? "var(--warn)" : "var(--success)" },
          { label: "Unique IPs",  val: uniqueIPs,  color: "var(--accent)" },
          { label: "Top abuser", val: sorted[0]?.[1].count ?? 0, sub: sorted[0]?.[0].slice(0, 12) ?? "—", color: "var(--danger)" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 18px", minWidth: 130 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.label}</div>
            {"sub" in s && s.sub && <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "monospace", marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</div>
      ) : sorted.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <i className="ti ti-shield-check" style={{ fontSize: 28, color: "var(--success)", display: "block", marginBottom: 8 }} />
          No rate limit hits in the last {window}. All clear.
        </div>
      ) : (
        <>
          {/* Per-IP breakdown */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top offenders — last {window}</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
                    {["IP / User", "Hits", "Last seen", "Endpoints hit"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 30).map(([key, data]) => (
                    <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{key.slice(0, 20)}{key.length > 20 ? "…" : ""}</td>
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{ fontWeight: 800, color: data.count > 50 ? "var(--danger)" : data.count > 10 ? "var(--warn)" : "var(--text2)" }}>{data.count}</span>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--text3)", fontSize: 12 }}>
                        {new Date(data.lastSeen).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {[...data.endpoints].slice(0, 4).map(ep => (
                            <span key={ep} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface2)", color: "var(--text3)", fontFamily: "monospace" }}>{ep}</span>
                          ))}
                          {data.endpoints.size > 4 && <span style={{ fontSize: 10, color: "var(--text3)" }}>+{data.endpoints.size - 4}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw event timeline (last 20) */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Recent events</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.slice(0, 20).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, alignItems: "center", padding: "6px 0", borderBottom: i < 19 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ color: "var(--text3)", fontSize: 11, whiteSpace: "nowrap" }}>
                    {new Date(r.created_at).toLocaleTimeString("en-IN")}
                  </span>
                  <span style={{ fontFamily: "monospace", color: "var(--text2)", fontSize: 11 }}>
                    {(r.ip_address ?? r.user_id ?? "—").slice(0, 18)}
                  </span>
                  {(r.meta as { endpoint?: string } | null)?.endpoint && (
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(239,68,68,.08)", color: "var(--danger)", fontFamily: "monospace" }}>
                      {(r.meta as { endpoint?: string })!.endpoint}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
