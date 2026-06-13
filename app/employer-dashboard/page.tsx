"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSupabaseAsync } from "@/lib/supabase";

/* ── Types ─────────────────────────────────────────────────── */
type Tab = "overview" | "pipeline" | "candidates" | "bgv" | "team-tools" | "billing" | "team";

interface Role {
  id: string; title: string; city: string; type: string;
  applicants: number; bgvCleared: number; interviews: number;
  offers: number; daysOpen: number;
}

interface Candidate {
  id: string; name: string; initials: string; role: string;
  match: number; notice: number; bgv: "cleared" | "pending" | "failed";
  salary: string; stage: "new" | "shortlisted" | "interview" | "offer";
}

/* ── Mock Data ───────────────────────────────────────────────── */
const ROLES: Role[] = [
  { id: "r1", title: "Senior Backend Engineer", city: "Bangalore", type: "Hybrid",  applicants: 47, bgvCleared: 12, interviews: 3, offers: 1, daysOpen: 8  },
  { id: "r2", title: "Product Manager",         city: "Mumbai",    type: "Remote",  applicants: 23, bgvCleared: 8,  interviews: 5, offers: 2, daysOpen: 14 },
  { id: "r3", title: "Frontend Engineer",       city: "Hyderabad", type: "Onsite",  applicants: 61, bgvCleared: 19, interviews: 7, offers: 0, daysOpen: 21 },
  { id: "r4", title: "Data Scientist",          city: "Bangalore", type: "Hybrid",  applicants: 18, bgvCleared: 5,  interviews: 2, offers: 0, daysOpen: 6  },
];

const CANDIDATES: Candidate[] = [
  { id: "c1", name: "Asha Patel",    initials: "AP", role: "Senior Backend Engineer", match: 94, notice: 7,  bgv: "cleared", salary: "₹28–42L", stage: "interview" },
  { id: "c2", name: "Vikram Suri",   initials: "VS", role: "Product Manager",         match: 91, notice: 15, bgv: "cleared", salary: "₹22–30L", stage: "offer"     },
  { id: "c3", name: "Maya Krishnan", initials: "MK", role: "Frontend Engineer",       match: 88, notice: 7,  bgv: "cleared", salary: "₹18–26L", stage: "shortlisted"},
  { id: "c4", name: "Rohit Das",     initials: "RD", role: "Senior Backend Engineer", match: 84, notice: 30, bgv: "pending", salary: "₹25–38L", stage: "new"       },
  { id: "c5", name: "Priya Mehta",   initials: "PM", role: "Data Scientist",          match: 80, notice: 15, bgv: "cleared", salary: "₹20–32L", stage: "shortlisted"},
];

const PLAN_FEATURES = {
  free:       { name: "Free",       price: "₹0",        color: "#94a3b8", roles: 1,   seats: 1,   bgv: false, bots: false, whitelabel: false },
  starter:    { name: "Starter",    price: "₹4,999/mo", color: "#6366f1", roles: 5,   seats: 3,   bgv: true,  bots: true,  whitelabel: false },
  growth:     { name: "Growth",     price: "₹14,999/mo",color: "var(--warn)", roles: 20,  seats: 10,  bgv: true,  bots: true,  whitelabel: false },
  enterprise: { name: "Enterprise", price: "Custom",    color: "var(--success)", roles: 999, seats: 999, bgv: true,  bots: true,  whitelabel: true  },
};

/* ── Sub-components ──────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text1)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StageBadge({ stage }: { stage: Candidate["stage"] }) {
  const cfg = {
    new:         { label: "New",         bg: "rgba(148,163,184,.1)", color: "#94a3b8"       },
    shortlisted: { label: "Shortlisted", bg: "rgba(99,102,241,.1)",  color: "var(--accent)" },
    interview:   { label: "Interview",   bg: "rgba(251,191,36,.1)",  color: "var(--warn)"       },
    offer:       { label: "Offer Sent",  bg: "rgba(34,197,94,.1)",   color: "var(--success)"       },
  }[stage];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

/* ── Candidate list with skill-match + AI summary ───────────── */
function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--accent)" : "var(--warn)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 48, height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color }}>{pct}%</span>
    </div>
  );
}

