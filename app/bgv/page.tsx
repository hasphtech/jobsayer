"use client";
/**
 * /bgv — Candidate Background Verification
 * Multi-step form: Identity → Education → Employment → Review & Submit
 */
import React, { useState, useEffect } from "react";
import { useWindowWidth } from "@/lib/useWindowWidth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { validatePAN } from "@/lib/bgvUtils";
import AppShell from "@/components/AppShell";

/* ── Types ─────────────────────────────────────────────────── */
interface EduEntry  { degree: string; institution: string; year: string; result: string }
interface EmpEntry  { company: string; role: string; from_date: string; to_date: string; manager_name: string; manager_email: string }
interface BgvRecord { status: string; verification_score: number | null; id_verified: boolean; edu_verified: boolean; emp_verified: boolean; address_verified: boolean; submitted_at: string; admin_notes: string | null; rejection_reason: string | null; auto_check_results?: { autoScore: number } | null }

type Step = "identity" | "education" | "employment" | "review" | "submitted";

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "identity",   label: "Identity",   icon: "🪪" },
  { key: "education",  label: "Education",  icon: "🎓" },
  { key: "employment", label: "Employment", icon: "💼" },
  { key: "review",     label: "Review",     icon: "✅" },
];

const emptyEdu  = (): EduEntry => ({ degree: "", institution: "", year: "", result: "" });
const emptyEmp  = (): EmpEntry => ({ company: "", role: "", from_date: "", to_date: "", manager_name: "", manager_email: "" });

