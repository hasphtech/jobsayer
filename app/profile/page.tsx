"use client";
/**
 * /profile — Account & subscription management
 * Shows current user info, plan, resume save count, and account actions.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResumePlan } from "@/lib/resumePlan";
import { getSupabaseAsync } from "@/lib/auth";
import AppNav from "@/components/AppNav";
import type { SkillProof } from "@/lib/types";

/* ── Availability types ─────────────────────────────────────── */
type OpenToWork   = "active" | "passive" | "not_looking";
type NoticePeriod = "immediate" | "15" | "30" | "45" | "60" | "90" | "90+";
type WorkPref     = "full_time" | "part_time" | "contract" | "any";

interface Availability {
  openToWork:   OpenToWork;
  noticePeriod: NoticePeriod;
  workPref:     WorkPref;
}

const AVAIL_KEY  = "jobsayer-availability";
const PROOFS_KEY = "jobsayer-skill-proofs";

const PROOF_TYPE_CONFIG: Record<SkillProof["proofType"], { label: string; icon: string; placeholder: string }> = {
  github:  { label: "GitHub",    icon: "🐙", placeholder: "https://github.com/you/project" },
  demo:    { label: "Live Demo", icon: "🌐", placeholder: "https://your-project.vercel.app" },
  article: { label: "Article",   icon: "✍️", placeholder: "https://medium.com/your-article" },
  project: { label: "Project",   icon: "🚀", placeholder: "https://your-portfolio.com/project" },
  cert:    { label: "Cert",      icon: "🎓", placeholder: "https://credly.com/badges/..." },
  other:   { label: "Other",     icon: "🔗", placeholder: "https://..." },
};

const OTW_CONFIG: Record<OpenToWork, { label: string; color: string; bg: string; dot: string }> = {
  active:      { label: "Actively looking",  color: "var(--success)", bg: "rgba(34,197,94,.1)",  dot: "#22c55e" },
  passive:     { label: "Open to offers",    color: "var(--warn)",    bg: "rgba(234,179,8,.1)",  dot: "#eab308" },
  not_looking: { label: "Not looking",       color: "var(--text3)",   bg: "var(--surface2)",     dot: "#71717a" },
};
const NOTICE_OPTIONS: { value: NoticePeriod; label: string }[] = [
  { value: "immediate", label: "Immediate" },
  { value: "15",        label: "15 days"   },
  { value: "30",        label: "30 days"   },
  { value: "45",        label: "45 days"   },
  { value: "60",        label: "60 days"   },
  { value: "90",        label: "90 days"   },
  { value: "90+",       label: "3 months+" },
];
const WORK_PREF_OPTIONS: { value: WorkPref; label: string }[] = [
  { value: "full_time", label: "Full-time"       },
  { value: "part_time", label: "Part-time"       },
  { value: "contract",  label: "Contract / Gig"  },
  { value: "any",       label: "Any / Open"      },
];

