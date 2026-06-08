"use client";
/**
 * /salary — Global Salary Intelligence + Negotiation Coach
 * Multi-currency (USD/EUR/GBP/SGD/AED/INR), global cities, AI negotiation coach.
 */
import React, { useState, useMemo, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { trackAction } from "@/lib/activityTracker";
import { useWindowWidth } from "@/lib/useWindowWidth";

/* ── Currency config ─────────────────────────────────────────── */
type Currency = "USD" | "EUR" | "GBP" | "SGD" | "AED" | "INR";
const CURRENCIES: Record<Currency, { symbol: string; name: string; toUSD: number }> = {
  USD: { symbol: "$",   name: "US Dollar",         toUSD: 1      },
  EUR: { symbol: "€",   name: "Euro",               toUSD: 1.08   },
  GBP: { symbol: "£",   name: "British Pound",      toUSD: 1.27   },
  SGD: { symbol: "S$",  name: "Singapore Dollar",   toUSD: 0.74   },
  AED: { symbol: "د.إ", name: "UAE Dirham",          toUSD: 0.272  },
  INR: { symbol: "₹",   name: "Indian Rupee (LPA)", toUSD: 0.012  },
};

function fmtSalary(usd: number, cur: Currency): string {
  const rate = CURRENCIES[cur].toUSD;
  const val  = usd / rate;
  const sym  = CURRENCIES[cur].symbol;
  if (cur === "INR") return `${sym}${Math.round(val / 100000)}L`;
  if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
  return `${sym}${Math.round(val / 1000)}K`;
}

/* ── Data (all salaries stored as USD/year) ──────────────────── */
interface SalaryRow {
  role:      string;
  category:  string;
  region:    string;
  city:      string;
  exp:       "0-2" | "2-5" | "5-10" | "10+";
  median:    number; // USD/yr
  p25:       number;
  p75:       number;
  yoyGrowth: number; // %
  openings:  number;
}

const DATA: SalaryRow[] = [
  // ── North America ──────────────────────────────────────────
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "North America", city: "San Francisco",  exp: "0-2",  median: 145000, p25: 120000, p75: 175000, yoyGrowth: 6,  openings: 3800 },
  { role: "Software Engineer (L4/SDE-2)",  category: "Engineering", region: "North America", city: "San Francisco",  exp: "2-5",  median: 195000, p25: 165000, p75: 240000, yoyGrowth: 9,  openings: 2900 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "North America", city: "San Francisco",  exp: "5-10", median: 265000, p25: 220000, p75: 330000, yoyGrowth: 8,  openings: 1600 },
  { role: "Staff Engineer",                category: "Engineering", region: "North America", city: "San Francisco",  exp: "10+",  median: 370000, p25: 300000, p75: 480000, yoyGrowth: 12, openings: 540  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "San Francisco",  exp: "2-5",  median: 210000, p25: 175000, p75: 270000, yoyGrowth: 34, openings: 920  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "San Francisco",  exp: "5-10", median: 310000, p25: 255000, p75: 400000, yoyGrowth: 31, openings: 480  },
  { role: "Product Manager",               category: "Product",     region: "North America", city: "San Francisco",  exp: "2-5",  median: 175000, p25: 140000, p75: 220000, yoyGrowth: 7,  openings: 860  },
  { role: "Product Manager",               category: "Product",     region: "North America", city: "San Francisco",  exp: "5-10", median: 240000, p25: 195000, p75: 310000, yoyGrowth: 9,  openings: 420  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "North America", city: "San Francisco",  exp: "2-5",  median: 165000, p25: 135000, p75: 205000, yoyGrowth: 18, openings: 680  },
  { role: "Data Engineer",                 category: "Data & AI",   region: "North America", city: "San Francisco",  exp: "2-5",  median: 160000, p25: 130000, p75: 200000, yoyGrowth: 20, openings: 740  },
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "North America", city: "New York",       exp: "0-2",  median: 135000, p25: 110000, p75: 165000, yoyGrowth: 5,  openings: 2400 },
  { role: "Software Engineer (L4/SDE-2)",  category: "Engineering", region: "North America", city: "New York",       exp: "2-5",  median: 180000, p25: 150000, p75: 225000, yoyGrowth: 8,  openings: 1800 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "North America", city: "New York",       exp: "5-10", median: 245000, p25: 200000, p75: 305000, yoyGrowth: 7,  openings: 980  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "New York",       exp: "2-5",  median: 195000, p25: 160000, p75: 250000, yoyGrowth: 30, openings: 560  },
  { role: "Product Manager",               category: "Product",     region: "North America", city: "New York",       exp: "2-5",  median: 160000, p25: 130000, p75: 200000, yoyGrowth: 6,  openings: 620  },
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "North America", city: "Seattle",        exp: "0-2",  median: 150000, p25: 125000, p75: 180000, yoyGrowth: 7,  openings: 2100 },
  { role: "Software Engineer (L4/SDE-2)",  category: "Engineering", region: "North America", city: "Seattle",        exp: "2-5",  median: 200000, p25: 168000, p75: 248000, yoyGrowth: 10, openings: 1600 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "North America", city: "Seattle",        exp: "5-10", median: 272000, p25: 225000, p75: 340000, yoyGrowth: 9,  openings: 820  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "Seattle",        exp: "2-5",  median: 215000, p25: 178000, p75: 275000, yoyGrowth: 33, openings: 700  },
  // ── Europe ────────────────────────────────────────────────
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "London",        exp: "2-5",  median: 90000,  p25: 72000,  p75: 115000, yoyGrowth: 8,  openings: 3200 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "London",        exp: "5-10", median: 130000, p25: 105000, p75: 165000, yoyGrowth: 9,  openings: 1400 },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "London",        exp: "2-5",  median: 105000, p25: 85000,  p75: 135000, yoyGrowth: 28, openings: 680  },
  { role: "Product Manager",               category: "Product",     region: "Europe", city: "London",        exp: "2-5",  median: 95000,  p25: 75000,  p75: 120000, yoyGrowth: 7,  openings: 720  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Europe", city: "London",        exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 16, openings: 520  },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "Berlin",        exp: "2-5",  median: 75000,  p25: 60000,  p75: 95000,  yoyGrowth: 9,  openings: 2100 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "Berlin",        exp: "5-10", median: 108000, p25: 88000,  p75: 138000, yoyGrowth: 10, openings: 880  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "Berlin",        exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 26, openings: 420  },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "Amsterdam",     exp: "2-5",  median: 82000,  p25: 65000,  p75: 105000, yoyGrowth: 10, openings: 1600 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "Amsterdam",     exp: "5-10", median: 118000, p25: 95000,  p75: 150000, yoyGrowth: 11, openings: 620  },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "Paris",         exp: "2-5",  median: 68000,  p25: 54000,  p75: 87000,  yoyGrowth: 7,  openings: 1400 },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "Paris",         exp: "2-5",  median: 82000,  p25: 65000,  p75: 105000, yoyGrowth: 25, openings: 380  },
  // ── Asia Pacific ──────────────────────────────────────────
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 11, openings: 1800 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Singapore",  exp: "5-10", median: 130000, p25: 105000, p75: 165000, yoyGrowth: 12, openings: 720  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 98000,  p25: 78000,  p75: 128000, yoyGrowth: 30, openings: 420  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 92000,  p25: 73000,  p75: 118000, yoyGrowth: 9,  openings: 480  },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 26400,  p25: 20400,  p75: 36000,  yoyGrowth: 12, openings: 2200 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "5-10", median: 45600,  p25: 33600,  p75: 62400,  yoyGrowth: 10, openings: 980  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 30000,  p25: 22800,  p75: 43200,  yoyGrowth: 31, openings: 480  },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Asia Pacific", city: "Sydney",     exp: "2-5",  median: 105000, p25: 85000,  p75: 130000, yoyGrowth: 7,  openings: 1400 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Sydney",     exp: "5-10", median: 148000, p25: 120000, p75: 185000, yoyGrowth: 8,  openings: 580  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Sydney",     exp: "2-5",  median: 118000, p25: 95000,  p75: 152000, yoyGrowth: 27, openings: 320  },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Asia Pacific", city: "Tokyo",      exp: "2-5",  median: 72000,  p25: 58000,  p75: 92000,  yoyGrowth: 9,  openings: 1200 },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Tokyo",      exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 24, openings: 360  },
  // ── Middle East ───────────────────────────────────────────
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Middle East", city: "Dubai",      exp: "2-5",  median: 78000,  p25: 62000,  p75: 98000,  yoyGrowth: 20, openings: 1600 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Middle East", city: "Dubai",      exp: "5-10", median: 112000, p25: 90000,  p75: 142000, yoyGrowth: 22, openings: 640  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Middle East", city: "Dubai",      exp: "2-5",  median: 92000,  p25: 73000,  p75: 118000, yoyGrowth: 38, openings: 480  },
  { role: "Product Manager",               category: "Product",     region: "Middle East", city: "Dubai",      exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 16, openings: 420  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Middle East", city: "Dubai",      exp: "2-5",  median: 75000,  p25: 60000,  p75: 96000,  yoyGrowth: 19, openings: 360  },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Middle East", city: "Riyadh",     exp: "2-5",  median: 72000,  p25: 57000,  p75: 91000,  yoyGrowth: 24, openings: 1100 },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Middle East", city: "Riyadh",     exp: "2-5",  median: 86000,  p25: 68000,  p75: 110000, yoyGrowth: 40, openings: 380  },
];

