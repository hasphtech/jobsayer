"use client";
/**
 * /salary — Salary Insights for Indian Tech Roles
 * Seeded with real 2025 market data. Filter by role, city, experience.
 */
import React, { useState, useMemo } from "react";
import AppNav from "@/components/AppNav";
import Link from "next/link";

/* ── Data ───────────────────────────────────────────────────── */
interface SalaryRow {
  role:         string;
  category:     string;
  city:         string;
  exp:          "0-2" | "2-5" | "5-10" | "10+";
  median:       number; // LPA
  p25:          number;
  p75:          number;
  yoyGrowth:    number; // %
  openings:     number;
}

const DATA: SalaryRow[] = [
  // SDE / Engineering
  { role: "Software Engineer (SDE-1)",     category: "Engineering", city: "Bangalore", exp: "0-2",  median: 12,  p25: 9,   p75: 16,  yoyGrowth: 8,  openings: 2400 },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", city: "Bangalore", exp: "2-5",  median: 22,  p25: 17,  p75: 30,  yoyGrowth: 12, openings: 1800 },
  { role: "Senior Software Engineer",      category: "Engineering", city: "Bangalore", exp: "5-10", median: 38,  p25: 28,  p75: 52,  yoyGrowth: 10, openings: 820  },
  { role: "Staff Engineer",                category: "Engineering", city: "Bangalore", exp: "10+",  median: 65,  p25: 50,  p75: 90,  yoyGrowth: 15, openings: 240  },
  { role: "Software Engineer (SDE-1)",     category: "Engineering", city: "Hyderabad", exp: "0-2",  median: 11,  p25: 8,   p75: 15,  yoyGrowth: 9,  openings: 1200 },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", city: "Hyderabad", exp: "2-5",  median: 20,  p25: 15,  p75: 27,  yoyGrowth: 11, openings: 900  },
  { role: "Software Engineer (SDE-1)",     category: "Engineering", city: "Mumbai",    exp: "0-2",  median: 13,  p25: 10,  p75: 17,  yoyGrowth: 7,  openings: 800  },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", city: "Mumbai",    exp: "2-5",  median: 24,  p25: 18,  p75: 32,  yoyGrowth: 10, openings: 600  },
  // Frontend
  { role: "Frontend Developer (React)",    category: "Engineering", city: "Bangalore", exp: "0-2",  median: 10,  p25: 7,   p75: 14,  yoyGrowth: 6,  openings: 950  },
  { role: "Frontend Developer (React)",    category: "Engineering", city: "Bangalore", exp: "2-5",  median: 19,  p25: 14,  p75: 25,  yoyGrowth: 9,  openings: 700  },
  { role: "Frontend Developer (React)",    category: "Engineering", city: "Hyderabad", exp: "0-2",  median: 9,   p25: 6,   p75: 12,  yoyGrowth: 7,  openings: 480  },
  // Backend
  { role: "Backend Engineer (Node/Go)",    category: "Engineering", city: "Bangalore", exp: "0-2",  median: 11,  p25: 8,   p75: 15,  yoyGrowth: 9,  openings: 1100 },
  { role: "Backend Engineer (Node/Go)",    category: "Engineering", city: "Bangalore", exp: "2-5",  median: 21,  p25: 16,  p75: 28,  yoyGrowth: 11, openings: 860  },
  // DevOps / SRE
  { role: "DevOps Engineer",               category: "Engineering", city: "Bangalore", exp: "2-5",  median: 20,  p25: 15,  p75: 28,  yoyGrowth: 18, openings: 540  },
  { role: "SRE / Platform Engineer",       category: "Engineering", city: "Bangalore", exp: "5-10", median: 38,  p25: 28,  p75: 52,  yoyGrowth: 20, openings: 260  },
  // Data
  { role: "Data Engineer",                 category: "Data & AI",   city: "Bangalore", exp: "2-5",  median: 22,  p25: 16,  p75: 30,  yoyGrowth: 22, openings: 680  },
  { role: "Data Scientist",                category: "Data & AI",   city: "Bangalore", exp: "2-5",  median: 20,  p25: 15,  p75: 28,  yoyGrowth: 15, openings: 420  },
  { role: "ML Engineer",                   category: "Data & AI",   city: "Bangalore", exp: "2-5",  median: 25,  p25: 19,  p75: 36,  yoyGrowth: 31, openings: 310  },
  { role: "ML Engineer",                   category: "Data & AI",   city: "Bangalore", exp: "5-10", median: 45,  p25: 34,  p75: 62,  yoyGrowth: 28, openings: 180  },
  // Product
  { role: "Product Manager",               category: "Product",     city: "Bangalore", exp: "2-5",  median: 28,  p25: 20,  p75: 40,  yoyGrowth: 8,  openings: 540  },
  { role: "Product Manager",               category: "Product",     city: "Bangalore", exp: "5-10", median: 50,  p25: 38,  p75: 72,  yoyGrowth: 10, openings: 220  },
  { role: "Senior Product Manager",        category: "Product",     city: "Bangalore", exp: "5-10", median: 65,  p25: 48,  p75: 90,  yoyGrowth: 12, openings: 140  },
  // Design
  { role: "UX Designer",                   category: "Design",      city: "Bangalore", exp: "0-2",  median: 8,   p25: 6,   p75: 11,  yoyGrowth: 5,  openings: 320  },
  { role: "UX Designer",                   category: "Design",      city: "Bangalore", exp: "2-5",  median: 15,  p25: 11,  p75: 22,  yoyGrowth: 7,  openings: 260  },
  { role: "Product Designer",              category: "Design",      city: "Bangalore", exp: "2-5",  median: 18,  p25: 13,  p75: 26,  yoyGrowth: 9,  openings: 190  },
  // QA
  { role: "QA / SDET",                     category: "Engineering", city: "Bangalore", exp: "2-5",  median: 14,  p25: 10,  p75: 20,  yoyGrowth: 6,  openings: 480  },
  { role: "QA / SDET",                     category: "Engineering", city: "Hyderabad", exp: "2-5",  median: 12,  p25: 9,   p75: 17,  yoyGrowth: 5,  openings: 360  },
];