interface SaveMeta {
  id: string;
  name: string;
  updated_at: string;
}
interface BgvStatus {
  status: string;
  verification_score: number | null;
  id_verified: boolean;
  edu_verified: boolean;
  emp_verified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const plan = useResumePlan();
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [savesLoading, setSavesLoading] = useState(true);
  const [bgv, setBgv] = useState<BgvStatus | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avail, setAvail] = useState<Availability>({ openToWork: "active", noticePeriod: "30", workPref: "full_time" });

  // Proof of Skills state
  const [proofs, setProofs]           = useState<SkillProof[]>([]);
  const [proofForm, setProofForm]     = useState(false);
  const [newSkill, setNewSkill]       = useState("");
  const [newType, setNewType]         = useState<SkillProof["proofType"]>("github");
  const [newUrl, setNewUrl]           = useState("");
  const [newDesc, setNewDesc]         = useState("");

  // Load availability + proofs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AVAIL_KEY);
      if (raw) setAvail(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(PROOFS_KEY);
      if (raw) setProofs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function saveProofs(next: SkillProof[]) {
    setProofs(next);
    try { localStorage.setItem(PROOFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function addProof() {
    if (!newSkill.trim() || !newUrl.trim()) return;
    const entry: SkillProof = { id: crypto.randomUUID(), skill: newSkill.trim(), proofType: newType, url: newUrl.trim(), desc: newDesc.trim(), addedAt: new Date().toISOString() };
    saveProofs([entry, ...proofs]);
    setNewSkill(""); setNewUrl(""); setNewDesc(""); setProofForm(false);
  }
  function removeProof(id: string) {
    saveProofs(proofs.filter(p => p.id !== id));
  }

  function updateAvail(patch: Partial<Availability>) {
    setAvail(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(AVAIL_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  // Redirect guests to home
  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [user, authLoading, router]);

  // Load save list
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const sb = await getSupabaseAsync();
        const { data } = await sb
          .from("resume_saves")
          .select("id, name, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });
        setSaves(data ?? []);
      } catch { /* ignore */ }
      finally { setSavesLoading(false); }
    })();
    // Load BGV status
    fetch("/api/bgv/status").then(r => r.json()).then(d => { if (d.bgv) setBgv(d.bgv); }).catch(() => {});
  }, [user]);

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      const sb = await getSupabaseAsync();
      // Delete all user data — RLS cascade handles the rest
      await sb.from("resume_saves").delete().eq("user_id", user.id);
      await sb.from("resume_shares").delete().eq("user_id", user.id);
      await sb.auth.admin?.deleteUser(user.id); // only works server-side, will silently fail client-side
      signOut();
    } catch {
      // sign out anyway — user can contact support for full deletion
      signOut();
    }
  }

  if (authLoading || !user) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Loading…</div>
    </div>
  );

  const tierColors: Record<string, string> = {
    free: "var(--text3)",
    starter: "var(--warn)",
    pro: "var(--accent)",
  };
  const tierLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
  };

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 14, padding: "24px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 28 }}>My Account</h1>

        {/* Profile card */}
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: "var(--accdim)", border: "2px solid var(--accborder)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "var(--accent)",
          }}>
            {user.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              : (user.email?.[0] ?? "?").toUpperCase()
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)" }}>
              {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{user.email}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {/* Open to Work badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                background: OTW_CONFIG[avail.openToWork].bg,
                color: OTW_CONFIG[avail.openToWork].color,
                border: `1px solid ${OTW_CONFIG[avail.openToWork].color}40`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: OTW_CONFIG[avail.openToWork].dot, display: "inline-block" }} />
                {OTW_CONFIG[avail.openToWork].label}
              </span>
              {avail.openToWork !== "not_looking" && (
                <span style={{ fontSize: 11, color: "var(--text3)", padding: "3px 10px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  🕐 {avail.noticePeriod === "immediate" ? "Immediate joiner" : `${avail.noticePeriod}-day notice`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8,
              background: "none", color: "var(--text2)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            }}
          >
            Sign out
          </button>
        </div>

        {/* ── Availability & Notice Period ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 18 }}>
            🟢 Availability & Notice Period
          </div>

          {/* Open to Work */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              Job search status
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.entries(OTW_CONFIG) as [OpenToWork, typeof OTW_CONFIG[OpenToWork]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => updateAvail({ openToWork: key })} style={{
                  padding: "8px 16px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${avail.openToWork === key ? cfg.color + "60" : "var(--border)"}`,
                  background: avail.openToWork === key ? cfg.bg : "var(--surface2)",
                  color: avail.openToWork === key ? cfg.color : "var(--text2)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: avail.openToWork === key ? cfg.dot : "var(--border)", display: "inline-block" }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notice Period */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              Current notice period
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {NOTICE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => updateAvail({ noticePeriod: opt.value })} style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${avail.noticePeriod === opt.value ? "var(--accent)" : "var(--border)"}`,
                  background: avail.noticePeriod === opt.value ? "var(--accdim)" : "var(--surface2)",
                  color: avail.noticePeriod === opt.value ? "var(--accent)" : "var(--text2)",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Work type preference */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              Work type preference
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {WORK_PREF_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => updateAvail({ workPref: opt.value })} style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${avail.workPref === opt.value ? "var(--accent)" : "var(--border)"}`,
                  background: avail.workPref === opt.value ? "var(--accdim)" : "var(--surface2)",
                  color: avail.workPref === opt.value ? "var(--accent)" : "var(--text2)",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary line */}
          {avail.openToWork !== "not_looking" && (
            <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 9, background: OTW_CONFIG[avail.openToWork].bg, border: `1px solid ${OTW_CONFIG[avail.openToWork].color}30`, fontSize: 12, color: OTW_CONFIG[avail.openToWork].color, fontWeight: 600 }}>
              {OTW_CONFIG[avail.openToWork].label} ·{" "}
              {avail.noticePeriod === "immediate" ? "Can join immediately" : `Can join in ${avail.noticePeriod} days`} ·{" "}
              {WORK_PREF_OPTIONS.find(o => o.value === avail.workPref)?.label}
            </div>
          )}
        </div>

        {/* Plan card */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>Current Plan</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: tierColors[plan.tier] ?? "var(--accent)", marginTop: 4 }}>
                {tierLabels[plan.tier] ?? plan.tier}
              </div>
            </div>
            {plan.tier !== "pro" && (
              <Link href="/upgrade" style={{
                padding: "10px 20px", background: "var(--accent)", borderRadius: 9,
                color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Upgrade →
              </Link>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <PlanStat label="Resume Saves" value={`${saves.length} / ${plan.maxSaves}`} />
            <PlanStat label="AI Features" value={plan.hasAiFeatures ? "✓ Enabled" : "✗ Upgrade needed"} />
            <PlanStat label="DOCX Export" value={plan.hasDocxExport ? "✓ Enabled" : "✗ Starter+"} />
            <PlanStat label="All Templates" value={plan.allTemplates ? "✓ Enabled" : "✗ Starter+"} />
          </div>
        </div>

        {/* BGV status */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: bgv ? 14 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>🛡 Background Verification</div>
            <Link href="/bgv" style={{ padding: "7px 16px", background: bgv?.status === "verified" ? "rgba(34,197,94,.1)" : "var(--accdim)", border: `1px solid ${bgv?.status === "verified" ? "rgba(34,197,94,.3)" : "var(--accborder)"}`, borderRadius: 8, color: bgv?.status === "verified" ? "var(--success)" : "var(--accent)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              {bgv ? "View / Update →" : "Start BGV →"}
            </Link>
          </div>
          {bgv ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: bgv.status === "verified" ? "var(--success)" : bgv.status === "failed" ? "var(--danger)" : "var(--warn)", padding: "3px 10px", borderRadius: 8, background: bgv.status === "verified" ? "rgba(34,197,94,.1)" : bgv.status === "failed" ? "rgba(239,68,68,.1)" : "rgba(234,179,8,.1)", textTransform: "capitalize" }}>
                  {bgv.status === "in_progress" ? "🔍 In Progress" : bgv.status === "verified" ? "🛡 Verified" : bgv.status === "failed" ? "✗ Failed" : "⏳ Pending Review"}
                </span>
                {bgv.verification_score != null && <span style={{ fontSize: 12, color: "var(--text3)" }}>Score: <strong style={{ color: "var(--text1)" }}>{bgv.verification_score}/100</strong></span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["🪪 ID", bgv.id_verified], ["🎓 Education", bgv.edu_verified], ["💼 Employment", bgv.emp_verified]].map(([l, v]) => (
                  <span key={l as string} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 600, background: v ? "rgba(34,197,94,.08)" : "var(--surface2)", color: v ? "var(--success)" : "var(--text3)", border: `1px solid ${v ? "rgba(34,197,94,.2)" : "var(--border)"}` }}>
                    {l as string} {v ? "✓" : "○"}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 10 }}>
              Get your identity, education, and employment verified. A BGV badge boosts your profile trust with employers.
            </p>
          )}
        </div>

        {/* Saved resumes */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 14 }}>
            Saved Resumes ({savesLoading ? "…" : saves.length})
          </div>
          {savesLoading ? (
            <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div>
          ) : saves.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text3)" }}>
              No saved resumes yet.{" "}
              <Link href="/builder" style={{ color: "var(--accent)" }}>Open the builder →</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {saves.map(s => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "var(--surface2)", borderRadius: 9,
                  border: "1px solid var(--border)",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                      Updated {new Date(s.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <Link href="/builder" style={{
                    padding: "5px 14px", background: "var(--accdim)", borderRadius: 7,
                    color: "var(--accent)", fontSize: 12, fontWeight: 600, textDecoration: "none",
                    border: "1px solid var(--accborder)",
                  }}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Proof of Skills ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>⚡ Proof of Skills</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>Attach verifiable proof to each skill — GitHub repos, live demos, articles, certs.</div>
            </div>
            <button onClick={() => setProofForm(f => !f)} style={{ padding: "7px 16px", borderRadius: 8, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {proofForm ? "Cancel" : "+ Add proof"}
            </button>
          </div>

          {/* Add form */}
          {proofForm && (
            <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 18, border: "1px solid var(--border)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Skill name</label>
                  <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="e.g. React, System Design"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Proof type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value as SkillProof["proofType"])}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    {(Object.entries(PROOF_TYPE_CONFIG) as [SkillProof["proofType"], typeof PROOF_TYPE_CONFIG[SkillProof["proofType"]]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>URL</label>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder={PROOF_TYPE_CONFIG[newType].placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>What does this prove? (optional)</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Built a production app with 10K users using React + TypeScript"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              </div>
              <button onClick={addProof} disabled={!newSkill.trim() || !newUrl.trim()} style={{ padding: "9px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}>
                Save proof
              </button>
            </div>
          )}

          {proofs.length === 0 && !proofForm ? (
            <div style={{ fontSize: 13, color: "var(--text3)", padding: "14px 0" }}>
              No skill proofs yet. Add your first proof — it makes your profile 3× more credible to recruiters.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {proofs.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{PROOF_TYPE_CONFIG[p.proofType].icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>{p.skill}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "var(--accdim)", color: "var(--accent)", border: "1px solid var(--accborder)" }}>{PROOF_TYPE_CONFIG[p.proofType].label}</span>
                    </div>
                    {p.desc && <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, lineHeight: 1.5 }}>{p.desc}</div>}
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}>{p.url}</a>
                  </div>
                  <button onClick={() => removeProof(p.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: "2px 4px", lineHeight: 1, flexShrink: 0 }} title="Remove">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 14 }}>Quick Links</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { href: "/builder",    label: "✏️ Resume Builder" },
              { href: "/score",      label: "🎯 My Score" },
              { href: "/jobs",       label: "💼 Matched Jobs" },
              { href: "/interview",  label: "🎤 Interview Prep" },
              { href: "/career-gps", label: "🧭 Career GPS" },
              { href: "/bgv",        label: "🛡 Background Verify" },
              { href: "/upgrade",    label: "⚡ Upgrade Plan" },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                padding: "8px 16px", background: "var(--surface2)", borderRadius: 9,
                border: "1px solid var(--border)", color: "var(--text2)",
                fontSize: 13, fontWeight: 500, textDecoration: "none",
              }}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...card, borderColor: "rgba(239,68,68,.2)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)", marginBottom: 10 }}>Danger Zone</div>
          {!deleteConfirm ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Delete Account</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                  Permanently deletes your account and all resume data. This cannot be undone.
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(true)}
                style={{
                  padding: "8px 18px", borderRadius: 8,
                  border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.06)",
                  color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Delete Account
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
                Are you sure? This will permanently delete your account, all saved resumes, and shared links.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    padding: "9px 20px", borderRadius: 8, border: "none",
                    background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  style={{
                    padding: "9px 18px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "none",
                    color: "var(--text2)", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 14px", background: "var(--surface2)",
      borderRadius: 9, border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{value}</div>
    </div>
  );
}