const REGIONS    = ["All regions", "North America", "Europe", "Asia Pacific", "Middle East"];
const CATEGORIES = ["All", "Engineering", "Data & AI", "Product"];
const EXP_LEVELS = [
  { key: "all",  label: "All experience" },
  { key: "0-2",  label: "0–2 yrs"  },
  { key: "2-5",  label: "2–5 yrs"  },
  { key: "5-10", label: "5–10 yrs" },
  { key: "10+",  label: "10+ yrs"  },
] as const;

/* ── Negotiation tactics ─────────────────────────────────────── */
interface NegTactic { title: string; script: string; power: "high"|"medium"; timing: string; }
const TACTICS: NegTactic[] = [
  { title: "Anchor with market data", power: "high", timing: "When they ask your expectation first",
    script: `"Based on my research, the market range for this role in [city] is $X–$Y. Given my background in [specific skill], I'm targeting the upper end of that range."` },
  { title: "Counter with a specific number", power: "high", timing: "After receiving the first offer",
    script: `"Thank you for the offer of $X. Based on market data and what I bring to this role, I'm looking for $Y. Is there flexibility to get closer to that?"` },
  { title: "Competing offer leverage", power: "high", timing: "When you have another offer",
    script: `"I'm genuinely excited about this role. I do have another offer at $X that I need to respond to by [date]. If you can match or beat that, this is my first choice."` },
  { title: "Delay the salary question", power: "medium", timing: "Early-stage recruiter screen",
    script: `"I'd love to learn more about the scope of the role first. Can we come back to compensation after I understand the full picture?"` },
  { title: "Total comp framing", power: "medium", timing: "When base is stuck but equity/bonus is flexible",
    script: `"I understand the base band is fixed. Can we look at the equity grant or sign-on to bridge the gap? Total comp is what matters to me."` },
  { title: "The silent pause", power: "medium", timing: "Right after hearing the offer number",
    script: `Say "Thank you — let me think about that for a moment." Then go completely silent for 5 seconds. Many recruiters will immediately improve the offer or add "...there may be some flexibility."` },
  { title: "Justify the ask with proof", power: "high", timing: "Any negotiation conversation",
    script: `"The reason I'm asking for $X is [specific skill/project/impact]. [Brief proof point: 'I shipped X that generated Y']. That's why I believe the higher number is justified."` },
];