function CandidateCard({ c, stages, advanceStage }: { c: Candidate; stages: Record<string, Candidate["stage"]>; advanceStage: (id: string) => void }) {
  const [showSummary, setShowSummary] = useState(false);
  const [summary,     setSummary]     = useState("");
  const [aiLoading,   setAiLoading]   = useState(false);

  async function generateSummary() {
    if (summary) { setShowSummary(s => !s); return; }
    setAiLoading(true); setShowSummary(true);
    try {
      const res = await fetch("/api/employer/candidates/ai-summary-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: c.name, role: c.role, match: c.match }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json() as { summary: string };
      setSummary(d.summary ?? "");
    } catch {
      setSummary("Could not generate summary. Please try again.");
    } finally { setAiLoading(false); }
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {c.initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.role} · {c.notice}d notice · {c.salary}</div>
          <div style={{ marginTop: 4 }}>
            <MatchBar pct={c.match} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: c.bgv === "cleared" ? "rgba(34,197,94,.1)" : "rgba(251,191,36,.1)", color: c.bgv === "cleared" ? "var(--success)" : "var(--warn)" }}>
              {c.bgv === "cleared" ? "✓ BGV" : "⟳ BGV"}
            </div>
            <StageBadge stage={stages[c.id] ?? c.stage} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => void generateSummary()} style={{
              padding: "5px 10px", borderRadius: 7, border: "1px solid var(--accborder)",
              background: "var(--accdim)", color: "var(--accent)", fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <i className="ti ti-robot"/> AI fit
            </button>
            <button onClick={() => advanceStage(c.id)} style={{
              padding: "5px 10px", borderRadius: 7, background: "var(--accent)", border: "none",
              color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              Advance <i className="ti ti-arrow-right"/>
            </button>
          </div>
        </div>
      </div>
      {showSummary && (
        <div style={{
          marginTop: 10, padding: "10px 12px", background: "var(--accdim)",
          border: "1px solid var(--accborder)", borderRadius: 8, fontSize: 12, color: "var(--text2)", lineHeight: 1.6,
        }}>
          {aiLoading
            ? <span style={{ color: "var(--text3)" }}><i className="ti ti-loader-2"/> Generating AI fit summary…</span>
            : <><i className="ti ti-sparkles" style={{ color: "var(--accent)", marginRight: 4 }}/>{summary}</>
          }
        </div>
      )}
    </div>
  );
}

function CandidateList({ candidates, stages, advanceStage }: {
  candidates: Candidate[];
  stages: Record<string, Candidate["stage"]>;
  advanceStage: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {candidates.map(c => (
        <CandidateCard key={c.id} c={c} stages={stages} advanceStage={advanceStage} />
      ))}
    </div>
  );
}

/* ── Team Tab ────────────────────────────────────────────────── */
interface TeamMember {
  id: string; email: string; name: string | null;
  role: "admin" | "hr_manager" | "recruiter" | "viewer";
  status: "invited" | "active" | "suspended";
  invited_at: string; joined_at: string | null; last_active: string | null;
}
interface ActivityRow {
  id: string; member_email: string | null; member_name: string | null;
  action: string; entity_type: string | null; entity_label: string | null;
  created_at: string; metadata: Record<string, unknown>;
}
interface MemberStat {
  id: string; email: string; name: string;
  total: number; jobs: number; bgvs: number; candidates: number; lastActive: string;
}

function TeamTab() {
  const [members, setMembers]       = useState<TeamMember[]>([]);
  const [activity, setActivity]     = useState<ActivityRow[]>([]);
  const [stats, setStats]           = useState<MemberStat[]>([]);
  const [loading, setLoading]       = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState<TeamMember["role"]>("recruiter");
  const [inviteName, setInviteName]   = useState("");
  const [inviting, setInviting]       = useState(false);
  const [filterUser, setFilterUser]   = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom]   = useState("");
  const [filterTo, setFilterTo]       = useState("");
  const [actPage, setActPage]         = useState(0);
  const [err, setErr]               = useState("");
  const ACT_LIMIT = 20;

  const getToken = useCallback(async () => {
    const sb = await getSupabaseAsync();
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const authHeader = useCallback(async () => {
    const tok = await getToken();
    return { Authorization: `Bearer ${tok}` };
  }, [getToken]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const h = await authHeader();
      const [mRes, aRes, sRes] = await Promise.all([
        fetch("/api/employer/team", { headers: h }),
        fetch(`/api/employer/activity?limit=${ACT_LIMIT}&offset=${actPage * ACT_LIMIT}${filterUser ? `&userId=${filterUser}` : ""}${filterAction ? `&action=${filterAction}` : ""}${filterFrom ? `&from=${filterFrom}T00:00:00Z` : ""}${filterTo ? `&to=${filterTo}T23:59:59Z` : ""}`, { headers: h }),
        fetch("/api/employer/activity?stats=true", { headers: h }),
      ]);
      const [md, ad, sd] = await Promise.all([mRes.json(), aRes.json(), sRes.json()]);
      if (md.members) setMembers(md.members);
      if (ad.activity) setActivity(ad.activity);
      if (sd.stats)    setStats(sd.stats);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [authHeader, actPage, filterUser, filterAction, filterFrom, filterTo]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setErr("");
    try {
      const h = await authHeader();
      const res = await fetch("/api/employer/team", {
        method: "POST", headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() || null, role: inviteRole }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInviteEmail(""); setInviteName(""); setInviteRole("recruiter");
      await loadAll();
    } catch (e) { setErr(String(e)); }
    finally { setInviting(false); }
  }

  async function removeMember(id: string) {
    if (!confirm("Remove this team member?")) return;
    const h = await authHeader();
    await fetch(`/api/employer/team?memberId=${id}`, { method: "DELETE", headers: h });
    await loadAll();
  }

  async function changeRole(id: string, role: TeamMember["role"]) {
    const h = await authHeader();
    await fetch(`/api/employer/team?memberId=${id}`, {
      method: "PATCH", headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await loadAll();
  }

  function exportCsv() {
    const rows = [
      ["Time", "Member", "Action", "Entity Type", "Entity", "Details"],
      ...activity.map(a => [
        new Date(a.created_at).toLocaleString(),
        a.member_name ?? a.member_email ?? "—",
        a.action,
        a.entity_type ?? "—",
        a.entity_label ?? "—",
        JSON.stringify(a.metadata ?? {}),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "hr-activity.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const roleCfg: Record<TeamMember["role"], { label: string; color: string }> = {
    admin:      { label: "Admin",       color: "#ef4444" },
    hr_manager: { label: "HR Manager",  color: "var(--accent)" },
    recruiter:  { label: "Recruiter",   color: "var(--warn)" },
    viewer:     { label: "Viewer",      color: "var(--text3)" },
  };
  const statusCfg: Record<TeamMember["status"], { label: string; color: string; bg: string }> = {
    active:    { label: "Active",    color: "var(--success)", bg: "rgba(34,197,94,.1)" },
    invited:   { label: "Invited",   color: "var(--warn)",    bg: "rgba(251,191,36,.1)" },
    suspended: { label: "Suspended", color: "var(--danger,#ef4444)", bg: "rgba(239,68,68,.08)" },
  };

  const actionColor = (action: string) => {
    if (action.startsWith("job."))       return "var(--accent)";
    if (action.startsWith("bgv."))       return "#8b5cf6";
    if (action.startsWith("candidate.")) return "var(--warn)";
    if (action.startsWith("member."))    return "var(--success)";
    return "var(--text3)";
  };

  const actionIcon = (action: string) => {
    if (action.includes("post") || action.includes("job"))   return "ti-briefcase";
    if (action.includes("bgv"))                              return "ti-shield-check";
    if (action.includes("candidate"))                        return "ti-users";
    if (action.includes("member"))                           return "ti-user-plus";
    if (action.includes("export") || action.includes("report")) return "ti-download";
    return "ti-activity";
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 22, display: "block", marginBottom: 8 }} />
      Loading team data...
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {err && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "var(--danger,#ef4444)", fontSize: 12 }}>
          {err}
        </div>
      )}

      {/* Member Stats Cards */}
      {stats.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
            30-Day Activity Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {stats.map(s => (
              <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {(s.name || s.email).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name || s.email.split("@")[0]}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>{s.total} actions</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: "var(--text3)" }}>
                  <span><strong style={{ color: "var(--accent)" }}>{s.jobs}</strong> jobs</span>
                  <span><strong style={{ color: "#8b5cf6" }}>{s.bgvs}</strong> BGVs</span>
                  <span><strong style={{ color: "var(--warn)" }}>{s.candidates}</strong> cands</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.lastActive ? new Date(s.lastActive).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Roster */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            Team Members ({members.length})
          </div>
        </div>

        {/* Invite form */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input
            value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="member@company.com"
            style={{ flex: "2 1 160px", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit" }}
          />
          <input
            value={inviteName} onChange={e => setInviteName(e.target.value)}
            placeholder="Name (optional)"
            style={{ flex: "1 1 120px", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit" }}
          />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value as TeamMember["role"])}
            style={{ flex: "0 0 130px", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit" }}>
            <option value="recruiter">Recruiter</option>
            <option value="hr_manager">HR Manager</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button onClick={inviteMember} disabled={inviting || !inviteEmail.trim()}
            style={{ flex: "0 0 auto", padding: "8px 16px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (inviting || !inviteEmail.trim()) ? .5 : 1 }}>
            {inviting ? "Inviting…" : <><i className="ti ti-user-plus" /> Invite</>}
          </button>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: 12, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
            No team members yet — invite someone above.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  {["Member", "Role", "Status", "Joined", "Last Active", ""].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text3)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text1)" }}>{m.name || m.email.split("@")[0]}</div>
                      <div style={{ color: "var(--text3)", fontSize: 10 }}>{m.email}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <select value={m.role} onChange={e => changeRole(m.id, e.target.value as TeamMember["role"])}
                        style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${roleCfg[m.role].color}40`, background: `${roleCfg[m.role].color}15`, color: roleCfg[m.role].color, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        <option value="admin">Admin</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: statusCfg[m.status].bg, color: statusCfg[m.status].color }}>
                        {statusCfg[m.status].label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text3)", whiteSpace: "nowrap" }}>
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : (m.invited_at ? new Date(m.invited_at).toLocaleDateString() : "—")}
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text3)", whiteSpace: "nowrap" }}>
                      {m.last_active ? new Date(m.last_active).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <button onClick={() => removeMember(m.id)}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginRight: "auto" }}>
            Activity Log
          </div>
          <button onClick={exportCsv} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-download" /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setActPage(0); }}
            style={{ flex: "1 1 130px", padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 11, fontFamily: "inherit" }}>
            <option value="">All members</option>
            {stats.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
          </select>
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setActPage(0); }}
            style={{ flex: "1 1 130px", padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 11, fontFamily: "inherit" }}>
            <option value="">All actions</option>
            <option value="job.posted">Job Posted</option>
            <option value="job.updated">Job Updated</option>
            <option value="job.deleted">Job Deleted</option>
            <option value="candidate.shortlisted">Candidate Shortlisted</option>
            <option value="candidate.rejected">Candidate Rejected</option>
            <option value="candidate.viewed">Candidate Viewed</option>
            <option value="bgv.initiated">BGV Initiated</option>
            <option value="bgv.updated">BGV Updated</option>
            <option value="member.invited">Member Invited</option>
            <option value="member.removed">Member Removed</option>
            <option value="member.role_changed">Role Changed</option>
            <option value="report.exported">Report Exported</option>
          </select>
          <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setActPage(0); }}
            style={{ flex: "0 1 130px", padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 11, fontFamily: "inherit" }} />
          <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setActPage(0); }}
            style={{ flex: "0 1 130px", padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 11, fontFamily: "inherit" }} />
          {(filterUser || filterAction || filterFrom || filterTo) && (
            <button onClick={() => { setFilterUser(""); setFilterAction(""); setFilterFrom(""); setFilterTo(""); setActPage(0); }}
              style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              Clear
            </button>
          )}
        </div>

        {activity.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: 12, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
            No activity logged yet. Actions taken by your team will appear here.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  {["Time", "Member", "Action", "Entity", "Details"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text3)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map((a, i) => (
                  <tr key={a.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)" }}>
                    <td style={{ padding: "9px 12px", color: "var(--text3)", whiteSpace: "nowrap", fontSize: 11 }}>
                      {new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text1)" }}>{a.member_name || (a.member_email ? a.member_email.split("@")[0] : "—")}</div>
                      {a.member_email && <div style={{ fontSize: 10, color: "var(--text3)" }}>{a.member_email}</div>}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: actionColor(a.action) }}>
                        <i className={`ti ${actionIcon(a.action)}`} style={{ fontSize: 12 }} />
                        {a.action.replace(".", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      {a.entity_label ? (
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text2)" }}>{a.entity_label}</div>
                          {a.entity_type && <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "capitalize" }}>{a.entity_type}</div>}
                        </div>
                      ) : <span style={{ color: "var(--text3)" }}>—</span>}
                    </td>
                    <td style={{ padding: "9px 12px", color: "var(--text3)", fontSize: 11 }}>
                      {Object.keys(a.metadata ?? {}).length > 0
                        ? Object.entries(a.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {activity.length === ACT_LIMIT && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
            <button disabled={actPage === 0} onClick={() => setActPage(p => p - 1)}
              style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 11, cursor: actPage === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: actPage === 0 ? .4 : 1 }}>
              ← Prev
            </button>
            <span style={{ padding: "6px 12px", fontSize: 11, color: "var(--text3)" }}>Page {actPage + 1}</span>
            <button onClick={() => setActPage(p => p + 1)}
              style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main content ────────────────────────────────────────────── */
function EmployerDashboardContent() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";

  const [currentPlan] = useState<keyof typeof PLAN_FEATURES>("starter");
  const [stages, setStages] = useState<Record<string, Candidate["stage"]>>(
    Object.fromEntries(CANDIDATES.map(c => [c.id, c.stage]))
  );

  function advanceStage(id: string) {
    const order: Candidate["stage"][] = ["new", "shortlisted", "interview", "offer"];
    setStages(prev => {
      const cur = prev[id];
      const idx = order.indexOf(cur);
      return { ...prev, [id]: order[Math.min(idx + 1, order.length - 1)] };
    });
  }

  const plan = PLAN_FEATURES[currentPlan];

  return (
    <AppShell aiPanel={false}>
      <div style={{ padding: "24px 28px", maxWidth: 1000 }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "var(--text1)", margin: 0 }}>
              {tab === "overview"    ? "Hiring Overview"
               : tab === "pipeline"  ? "Hiring Pipeline"
               : tab === "candidates"? "Verified Candidates"
               : tab === "bgv"       ? "BGV Management"
               : tab === "team-tools"? "Team Career Tools"
               : tab === "team"      ? "HR Team Activity"
               : "Plans & Billing"}
            </h1>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "2px 0 0" }}>
              {tab === "overview" ? "Your hiring at a glance — last 30 days"
               : tab === "pipeline" ? "Drag candidates through hiring stages"
               : tab === "candidates" ? "All BGV-verified candidates in your pool"
               : tab === "bgv" ? "All verifications run at platform layer — no separate vendor contract needed"
               : tab === "team-tools" ? "Give your employees career growth tools as a company benefit"
               : tab === "team" ? "Manage team members and track every HR action across your organisation"
               : "Manage your employer subscription"}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 20, background: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}30` }}>
              {plan.name} Plan
            </span>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 28 }}>
              <StatCard icon="ti-briefcase"    label="Open Roles"       value={ROLES.length} sub="All fresh (<30d)"    color="var(--accent)" />
              <StatCard icon="ti-users"        label="Total Applicants" value={149}          sub="+23 this week"      color="var(--success)"       />
              <StatCard icon="ti-shield-check" label="BGV Cleared"      value={44}           sub="29% of pool"        color="var(--warn)"       />
              <StatCard icon="ti-clock"        label="Avg Hire Time"    value="11d"          sub="vs 28d industry"    color="#8b5cf6"       />
              <StatCard icon="ti-send"         label="Offers Sent"      value={3}            sub="2 accepted"         color="#ec4899"       />
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
              Active Roles
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ROLES.map(r => (
                <div key={r.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.city} · {r.type} · Day {r.daysOpen}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text3)" }}>
                    <span><strong style={{ color: "var(--text1)" }}>{r.applicants}</strong> applied</span>
                    <span><strong style={{ color: "var(--success)" }}>{r.bgvCleared}</strong> BGV ✓</span>
                    <span><strong style={{ color: "var(--warn)" }}>{r.interviews}</strong> interviews</span>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 10, background: "rgba(34,197,94,.1)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)" }}>
                    FRESH
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PIPELINE ── */}
        {tab === "pipeline" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {(["new", "shortlisted", "interview", "offer"] as Candidate["stage"][]).map(stage => (
              <div key={stage} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 12 }}>
                  {stage === "new" ? "New" : stage === "shortlisted" ? "Shortlisted" : stage === "interview" ? "Interview" : "Offer"}{" "}
                  ({CANDIDATES.filter(c => (stages[c.id] ?? c.stage) === stage).length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {CANDIDATES.filter(c => (stages[c.id] ?? c.stage) === stage).map(c => (
                    <div key={c.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                          {c.initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)" }}>{c.notice}d notice · {c.bgv === "cleared" ? "BGV" : "BGV"}</div>
                        </div>
                      </div>
                      {stage !== "offer" && (
                        <button onClick={() => advanceStage(c.id)}
                          style={{ width: "100%", padding: "5px 0", borderRadius: 6, background: "var(--accent)", border: "none", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          <i className="ti ti-arrow-right"/> {stage === "new" ? "Shortlist" : stage === "shortlisted" ? "Schedule" : "Send Offer"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CANDIDATES ── */}
        {tab === "candidates" && (
          <CandidateList candidates={CANDIDATES} stages={stages} advanceStage={advanceStage} />
        )}

        {/* ── BGV ── */}
        {tab === "bgv" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
              <StatCard icon="ti-check"    label="Cleared"         value={44}    color="var(--success)"       />
              <StatCard icon="ti-clock"    label="In Progress"     value={12}    sub="Avg 4.2 days"    color="var(--warn)"       />
              <StatCard icon="ti-x"        label="Failed"          value={3}     color="var(--danger)"       />
              <StatCard icon="ti-calendar" label="Avg Turnaround"  value="4.2d"  sub="vs 14d industry" color="var(--accent)" />
            </div>
            {CANDIDATES.map(c => (
              <div key={c.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
                    {c.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.role}</div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 10,
                    background: c.bgv === "cleared" ? "rgba(34,197,94,.1)" : "rgba(251,191,36,.1)",
                    color: c.bgv === "cleared" ? "var(--success)" : "var(--warn)",
                    border: "1px solid " + (c.bgv === "cleared" ? "rgba(34,197,94,.25)" : "rgba(251,191,36,.25)"),
                  }}>
                    {c.bgv === "cleared" ? "All Cleared" : "In Progress"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["PAN / Aadhaar", "Education", "Employment"].map((check) => (
                    <span key={check} style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 6,
                      background: c.bgv === "cleared" ? "rgba(34,197,94,.1)" : "rgba(251,191,36,.1)",
                      color: c.bgv === "cleared" ? "var(--success)" : "var(--warn)",
                      border: "1px solid " + (c.bgv === "cleared" ? "rgba(34,197,94,.2)" : "rgba(251,191,36,.2)"),
                    }}>
                      {c.bgv === "cleared" ? "✓" : "⟳"} {check}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TEAM TOOLS ── */}
        {tab === "team-tools" && (
          <div>
            <div style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)", marginBottom: 6 }}><i className="ti ti-building"/> White-Label Career Portal</div>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.65, margin: 0 }}>
                Your employees get a branded portal at <strong style={{ color: "var(--accent)" }}>careers.yourcompany.com</strong> — resume builder, interview prep, career GPS, salary insights. Powered by jobSayer, branded as your company. Available on Enterprise plan.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { icon: "ti-file-text",          title: "Resume Builder",  desc: "Employees build ATS-ready resumes for internal mobility or future job searches", available: true  },
                { icon: "ti-microphone",          title: "Interview Coach", desc: "Prep for internal promotions and panel interviews", available: true  },
                { icon: "ti-compass",             title: "Career GPS",      desc: "Skill gap analysis aligned to your internal role ladder", available: true  },
                { icon: "ti-coin",                title: "Salary Insights", desc: "Market compensation data to reduce attrition from salary dissatisfaction", available: true  },
                { icon: "ti-heart-rate-monitor",  title: "Career Health",   desc: "Track employee career growth velocity — an engagement signal", available: false },
                { icon: "ti-certificate",         title: "Proof of Skills", desc: "Employees earn verified skills badges on your company portal", available: false },
              ].map(tool => (
                <div key={tool.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px" }}>
                  <i className={`ti ${tool.icon}`} style={{ fontSize: 20, color: tool.available ? "var(--accent)" : "var(--text3)", display: "block", marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: tool.available ? "var(--text1)" : "var(--text3)", marginBottom: 4 }}>{tool.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.55 }}>{tool.desc}</div>
                  {!tool.available && <div style={{ fontSize: 10, fontWeight: 700, color: "var(--warn)", marginTop: 8 }}>Enterprise only</div>}
                </div>
              ))}
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text1)", marginBottom: 10 }}>Why offer this to employees?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "Reduces attrition: employees who grow inside the company don't need to leave for growth",
                  "Internal mobility: Career GPS surfaces internal role matches before employees look externally",
                  "Employer brand: A career growth benefit signals you invest in people, not just productivity",
                  "Pre-BGV-ready workforce: Employees already have verified profiles when you need to hire internally",
                ].map(p => (
                  <div key={p} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--success)", flexShrink: 0 }}>✓</span> {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TEAM ── */}
        {tab === "team" && <TeamTab />}

        {/* ── BILLING ── */}
        {tab === "billing" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
              {Object.entries(PLAN_FEATURES).map(([key, p]) => (
                <div key={key} style={{
                  background: key === currentPlan ? `${p.color}10` : "var(--surface)",
                  border: `1px solid ${key === currentPlan ? p.color + "40" : "var(--border)"}`,
                  borderRadius: 12, padding: "18px 16px",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text1)", marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: p.color, marginBottom: 12 }}>{p.price}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "var(--text3)" }}>
                    <span>{p.roles === 999 ? "Unlimited" : p.roles} active roles</span>
                    <span>{p.seats === 999 ? "Unlimited" : p.seats} team seats</span>
                    <span style={{ color: p.bgv ? "var(--success)" : "var(--text3)" }}>{p.bgv ? "✓" : "✗"} Integrated BGV</span>
                    <span style={{ color: p.bots ? "var(--success)" : "var(--text3)" }}>{p.bots ? "✓" : "✗"} Bot integrations</span>
                    <span style={{ color: p.whitelabel ? "var(--success)" : "var(--text3)" }}>{p.whitelabel ? "✓" : "✗"} White-label portal</span>
                  </div>
                  {key === currentPlan ? (
                    <div style={{ marginTop: 12, fontSize: 10, fontWeight: 800, color: p.color, textAlign: "center" }}>CURRENT PLAN</div>
                  ) : (
                    <button style={{ marginTop: 12, width: "100%", padding: "8px 0", borderRadius: 7, background: p.color, border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {key === "enterprise" ? "Contact Sales" : "Upgrade"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

/* ── Page export with Suspense ───────────────────────────────── */
export default function EmployerDashboard() {
  return (
    <Suspense fallback={
      <AppShell aiPanel={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "var(--text3)", fontSize: 13 }}>
          Loading portal...
        </div>
      </AppShell>
    }>
      <EmployerDashboardContent />
    </Suspense>
  );
}
