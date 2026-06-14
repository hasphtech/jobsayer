"use client";
/**
 * /profile — Account & subscription management (tabbed layout)
 * Tabs: Overview · Career · Resumes · Plan · Settings
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResumePlan } from "@/lib/resumePlan";
import { getSupabaseAsync } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import UpgradePlans from "@/components/UpgradePlans";
import JobPreferences from "@/components/JobPreferences";
import type { SkillProof } from "@/lib/types";

/* ── Types ──────────────────────────────────────────────────── */
type OpenToWork   = "active" | "passive" | "not_looking";
type NoticePeriod = "immediate" | "15" | "30" | "45" | "60" | "90" | "90+";
type WorkPref     = "full_time" | "part_time" | "contract" | "any";
type TabId        = "overview" | "career" | "resumes" | "plan" | "settings";

interface Availability {
  openToWork:   OpenToWork;
  noticePeriod: NoticePeriod;
  workPref:     WorkPref;
}
interface SaveMeta  { id: string; name: string; updated_at: string; }
interface BgvStatus { status: string; verification_score: number | null; id_verified: boolean; edu_verified: boolean; emp_verified: boolean; }

/* ── Constants ──────────────────────────────────────────────── */
const AVAIL_KEY  = "jobsayer-availability";
const PROOFS_KEY = "jobsayer-skill-proofs";

const PROOF_TYPE_CONFIG: Record<SkillProof["proofType"], { label: string; icon: string; placeholder: string }> = {
  github:  { label: "GitHub",    icon: "ti-brand-github", placeholder: "https://github.com/you/project" },
  demo:    { label: "Live Demo", icon: "ti-world",        placeholder: "https://your-project.vercel.app" },
  article: { label: "Article",   icon: "ti-pencil",       placeholder: "https://medium.com/your-article" },
  project: { label: "Project",   icon: "ti-rocket",       placeholder: "https://your-portfolio.com/project" },
  cert:    { label: "Cert",      icon: "ti-school",       placeholder: "https://credly.com/badges/..." },
  other:   { label: "Other",     icon: "ti-link",         placeholder: "https://..." },
};

const OTW_CONFIG: Record<OpenToWork, { label: string; color: string; bg: string; dot: string }> = {
  active:      { label: "Actively looking", color: "var(--success)", bg: "rgba(34,197,94,.1)",  dot: "var(--success)" },
  passive:     { label: "Open to offers",   color: "var(--warn)",    bg: "rgba(234,179,8,.1)",  dot: "#eab308" },
  not_looking: { label: "Not looking",      color: "var(--text3)",   bg: "var(--surface2)",     dot: "#71717a" },
};
const NOTICE_OPTIONS: { value: NoticePeriod; label: string }[] = [
  { value: "immediate", label: "Immediate" }, { value: "15", label: "15 days"  },
  { value: "30",        label: "30 days"   }, { value: "45", label: "45 days"  },
  { value: "60",        label: "60 days"   }, { value: "90", label: "90 days"  },
  { value: "90+",       label: "3 months+" },
];
const WORK_PREF_OPTIONS: { value: WorkPref; label: string }[] = [
  { value: "full_time", label: "Full-time"      },
  { value: "part_time", label: "Part-time"      },
  { value: "contract",  label: "Contract / Gig" },
  { value: "any",       label: "Any / Open"     },
];

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview",    icon: "ti-home"            },
  { id: "career",   label: "Career",      icon: "ti-briefcase"       },
  { id: "resumes",  label: "Resumes",     icon: "ti-file-text"       },
  { id: "plan",     label: "Plan",        icon: "ti-sparkles"        },
  { id: "settings", label: "Settings",    icon: "ti-adjustments-alt" },
];