/* ── Underpaid verdict ───────────────────────────────────────── */
function underpaidVerdict(currentUSD: number, row: SalaryRow, cur: Currency) {
  const diff = ((currentUSD - row.median) / row.median) * 100;
  if (diff >= 15)  return { label: "Well paid",               color: "var(--success)", pct: diff, msg: `You're ${Math.abs(Math.round(diff))}% above the market median. Strong position.` };
  if (diff >= -5)  return { label: "At market rate",          color: "var(--warn)",    pct: diff, msg: `You're at market rate. Good baseline for a raise conversation — push for P75: ${fmtSalary(row.p75, cur)}.` };
  if (diff >= -20) return { label: "Underpaid",               color: "var(--danger)",  pct: diff, msg: `You're ${Math.abs(Math.round(diff))}% below the market median. You have strong grounds to negotiate or switch.` };
  return               { label: "Significantly underpaid",   color: "var(--danger)",  pct: diff, msg: `You're ${Math.abs(Math.round(diff))}% below market. A job switch could mean an immediate ${Math.abs(Math.round(diff))+10}%+ jump.` };
}

/* ── Page ────────────────────────────────────────────────────── */
export default function SalaryPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [region,    setRegion]    = useState("All regions");
  const [category,  setCategory]  = useState("All");
  const [exp,       setExp]       = useState<"all"|"0-2"|"2-5"|"5-10"|"10+">("all");
  const [search,    setSearch]    = useState("");
  const [sortBy,    setSortBy]    = useState<"median"|"growth"|"openings">("median");
  const [currency,  setCurrency]  = useState<Currency>("USD");
  const [activeTab, setActiveTab] = useState<"browse"|"underpaid"|"negotiate">("browse");
  const [showScript, setShowScript] = useState<number|null>(null);

  // Track XP on first visit
  useEffect(() => { trackAction("salary_checked", 120); }, []);

  // Underpaid checker
  const [upRole, setUpRole]     = useState("");
  const [upCity, setUpCity]     = useState("");
  const [upExp,  setUpExp]      = useState<"0-2"|"2-5"|"5-10"|"10+">("2-5");
  const [upVal,  setUpVal]      = useState("");
  const [upCur,  setUpCur]      = useState<Currency>("USD");

  // Negotiation analyser
  const [negCurrent, setNegCurrent] = useState("");
  const [negOffer,   setNegOffer]   = useState("");
  const [negRole,    setNegRole]    = useState("");
  const [negCity,    setNegCity]    = useState("");

  const filtered = useMemo(() => DATA
    .filter(d => region   === "All regions" || d.region   === region)
    .filter(d => category === "All"         || d.category === category)
    .filter(d => exp      === "all"         || d.exp      === exp)
    .filter(d => !search  || d.role.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "median" ? b.median - a.median : sortBy === "growth" ? b.yoyGrowth - a.yoyGrowth : b.openings - a.openings)
  , [region, category, exp, search, sortBy]);

  const topGainers = [...DATA].filter(d => d.exp === "2-5").sort((a,b) => b.yoyGrowth - a.yoyGrowth).slice(0, 4);
  const allCities  = [...new Set(DATA.map(d => d.city))].sort();
  const allRoles   = [...new Set(DATA.map(d => d.role))].sort();

  // Underpaid result
  const upResult = useMemo(() => {
    if (!upRole || !upVal || !upCity) return null;
    const currentUSD = Number(upVal) * CURRENCIES[upCur].toUSD;
    const row = DATA.find(d => d.role === upRole && d.city === upCity && d.exp === upExp);
    if (!row) return null;
    return { verdict: underpaidVerdict(currentUSD, row, upCur), row, currentUSD };
  }, [upRole, upCity, upExp, upVal, upCur]);

  // Negotiation result
  const negResult = useMemo(() => {
    if (!negCurrent || !negOffer || !negRole || !negCity) return null;
    const rate = CURRENCIES[currency].toUSD;
    const curUSD = Number(negCurrent) * rate;
    const offUSD = Number(negOffer)   * rate;
    const market = DATA.find(d => d.role === negRole && d.city === negCity);
    const hikePct = Math.round(((offUSD - curUSD) / curUSD) * 100);
    const vsMed   = market ? Math.round(((offUSD - market.median) / market.median) * 100) : null;
    return { curUSD, offUSD, hikePct, vsMed, market };
  }, [negCurrent, negOffer, negRole, negCity, currency]);

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };
  const chip = (active: boolean, col = "var(--accent)"): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", border: `1px solid ${active ? col + "55" : "var(--border)"}`,
    background: active ? col + "18" : "none", color: active ? col : "var(--text2)", transition: "all .15s",
  });
  const powerCol = { high: "var(--success)", medium: "var(--warn)" };

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            🌍 Global · 2025–2026
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>Global Salary Intelligence</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7, maxWidth: 580 }}>
            Real compensation across North America, Europe, Asia Pacific &amp; the Middle East.
            Benchmark your salary, spot if you're underpaid, and negotiate with data.
          </p>
        </div>

        {/* Currency picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)" }}>Display in:</span>
          {(Object.keys(CURRENCIES) as Currency[]).map(c => (
            <button key={c} onClick={() => setCurrency(c)} style={chip(currency === c, "#8b5cf6")}>
              {CURRENCIES[c].symbol} {c}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--surface2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {([["browse","📊 Browse"],["underpaid","🔍 Am I Underpaid?"],["negotiate","🤝 Negotiate"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "7px 16px", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 600,
              background: activeTab === key ? "var(--surface)" : "transparent",
              color: activeTab === key ? "var(--text1)" : "var(--text3)",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,.15)" : "none",
            }}>{label}</button>
          ))}
        </div>

        {/* ══ UNDERPAID ══ */}
        {activeTab === "underpaid" && (
          <div style={{ maxWidth: 620 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Am I underpaid?</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24, lineHeight: 1.7 }}>
              Enter your current salary — we benchmark you against real market data instantly.
            </p>
            <div style={{ ...card, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Currency</label>
                  <select value={upCur} onChange={e => setUpCur(e.target.value as Currency)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    {(Object.keys(CURRENCIES) as Currency[]).map(c => <option key={c} value={c}>{CURRENCIES[c].symbol} {c} — {CURRENCIES[c].name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Current salary ({upCur === "INR" ? "LPA" : "/yr"})</label>
                  <input type="number" placeholder={upCur === "INR" ? "e.g. 25" : "e.g. 120000"} value={upVal} onChange={e => setUpVal(e.target.value)}
                    style={{ padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 15, fontWeight: 600, fontFamily: "inherit", width: "100%" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Role</label>
                <select value={upRole} onChange={e => setUpRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                  <option value="">Select role…</option>
                  {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>City</label>
                  <select value={upCity} onChange={e => setUpCity(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="">Select city…</option>
                    {allCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Experience</label>
                  <select value={upExp} onChange={e => setUpExp(e.target.value as typeof upExp)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="0-2">0–2 years</option>
                    <option value="2-5">2–5 years</option>
                    <option value="5-10">5–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>

              {upResult && (() => {
                const { verdict, row, currentUSD } = upResult;
                const maxUSD = row.p75 * 1.2;
                return (
                  <div style={{ background: "var(--surface)", borderRadius: 14, border: `2px solid ${verdict.color}44`, padding: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: verdict.color }}>{verdict.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: verdict.color }}>{verdict.pct > 0 ? "+" : ""}{Math.round(verdict.pct)}%</div>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>{verdict.msg}</p>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 5 }}>
                        <span>P25: {fmtSalary(row.p25, upCur)}</span>
                        <span>Median: {fmtSalary(row.median, upCur)}</span>
                        <span>P75: {fmtSalary(row.p75, upCur)}</span>
                      </div>
                      <div style={{ position: "relative", height: 10, background: "var(--surface2)", borderRadius: 5 }}>
                        <div style={{ position: "absolute", left: `${(row.p25/maxUSD)*100}%`, width: `${((row.p75-row.p25)/maxUSD)*100}%`, height: "100%", background: "rgba(99,102,241,.3)", borderRadius: 5 }} />
                        <div style={{ position: "absolute", left: `${(row.median/maxUSD)*100}%`, transform: "translateX(-50%)", width: 3, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                        <div style={{ position: "absolute", left: `${Math.min(95,Math.max(2,(currentUSD/maxUSD)*100))}%`, transform: "translateX(-50%)", width: 4, height: "140%", top: "-20%", background: verdict.color, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 11, color: verdict.color, marginTop: 4, fontWeight: 600, textAlign: "right" }}>← You are here</div>
                    </div>
                    {verdict.pct < 0 && (
                      <button onClick={() => { setNegRole(upRole); setNegCity(upCity); setActiveTab("negotiate"); }} style={{ padding: "9px 18px", borderRadius: 9, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        Get the negotiation script →
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ══ NEGOTIATE ══ */}
        {activeTab === "negotiate" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Salary Negotiation Coach</h2>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 580 }}>
                85% of people who negotiate get more. Most don't because they don't know what to say. Here's your playbook — word for word.
              </p>
            </div>

            {/* Offer analyser */}
            <div style={{ ...card, padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 Analyse this offer</h3>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: `Current salary (${currency}${currency==="INR"?" LPA":"/yr"})`, val: negCurrent, set: setNegCurrent, ph: currency==="INR"?"e.g. 25":"e.g. 120000" },
                  { label: `Offer amount (${currency}${currency==="INR"?" LPA":"/yr"})`,    val: negOffer,   set: setNegOffer,   ph: currency==="INR"?"e.g. 38":"e.g. 160000" },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{f.label}</label>
                    <input type="number" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                      style={{ padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 14, fontFamily: "inherit", width: "100%" }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Role</label>
                  <select value={negRole} onChange={e => setNegRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="">Select role…</option>
                    {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>City</label>
                  <select value={negCity} onChange={e => setNegCity(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="">Select city…</option>
                    {allCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {negResult && (() => {
                const { hikePct, vsMed, market } = negResult;
                const shouldCounter = market ? negResult.offUSD < market.p75 : hikePct < 20;
                const targetLocal   = market ? fmtSalary(market.p75, currency) : null;
                return (
                  <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Hike</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: hikePct >= 30 ? "var(--success)" : hikePct >= 15 ? "var(--warn)" : "var(--danger)" }}>+{hikePct}%</div>
                      </div>
                      {vsMed !== null && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>vs market median</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: vsMed >= 10 ? "var(--success)" : vsMed >= -10 ? "var(--warn)" : "var(--danger)" }}>{vsMed > 0?"+":""}{vsMed}%</div>
                        </div>
                      )}
                      {targetLocal && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>P75 target</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent)" }}>{targetLocal}</div>
                        </div>
                      )}
                    </div>
                    {shouldCounter ? (
                      <div style={{ padding: 16, background: "var(--accdim)", borderRadius: 10, border: "1px solid var(--accborder)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>💡 Counter this offer. Here's what to say:</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, fontStyle: "italic" }}>
                          {`"Thank you for the offer — I'm excited about this role. Based on my research, the market range for this position in ${negCity} is ${market ? fmtSalary(market.p25, currency) : "—"}–${targetLocal ?? "—"}. Given my experience, I'm targeting ${targetLocal ?? "the upper range"}. Is there flexibility to get closer to that?"`}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: 16, background: "rgba(34,197,94,.06)", borderRadius: 10, border: "1px solid rgba(34,197,94,.2)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 4 }}>✅ Strong offer — at or above P75 market rate.</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>Still worth asking for equity or sign-on bonus. Asking once never hurts.</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Tactics library */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎯 Proven negotiation tactics</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TACTICS.map((t, i) => (
                <div key={i} style={{ ...card, overflow: "hidden" }}>
                  <button onClick={() => setShowScript(showScript === i ? null : i)} style={{
                    width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontFamily: "inherit",
                  }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text1)" }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>When: {t.timing}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: powerCol[t.power]+"20", color: powerCol[t.power], border: `1px solid ${powerCol[t.power]}44` }}>{t.power} impact</span>
                      <span style={{ color: "var(--text3)" }}>{showScript === i ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {showScript === i && (
                    <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border2)" }}>
                      <div style={{ marginTop: 14, padding: "14px 16px", background: "var(--surface2)", borderRadius: 10, fontSize: 13, color: "var(--text2)", lineHeight: 1.7, fontStyle: "italic", borderLeft: "3px solid var(--accent)" }}>
                        {t.script}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              💡 <strong style={{ color: "var(--accent)" }}>Always negotiate.</strong> The worst outcome is "no" — you keep the offer. The best outcome adds $5K–$30K with a single 5-minute conversation.
            </div>
          </div>
        )}

        {/* ══ BROWSE ══ */}
        {activeTab === "browse" && (
          <>
            {/* Hot roles */}
            <div style={{ ...card, padding: "18px 20px", marginBottom: 24, background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor: "var(--accborder)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>🔥 Fastest-growing roles globally (2025–26 YoY)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 10 }}>
                {topGainers.map(r => (
                  <div key={r.role+r.city} style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text1)", marginBottom: 2, lineHeight: 1.3 }}>{r.role}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{r.city}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>+{r.yoyGrowth}%</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>YoY · {fmtSalary(r.median, currency)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {REGIONS.map(r => <button key={r} style={chip(region === r)} onClick={() => setRegion(r)}>{r}</button>)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {CATEGORIES.map(c => <button key={c} style={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {EXP_LEVELS.map(e => <button key={e.key} style={chip(exp === e.key, "#a78bfa")} onClick={() => setExp(e.key as typeof exp)}>{e.label}</button>)}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search role or city…"
                style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: 2, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", padding: 3 }}>
                {[["median","Salary"],["growth","Growth"],["openings","Openings"]].map(([k,l]) => (
                  <button key={k} onClick={() => setSortBy(k as typeof sortBy)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: sortBy===k?"var(--accent)":"transparent", color: sortBy===k?"#fff":"var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "var(--text3)", fontSize: 13 }}>No data for this combination. Try different filters.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map((row, i) => (
                  <div key={i} style={{ ...card, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 3 }}>{row.role}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{row.city} · {row.region} · {row.exp} yrs · {row.openings.toLocaleString()} openings</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 100 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", letterSpacing: "-.03em" }}>{fmtSalary(row.median, currency)}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>median/yr</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{fmtSalary(row.p25, currency)} – {fmtSalary(row.p75, currency)}</div>
                      </div>
                      <div style={{ minWidth: 140, display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
                        <div style={{ position: "relative", height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ position: "absolute", left: `${(row.p25/(row.p75*1.2))*100}%`, width: `${((row.p75-row.p25)/(row.p75*1.2))*100}%`, height: "100%", background: "rgba(99,102,241,.3)", borderRadius: 4 }} />
                          <div style={{ position: "absolute", left: `${(row.median/(row.p75*1.2))*100}%`, transform: "translateX(-50%)", width: 3, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 55 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: row.yoyGrowth>=20?"var(--success)":row.yoyGrowth>=10?"var(--warn)":"var(--text2)" }}>+{row.yoyGrowth}%</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>YoY</div>
                      </div>
                      <button onClick={() => { setNegRole(row.role); setNegCity(row.city); setActiveTab("negotiate"); }} style={{ padding: "7px 14px", borderRadius: 8, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Negotiate →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 28, padding: "14px 18px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
                <strong style={{ color: "var(--text2)" }}>Sources:</strong> 2025–2026 offer letters, levels.fyi, Glassdoor, and community-reported compensation. All figures annual gross pre-tax. INR shown as LPA.{" "}
                <Link href="/builder" style={{ color: "var(--accent)" }}>Build your resume →</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
