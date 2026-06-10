"use client";
/**
 * /employer — Employer Portal
 * API key management, documentation, tier info, candidate search preview.
 * Requires Supabase auth (employer signs in with work email).
 */
import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

/* ── Types ───────────────────────────────────────────────────── */
interface ApiKey {
  id:           string;
  key_prefix:   string;
  name:         string;
  tier:         string;
  monthly_quota: number;
  monthly_used:  number;
  last_used_at:  string | null;
  active:        boolean;
  created_at:    string;
}

/* ── Tier config ─────────────────────────────────────────────── */
const TIERS = [
  { name: "Free",       price: "$0/mo",   monthly: 10,    rpm: 10,  contact: false, color: "var(--text3)",  features: ["10 candidate searches/month", "Skills + availability data", "No contact unlock"] },
  { name: "Starter",    price: "$49/mo",  monthly: 100,   rpm: 20,  contact: false, color: "var(--accent)", features: ["100 candidate pulls/month", "Full profile data", "No contact unlock"] },
  { name: "Growth",     price: "$199/mo", monthly: 1000,  rpm: 60,  contact: true,  color: "#a78bfa",       features: ["1,000 pulls/month", "Contact unlock tokens", "Webhook events", "Priority support"] },
  { name: "Enterprise", price: "Custom",  monthly: 99999, rpm: 300, contact: true,  color: "var(--warn)",   features: ["Unlimited pulls", "Dedicated SLA", "ATS integration support", "Custom contract"] },
];

const ENDPOINTS = [
  {
    method: "GET", path: "/api/employer/candidates",
    desc: "Search discoverable candidates",
    params: ["skills (comma-sep)", "location", "open_to (active|passive|any)", "limit (max 50)", "offset"],
    example: `curl -H "Authorization: Bearer js_live_..." \\
  "https://jobsayer.com/api/employer/candidates?skills=React,TypeScript&location=London&limit=10"`,
    response: `{
  "candidates": [
    {
      "id": "uuid",
      "title": "Senior Software Engineer",
      "skills": ["React", "TypeScript", "Node.js"],
      "experience_years": 6,
      "location": "London, UK",
      "last_active": "2026-06-01T..."
    }
  ],
  "total": 142,
  "remaining_quota": 89
}`,
  },
  {
    method: "GET", path: "/api/employer/candidates/{id}",
    desc: "Get full profile for a single candidate",
    params: ["X-Unlock-Contact: true header (growth+ tier) to receive email/phone"],
    example: `curl -H "Authorization: Bearer js_live_..." \\
  "https://jobsayer.com/api/employer/candidates/uuid-here"`,
    response: `{
  "candidate": {
    "id": "uuid",
    "title": "Senior Software Engineer",
    "summary": "7 years building...",
    "skills": ["React", "TypeScript", ...],
    "work": [{ "company": "...", "role": "...", "from": "2019", ... }],
    "education": [...],
    "github": "https://github.com/...",
    "last_active": "2026-06-01T..."
  },
  "remaining_quota": 88
}`,
  },
];