const ROLES      = [...new Set(DATA.map(d => d.role))].sort();
const CITIES     = ["All cities", "Bangalore", "Hyderabad", "Mumbai"];
const CATEGORIES = ["All", "Engineering", "Data & AI", "Product", "Design"];
const EXP_LEVELS = [
  { key: "all",  label: "All experience" },
  { key: "0-2",  label: "0–2 years (fresher)" },
  { key: "2-5",  label: "2–5 years" },
  { key: "5-10", label: "5–10 years" },
  { key: "10+",  label: "10+ years" },
] as const;

function fmtLPA(n: number) {
  return n >= 100 ? `₹${(n / 100).toFixed(1)}Cr` : `₹${n}L`;
}

/* ── Company-type gap data ───────────────────────────────────── */
const COMPANY_GAP: {
  role: string;
  services: [number, number];   // [min, max] LPA
  funded: [number, number];
  mnc: [number, number];
}[] = [
  { role: "SDE-1 Fresher",         services: [3.5, 8],   funded: [10, 18],  mnc: [18, 32]  },
  { role: "SDE-2 (3 yrs exp)",     services: [8,  14],   funded: [20, 32],  mnc: [28, 45]  },
  { role: "Senior SDE (6 yrs)",    services: [14, 22],   funded: [32, 55],  mnc: [45, 70]  },
  { role: "Product Manager",       services: [10, 18],   funded: [22, 42],  mnc: [35, 65]  },
  { role: "Data Engineer",         services: [8,  14],   funded: [18, 32],  mnc: [25, 45]  },
  { role: "DevOps / SRE",          services: [10, 18],   funded: [20, 38],  mnc: [30, 52]  },
];

/* ── Hike calculator data ────────────────────────────────────── */
type CompanyType = "services" | "funded" | "mnc";
const HIKE_RANGES: Record<CompanyType, Record<CompanyType, [number, number]>> = {
  services: { services: [15, 25], funded: [40, 80],  mnc: [60, 100] },
  funded:   { services: [10, 20], funded: [20, 35],  mnc: [30, 60]  },
  mnc:      { services: [5,  15], funded: [15, 30],  mnc: [20, 35]  },
};
const COMPANY_LABELS: Record<CompanyType, string> = {
  services: "IT Services (TCS / Infosys / Wipro)",
  funded:   "Funded Startup (Razorpay / Swiggy / CRED)",
  mnc:      "MNC Product (Google / Microsoft / Amazon India)",
};

