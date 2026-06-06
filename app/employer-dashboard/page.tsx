"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";

/* ── Types ─────────────────────────────────────────────────── */
type Tab = "overview" | "pipeline" | "candidates" | "bgv" | "team-tools" | "billing";

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
  growth:     { name: "Growth",     price: "₹14,999/mo",color: "#f59e0b", roles: 20,  seats: 10,  bgv: true,  bots: true,  whitelabel: false },
  enterprise: { name: "Enterprise", price: "Custom",    color: "#22c55e", roles: 999, seats: 999, bgv: true,  bots: true,  whitelabel: true  },
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
    interview:   { label: "Interview",   bg: "rgba(251,191,36,.1)",  color: "#f59e0b"       },
    offer:       { label: "Offer Sent",  bg: "rgba(34,197,94,.1)",   color: "#22c55e"       },
  }[stage];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
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
               : "Plans & Billing"}
            </h1>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "2px 0 0" }}>
              {tab === "overview" ? "Your hiring at a glance — last 30 days"
               : tab === "pipeline" ? "Drag candidates through hiring stages"
               : tab === "candidates" ? "All BGV-verified candidates in your pool"
               : tab === "bgv" ? "All verifications run at platform layer — no separate vendor contract needed"
               : tab === "team-tools" ? "Give your employees career growth tools as a company benefit"
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
              <StatCard icon="ti-users"        label="Total Applicants" value={149}          sub="+23 this week"      color="#22c55e"       />
              <StatCard icon="ti-shield-check" label="BGV Cleared"      value={44}           sub="29% of pool"        color="#f59e0b"       />
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
                    <span><strong style={{ color: "#22c55e" }}>{r.bgvCleared}</strong> BGV ✓</span>
                    <span><strong style={{ color: "#f59e0b" }}>{r.interviews}</strong> interviews</span>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 10, background: "rgba(34,197,94,.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,.2)" }}>
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
                    <div key={c.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                          {c.initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)" }}>{c.notice}d notice · {c.bgv === "cleared" ? "✅ BGV" : "⏳ BGV"}</div>
                        </div>
                      </div>
                      {stage !== "offer" && (
                        <button onClick={() => advanceStage(c.id)}
                          style={{ width: "100%", padding: "5px 0", borderRadius: 6, background: "var(--accent)", border: "none", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          → {stage === "new" ? "Shortlist" : stage === "shortlisted" ? "Schedule" : "Send Offer"}
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CANDIDATES.map(c => (
              <div key={c.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {c.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.role} · {c.notice}d notice · {c.salary}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>{c.match}%</div>
                <div style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: c.bgv === "cleared" ? "rgba(34,197,94,.1)" : "rgba(251,191,36,.1)", color: c.bgv === "cleared" ? "#22c55e" : "#f59e0b" }}>
                  {c.bgv === "cleared" ? "✓ BGV" : "⟳ BGV"}
                </div>
                <StageBadge stage={stages[c.id] ?? c.stage} />
                <button onClick={() => advanceStage(c.id)}
                  style={{ padding: "7px 12px", borderRadius: 7, background: "var(--accent)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Advance →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── BGV ── */}
        {tab === "bgv" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
              <StatCard icon="ti-check"    label="Cleared"         value={44}    color="#22c55e"       />
              <StatCard icon="ti-clock"    label="In Progress"     value={12}    sub="Avg 4.2 days"    color="#f59e0b"       />
              <StatCard icon="ti-x"        label="Failed"          value={3}     color="#ef4444"       />
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
                    color: c.bgv === "cleared" ? "#22c55e" : "#f59e0b",
                    border: "1px solid " + (c.bgv === "cleared" ? "rgba(34,197,94,.25)" : "rgba(251,191,36,.25)"),
                  }}>
                    {c.bgv === "cleared" ? "All Cleared" : "In Progress"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Aadhaar", "PAN", "Address", "Education", "Employment", "Criminal"].map((check, i) => (
                    <span key={check} style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 6,
                      background: (c.bgv === "cleared" || i < 4) ? "rgba(34,197,94,.1)" : "rgba(251,191,36,.1)",
                      color: (c.bgv === "cleared" || i < 4) ? "#22c55e" : "#f59e0b",
                      border: "1px solid " + ((c.bgv === "cleared" || i < 4) ? "rgba(34,197,94,.2)" : "rgba(251,191,36,.2)"),
                    }}>
                      {c.bgv === "cleared" || i < 4 ? "✓" : "⟳"} {check}
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
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)", marginBottom: 6 }}>🏢 White-Label Career Portal</div>
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
                  {!tool.available && <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", marginTop: 8 }}>Enterprise only</div>}
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
                    <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                    <span style={{ color: p.bgv ? "#22c55e" : "var(--text3)" }}>{p.bgv ? "✓" : "✗"} Integrated BGV</span>
                    <span style={{ color: p.bots ? "#22c55e" : "var(--text3)" }}>{p.bots ? "✓" : "✗"} Bot integrations</span>
                    <span style={{ color: p.whitelabel ? "#22c55e" : "var(--text3)" }}>{p.whitelabel ? "✓" : "✗"} White-label portal</span>
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