/* ── Page ────────────────────────────────────────────────────── */
export default function EmployerPortalPage() {
  const [keys,        setKeys]        = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newKeyName,  setNewKeyName]  = useState("Default key");
  const [generating,  setGenerating]  = useState(false);
  const [newKeyRaw,   setNewKeyRaw]   = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [activeTab,   setActiveTab]   = useState<"keys"|"docs"|"tiers">("keys");
  const [expandedEp,  setExpandedEp]  = useState<number | null>(0);
  const [revoking,    setRevoking]    = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employer/keys")
      .then(r => r.json())
      .then(d => setKeys(d.keys ?? []))
      .catch(() => {})
      .finally(() => setKeysLoading(false));
  }, []);

  async function generateKey() {
    setGenerating(true);
    setNewKeyRaw(null);
    try {
      const res = await fetch("/api/employer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (data.raw_key) {
        setNewKeyRaw(data.raw_key);
        setKeys(prev => [data, ...prev]);
      }
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function revokeKey(id: string) {
    setRevoking(id);
    await fetch(`/api/employer/keys?id=${id}`, { method: "DELETE" }).catch(() => {});
    setKeys(prev => prev.map(k => k.id === id ? { ...k, active: false } : k));
    setRevoking(null);
  }

  function copyKey() {
    if (!newKeyRaw) return;
    navigator.clipboard.writeText(newKeyRaw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 };
  const methodColor: Record<string, string> = { GET: "var(--success)", POST: "var(--accent)", DELETE: "var(--danger)" };

  return (
    <AppShell>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            <i className="ti ti-building"/> For Employers & Recruiters
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>Employer Portal</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6, maxWidth: 560 }}>
            Access jobSayer's candidate pool via API. Search by skills, location, and availability.
            Candidates explicitly opt in — quality over volume.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--surface2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {([["keys","API Keys"],["docs","API Docs"],["tiers","Pricing"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "7px 18px", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 600,
              background: activeTab === key ? "var(--surface)" : "transparent",
              color: activeTab === key ? "var(--text1)" : "var(--text3)",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,.15)" : "none",
            }}>{label}</button>
          ))}
        </div>

        {/* ══ API KEYS TAB ══ */}
        {activeTab === "keys" && (
          <div>
            {/* New key revealed */}
            {newKeyRaw && (
              <div style={{ ...card, padding: "18px 22px", marginBottom: 20, borderColor: "rgba(34,197,94,.3)", background: "rgba(34,197,94,.04)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 8 }}>
                  <i className="ti ti-circle-check"/> New API key generated — save it now, it won't be shown again
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <code style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 13, fontFamily: "monospace", color: "var(--success)", wordBreak: "break-all" }}>
                    {newKeyRaw}
                  </code>
                  <button onClick={copyKey} style={{ padding: "10px 18px", borderRadius: 8, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <button onClick={() => setNewKeyRaw(null)} style={{ marginTop: 12, background: "none", border: "none", color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  Dismiss
                </button>
              </div>
            )}

            {/* Generate new key */}
            <div style={{ ...card, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Generate API Key</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production, Staging)"
                  style={{ flex: 1, minWidth: 200, padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
                <button onClick={generateKey} disabled={generating} style={{ padding: "10px 22px", borderRadius: 9, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  {generating ? "Generating…" : "+ Generate key"}
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
                Keys are tied to your account tier. You're currently on the <strong style={{ color: "var(--text2)" }}>Free</strong> tier — 10 pulls/month.
                {" "}<Link href="#" onClick={() => setActiveTab("tiers")} style={{ color: "var(--accent)" }}>Upgrade <i className="ti ti-arrow-right"/></Link>
              </div>
            </div>

            {/* Key list */}
            <div style={{ ...card, padding: "20px 24px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Your API Keys ({keysLoading ? "…" : keys.length})
              </div>
              {keysLoading ? (
                <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div>
              ) : keys.length === 0 ? (
                <div style={{ color: "var(--text3)", fontSize: 13 }}>No keys yet — generate your first key above.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {keys.map(key => (
                    <div key={key.id} style={{ padding: "14px 16px", borderRadius: 10, background: "var(--surface2)", border: `1px solid ${key.active ? "var(--border)" : "rgba(239,68,68,.2)"}`, opacity: key.active ? 1 : 0.6 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>{key.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                              background: key.active ? "var(--accdim)" : "rgba(239,68,68,.1)",
                              color: key.active ? "var(--accent)" : "var(--danger)",
                              border: `1px solid ${key.active ? "var(--accborder)" : "rgba(239,68,68,.2)"}`,
                            }}>{key.active ? key.tier.toUpperCase() : "REVOKED"}</span>
                          </div>
                          <code style={{ fontSize: 12, color: "var(--text3)", fontFamily: "monospace" }}>{key.key_prefix}…</code>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                            {key.monthly_used}/{key.monthly_quota} pulls used this month
                            {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        {key.active && (
                          <button onClick={() => revokeKey(key.id)} disabled={revoking === key.id} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", color: "var(--danger)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            {revoking === key.id ? "Revoking…" : "Revoke"}
                          </button>
                        )}
                      </div>
                      {/* Quota bar */}
                      <div style={{ marginTop: 10, height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: "var(--accent)", width: `${Math.min(100, (key.monthly_used/key.monthly_quota)*100)}%`, transition: "width .5s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auth note */}
            <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 10, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--accent)" }}>Authentication:</strong> Pass your key as{" "}
              <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>Authorization: Bearer js_live_...</code>{" "}
              in all API requests. Keys are scoped to your employer account and respect candidate opt-in consent.
            </div>
          </div>
        )}

        {/* ══ API DOCS TAB ══ */}
        {activeTab === "docs" && (
          <div>
            <div style={{ ...card, padding: "18px 22px", marginBottom: 20, background: "rgba(99,102,241,.04)", borderColor: "var(--accborder)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>Base URL</div>
              <code style={{ fontSize: 13, color: "var(--text1)", fontFamily: "monospace" }}>https://jobsayer.com/api/employer</code>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
                All responses are JSON. Rate limits and quota are returned in every response as <code style={{ fontSize: 11, background: "var(--surface2)", padding: "1px 5px", borderRadius: 4 }}>remaining_quota</code>.
                Candidates who have disabled discoverability are automatically excluded — no filtering needed.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ENDPOINTS.map((ep, i) => (
                <div key={i} style={{ ...card, overflow: "hidden" }}>
                  <button onClick={() => setExpandedEp(expandedEp === i ? null : i)} style={{
                    width: "100%", padding: "16px 20px", background: "none", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 6, background: (methodColor[ep.method] ?? "var(--text3)") + "18", color: methodColor[ep.method] ?? "var(--text3)", fontFamily: "monospace", flexShrink: 0 }}>
                      {ep.method}
                    </span>
                    <code style={{ fontSize: 13, color: "var(--text1)", fontFamily: "monospace", flex: 1, textAlign: "left" }}>{ep.path}</code>
                    <span style={{ fontSize: 12, color: "var(--text3)", flex: 1, textAlign: "left" }}>{ep.desc}</span>
                    <span style={{ color: "var(--text3)" }}>{expandedEp === i ? "▲" : "▼"}</span>
                  </button>
                  {expandedEp === i && (
                    <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border2)" }}>
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Parameters</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {ep.params.map(p => (
                            <code key={p} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>{p}</code>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Example Request</div>
                        <pre style={{ fontSize: 12, background: "#0d1117", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "14px 16px", color: "#e6edf3", overflowX: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>
                          {ep.example}
                        </pre>
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Response Shape</div>
                        <pre style={{ fontSize: 12, background: "#0d1117", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "14px 16px", color: "#e6edf3", overflowX: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>
                          {ep.response}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: "18px 22px", marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}><i className="ti ti-link"/> ATS Integration</div>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: 12 }}>
                The API follows REST conventions and returns standard JSON — compatible with any ATS that supports webhook/API integrations.
                Publish your <strong style={{ color: "var(--text2)" }}>OpenAPI spec</strong> to let ATS vendors self-integrate.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Greenhouse", "Lever", "Workday", "BambooHR", "Ashby"].map(ats => (
                  <span key={ats} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                    {ats}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>Integration guides coming soon on enterprise tier.</div>
            </div>
          </div>
        )}

        {/* ══ TIERS TAB ══ */}
        {activeTab === "tiers" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))", gap: 16 }}>
              {TIERS.map(tier => (
                <div key={tier.name} style={{ ...card, padding: "22px 20px", borderColor: tier.name === "Growth" ? "#a78bfa44" : "var(--border)", background: tier.name === "Growth" ? "rgba(167,139,250,.04)" : "var(--surface)" }}>
                  {tier.name === "Growth" && (
                    <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(167,139,250,.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,.3)", width: "fit-content", marginBottom: 10 }}>
                      POPULAR
                    </div>
                  )}
                  <div style={{ fontSize: 18, fontWeight: 900, color: tier.color, marginBottom: 4 }}>{tier.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4, letterSpacing: "-.02em" }}>{tier.price}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
                    {tier.monthly === 99999 ? "Unlimited" : `${tier.monthly.toLocaleString()} pulls`}/month · {tier.rpm} req/min
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
                    {tier.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text2)" }}>
                        <span style={{ color: "var(--success)", flexShrink: 0 }}>✓</span> {f}
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: tier.contact ? "var(--success)" : "var(--text3)" }}>
                      {tier.contact ? "✓" : "✗"} Contact unlock {tier.contact ? "(tokens)" : "not available"}
                    </div>
                  </div>
                  <Link href="/upgrade" style={{ display: "block", padding: "10px 0", borderRadius: 9, textAlign: "center", background: tier.name === "Growth" ? "#a78bfa" : "var(--surface2)", border: `1px solid ${tier.name === "Growth" ? "#a78bfa" : "var(--border)"}`, color: tier.name === "Growth" ? "#fff" : "var(--text1)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    {tier.name === "Free" ? "Current plan" : tier.name === "Enterprise" ? "Contact us" : `Get ${tier.name}`}
                  </Link>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
              All plans include: GDPR-compliant opt-in system, full audit log, candidate data deletion support, and standard SLA.
              Employer accounts are domain-verified before growth+ tier activation.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
