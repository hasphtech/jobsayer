"use client";
/**
 * JobPreferences — inline component for /profile
 * Lets users set target job titles, locations, job types, salary, skills.
 * Saves to /api/preferences. Notifies on relevant job matches.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Check, Bell, BellOff, Plus, X } from "lucide-react";
import { getSupabaseAsync } from "@/lib/auth";

export interface Prefs {
  job_titles:   string[];
  locations:    string[];
  job_types:    string[];
  min_salary:   number | null;
  currency:     string;
  skills:       string[];
  notify_email: boolean;
  notify_freq:  string;
}

const EMPTY_PREFS: Prefs = {
  job_titles: [], locations: [], job_types: [],
  min_salary: null, currency: "USD", skills: [],
  notify_email: true, notify_freq: "daily",
};

const JOB_TYPES = ["Full-time", "Part-time", "Remote", "Contract", "Internship"];

/* ── Tag input ─────────────────────────────────────────────────── */
function TagInput({
  label, tags, onChange, placeholder, suggestions,
}: {
  label: string; tags: string[]; onChange: (t: string[]) => void;
  placeholder?: string; suggestions?: string[];
}) {
  const [val, setVal] = useState("");
  const [showSug, setShowSug] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions?.filter(
    s => s.toLowerCase().includes(val.toLowerCase()) && !tags.includes(s)
  ).slice(0, 6) ?? [];

  function add(tag: string) {
    const t = tag.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal(""); setShowSug(false);
  }
  function remove(tag: string) { onChange(tags.filter(t => t !== tag)); }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {tags.map(t => (
          <span key={t} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 20,
            background: "var(--accdim)", border: "1px solid var(--accborder)",
            color: "var(--accent)", fontSize: 12, fontWeight: 600,
          }}>
            {t}
            <button onClick={() => remove(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--accent)", display: "flex", lineHeight: 1 }}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      {/* Input */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            ref={inputRef}
            value={val}
            onChange={e => { setVal(e.target.value); setShowSug(true); }}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(val); } if (e.key === "Escape") setShowSug(false); }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            placeholder={placeholder}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--surface)",
              color: "var(--text1)", fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
          />
          <button onClick={() => add(val)} style={{
            padding: "8px 12px", borderRadius: 8, border: "none",
            background: "var(--surface2)", color: "var(--text2)", cursor: "pointer",
            display: "flex", alignItems: "center",
          }}>
            <Plus size={14} />
          </button>
        </div>
        {showSug && filtered.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, zIndex: 10, overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,.1)",
          }}>
            {filtered.map(s => (
              <button key={s} onMouseDown={() => add(s)} style={{
                width: "100%", padding: "8px 12px", border: "none",
                background: "none", cursor: "pointer", textAlign: "left",
                fontFamily: "inherit", fontSize: 13, color: "var(--text1)",
                borderBottom: "1px solid var(--border)",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
        Type and press Enter or comma to add
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export default function JobPreferences() {
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  /* Load */
  useEffect(() => {
    (async () => {
      try {
        const sb = await getSupabaseAsync();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { setLoading(false); return; }
        const res = await fetch("/api/preferences", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json() as { preferences?: Prefs };
        if (json.preferences) setPrefs(json.preferences);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  function patch(fields: Partial<Prefs>) { setPrefs(p => ({ ...p, ...fields })); }

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const sb = await getSupabaseAsync();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { setError("Sign in to save preferences."); return; }
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Could not save. Please try again."); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text3)", fontSize: 13, padding: "12px 0" }}>
      <Loader2 size={14} className="spin" /> Loading preferences…
      <style>{`.spin{animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>
            <i className="ti ti-adjustments-horizontal" style={{ marginRight: 6, color: "var(--accent)" }}/>
            Job Preferences
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            We'll match and notify you when relevant jobs appear
          </div>
        </div>
        {prefs.notify_email ? (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--success)", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 20, padding: "4px 10px" }}>
            <Bell size={11} /> Alerts on
          </span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 10px" }}>
            <BellOff size={11} /> Alerts off
          </span>
        )}
      </div>

      {/* Target job titles */}
      <TagInput
        label="Target Job Titles"
        tags={prefs.job_titles}
        onChange={t => patch({ job_titles: t })}
        placeholder="e.g. Frontend Engineer, Product Manager…"
        suggestions={[
          "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Developer",
          "Product Manager", "Data Scientist", "Data Analyst", "DevOps Engineer",
          "UX Designer", "Marketing Manager", "Sales Executive", "Project Manager",
          "Machine Learning Engineer", "Business Analyst", "Cloud Architect",
        ]}
      />

      {/* Preferred locations */}
      <TagInput
        label="Preferred Locations"
        tags={prefs.locations}
        onChange={t => patch({ locations: t })}
        placeholder="e.g. Remote, San Francisco, London…"
        suggestions={[
          "Remote", "Hybrid", "San Francisco, CA", "New York, NY", "Seattle, WA",
          "Austin, TX", "Boston, MA", "Chicago, IL", "London, UK", "Berlin, Germany",
          "Singapore", "Bangalore, India", "Mumbai, India", "Toronto, Canada", "Sydney, Australia",
        ]}
      />

      {/* Job types */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 8 }}>
          Job Types
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {JOB_TYPES.map(jt => {
            const active = prefs.job_types.includes(jt);
            return (
              <button key={jt} onClick={() => patch({ job_types: active ? prefs.job_types.filter(t => t !== jt) : [...prefs.job_types, jt] })}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "none", fontFamily: "inherit",
                  background: active ? "var(--accent)" : "var(--surface2)",
                  color: active ? "#fff" : "var(--text2)",
                  transition: "all .15s",
                }}>
                {jt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <TagInput
        label="Key Skills (to match against JDs)"
        tags={prefs.skills}
        onChange={t => patch({ skills: t })}
        placeholder="e.g. React, Python, SQL…"
        suggestions={[
          "React", "TypeScript", "Python", "SQL", "Node.js", "AWS", "Docker",
          "Machine Learning", "Data Analysis", "Figma", "Product Strategy", "Go",
          "Kubernetes", "GraphQL", "PostgreSQL", "Next.js", "TensorFlow",
        ]}
      />

      {/* Salary + Currency */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 }}>
            Minimum Salary
          </label>
          <input
            type="number" min={0} step={1000}
            value={prefs.min_salary ?? ""}
            onChange={e => patch({ min_salary: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g. 80000"
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 }}>
            Currency
          </label>
          <select value={prefs.currency} onChange={e => patch({ currency: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}>
            {["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "AED"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification settings */}
      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>Email Notifications</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Get notified when jobs match your preferences</div>
          </div>
          <button
            onClick={() => patch({ notify_email: !prefs.notify_email })}
            style={{
              width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
              background: prefs.notify_email ? "var(--accent)" : "var(--border)",
              position: "relative", transition: "background .2s", flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 2,
              left: prefs.notify_email ? 20 : 2,
              width: 18, height: 18, borderRadius: "50%",
              background: "#fff", transition: "left .2s",
            }} />
          </button>
        </div>
        {prefs.notify_email && (
          <div style={{ display: "flex", gap: 8 }}>
            {(["instant", "daily", "weekly"] as const).map(f => (
              <button key={f} onClick={() => patch({ notify_freq: f })}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "1px solid var(--border)", fontFamily: "inherit",
                  background: prefs.notify_freq === f ? "var(--accent)" : "var(--surface)",
                  color: prefs.notify_freq === f ? "#fff" : "var(--text2)",
                }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,.2)" }}>
          {error}
        </div>
      )}
      <button onClick={save} disabled={saving} style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "10px 22px", borderRadius: 9, border: "none",
        background: saved ? "var(--success)" : "var(--accent)",
        color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
        transition: "background .2s",
      }}>
        {saving ? <Loader2 size={14} className="spin" /> : saved ? <Check size={14} /> : <Bell size={14} />}
        {saved ? "Preferences saved!" : saving ? "Saving…" : "Save & Enable Alerts"}
      </button>

      <style>{`.spin{animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
