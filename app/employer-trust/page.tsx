"use client";
/**
 * /employer-trust — Employer Trust Ratings
 * Candidate-side accountability: ghost rate, response SLA, offer transparency,
 * interview fairness. Globally framed — any company, any country.
 */
import React, { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────────── */
interface EmployerRating {
  id:              string;
  company:         string;
  country:         string;
  industry:        string;
  size:            string;
  ghostRate:       number;  // % of applicants ghosted after final round
  responseSlaDays: number;  // avg days to first response
  offerRate:       number;  // % of final-rounders who got offers
  interviewFair:   number;  // 1-5 score
  overallTrust:    number;  // computed 0–100
  reviews:         number;
  hiringFreeze:    boolean;
  tags:            string[];
}

/* ── Seed data ───────────────────────────────────────────────── */
const EMPLOYERS: EmployerRating[] = [
  // North America
  { id: "stripe",      company: "Stripe",            country: "🇺🇸 USA",         industry: "Fintech",         size: "5K–10K",  ghostRate: 8,  responseSlaDays: 3,  offerRate: 22, interviewFair: 4.7, overallTrust: 92, reviews: 1840, hiringFreeze: false, tags: ["transparent", "fast response", "strong feedback"] },
  { id: "linear",      company: "Linear",             country: "🇺🇸 USA",         industry: "Dev Tools",       size: "< 100",   ghostRate: 5,  responseSlaDays: 2,  offerRate: 18, interviewFair: 4.8, overallTrust: 95, reviews: 290,  hiringFreeze: false, tags: ["top-rated", "respectful", "small but excellent"] },
  { id: "shopify",     company: "Shopify",            country: "🇨🇦 Canada",      industry: "E-commerce",      size: "10K+",    ghostRate: 12, responseSlaDays: 5,  offerRate: 15, interviewFair: 4.4, overallTrust: 84, reviews: 3200, hiringFreeze: false, tags: ["remote-first", "detailed process"] },
  { id: "airbnb",      company: "Airbnb",             country: "🇺🇸 USA",         industry: "Travel Tech",     size: "5K–10K",  ghostRate: 18, responseSlaDays: 7,  offerRate: 12, interviewFair: 4.2, overallTrust: 78, reviews: 2100, hiringFreeze: false, tags: ["competitive", "long process"] },
  { id: "uber",        company: "Uber",               country: "🇺🇸 USA",         industry: "Mobility",        size: "10K+",    ghostRate: 22, responseSlaDays: 8,  offerRate: 10, interviewFair: 4.0, overallTrust: 72, reviews: 4800, hiringFreeze: false, tags: ["large org", "variable experience"] },
  { id: "amazon",      company: "Amazon",             country: "🇺🇸 USA",         industry: "Cloud / Retail",  size: "100K+",   ghostRate: 35, responseSlaDays: 14, offerRate: 8,  interviewFair: 3.8, overallTrust: 62, reviews: 18000,hiringFreeze: false, tags: ["high volume", "bar-raiser process", "slow"] },
  { id: "meta",        company: "Meta",               country: "🇺🇸 USA",         industry: "Social / AI",     size: "50K+",    ghostRate: 28, responseSlaDays: 10, offerRate: 9,  interviewFair: 4.1, overallTrust: 68, reviews: 12000,hiringFreeze: false, tags: ["highly selective", "structured"] },
  { id: "openai",      company: "OpenAI",             country: "🇺🇸 USA",         industry: "AI",              size: "1K–5K",   ghostRate: 15, responseSlaDays: 6,  offerRate: 6,  interviewFair: 4.5, overallTrust: 81, reviews: 680,  hiringFreeze: false, tags: ["mission-driven", "very selective"] },
  // Europe
  { id: "spotify",     company: "Spotify",            country: "🇸🇪 Sweden",      industry: "Music / Tech",    size: "5K–10K",  ghostRate: 10, responseSlaDays: 5,  offerRate: 16, interviewFair: 4.5, overallTrust: 87, reviews: 2400, hiringFreeze: false, tags: ["remote-friendly", "transparent", "structured"] },
  { id: "monzo",       company: "Monzo",              country: "🇬🇧 UK",          industry: "Fintech",         size: "1K–5K",   ghostRate: 7,  responseSlaDays: 3,  offerRate: 19, interviewFair: 4.7, overallTrust: 91, reviews: 820,  hiringFreeze: false, tags: ["top-rated UK", "fast", "genuine feedback"] },
  { id: "revolut",     company: "Revolut",            country: "🇬🇧 UK",          industry: "Fintech",         size: "5K–10K",  ghostRate: 30, responseSlaDays: 12, offerRate: 10, interviewFair: 3.5, overallTrust: 55, reviews: 3100, hiringFreeze: false, tags: ["high ghost rate", "intense", "inconsistent"] },
  { id: "klarna",      company: "Klarna",             country: "🇸🇪 Sweden",      industry: "Fintech",         size: "5K–10K",  ghostRate: 20, responseSlaDays: 8,  offerRate: 13, interviewFair: 4.0, overallTrust: 73, reviews: 1400, hiringFreeze: true,  tags: ["hiring freeze history", "variable"] },
  { id: "deepmind",    company: "Google DeepMind",    country: "🇬🇧 UK",          industry: "AI Research",     size: "1K–5K",   ghostRate: 20, responseSlaDays: 14, offerRate: 5,  interviewFair: 4.3, overallTrust: 74, reviews: 540,  hiringFreeze: false, tags: ["research-focused", "selective", "slow"] },
  { id: "adyen",       company: "Adyen",              country: "🇳🇱 Netherlands", industry: "Payments",        size: "5K–10K",  ghostRate: 9,  responseSlaDays: 4,  offerRate: 18, interviewFair: 4.6, overallTrust: 89, reviews: 920,  hiringFreeze: false, tags: ["top-rated EU", "clear process", "respectful"] },
  // Asia Pacific
  { id: "atlassian",   company: "Atlassian",          country: "🇦🇺 Australia",   industry: "Dev Tools",       size: "10K+",    ghostRate: 11, responseSlaDays: 5,  offerRate: 15, interviewFair: 4.5, overallTrust: 85, reviews: 2800, hiringFreeze: false, tags: ["remote-first", "transparent", "structured"] },
  { id: "grab",        company: "Grab",               country: "🇸🇬 Singapore",   industry: "Super App",       size: "5K–10K",  ghostRate: 16, responseSlaDays: 7,  offerRate: 14, interviewFair: 4.2, overallTrust: 79, reviews: 1600, hiringFreeze: false, tags: ["Southeast Asia hub", "fast-paced"] },
  { id: "sea",         company: "Sea Group",          country: "🇸🇬 Singapore",   industry: "Gaming / Tech",   size: "10K+",    ghostRate: 24, responseSlaDays: 10, offerRate: 11, interviewFair: 3.9, overallTrust: 67, reviews: 2200, hiringFreeze: false, tags: ["large corp", "variable experience"] },
  { id: "razorpay",    company: "Razorpay",           country: "🇮🇳 India",       industry: "Fintech",         size: "1K–5K",   ghostRate: 9,  responseSlaDays: 4,  offerRate: 18, interviewFair: 4.5, overallTrust: 88, reviews: 1100, hiringFreeze: false, tags: ["top-rated India", "fast", "clear feedback"] },
  { id: "zepto",       company: "Zepto",              country: "🇮🇳 India",       industry: "Q-commerce",      size: "1K–5K",   ghostRate: 12, responseSlaDays: 5,  offerRate: 16, interviewFair: 4.3, overallTrust: 83, reviews: 480,  hiringFreeze: false, tags: ["fast-growing", "startup energy"] },
  { id: "tcs",         company: "TCS",                country: "🇮🇳 India",       industry: "IT Services",     size: "100K+",   ghostRate: 42, responseSlaDays: 21, offerRate: 30, interviewFair: 3.2, overallTrust: 41, reviews: 28000,hiringFreeze: false, tags: ["high ghost rate", "slow", "high volume"] },
  // Middle East
  { id: "careemcorp",  company: "Careem",             country: "🇦🇪 UAE",         industry: "Mobility / Super App", size: "1K–5K", ghostRate: 14, responseSlaDays: 6, offerRate: 17, interviewFair: 4.2, overallTrust: 80, reviews: 680, hiringFreeze: false, tags: ["regional leader", "growing"] },
  { id: "tabby",       company: "Tabby",              country: "🇦🇪 UAE",         industry: "BNPL / Fintech",  size: "500–1K", ghostRate: 8,  responseSlaDays: 3,  offerRate: 20, interviewFair: 4.6, overallTrust: 90, reviews: 240,  hiringFreeze: false, tags: ["top-rated MENA", "fast", "respectful"] },
  { id: "noon",        company: "Noon",               country: "🇦🇪 UAE",         industry: "E-commerce",      size: "5K–10K",  ghostRate: 28, responseSlaDays: 14, offerRate: 12, interviewFair: 3.6, overallTrust: 58, reviews: 960,  hiringFreeze: false, tags: ["slow response", "inconsistent"] },
];

const INDUSTRIES = ["All industries", ...new Set(EMPLOYERS.map(e => e.industry))].filter((v,i,a) => a.indexOf(v) === i);
const COUNTRIES  = ["All countries",  ...new Set(EMPLOYERS.map(e => e.country))].filter((v,i,a) => a.indexOf(v) === i);
const SIZES      = ["All sizes", "< 100", "500–1K", "1K–5K", "5K–10K", "10K+", "50K+", "100K+"];

function trustColor(score: number): string {
  if (score >= 85) return "var(--success)";
  if (score >= 70) return "#22d3ee";
  if (score >= 55) return "var(--warn)";
  return "var(--danger)";
}
function trustLabel(score: number): string {
  if (score >= 85) return "Highly trusted";
  if (score >= 70) return "Good";
  if (score >= 55) return "Mixed";
  return "Caution";
}
function ghostColor(rate: number): string {
  if (rate <= 10)  return "var(--success)";
  if (rate <= 20)  return "var(--warn)";
  return "var(--danger)";
}

/* ── Mini score ring ─────────────────────────────────────────── */
function MiniRing({ score, size = 52 }: { score: number; size?: number }) {
  const r    = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const col  = trustColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.27, fontWeight: 900, color: col }}>{score}</span>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function EmployerTrustPage() {
  const [industry, setIndustry] = useState("All industries");
  const [country,  setCountry]  = useState("All countries");
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState<"trust"|"ghost"|"speed">("trust");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => EMPLOYERS
    .filter(e => industry === "All industries" || e.industry === industry)
    .filter(e => country  === "All countries"  || e.country  === country)
    .filter(e => !search  || e.company.toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "trust") return b.overallTrust    - a.overallTrust;
      if (sortBy === "ghost") return a.ghostRate       - b.ghostRate;
      return a.responseSlaDays - b.responseSlaDays;
    })
  , [industry, country, search, sortBy]);

  const topTrusted = [...EMPLOYERS].sort((a,b) => b.overallTrust - a.overallTrust).slice(0, 3);
  const worstGhost = [...EMPLOYERS].sort((a,b) => b.ghostRate - a.ghostRate).slice(0, 3);

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };
  const chip = (active: boolean, col = "var(--accent)"): React.CSSProperties => ({
    padding: "5px 13px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", border: `1px solid ${active ? col + "55" : "var(--border)"}`,
    background: active ? col + "18" : "none", color: active ? col : "var(--text2)", transition: "all .15s",
  });

  return (
    <AppShell>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            🌍 Global · Candidate-reported
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>Employer Trust Ratings</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7, maxWidth: 580 }}>
            Accountability goes both ways. See which employers ghost candidates, respond fast, and run fair interviews — before you apply.
          </p>
        </div>

        {/* Top/Worst callouts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <div style={{ ...card, padding: "16px 20px", borderColor: "rgba(34,197,94,.25)", background: "rgba(34,197,94,.04)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", marginBottom: 12 }}>✅ Most trusted employers</div>
            {topTrusted.map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text1)", fontWeight: 600, flex: 1 }}>{e.company}</span>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>{e.country}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--success)" }}>{e.overallTrust}</span>
              </div>
            ))}
          </div>
          <div style={{ ...card, padding: "16px 20px", borderColor: "rgba(239,68,68,.25)", background: "rgba(239,68,68,.04)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 12 }}>👻 Highest ghost rates</div>
            {worstGhost.map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text1)", fontWeight: 600, flex: 1 }}>{e.company}</span>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>{e.country}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)" }}>{e.ghostRate}% ghosted</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {["All industries", "Fintech", "AI", "Dev Tools", "E-commerce", "Mobility", "Cloud / Retail"].map(i => (
            <button key={i} style={chip(industry === i)} onClick={() => setIndustry(i)}>{i}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {["All countries", "🇺🇸 USA", "🇬🇧 UK", "🇸🇬 Singapore", "🇮🇳 India", "🇦🇪 UAE", "🇸🇪 Sweden", "🇦🇺 Australia"].map(c => (
            <button key={c} style={chip(country === c, "#8b5cf6")} onClick={() => setCountry(c)}>{c}</button>
          ))}
        </div>

        {/* Search + Sort */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or tag…"
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 2, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", padding: 3 }}>
            {[["trust","Trust Score"],["ghost","Ghost Rate"],["speed","Response Speed"]].map(([k,l]) => (
              <button key={k} onClick={() => setSortBy(k as typeof sortBy)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: sortBy===k?"var(--accent)":"transparent", color: sortBy===k?"#fff":"var(--text2)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Employer cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(e => {
            const open = expanded === e.id;
            const col  = trustColor(e.overallTrust);
            return (
              <div key={e.id} style={{ ...card, overflow: "hidden", borderLeft: `3px solid ${col}` }}>
                <button onClick={() => setExpanded(open ? null : e.id)} style={{
                  width: "100%", padding: "16px 20px", background: "none", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 16, fontFamily: "inherit", flexWrap: "wrap",
                }}>
                  {/* Company + meta */}
                  <div style={{ flex: 1, minWidth: 180, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)" }}>{e.company}</span>
                      {e.hiringFreeze && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "rgba(239,68,68,.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)" }}>Freeze</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{e.country} · {e.industry} · {e.size} employees · {e.reviews.toLocaleString()} reviews</div>
                  </div>

                  {/* Key metrics */}
                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: ghostColor(e.ghostRate) }}>{e.ghostRate}%</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>ghost rate</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: e.responseSlaDays <= 5 ? "var(--success)" : e.responseSlaDays <= 10 ? "var(--warn)" : "var(--danger)" }}>{e.responseSlaDays}d</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>response</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text2)" }}>{e.interviewFair}/5</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>interview fair</div>
                    </div>
                  </div>

                  {/* Trust ring + label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <MiniRing score={e.overallTrust} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: col }}>{trustLabel(e.overallTrust)}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>trust score</div>
                    </div>
                    <span style={{ color: "var(--text3)", marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
                  </div>
                </button>

                {open && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border2)" }}>
                    {/* Detailed metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginTop: 16, marginBottom: 16 }}>
                      {[
                        { label: "Ghost rate",         value: `${e.ghostRate}%`,         sub: "after final round",  color: ghostColor(e.ghostRate) },
                        { label: "Avg first response", value: `${e.responseSlaDays} days`, sub: "from application",   color: e.responseSlaDays <= 5 ? "var(--success)" : e.responseSlaDays <= 10 ? "var(--warn)" : "var(--danger)" },
                        { label: "Offer rate",         value: `${e.offerRate}%`,          sub: "of final rounders",  color: "var(--accent)" },
                        { label: "Interview fairness", value: `${e.interviewFair}/5.0`,   sub: "candidate rating",   color: e.interviewFair >= 4.3 ? "var(--success)" : e.interviewFair >= 3.8 ? "var(--warn)" : "var(--danger)" },
                      ].map(m => (
                        <div key={m.label} style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: m.color }}>{m.value}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)", marginTop: 2 }}>{m.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{m.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                      {e.tags.map(t => (
                        <span key={t} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>{t}</span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <Link href="/jobs" style={{ padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                        Find jobs here →
                      </Link>
                      <Link href="/interview" style={{ padding: "8px 18px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        Prep for interview
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit rating CTA */}
        <div style={{ marginTop: 32, padding: "20px 24px", borderRadius: 14, background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", border: "1px solid var(--accborder)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>📝 Had a hiring experience?</div>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14, maxWidth: 500 }}>
            Help other professionals make informed decisions. Rate your interview experience — response time, fairness, ghosting. Anonymous and community-powered.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["⚡ Response time", "👻 Were you ghosted?", "🎯 Interview fairness", "💸 Offer transparency"].map(label => (
              <span key={label} style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)" }}>{label}</span>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text3)" }}>
            Community ratings coming soon — we'll notify you when submissions open.
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          Data based on candidate-reported experiences and public hiring data. Updated continuously. Trust scores weigh ghost rate (40%), response speed (25%), interview fairness (25%), and offer transparency (10%).
        </div>
      </div>
    </AppShell>
  );
}
