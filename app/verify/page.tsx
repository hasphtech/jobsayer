"use client";
/**
 * /verify — Company Verification for Employers
 * GSTIN live check + CIN/MCA format validation + admin approval workflow
 */
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { validateGSTIN, validateCIN, validatePAN, gstinStateLabel } from "@/lib/bgvUtils";

interface VerificationRecord {
  id: string;
  company_name: string;
  cin: string | null;
  gstin: string | null;
  pan: string | null;
  verification_status: string;
  is_mca_verified: boolean;
  is_gst_verified: boolean;
  trust_score: number | null;
  gst_trade_name: string | null;
  gst_legal_name: string | null;
  gst_registration_date: string | null;
  gst_business_type: string | null;
  gst_status: string | null;
  mca_status: string | null;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:            { label: "Pending Review",      color: "#fbbf24", bg: "rgba(251,191,36,.1)",  icon: "⏳" },
  in_progress:        { label: "Verification In Progress", color: "var(--accent)", bg: "var(--accdim)", icon: "🔍" },
  verified:           { label: "Fully Verified ✓",    color: "#4ade80", bg: "rgba(74,222,128,.1)",  icon: "🏅" },
  partially_verified: { label: "Partially Verified",  color: "#fbbf24", bg: "rgba(251,191,36,.1)",  icon: "⚠" },
  failed:             { label: "Verification Failed", color: "#f87171", bg: "rgba(248,113,113,.1)", icon: "✗" },
};