/* ── Shared styles ──────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 9,
  background: "var(--surface2)", border: "1px solid var(--border)",
  color: "var(--text1)", fontSize: 14, fontFamily: "inherit",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--text3)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em",
};
const cardStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 14, padding: "24px",
};

/* ── Status badge ───────────────────────────────────────────── */
function StatusBadge({ bgv }: { bgv: BgvRecord }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const cfg: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    pending:     { color: "var(--warn)", bg: "rgba(234,179,8,.1)",  label: "Pending Review",    icon: "⏳" },
    in_progress: { color: "var(--accent)", bg: "var(--accdim)", label: "In Progress",        icon: "🔍" },
    verified:    { color: "var(--success)", bg: "rgba(34,197,94,.1)",  label: "Verified ✓",         icon: "🛡" },
    partial:     { color: "var(--warn)", bg: "rgba(234,179,8,.1)",  label: "Partially Verified", icon: "⚠" },
    failed:      { color: "var(--danger)", bg: "rgba(239,68,68,.1)", label: "Verification Failed","icon": "✗" },
  };
  const s = cfg[bgv.status] ?? cfg.pending;
  const checks = [
    { label: "Identity",   done: bgv.id_verified   },
    { label: "Education",  done: bgv.edu_verified  },
    { label: "Employment", done: bgv.emp_verified  },
    { label: "Address",    done: bgv.address_verified },
  ];
  return (
    <div style={{ ...cardStyle, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{s.icon}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.label}</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
            Submitted {new Date(bgv.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {bgv.verification_score != null && <> · Score: <strong style={{ color: s.color }}>{bgv.verification_score}/100</strong></>}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        {checks.map(c => (
          <div key={c.label} style={{
            padding: "10px 12px", borderRadius: 9, textAlign: "center",
            background: c.done ? "rgba(34,197,94,.08)" : "var(--surface2)",
            border: `1px solid ${c.done ? "rgba(34,197,94,.2)" : "var(--border)"}`,
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{c.done ? "✅" : "⭕"}</div>
            <div style={{ fontSize: 11, color: c.done ? "var(--success)" : "var(--text3)", fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>
      {bgv.admin_notes && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--accdim)", borderRadius: 9, fontSize: 13, color: "var(--text2)", border: "1px solid var(--accborder)" }}>
          📝 Admin note: {bgv.admin_notes}
        </div>
      )}
      {bgv.rejection_reason && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(239,68,68,.08)", borderRadius: 9, fontSize: 13, color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)" }}>
          ✗ {bgv.rejection_reason}
        </div>
      )}
    </div>
  );
}

/* ── Step indicator ─────────────────────────────────────────── */
function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 72 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: i < idx ? "var(--success)" : i === idx ? "var(--accent)" : "var(--surface2)",
              border: `2px solid ${i < idx ? "var(--success)" : i === idx ? "var(--accent)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: i < idx ? 14 : 16, color: i <= idx ? "#fff" : "var(--text3)",
              fontWeight: 700,
            }}>
              {i < idx ? "✓" : s.icon}
            </div>
            <div style={{ fontSize: 11, color: i === idx ? "var(--accent)" : "var(--text3)", marginTop: 5, fontWeight: i === idx ? 700 : 400 }}>{s.label}</div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? "var(--success)" : "var(--border)", margin: "0 4px 20px" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function BgvPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Existing BGV record
  const [existing, setExisting] = useState<BgvRecord | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Form state
  const [step, setStep]           = useState<Step>("identity");
  const [submitMsg, setSubmitMsg] = useState<string>("");
  const [identity, setIdentity]   = useState({ full_name: "", dob: "", pan_number: "", aadhaar_last4: "" });
  const [education, setEducation] = useState<EduEntry[]>([emptyEdu()]);
  const [employment, setEmployment] = useState<EmpEntry[]>([emptyEmp()]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  useEffect(() => { if (!authLoading && !user) router.replace("/"); }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingExisting(true);
    fetch("/api/bgv/status").then(r => r.json()).then(d => {
      if (d.bgv) {
        setExisting(d.bgv);
        // Pre-fill form with existing data
        if (d.bgv.full_name) {
          setIdentity({ full_name: d.bgv.full_name, dob: d.bgv.dob ?? "", pan_number: d.bgv.pan_number ?? "", aadhaar_last4: d.bgv.aadhaar_last4 ?? "" });
          if (d.bgv.education?.length)  setEducation(d.bgv.education);
          if (d.bgv.employment?.length) setEmployment(d.bgv.employment);
        }
      }
    }).catch(() => {}).finally(() => setLoadingExisting(false));
  }, [user]);

  /* ── Validation ── */
  function validateIdentity() {
    const e: Record<string, string> = {};
    if (!identity.full_name.trim()) e.full_name = "Required";
    if (identity.pan_number && !validatePAN(identity.pan_number).valid) e.pan_number = "Invalid PAN format (e.g. ABCDE1234F)";
    if (identity.aadhaar_last4 && !/^\d{4}$/.test(identity.aadhaar_last4)) e.aadhaar_last4 = "Must be exactly 4 digits";
    setErrors(e); return Object.keys(e).length === 0;
  }
  function validateEducation() {
    const e: Record<string, string> = {};
    education.forEach((ed, i) => {
      if (!ed.degree.trim())      e[`edu_${i}_degree`]      = "Required";
      if (!ed.institution.trim()) e[`edu_${i}_institution`] = "Required";
    });
    setErrors(e); return Object.keys(e).length === 0;
  }
  function validateEmployment() {
    const e: Record<string, string> = {};
    employment.forEach((em, i) => {
      if (!em.company.trim()) e[`emp_${i}_company`] = "Required";
      if (!em.role.trim())    e[`emp_${i}_role`]    = "Required";
    });
    setErrors(e); return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (step === "identity"   && !validateIdentity())   return;
    if (step === "education"  && !validateEducation())   return;
    if (step === "employment" && !validateEmployment())  return;
    const order: Step[] = ["identity", "education", "employment", "review"];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  }
  function prevStep() {
    const order: Step[] = ["identity", "education", "employment", "review"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bgv/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...identity, education, employment }),
      });
      const data = await res.json() as { bgv?: BgvRecord; error?: string; autoScore?: number; message?: string };
      if (data.bgv) {
        setExisting(data.bgv as unknown as BgvRecord);
        setSubmitMsg(data.message ?? "");
        setStep("submitted");
      } else alert(data.error ?? "Submission failed");
    } catch { alert("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  /* ── Helpers ── */
  function setId(k: keyof typeof identity, v: string) { setIdentity(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); }
  function setEdu(i: number, k: keyof EduEntry, v: string) { setEducation(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x)); }
  function setEmp(i: number, k: keyof EmpEntry, v: string) { setEmployment(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x)); }

  // Render shell + nav immediately — skeletons fill while data loads
  const dataLoading = authLoading || loadingExisting;

  return (
    <AppShell>

      <div style={{ padding: "24px 24px 48px" }}>

        {/* Header — always visible */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Background Verification (BGV)</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7 }}>
            A verified BGV badge boosts your profile trust score and gets you prioritised by employers.
            Verification takes <strong style={{ color: "var(--text1)" }}>2–5 business days</strong>.
          </p>
        </div>

        {/* Skeleton while loading */}
        {dataLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            <div className="skeleton" style={{ height: 100, borderRadius: 14 }} />
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
              {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
            </div>
          </div>
        )}

        {/* Existing status card */}
        {!dataLoading && existing && existing.status !== "pending" && step !== "submitted" && (
          <StatusBadge bgv={existing} />
        )}

        {/* Trust info bar */}
        {!dataLoading && !existing && (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { icon: "🪪", title: "Identity Check",   desc: "PAN + Aadhaar last 4 digits" },
              { icon: "🎓", title: "Education Check",  desc: "Degree & institution verification" },
              { icon: "💼", title: "Employment Check", desc: "Previous employer confirmation" },
            ].map(c => (
              <div key={c.title} style={{ ...cardStyle, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Submitted confirmation */}
        {!dataLoading && step === "submitted" && (
          <div style={{ ...cardStyle, textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🛡</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>BGV Submitted Successfully!</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 16, lineHeight: 1.7 }}>
              {submitMsg || "Our verification team will review your details within 2–5 business days. You'll receive an email once your BGV is complete."}
            </p>
            {existing?.auto_check_results?.autoScore != null && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 99, marginBottom: 24,
                background: existing.auto_check_results.autoScore >= 70 ? "rgba(34,197,94,.1)" : "rgba(234,179,8,.1)",
                border: `1px solid ${existing.auto_check_results.autoScore >= 70 ? "rgba(34,197,94,.25)" : "rgba(234,179,8,.25)"}`,
                color: existing.auto_check_results.autoScore >= 70 ? "var(--success)" : "var(--warn)",
                fontSize: 13, fontWeight: 700,
              }}>
                ⚡ Auto-check score: {existing.auto_check_results.autoScore}/100
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link href="/profile" style={{ padding: "11px 24px", background: "var(--accent)", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>View My Profile</Link>
              <Link href="/jobs" style={{ padding: "11px 24px", border: "1px solid var(--border)", borderRadius: 9, color: "var(--text2)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Browse Jobs</Link>
            </div>
          </div>
        )}

        {/* Multi-step form */}
        {!dataLoading && step !== "submitted" && (
          <>
            <StepBar current={step} />

            {/* ── Identity ── */}
            {step === "identity" && (
              <div style={cardStyle}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🪪 Identity Verification</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Full Name (as per ID) *</label>
                    <input style={{ ...inputStyle, borderColor: errors.full_name ? "var(--danger)" : "" }}
                      value={identity.full_name} onChange={e => setId("full_name", e.target.value)}
                      placeholder="Priya Sharma" />
                    {errors.full_name && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{errors.full_name}</div>}
                  </div>
                  <div>
                    <label style={labelStyle}>Date of Birth</label>
                    <input type="date" style={inputStyle} value={identity.dob} onChange={e => setId("dob", e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>PAN Number</label>
                      <input style={{ ...inputStyle, borderColor: errors.pan_number ? "var(--danger)" : "", textTransform: "uppercase" }}
                        value={identity.pan_number} onChange={e => setId("pan_number", e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F" maxLength={10} />
                      {errors.pan_number ? <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{errors.pan_number}</div>
                        : <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>5 letters + 4 digits + 1 letter</div>}
                    </div>
                    <div>
                      <label style={labelStyle}>Aadhaar — Last 4 Digits Only</label>
                      <input style={{ ...inputStyle, borderColor: errors.aadhaar_last4 ? "var(--danger)" : "" }}
                        value={identity.aadhaar_last4} onChange={e => setId("aadhaar_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="XXXX" maxLength={4} inputMode="numeric" />
                      {errors.aadhaar_last4 ? <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{errors.aadhaar_last4}</div>
                        : <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>We never store your full Aadhaar number</div>}
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px", background: "rgba(99,102,241,.06)", border: "1px solid var(--accborder)", borderRadius: 9, fontSize: 12, color: "var(--text2)" }}>
                    🔒 <strong>Privacy:</strong> Only the last 4 digits of Aadhaar are stored. PAN is used for identity matching only and is never shared with third parties.
                  </div>
                </div>
              </div>
            )}

            {/* ── Education ── */}
            {step === "education" && (
              <div>
                {education.map((ed, i) => (
                  <div key={i} style={{ ...cardStyle, marginBottom: 14, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700 }}>🎓 Education {i + 1}</h3>
                      {education.length > 1 && (
                        <button onClick={() => setEducation(p => p.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Degree / Qualification *</label>
                          <input style={{ ...inputStyle, borderColor: errors[`edu_${i}_degree`] ? "var(--danger)" : "" }}
                            value={ed.degree} onChange={e => setEdu(i, "degree", e.target.value)}
                            placeholder="B.Tech Computer Science" />
                          {errors[`edu_${i}_degree`] && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{errors[`edu_${i}_degree`]}</div>}
                        </div>
                        <div>
                          <label style={labelStyle}>Year of Passing</label>
                          <input style={inputStyle} value={ed.year} onChange={e => setEdu(i, "year", e.target.value)} placeholder="2020" maxLength={4} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Institution / University *</label>
                        <input style={{ ...inputStyle, borderColor: errors[`edu_${i}_institution`] ? "var(--danger)" : "" }}
                          value={ed.institution} onChange={e => setEdu(i, "institution", e.target.value)}
                          placeholder="IIT Delhi / Anna University" />
                        {errors[`edu_${i}_institution`] && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{errors[`edu_${i}_institution`]}</div>}
                      </div>
                      <div>
                        <label style={labelStyle}>Result / Grade (optional)</label>
                        <input style={inputStyle} value={ed.result} onChange={e => setEdu(i, "result", e.target.value)} placeholder="8.5 CGPA / 85% / First Class" />
                      </div>
                    </div>
                  </div>
                ))}
                {education.length < 4 && (
                  <button onClick={() => setEducation(p => [...p, emptyEdu()])} style={{
                    width: "100%", padding: "11px", borderRadius: 9,
                    border: "1px dashed var(--border)", background: "none",
                    color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    + Add Another Qualification
                  </button>
                )}
              </div>
            )}

            {/* ── Employment ── */}
            {step === "employment" && (
              <div>
                {employment.map((em, i) => (
                  <div key={i} style={{ ...cardStyle, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700 }}>💼 Employment {i + 1} {i === 0 ? "(Most Recent)" : ""}</h3>
                      {employment.length > 1 && (
                        <button onClick={() => setEmployment(p => p.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Company Name *</label>
                          <input style={{ ...inputStyle, borderColor: errors[`emp_${i}_company`] ? "var(--danger)" : "" }}
                            value={em.company} onChange={e => setEmp(i, "company", e.target.value)} placeholder="Razorpay / Infosys" />
                          {errors[`emp_${i}_company`] && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{errors[`emp_${i}_company`]}</div>}
                        </div>
                        <div>
                          <label style={labelStyle}>Role / Designation *</label>
                          <input style={{ ...inputStyle, borderColor: errors[`emp_${i}_role`] ? "var(--danger)" : "" }}
                            value={em.role} onChange={e => setEmp(i, "role", e.target.value)} placeholder="Senior Engineer" />
                          {errors[`emp_${i}_role`] && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{errors[`emp_${i}_role`]}</div>}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>From</label>
                          <input type="month" style={inputStyle} value={em.from_date} onChange={e => setEmp(i, "from_date", e.target.value)} />
                        </div>
                        <div>
                          <label style={labelStyle}>To (leave blank if current)</label>
                          <input type="month" style={inputStyle} value={em.to_date} onChange={e => setEmp(i, "to_date", e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Manager / HR Name (for reference)</label>
                          <input style={inputStyle} value={em.manager_name} onChange={e => setEmp(i, "manager_name", e.target.value)} placeholder="Amit Kumar" />
                        </div>
                        <div>
                          <label style={labelStyle}>Manager / HR Work Email</label>
                          <input type="email" style={inputStyle} value={em.manager_email} onChange={e => setEmp(i, "manager_email", e.target.value)} placeholder="amit@razorpay.com" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {employment.length < 5 && (
                  <button onClick={() => setEmployment(p => [...p, emptyEmp()])} style={{
                    width: "100%", padding: "11px", borderRadius: 9,
                    border: "1px dashed var(--border)", background: "none",
                    color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    + Add Previous Employer
                  </button>
                )}
              </div>
            )}

            {/* ── Review ── */}
            {step === "review" && (
              <div style={cardStyle}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>✅ Review & Submit</h2>

                <Section title="Identity">
                  <Row label="Full Name"     value={identity.full_name} />
                  <Row label="Date of Birth" value={identity.dob || "—"} />
                  <Row label="PAN"           value={identity.pan_number || "—"} />
                  <Row label="Aadhaar"       value={identity.aadhaar_last4 ? `XXXX XXXX XXXX ${identity.aadhaar_last4}` : "—"} />
                </Section>

                <Section title="Education">
                  {education.map((ed, i) => (
                    <div key={i} style={{ marginBottom: i < education.length - 1 ? 10 : 0, paddingBottom: i < education.length - 1 ? 10 : 0, borderBottom: i < education.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <Row label="Degree"      value={ed.degree || "—"} />
                      <Row label="Institution" value={ed.institution || "—"} />
                      <Row label="Year"        value={ed.year || "—"} />
                    </div>
                  ))}
                </Section>

                <Section title="Employment">
                  {employment.map((em, i) => (
                    <div key={i} style={{ marginBottom: i < employment.length - 1 ? 10 : 0, paddingBottom: i < employment.length - 1 ? 10 : 0, borderBottom: i < employment.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <Row label="Company"  value={em.company || "—"} />
                      <Row label="Role"     value={em.role || "—"} />
                      <Row label="Period"   value={`${em.from_date || "?"} → ${em.to_date || "Present"}`} />
                    </div>
                  ))}
                </Section>

                <div style={{ padding: "12px 14px", background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 9, fontSize: 12, color: "var(--text2)", marginBottom: 20 }}>
                  By submitting, I confirm all information provided is accurate and I consent to jobSayer verifying these details with the respective institutions and employers.
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={prevStep} disabled={step === "identity"} style={{
                padding: "11px 24px", borderRadius: 9, border: "1px solid var(--border)",
                background: "none", color: step === "identity" ? "var(--text3)" : "var(--text2)",
                fontSize: 14, fontWeight: 600, cursor: step === "identity" ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}>
                ← Back
              </button>
              {step === "review" ? (
                <button onClick={handleSubmit} disabled={submitting} style={{
                  padding: "11px 32px", borderRadius: 9, border: "none",
                  background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  {submitting ? "Submitting…" : "Submit BGV →"}
                </button>
              ) : (
                <button onClick={nextStep} style={{
                  padding: "11px 28px", borderRadius: 9, border: "none",
                  background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  Continue →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>{title}</div>
      <div style={{ background: "var(--surface2)", borderRadius: 9, padding: "12px 14px", border: "1px solid var(--border)" }}>{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "var(--text3)", minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text1)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