/* ── Page ───────────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const plan = useResumePlan();

  const [tab, setTab]                   = useState<TabId>("overview");
  const [saves, setSaves]               = useState<SaveMeta[]>([]);
  const [savesLoading, setSavesLoading] = useState(true);
  const [bgv, setBgv]                   = useState<BgvStatus | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [exportLoading,  setExportLoading]  = useState(false);
  const [referralCode, setReferralCode]     = useState<string | null>(null);
  const [referralStats, setReferralStats]   = useState({ total: 0, rewarded: 0 });
  const [discoverable, setDiscoverable]         = useState(false);
  const [discoverableSaving, setDiscoverableSaving] = useState(false);
  const [avail, setAvail] = useState<Availability>({ openToWork: "active", noticePeriod: "30", workPref: "full_time" });
  const [proofs, setProofs]       = useState<SkillProof[]>([]);
  const [proofForm, setProofForm] = useState(false);
  const [newSkill, setNewSkill]   = useState("");
  const [newType, setNewType]     = useState<SkillProof["proofType"]>("github");
  const [newUrl, setNewUrl]       = useState("");
  const [newDesc, setNewDesc]     = useState("");

  /* Load localStorage */
  useEffect(() => {
    try { const r = localStorage.getItem(AVAIL_KEY);  if (r) setAvail(JSON.parse(r));  } catch { /* */ }
    try { const r = localStorage.getItem(PROOFS_KEY); if (r) setProofs(JSON.parse(r)); } catch { /* */ }
  }, []);

  /* Redirect guests */
  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [user, authLoading, router]);

  /* Load data */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const sb = await getSupabaseAsync();
        const { data } = await sb
          .from("resume_saves").select("id, name, updated_at")
          .eq("user_id", user.id).order("updated_at", { ascending: false });
        setSaves(data ?? []);
      } catch { /* */ } finally { setSavesLoading(false); }
    })();
    fetch("/api/bgv/status").then(r => r.json()).then(d => { if (d.bgv) setBgv(d.bgv); }).catch(() => {});
    fetch("/api/referral").then(r => r.json()).then(d => {
      setReferralCode(d.referral_code ?? null);
      setReferralStats({ total: d.total ?? 0, rewarded: d.rewarded ?? 0 });
    }).catch(() => {});
    (async () => {
      try {
        const sb = await getSupabaseAsync();
        const { data } = await sb.from("resume_saves").select("discoverable")
          .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).single();
        if (data) setDiscoverable(data.discoverable ?? false);
      } catch { /* */ }
    })();
  }, [user]);

  /* Handlers */
  function updateAvail(patch: Partial<Availability>) {
    setAvail(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(AVAIL_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }
  function saveProofs(next: SkillProof[]) {
    setProofs(next);
    try { localStorage.setItem(PROOFS_KEY, JSON.stringify(next)); } catch { /* */ }
  }
  function addProof() {
    if (!newSkill.trim() || !newUrl.trim()) return;
    saveProofs([{ id: crypto.randomUUID(), skill: newSkill.trim(), proofType: newType, url: newUrl.trim(), desc: newDesc.trim(), addedAt: new Date().toISOString() }, ...proofs]);
    setNewSkill(""); setNewUrl(""); setNewDesc(""); setProofForm(false);
  }
  async function toggleDiscoverable() {
    if (!user) return;
    const next = !discoverable;
    setDiscoverableSaving(true);
    try {
      const sb = await getSupabaseAsync();
      await sb.from("resume_saves").update({ discoverable: next, discoverable_updated: new Date().toISOString() }).eq("user_id", user.id);
      setDiscoverable(next);
    } catch { /* */ }
    setDiscoverableSaving(false);
  }
  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try { await fetch("/api/gdpr/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }) }); signOut(); }
    catch { signOut(); }
  }
  async function handleBillingPortal() {
    setBillingLoading(true);
    try { const r = await fetch("/api/payment/billing-portal", { method: "POST" }); const j = await r.json(); if (j.url) window.location.href = j.url; else alert(j.error ?? "Could not open billing portal"); }
    catch { alert("Could not open billing portal"); }
    setBillingLoading(false);
  }
  async function handleExportData() {
    setExportLoading(true);
    try {
      const r = await fetch("/api/gdpr/export"); const blob = await r.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `jobsayer-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
    } catch { alert("Export failed — please try again"); }
    setExportLoading(false);
  }

  if (authLoading || !user) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Loading…</div>
    </div>
  );

  const otw = OTW_CONFIG[avail.openToWork];
  const tierColor  = plan.tier === "pro" ? "var(--accent)" : plan.tier === "starter" ? "var(--warn)" : "var(--text3)";
  const tierLabel  = plan.tier === "pro" ? "Career Pro" : plan.tier === "starter" ? "Starter" : "Free";

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
  const avatar = user.user_metadata?.avatar_url;

  /* ── Shared styles ── */
  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 };
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--text1)", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 };
  const pill = (active: boolean, color = "var(--accent)", bg = "var(--accdim)"): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${active ? color + "50" : "var(--border)"}`,
    background: active ? bg : "var(--surface2)",
    color: active ? color : "var(--text2)", fontFamily: "inherit",
  });
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 80px" }}>

        {/* ── Profile header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
            background: "var(--accdim)", border: "2px solid var(--accborder)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: "var(--accent)", overflow: "hidden",
          }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : displayName[0].toUpperCase()
            }
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text1)", marginBottom: 2 }}>{displayName}</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>{user.email}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {/* Status badge */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: otw.bg, color: otw.color, border: `1px solid ${otw.color}40` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: otw.dot, display: "inline-block" }} />
                {otw.label}
              </span>
              {/* Plan badge */}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "var(--accdim)", color: tierColor, border: `1px solid ${tierColor}40` }}>
                <i className="ti ti-sparkles" style={{ marginRight: 3 }}/>{tierLabel}
              </span>
              {/* BGV badge */}
              {bgv?.status === "verified" && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(34,197,94,.08)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)" }}>
                  <i className="ti ti-shield-check" style={{ marginRight: 3 }}/>BGV Verified
                </span>
              )}
            </div>
          </div>
          {/* Sign out */}
          <button onClick={signOut} style={{ padding: "8px 18px", border: "1px solid var(--border)", borderRadius: 9, background: "none", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            Sign out
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: "flex", gap: 2, background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 4, marginBottom: 24, overflowX: "auto",
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, minWidth: "fit-content", padding: "9px 14px", borderRadius: 9, border: "none",
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--text3)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all .15s", whiteSpace: "nowrap",
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════
            TAB: OVERVIEW
        ════════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div>
            {/* Quick stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
              <StatCard icon="ti-file-text" label="Saved Resumes" value={savesLoading ? "…" : String(saves.length)} sub={`of ${plan.maxSaves} max`} />
              <StatCard icon="ti-sparkles" label="AI Features"   value={plan.hasAiFeatures ? "Active" : "Upgrade"}  accent={plan.hasAiFeatures} />
              <StatCard icon="ti-shield-check" label="BGV Status" value={bgv?.status === "verified" ? "Verified" : bgv ? "In Progress" : "Not started"} accent={bgv?.status === "verified"} />
            </div>

            {/* Quick links */}
            <div style={card}>
              <div style={sectionTitle}><i className="ti ti-grid-dots" />Quick access</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {[
                  { href: "/builder",    icon: "ti-pencil",        label: "Resume Builder"  },
                  { href: "/editor",     icon: "ti-edit",          label: "My Resume"       },
                  { href: "/score",      icon: "ti-chart-bar",     label: "ATS Score"       },
                  { href: "/jobs",       icon: "ti-briefcase",     label: "Matched Jobs"    },
                  { href: "/interview",  icon: "ti-message-dots",  label: "Interview Prep"  },
                  { href: "/career-gps", icon: "ti-map-pin",       label: "Career GPS"      },
                  { href: "/learn",      icon: "ti-school",        label: "Learn"           },
                  { href: "/bgv",        icon: "ti-shield-check",  label: "BGV"             },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", background: "var(--surface2)", borderRadius: 10,
                    border: "1px solid var(--border)", color: "var(--text2)",
                    fontSize: 12, fontWeight: 600, textDecoration: "none",
                    transition: "border-color .15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <i className={`ti ${l.icon}`} style={{ fontSize: 15, color: "var(--accent)", flexShrink: 0 }} />
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Refer & Earn */}
            <div style={card}>
              <div style={sectionTitle}><i className="ti ti-gift" />Refer & Earn</div>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>
                Share your link — when someone signs up you both get <strong>1 month of Career Pro free</strong>.
              </p>
              {referralCode ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input readOnly value={`${typeof window !== "undefined" ? window.location.origin : "https://jobsayer.com"}/?ref=${referralCode}`}
                      style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} />
                    <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?ref=${referralCode}`)}
                      style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--accdim)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      Copy
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>Referred: <strong style={{ color: "var(--text1)" }}>{referralStats.total}</strong></span>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>Rewards: <strong style={{ color: "var(--success)" }}>{referralStats.rewarded}</strong></span>
                  </div>
                </div>
              ) : <div style={{ fontSize: 13, color: "var(--text3)" }}>Loading…</div>}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: CAREER
        ════════════════════════════════════════════════════════ */}
        {tab === "career" && (
          <div>
            {/* Availability */}
            <div style={card}>
              <div style={sectionTitle}><i className="ti ti-circle-dot" />Availability & Status</div>

              <div style={{ marginBottom: 18 }}>
                <Label>Job search status</Label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(Object.entries(OTW_CONFIG) as [OpenToWork, typeof OTW_CONFIG[OpenToWork]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => updateAvail({ openToWork: key })}
                      style={{ ...pill(avail.openToWork === key, cfg.color, cfg.bg), display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: avail.openToWork === key ? cfg.dot : "var(--border)", display: "inline-block" }} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <Label>Notice period</Label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {NOTICE_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => updateAvail({ noticePeriod: o.value })} style={pill(avail.noticePeriod === o.value)}>{o.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <Label>Work type preference</Label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {WORK_PREF_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => updateAvail({ workPref: o.value })} style={pill(avail.workPref === o.value)}>{o.label}</button>
                  ))}
                </div>
              </div>

              {avail.openToWork !== "not_looking" && (
                <div style={{ padding: "10px 14px", borderRadius: 9, background: otw.bg, border: `1px solid ${otw.color}30`, fontSize: 12, color: otw.color, fontWeight: 600 }}>
                  {otw.label} · {avail.noticePeriod === "immediate" ? "Can join immediately" : `${avail.noticePeriod}-day notice`} · {WORK_PREF_OPTIONS.find(o => o.value === avail.workPref)?.label}
                </div>
              )}
            </div>

            {/* Job Preferences */}
            <div style={card}>
              <JobPreferences />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: RESUMES
        ════════════════════════════════════════════════════════ */}
        {tab === "resumes" && (
          <div>
            {/* Saved resumes */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={sectionTitle} ><i className="ti ti-files" />Saved Resumes ({savesLoading ? "…" : saves.length})</div>
                <Link href="/builder" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none", padding: "6px 14px", borderRadius: 8, background: "var(--accdim)", border: "1px solid var(--accborder)" }}>
                  + New resume
                </Link>
              </div>
              {savesLoading ? (
                <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div>
              ) : saves.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text3)", padding: "20px 0", textAlign: "center" }}>
                  No saved resumes yet.{" "}
                  <Link href="/builder" style={{ color: "var(--accent)" }}>Open the builder →</Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {saves.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                          Updated {new Date(s.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href="/editor" style={{ padding: "5px 12px", background: "var(--accdim)", borderRadius: 7, color: "var(--accent)", fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid var(--accborder)" }}>Edit</Link>
                        <Link href="/builder" style={{ padding: "5px 12px", background: "var(--surface)", borderRadius: 7, color: "var(--text2)", fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid var(--border)" }}>Open</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employer Discoverability */}
            <div style={{ ...card, borderColor: discoverable ? "rgba(34,197,94,.3)" : "var(--border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={sectionTitle}><i className="ti ti-eye" />Employer Discoverability</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: discoverable ? "rgba(34,197,94,.1)" : "var(--surface2)", color: discoverable ? "var(--success)" : "var(--text3)", border: `1px solid ${discoverable ? "rgba(34,197,94,.25)" : "var(--border)"}` }}>
                      {discoverable ? "Visible" : "Private"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, maxWidth: 480 }}>
                    Verified employers can discover your profile (skills, title, experience, location). Your <strong style={{ color: "var(--text2)" }}>email and phone are never shared</strong> without explicit approval.
                  </p>
                </div>
                <button onClick={toggleDiscoverable} disabled={discoverableSaving}
                  style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 9, background: discoverable ? "rgba(34,197,94,.1)" : "var(--accdim)", border: `1px solid ${discoverable ? "rgba(34,197,94,.3)" : "var(--accborder)"}`, color: discoverable ? "var(--success)" : "var(--accent)", fontSize: 13, fontWeight: 700, cursor: discoverableSaving ? "not-allowed" : "pointer", opacity: discoverableSaving ? 0.6 : 1, fontFamily: "inherit" }}>
                  {discoverableSaving ? "Saving…" : discoverable ? "✓ On — Turn off" : "Enable"}
                </button>
              </div>
            </div>

            {/* Proof of Skills */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={sectionTitle}><i className="ti ti-bolt" />Proof of Skills</div>
                <button onClick={() => setProofForm(f => !f)} style={{ padding: "6px 14px", borderRadius: 8, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {proofForm ? "Cancel" : "+ Add"}
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: -8, marginBottom: 14 }}>Attach verifiable proof to each skill — GitHub repos, live demos, articles, certs.</p>

              {proofForm && (
                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 16, border: "1px solid var(--border)", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <Label>Skill name</Label>
                      <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="e.g. React, System Design" style={inputStyle} />
                    </div>
                    <div>
                      <Label>Proof type</Label>
                      <select value={newType} onChange={e => setNewType(e.target.value as SkillProof["proofType"])} style={inputStyle}>
                        {(Object.entries(PROOF_TYPE_CONFIG) as [SkillProof["proofType"], typeof PROOF_TYPE_CONFIG[SkillProof["proofType"]]][]).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>URL</Label>
                    <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder={PROOF_TYPE_CONFIG[newType].placeholder} style={inputStyle} />
                  </div>
                  <div>
                    <Label>What does this prove? (optional)</Label>
                    <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Built a production app with 10K users using React + TypeScript" style={inputStyle} />
                  </div>
                  <button onClick={addProof} disabled={!newSkill.trim() || !newUrl.trim()} style={{ padding: "9px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}>
                    Save proof
                  </button>
                </div>
              )}

              {proofs.length === 0 && !proofForm ? (
                <div style={{ fontSize: 13, color: "var(--text3)", padding: "16px 0", textAlign: "center" }}>
                  No skill proofs yet. Adding proofs makes your profile 3× more credible to recruiters.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {proofs.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <i className={`ti ${PROOF_TYPE_CONFIG[p.proofType].icon}`} style={{ fontSize: 18, color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{p.skill}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "var(--accdim)", color: "var(--accent)", border: "1px solid var(--accborder)" }}>{PROOF_TYPE_CONFIG[p.proofType].label}</span>
                        </div>
                        {p.desc && <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, lineHeight: 1.5 }}>{p.desc}</div>}
                        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}>{p.url}</a>
                      </div>
                      <button onClick={() => saveProofs(proofs.filter(x => x.id !== p.id))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 15, padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: PLAN
        ════════════════════════════════════════════════════════ */}
        {tab === "plan" && (
          <div>
            {/* Current plan */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Current Plan</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: tierColor }}>{tierLabel}</div>
                </div>
                {plan.tier !== "pro" && (
                  <button onClick={() => setTab("plan")} style={{ padding: "10px 22px", background: "var(--accent)", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Upgrade <i className="ti ti-arrow-right"/>
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <PlanStat label="Resume Saves"  value={`${saves.length} / ${plan.maxSaves}`} />
                <PlanStat label="AI Features"   value={plan.hasAiFeatures ? "✓ Enabled" : "✗ Upgrade needed"} />
                <PlanStat label="DOCX Export"   value={plan.hasDocxExport ? "✓ Enabled" : "✗ Starter+"} />
                <PlanStat label="All Templates" value={plan.allTemplates  ? "✓ Enabled" : "✗ Starter+"} />
              </div>
            </div>

            {/* Upgrade plans */}
            {plan.tier !== "pro" && (
              <div style={card}>
                <div style={sectionTitle}><i className="ti ti-rocket" />Upgrade your plan</div>
                <UpgradePlans />
              </div>
            )}

            {/* BGV */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: bgv ? 14 : 0 }}>
                <div style={sectionTitle}><i className="ti ti-shield-check" />Background Verification</div>
                <Link href="/bgv" style={{ padding: "7px 16px", background: bgv?.status === "verified" ? "rgba(34,197,94,.1)" : "var(--accdim)", border: `1px solid ${bgv?.status === "verified" ? "rgba(34,197,94,.3)" : "var(--accborder)"}`, borderRadius: 8, color: bgv?.status === "verified" ? "var(--success)" : "var(--accent)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  {bgv ? "View / Update →" : "Start BGV →"}
                </Link>
              </div>
              {bgv ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 8, textTransform: "capitalize", color: bgv.status === "verified" ? "var(--success)" : bgv.status === "failed" ? "var(--danger)" : "var(--warn)", background: bgv.status === "verified" ? "rgba(34,197,94,.1)" : bgv.status === "failed" ? "rgba(239,68,68,.1)" : "rgba(234,179,8,.1)" }}>
                      {bgv.status === "in_progress" ? "In Progress" : bgv.status === "verified" ? "Verified" : bgv.status === "failed" ? "✗ Failed" : "Pending"}
                    </span>
                    {bgv.verification_score != null && <span style={{ fontSize: 12, color: "var(--text3)" }}>Score: <strong style={{ color: "var(--text1)" }}>{bgv.verification_score}/100</strong></span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["ID", bgv.id_verified], ["Education", bgv.edu_verified], ["Employment", bgv.emp_verified]] as [string, boolean][]).map(([l, v]) => (
                      <span key={l} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 600, background: v ? "rgba(34,197,94,.08)" : "var(--surface2)", color: v ? "var(--success)" : "var(--text3)", border: `1px solid ${v ? "rgba(34,197,94,.2)" : "var(--border)"}` }}>
                        {l} {v ? "✓" : "○"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 10, lineHeight: 1.6 }}>
                  Get your identity, education, and employment verified. A BGV badge boosts your profile trust with employers.
                </p>
              )}
            </div>

            {/* Billing */}
            {plan.tier !== "free" && (
              <div style={card}>
                <div style={sectionTitle}><i className="ti ti-credit-card" />Billing</div>
                <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>
                  Manage your subscription, view invoices, and update your payment method via the Stripe billing portal.
                </p>
                <button onClick={handleBillingPortal} disabled={billingLoading} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {billingLoading ? "Opening…" : "Manage Billing →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB: SETTINGS
        ════════════════════════════════════════════════════════ */}
        {tab === "settings" && (
          <div>
            {/* Data & Privacy */}
            <div style={card}>
              <div style={sectionTitle}><i className="ti ti-lock" />Your Data (GDPR)</div>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>
                Download all data we hold about you, or permanently delete your account under GDPR Art. 17 &amp; 20.
              </p>
              <button onClick={handleExportData} disabled={exportLoading} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {exportLoading ? "Preparing…" : "Download my data"}
              </button>
            </div>

            {/* Account info */}
            <div style={card}>
              <div style={sectionTitle}><i className="ti ti-user" />Account</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Row label="Email"     value={user.email ?? "—"} />
                <Row label="User ID"   value={user.id.slice(0, 16) + "…"} mono />
                <Row label="Plan"      value={tierLabel} />
                <Row label="Member since" value={new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
              </div>
            </div>

            {/* Danger zone */}
            <div style={{ ...card, borderColor: "rgba(239,68,68,.25)", marginBottom: 0 }}>
              <div style={{ ...sectionTitle, color: "var(--danger)" }}><i className="ti ti-alert-triangle" />Danger Zone</div>
              {!deleteConfirm ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 600 }}>Delete Account</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Permanently deletes your account and all resume data. Cannot be undone.</div>
                  </div>
                  <button onClick={() => setDeleteConfirm(true)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.06)", color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Delete Account
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>
                    Are you sure? This will permanently delete your account, all saved resumes, and shared links.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleDeleteAccount} disabled={deleting} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {deleting ? "Deleting…" : "Yes, delete everything"}
                    </button>
                    <button onClick={() => setDeleteConfirm(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${accent ? "var(--accborder)" : "var(--border)"}`, borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
      <i className={`ti ${icon}`} style={{ fontSize: 20, color: accent ? "var(--accent)" : "var(--text3)", display: "block", marginBottom: 6 }} />
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text1)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>{sub}</div>}
      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 14px", background: "var(--surface2)", borderRadius: 9, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{value}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text1)", fontWeight: 600, fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}