export default function VerifyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [existing, setExisting]     = useState<VerificationRecord | null>(null);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState({ company_name: "", cin: "", gstin: "", pan: "" });
  const [liveCheck, setLiveCheck]   = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<{ message?: string; mcaLink?: string; gstLive?: Record<string, string>; error?: string } | null>(null);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  useEffect(() => { if (!authLoading && !user) router.replace("/recruit"); }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/verify/company").then(r => r.json())
      .then(d => { if (d.verification) setExisting(d.verification); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  /* ── Inline validation as user types ── */
  function setField(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
    const up = v.trim().toUpperCase();
    if (k === "gstin" && up.length === 15) {
      const r = validateGSTIN(up);
      setLiveCheck(p => ({ ...p, gstin: r.valid ? `✓ Valid format · State: ${gstinStateLabel(r.stateCode!)}` : `✗ ${r.error}` }));
    }
    if (k === "cin" && up.length >= 18) {
      const r = validateCIN(up);
      setLiveCheck(p => ({ ...p, cin: r.valid ? `✓ Valid format · ${r.companyType} · ${r.state} · Incorporated ${r.year}` : `✗ ${r.error}` }));
    }
    if (k === "pan" && up.length === 10) {
      const r = validatePAN(up);
      setLiveCheck(p => ({ ...p, pan: r.valid ? `✓ Valid · Entity: ${r.entityType}` : `✗ ${r.error}` }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!form.company_name.trim()) e2.company_name = "Required";
    if (!form.cin.trim() && !form.gstin.trim()) e2.cin = "Provide at least CIN or GSTIN";
    if (form.gstin.trim() && !validateGSTIN(form.gstin.trim().toUpperCase()).valid) e2.gstin = "Invalid GSTIN format";
    if (form.cin.trim()   && !validateCIN(form.cin.trim().toUpperCase()).valid)     e2.cin   = "Invalid CIN format";
    if (form.pan.trim()   && !validatePAN(form.pan.trim().toUpperCase()).valid)     e2.pan   = "Invalid PAN format";
    setErrors(e2); if (Object.keys(e2).length > 0) return;

    setSubmitting(true); setResult(null);
    try {
      const res = await fetch("/api/verify/company", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: form.company_name.trim(),
          cin:   form.cin.trim().toUpperCase() || undefined,
          gstin: form.gstin.trim().toUpperCase() || undefined,
          pan:   form.pan.trim().toUpperCase() || undefined,
        }),
      });
      const data = await res.json() as typeof result & { verification?: VerificationRecord };
      if (data.verification) setExisting(data.verification);
      setResult(data);
    } catch { setResult({ error: "Network error. Please try again." }); }
    finally { setSubmitting(false); }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 13px", borderRadius: 9,
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text1)", fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box", textTransform: "uppercase" as React.CSSProperties["textTransform"],
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" };
  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px" };

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,17,23,.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 14 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>job<span style={{ color: "var(--accent)" }}>Sayer</span></span>
        </Link>
        <span style={{ color: "var(--border)" }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>🏅 Company Verification</span>
        <div style={{ flex: 1 }} />
        <Link href="/recruit" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>← Employer Portal</Link>
      </nav>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Company Verification</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7 }}>
            A <strong style={{ color: "var(--text1)" }}>Verified Employer</strong> badge builds candidate trust, reduces ghost-job perception,
            and gives your listings priority placement on jobSayer.
          </p>
        </div>

        {/* What we verify */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
          {[
            { icon: "🏛", title: "MCA / CIN",  desc: "Ministry of Corporate Affairs — confirms legal registration, directors & status" },
            { icon: "🧾", title: "GSTIN",       desc: "GST portal live lookup — confirms active GST registration & trade name" },
            { icon: "📋", title: "PAN",         desc: "Company PAN verification — matches legal entity name" },
          ].map(c => (
            <div key={c.title} style={{ ...card, padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Existing verification status */}
        {existing && (
          <div style={{ ...card, marginBottom: 28 }}>
            {(() => {
              const s = STATUS_CFG[existing.verification_status] ?? STATUS_CFG.pending;
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
                        {existing.company_name} · Submitted {new Date(existing.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {existing.trust_score != null && <> · Trust Score: <strong style={{ color: s.color }}>{existing.trust_score}/100</strong></>}
                      </div>
                    </div>
                  </div>

                  {/* Check results */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[
                      { label: "MCA / CIN", done: existing.is_mca_verified, detail: existing.mca_status ?? "Pending review" },
                      { label: "GSTIN",     done: existing.is_gst_verified, detail: existing.gst_status === "active" ? `Active · ${existing.gst_trade_name ?? ""}` : (existing.gst_status ?? "Pending") },
                      { label: "PAN",       done: !!existing.pan,           detail: existing.pan ? "Submitted" : "Not provided" },
                    ].map(c => (
                      <div key={c.label} style={{ padding: "10px 12px", borderRadius: 9, background: c.done ? "rgba(74,222,128,.06)" : "var(--surface2)", border: `1px solid ${c.done ? "rgba(74,222,128,.2)" : "var(--border)"}` }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{c.done ? "✅" : "⭕"}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.done ? "#4ade80" : "var(--text2)", marginBottom: 2 }}>{c.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>{c.detail}</div>
                      </div>
                    ))}
                  </div>

                  {/* GST live data */}
                  {existing.gst_trade_name && (
                    <div style={{ padding: "12px 14px", background: "rgba(74,222,128,.06)", border: "1px solid rgba(74,222,128,.15)", borderRadius: 9, fontSize: 13 }}>
                      <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>✓ GST Portal Verified</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          ["Trade Name",   existing.gst_trade_name],
                          ["Legal Name",   existing.gst_legal_name],
                          ["Reg. Date",    existing.gst_registration_date],
                          ["Business Type",existing.gst_business_type],
                        ].filter(([, v]) => v).map(([k, v]) => (
                          <div key={k as string} style={{ fontSize: 12 }}>
                            <span style={{ color: "var(--text3)" }}>{k}: </span>
                            <span style={{ color: "var(--text1)", fontWeight: 600 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {existing.admin_notes && (
                    <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--accdim)", borderRadius: 9, fontSize: 13, color: "var(--text2)", border: "1px solid var(--accborder)" }}>
                      📝 {existing.admin_notes}
                    </div>
                  )}

                  <button onClick={() => setExisting(null)} style={{ marginTop: 14, background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 16px", color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Update / Re-submit
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* Form */}
        {!existing && (
          <form onSubmit={handleSubmit} style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Submit Company Details for Verification</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              <div>
                <label style={{ ...lbl, textTransform: "none" as React.CSSProperties["textTransform"] }}>COMPANY NAME *</label>
                <input style={{ ...inp, textTransform: "none" as React.CSSProperties["textTransform"], borderColor: errors.company_name ? "#f87171" : "" }}
                  value={form.company_name} onChange={e => setField("company_name", e.target.value)}
                  placeholder="e.g. Razorpay Software Private Limited" />
                {errors.company_name && <div style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{errors.company_name}</div>}
              </div>

              <div>
                <label style={lbl}>CIN — Company Identification Number (MCA)</label>
                <input style={{ ...inp, fontFamily: "monospace", borderColor: errors.cin ? "#f87171" : "" }}
                  value={form.cin} onChange={e => setField("cin", e.target.value)} placeholder="L17110MH1973PLC019786" maxLength={21} />
                {liveCheck.cin
                  ? <div style={{ fontSize: 12, color: liveCheck.cin.startsWith("✓") ? "#4ade80" : "#f87171", marginTop: 4 }}>{liveCheck.cin}</div>
                  : <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                      Format: L/U + 5 digits + State (2) + Year (4) + Company type + 6 digits ·{" "}
                      <a href="https://www.mca.gov.in/mcafoportal/showSearchResults.do" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Search on MCA Portal ↗</a>
                    </div>
                }
                {errors.cin && <div style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{errors.cin}</div>}
              </div>

              <div>
                <label style={lbl}>GSTIN — GST Identification Number</label>
                <input style={{ ...inp, fontFamily: "monospace", borderColor: errors.gstin ? "#f87171" : "" }}
                  value={form.gstin} onChange={e => setField("gstin", e.target.value)} placeholder="29ABCDE1234F1Z5" maxLength={15} />
                {liveCheck.gstin
                  ? <div style={{ fontSize: 12, color: liveCheck.gstin.startsWith("✓") ? "#4ade80" : "#f87171", marginTop: 4 }}>{liveCheck.gstin}</div>
                  : <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                      15 characters · We perform a live check on the GST portal ·{" "}
                      <a href="https://www.gst.gov.in/userregistration/gstreg/findgstin" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Verify on GST Portal ↗</a>
                    </div>
                }
                {errors.gstin && <div style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{errors.gstin}</div>}
              </div>

              <div>
                <label style={lbl}>Company PAN (optional)</label>
                <input style={{ ...inp, fontFamily: "monospace", borderColor: errors.pan ? "#f87171" : "" }}
                  value={form.pan} onChange={e => setField("pan", e.target.value)} placeholder="AAABC1234D" maxLength={10} />
                {liveCheck.pan
                  ? <div style={{ fontSize: 12, color: liveCheck.pan.startsWith("✓") ? "#4ade80" : "#f87171", marginTop: 4 }}>{liveCheck.pan}</div>
                  : <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Optional — helps cross-verify with MCA and GST records</div>
                }
              </div>

              {result?.error && (
                <div style={{ padding: "11px 14px", background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.3)", borderRadius: 9, fontSize: 13, color: "#f87171" }}>
                  {result.error}
                </div>
              )}
              {result?.message && !result.error && (
                <div style={{ padding: "11px 14px", background: "rgba(74,222,128,.06)", border: "1px solid rgba(74,222,128,.2)", borderRadius: 9, fontSize: 13, color: "#4ade80" }}>
                  {result.message}
                  {result.mcaLink && <> · <a href={result.mcaLink} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Check MCA Portal ↗</a></>}
                </div>
              )}

              <button type="submit" disabled={submitting} style={{
                padding: "13px", borderRadius: 9, border: "none",
                background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {submitting ? "Verifying…" : "Submit for Verification →"}
              </button>

              <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", lineHeight: 1.6 }}>
                GSTIN is checked live against the GST portal. CIN/MCA verification is reviewed by our team within 24 hours.
                All data is stored securely and used only for verification purposes.
              </div>
            </div>
          </form>
        )}

        {/* Benefits */}
        <div style={{ ...card, marginTop: 28, background: "linear-gradient(135deg,rgba(129,140,248,.06),rgba(99,102,241,.03))", borderColor: "var(--accborder)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🏅 Benefits of Verification</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              "✓ Verified badge on all job listings",
              "✓ Higher candidate reply rate (+35%)",
              "✓ Priority placement in search results",
              "✓ Reduced ghost-job flag probability",
              "✓ Employer trust score displayed",
              "✓ Faster admin approval for new posts",
            ].map(b => (
              <div key={b} style={{ fontSize: 13, color: "var(--text2)" }}>{b}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