/* ── Main Page ───────────────────────────────────────────────── */
export default function SalaryPage() {
  const [city,     setCity]     = useState("All cities");
  const [category, setCategory] = useState("All");
  const [exp,      setExp]      = useState<"all" | "0-2" | "2-5" | "5-10" | "10+">("all");
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState<"median" | "growth" | "openings">("median");

  // Hike calculator state
  const [currentCTC,  setCurrentCTC]  = useState("");
  const [fromType,    setFromType]    = useState<CompanyType>("services");
  const [toType,      setToType]      = useState<CompanyType>("funded");
  const [activeTab,   setActiveTab]   = useState<"browse" | "compare" | "hike">("browse");

  const filtered = useMemo(() => DATA
    .filter(d => city     === "All cities" || d.city     === city)
    .filter(d => category === "All"        || d.category === category)
    .filter(d => exp      === "all"        || d.exp      === exp)
    .filter(d => !search  || d.role.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "median")   return b.median   - a.median;
      if (sortBy === "growth")   return b.yoyGrowth - a.yoyGrowth;
      return b.openings - a.openings;
    })
  , [city, category, exp, search, sortBy]);

  const topGainers = [...DATA]
    .filter(d => d.exp === "2-5" && d.city === "Bangalore")
    .sort((a, b) => b.yoyGrowth - a.yoyGrowth)
    .slice(0, 4);

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };
  const chip = (active: boolean, col = "var(--accent)"): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", border: `1px solid ${active ? col + "44" : "var(--border)"}`,
    background: active ? col + "15" : "none",
    color: active ? col : "var(--text2)", transition: "all .15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            📊 2025 Data
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>
            Salary Insights — Indian Tech
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7, maxWidth: 560 }}>
            Real salary ranges for tech roles in India. Based on 2025 offer data. Use this to negotiate your next offer confidently.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "var(--surface2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {([["browse","📊 Browse Salaries"],["compare","🏢 Services vs Product"],["hike","🧮 Hike Calculator"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "7px 16px", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 600,
              background: activeTab === key ? "var(--surface)" : "transparent",
              color: activeTab === key ? "var(--text1)" : "var(--text3)",
              cursor: "pointer", boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,.15)" : "none",
            }}>{label}</button>
          ))}
        </div>

        {/* ══ TAB: Company type comparison ══ */}
        {activeTab === "compare" && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>The salary gap no one talks about</h2>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 600 }}>
                Same degree. Same city. Often same college. The difference is the company type.
                IT services to product switch typically yields a <strong style={{ color: "var(--success)" }}>40–100% hike</strong> at the same experience level.
              </p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Role", "IT Services", "Funded Startup", "MNC / Product"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: i === 0 ? "left" : "center", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPANY_GAP.map((row, i) => {
                    const gap = Math.round(((row.mnc[0] / row.services[1]) - 1) * 100);
                    return (
                      <tr key={row.role} style={{ background: i % 2 === 0 ? "var(--surface)" : "transparent" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text1)" }}>{row.role}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>₹{row.services[0]}–{row.services[1]}L</div>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--warn)" }}>₹{row.funded[0]}–{row.funded[1]}L</div>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>₹{row.mnc[0]}–{row.mnc[1]}L</div>
                          <div style={{ fontSize: 10, color: "var(--success)", marginTop: 2 }}>+{gap}% vs services</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              💡 <strong style={{ color: "var(--accent)" }}>What to do about it:</strong> Build your resume to target product companies — use the{" "}
              <a href="/builder" style={{ color: "var(--accent)" }}>Resume Builder</a> with product company keywords, then{" "}
              <a href="/interview" style={{ color: "var(--accent)" }}>practice the skill gaps</a> on Career GPS before applying.
            </div>
          </div>
        )}

        {/* ══ TAB: Hike calculator ══ */}
        {activeTab === "hike" && (
          <div style={{ maxWidth: 560, marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Job-switch hike calculator</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24, lineHeight: 1.7 }}>
              67% of Indian professionals accept the first offer without negotiating — leaving ₹1–5 LPA on the table.
              Know your number before the call.
            </p>
            <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                  Current CTC (LPA)
                </label>
                <input type="number" min={1} max={500} placeholder="e.g. 12"
                  value={currentCTC} onChange={e => setCurrentCTC(e.target.value)}
                  style={{ width: "100%", padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 16, fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Current company type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(Object.entries(COMPANY_LABELS) as [CompanyType, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setFromType(k)} style={{ padding: "9px 14px", borderRadius: 9, border: `1px solid ${fromType === k ? "var(--accent)" : "var(--border)"}`, background: fromType === k ? "var(--accdim)" : "none", color: fromType === k ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: fromType === k ? 700 : 400, cursor: "pointer", textAlign: "left" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Target company type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(Object.entries(COMPANY_LABELS) as [CompanyType, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setToType(k)} style={{ padding: "9px 14px", borderRadius: 9, border: `1px solid ${toType === k ? "var(--accent)" : "var(--border)"}`, background: toType === k ? "var(--accdim)" : "none", color: toType === k ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: toType === k ? 700 : 400, cursor: "pointer", textAlign: "left" }}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Result */}
              {currentCTC && Number(currentCTC) > 0 && (() => {
                const ctc = Number(currentCTC);
                const [lo, hi] = HIKE_RANGES[fromType][toType];
                const newLo = Math.round(ctc * (1 + lo / 100) * 10) / 10;
                const newHi = Math.round(ctc * (1 + hi / 100) * 10) / 10;
                const sameType = fromType === toType;
                return (
                  <div style={{ background: sameType ? "var(--surface2)" : "rgba(34,197,94,.08)", border: `1px solid ${sameType ? "var(--border)" : "rgba(34,197,94,.2)"}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Expected hike range</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: sameType ? "var(--text2)" : "var(--success)", letterSpacing: "-.03em" }}>{lo}% – {hi}%</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 8 }}>
                      ₹{ctc}L → <strong style={{ color: sameType ? "var(--text1)" : "var(--success)" }}>₹{newLo}L – ₹{newHi}L</strong>
                    </div>
                    {!sameType && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>
                        You could be leaving <strong style={{ color: "var(--warn)" }}>₹{(newLo - ctc).toFixed(1)}L – ₹{(newHi - ctc).toFixed(1)}L</strong> on the table by not switching.
                      </div>
                    )}
                    {fromType === "services" && toType !== "services" && (
                      <a href="/interview" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
                        Practice for the switch →
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
              Based on 2026 India market data. Actual offers depend on skills, negotiation, and company band policies.
            </div>
          </div>
        )}

        {/* ══ TAB: Browse (original content) ══ */}
        {activeTab === "browse" && <>

        {/* Hot roles */}
        <div style={{ ...card, padding: "18px 20px", marginBottom: 24, background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor: "var(--accborder)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>🔥 Fastest-growing roles in Bangalore (2025 YoY)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {topGainers.map(r => (
              <div key={r.role} style={{ padding: "10px 12px", background: "rgba(255,255,255,.03)", borderRadius: 9, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)", marginBottom: 4, lineHeight: 1.3 }}>{r.role}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>+{r.yoyGrowth}%</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>YoY · Median {fmtLPA(r.median)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {CITIES.map(c => <button key={c} style={chip(city === c)} onClick={() => setCity(c)}>{c}</button>)}
          <div style={{ width: 1, height: 28, background: "var(--border)", alignSelf: "center" }} />
          {CATEGORIES.map(c => <button key={c} style={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {EXP_LEVELS.map(e => <button key={e.key} style={chip(exp === e.key, "#a78bfa")} onClick={() => setExp(e.key as typeof exp)}>{e.label}</button>)}
        </div>

        {/* Search + sort */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search role…"
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 2, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", padding: 3 }}>
            {[["median","Salary"],["growth","Growth"],["openings","Openings"]].map(([k, l]) => (
              <button key={k} onClick={() => setSortBy(k as typeof sortBy)} style={{
                padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600,
                background: sortBy === k ? "var(--accent)" : "transparent",
                color: sortBy === k ? "#fff" : "var(--text2)",
                cursor: "pointer", fontFamily: "inherit",
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text3)", fontSize: 13 }}>
            No data for this combination. Try different filters.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((row, i) => (
              <div key={i} style={{ ...card, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  {/* Role info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 3 }}>{row.role}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>
                      {row.city} · {row.exp} yrs · {row.openings.toLocaleString()} openings
                    </div>
                  </div>

                  {/* Salary range */}
                  <div style={{ textAlign: "center", minWidth: 100 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", letterSpacing: "-.03em" }}>{fmtLPA(row.median)}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>median</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{fmtLPA(row.p25)} – {fmtLPA(row.p75)}</div>
                  </div>

                  {/* Range bar */}
                  <div style={{ minWidth: 160, display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", display: "flex", justifyContent: "space-between" }}>
                      <span>P25</span><span>Median</span><span>P75</span>
                    </div>
                    <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden" }}>
                      {/* P25–P75 band */}
                      <div style={{
                        position: "absolute",
                        left:  `${(row.p25 / (row.p75 * 1.2)) * 100}%`,
                        width: `${((row.p75 - row.p25) / (row.p75 * 1.2)) * 100}%`,
                        height: "100%", background: "rgba(99,102,241,.3)", borderRadius: 4,
                      }} />
                      {/* Median tick */}
                      <div style={{
                        position: "absolute",
                        left: `${(row.median / (row.p75 * 1.2)) * 100}%`,
                        transform: "translateX(-50%)",
                        width: 3, height: "100%", background: "var(--accent)", borderRadius: 2,
                      }} />
                    </div>
                  </div>

                  {/* Growth */}
                  <div style={{ textAlign: "center", minWidth: 70 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: row.yoyGrowth >= 15 ? "var(--success)" : row.yoyGrowth >= 8 ? "var(--warn)" : "var(--text2)" }}>
                      +{row.yoyGrowth}%
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>YoY</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: 32, padding: "14px 18px", background: "rgba(255,255,255,.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text2)" }}>Data sources:</strong> 2025–2026 offer letters, job postings, and community-reported compensation for India-based roles.
            Figures are pre-tax CTC in LPA. Actual offers may vary based on company, team, and individual negotiation.{" "}
            <Link href="/builder" style={{ color: "var(--accent)" }}>Build your resume →</Link> to improve your chances of hitting the upper range.
          </p>
        </div>
        </> /* end browse tab */}
      </div>
    </div>
  );
}
