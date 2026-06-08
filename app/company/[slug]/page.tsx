"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Types ─────────────────────────────────────────────────── */
interface CompanyProfile {
  slug: string;
  name: string;
  logo: string;
  tagline: string;
  industry: string;
  size: string;
  hq: string;
  founded: number;
  verified: boolean;

  // Salary data
  salaryBands: { role: string; low: number; high: number; median: number; reports: number }[];

  // Attrition signals
  attritionRate: number;         // % annually
  attritionTrend: "up" | "stable" | "down";
  avgTenure: number;             // years
  rehireRate: number;            // % of ex-employees who return

  // Interview intel
  interviewRounds: number;
  avgOfferDays: number;
  offerRate: number;             // % of who clears all rounds
  interviewTopics: string[];
  interviewStyle: string;

  // Financial health
  fundingStage: string;
  lastFunding: string;
  runway: string;
  profitability: string;

  // Culture
  cultureScore: number;          // 1–10
  workLifeScore: number;
  growthScore: number;
  diversityScore: number;

  // Open roles
  openRoles: { title: string; city: string; type: string; band: string }[];
}

/* ── Mock company data ─────────────────────────────────────── */
const COMPANIES: Record<string, CompanyProfile> = {
  razorpay: {
    slug: "razorpay", name: "Razorpay", logo: "R", tagline: "India's leading payment gateway",
    industry: "FinTech", size: "3,500–4,000", hq: "Bangalore", founded: 2014, verified: true,
    salaryBands: [
      { role: "Software Engineer L4", low: 2800000, high: 4200000, median: 3500000, reports: 23 },
      { role: "Product Manager", low: 3200000, high: 5000000, median: 4100000, reports: 11 },
      { role: "Data Engineer", low: 2200000, high: 3600000, median: 2900000, reports: 8 },
      { role: "Engineering Manager", low: 5500000, high: 9000000, median: 7200000, reports: 6 },
    ],
    attritionRate: 18, attritionTrend: "stable", avgTenure: 2.8, rehireRate: 12,
    interviewRounds: 5, avgOfferDays: 11, offerRate: 8,
    interviewTopics: ["DSA", "System Design", "Product Sense", "Bar Raiser", "HR"],
    interviewStyle: "Structured — LeetCode-style coding + distributed systems design. Expect a bar-raiser round.",
    fundingStage: "Series F", lastFunding: "Apr 2021 · $375M", runway: "Profitable (2024)", profitability: "EBITDA positive",
    cultureScore: 7.8, workLifeScore: 6.9, growthScore: 8.4, diversityScore: 7.2,
    openRoles: [
      { title: "Senior Backend Engineer", city: "Bangalore", type: "Hybrid", band: "₹28–42L" },
      { title: "Product Manager II", city: "Mumbai", type: "Remote", band: "₹32–50L" },
      { title: "Staff Data Engineer", city: "Bangalore", type: "Onsite", band: "₹40–60L" },
    ],
  },
  swiggy: {
    slug: "swiggy", name: "Swiggy", logo: "S", tagline: "India's leading food delivery platform",
    industry: "Food-Tech / Delivery", size: "6,000–7,000", hq: "Bangalore", founded: 2014, verified: true,
    salaryBands: [
      { role: "Software Engineer L5", low: 3500000, high: 5500000, median: 4500000, reports: 31 },
      { role: "Engineering Manager", low: 6000000, high: 10000000, median: 8000000, reports: 9 },
      { role: "Product Manager III", low: 4000000, high: 6500000, median: 5200000, reports: 14 },
    ],
    attritionRate: 22, attritionTrend: "up", avgTenure: 2.2, rehireRate: 9,
    interviewRounds: 6, avgOfferDays: 15, offerRate: 6,
    interviewTopics: ["DSA", "Machine Learning", "System Design", "Leadership", "Bar Raiser", "HR"],
    interviewStyle: "Rigorous. Heavy ML focus for data roles. Expect multiple system design rounds for senior positions.",
    fundingStage: "IPO filed (2023)", lastFunding: "IPO · ₹11,327 Cr", runway: "Listed company", profitability: "Path to profitability",
    cultureScore: 7.2, workLifeScore: 6.4, growthScore: 8.1, diversityScore: 7.6,
    openRoles: [
      { title: "Staff Software Engineer", city: "Bangalore", type: "Hybrid", band: "₹45–65L" },
      { title: "Senior PM – Growth", city: "Bangalore", type: "Hybrid", band: "₹40–58L" },
    ],
  },
};

function getCompany(slug: string): CompanyProfile | null {
  return COMPANIES[slug] ?? null;
}

/* ── Sub-components ─────────────────────────────────────────── */
function ScoreDot({ score, label }: { score: number; label: string }) {
  const color = score >= 8 ? "var(--success)" : score >= 6.5 ? "var(--warn)" : "var(--danger)";
  return (
    <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 4, alignItems: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color }}>
        {score.toFixed(1)}
      </div>
      <div style={{ fontSize: 10, color: "var(--text3)", textAlign: "center" }}>{label}</div>
    </div>
  );
}

function SalaryBar({ band }: { band: { role: string; low: number; high: number; median: number; reports: number } }) {
  const max = band.high * 1.1;
  const toW = (v: number) => `${(v / max) * 100}%`;
  function fmt(n: number) { return `₹${(n / 100000).toFixed(0)}L`; }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)" }}>{band.role}</span>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{band.reports} reports</span>
      </div>
      <div style={{ position: "relative", height: 14, background: "var(--border)", borderRadius: 7, overflow: "hidden" }}>
        {/* range */}
        <div style={{ position: "absolute", left: toW(band.low), width: `${((band.high - band.low) / max) * 100}%`, height: "100%", background: "rgba(99,102,241,.25)", borderRadius: 4 }} />
        {/* median marker */}
        <div style={{ position: "absolute", left: toW(band.median), transform: "translateX(-50%)", width: 3, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: "var(--text3)" }}>{fmt(band.low)}</span>
        <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>Median {fmt(band.median)}</span>
        <span style={{ fontSize: 10, color: "var(--text3)" }}>{fmt(band.high)}</span>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function CompanyPage({ params }: { params: { slug: string } }) {
  const company = getCompany(params.slug);
  const [tab, setTab] = useState<"overview" | "salary" | "interview" | "roles">("overview");

  if (!company) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text1)", fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Company not found</h1>
        <p style={{ color: "var(--text3)", marginBottom: 24 }}>We don't have verified data for this company yet.</p>
        <Link href="/jobs" style={{ padding: "10px 20px", background: "var(--accent)", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>Browse Jobs</Link>
      </div>
    );
  }

  const attritionColor = company.attritionTrend === "down" ? "var(--success)" : company.attritionTrend === "up" ? "var(--danger)" : "var(--warn)";
  const attritionLabel = company.attritionTrend === "down" ? "↓ Improving" : company.attritionTrend === "up" ? "↑ Rising" : "→ Stable";

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "salary", label: "Salary Bands" },
    { key: "interview", label: "Interview Intel" },
    { key: "roles", label: `Open Roles (${company.openRoles.length})` },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)", fontFamily: "var(--font-inter, Inter, sans-serif)" }}>

      {/* Topbar */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0 24px", background: "var(--nav-bg, #0d0d14)", display: "flex", alignItems: "center", height: 52, gap: 12 }}>
        <Link href="/jobs" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>← Jobs</Link>
        <div style={{ width: 1, height: 18, background: "var(--border)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{company.name}</span>
        {company.verified && (
          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,.1)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)" }}>
            ✓ Verified
          </span>
        )}
        <div style={{ flex: 1 }} />
        <Link href="/employer-dashboard" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>Are you hiring? →</Link>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

        {/* Company header */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
            {company.logo}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 3 }}>{company.name}</h1>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>{company.tagline}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                `📍 ${company.hq}`,
                `🏭 ${company.industry}`,
                `👥 ${company.size} employees`,
                `📅 Est. ${company.founded}`,
                `💰 ${company.fundingStage}`,
              ].map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: "9px 16px", borderRadius: "8px 8px 0 0", fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
                background: tab === t.key ? "var(--surface)" : "transparent",
                color: tab === t.key ? "var(--accent)" : "var(--text3)",
                border: "none", borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer", fontFamily: "inherit", marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            {/* Culture scores */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Culture Scores (from verified employees)</div>
              <div style={{ display: "flex", gap: 0 }}>
                <ScoreDot score={company.cultureScore} label="Overall Culture" />
                <ScoreDot score={company.workLifeScore} label="Work-Life Balance" />
                <ScoreDot score={company.growthScore} label="Career Growth" />
                <ScoreDot score={company.diversityScore} label="Diversity & Inclusion" />
              </div>
            </div>

            {/* Attrition signals */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Attrition & Retention Signals</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Annual Attrition</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: attritionColor }}>{company.attritionRate}%</div>
                  <div style={{ fontSize: 10, color: attritionColor, marginTop: 2 }}>{attritionLabel}</div>
                </div>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Avg Tenure</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text1)" }}>{company.avgTenure}y</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>vs 2.1y industry avg</div>
                </div>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Boomerang Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text1)" }}>{company.rehireRate}%</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>ex-employees return</div>
                </div>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Financial Health</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--success)", lineHeight: 1.3 }}>{company.profitability}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{company.lastFunding}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
                💡 <strong style={{ color: "var(--accent)" }}>What this means for you:</strong> A high boomerang rate ({company.rehireRate}%) means the company is worth returning to — a good sign for culture and growth. An attrition rate of {company.attritionRate}% {company.attritionRate > 25 ? "is above average — probe for burnout in interviews." : "is typical for Indian tech."} Avg tenure of {company.avgTenure}y suggests {company.avgTenure < 2 ? "high churn — validate growth paths carefully." : "reasonable stability for career building."}.
              </div>
            </div>
          </div>
        )}

        {/* ── SALARY ── */}
        {tab === "salary" && (
          <div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Verified Salary Bands</div>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>Based on {company.salaryBands.reduce((s, b) => s + b.reports, 0)} anonymous reports</span>
              </div>
              {company.salaryBands.map(b => <SalaryBar key={b.role} band={b} />)}
            </div>
            <div style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 10, padding: "14px 16px", fontSize: 12, color: "var(--text3)", lineHeight: 1.65 }}>
              💡 These are real reported figures, not posted JD ranges. Use the median as your anchor in salary negotiations, not the JD range — the JD range is usually set 20–30% lower than what strong candidates actually get.
            </div>
          </div>
        )}

        {/* ── INTERVIEW ── */}
        {tab === "interview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Total Rounds", value: company.interviewRounds, sub: "incl. HR" },
                { label: "Offer in Days", value: `${company.avgOfferDays}d`, sub: "from 1st round" },
                { label: "Offer Rate", value: `${company.offerRate}%`, sub: "who complete all rounds" },
              ].map(stat => (
                <div key={stat.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text1)" }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Round Breakdown</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {company.interviewTopics.map((t, i) => (
                  <span key={t} style={{ fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                    <span style={{ fontSize: 10, color: "var(--accent)", marginRight: 5 }}>R{i + 1}</span>{t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Interview Style</div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>{company.interviewStyle}</p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/interview" style={{ flex: 1, padding: "11px 16px", borderRadius: 9, background: "var(--accent)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                🎤 Practice Interview Now
              </Link>
              <Link href="/score" style={{ flex: 1, padding: "11px 16px", borderRadius: 9, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text1)", textDecoration: "none", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                🎯 Score Resume for {company.name}
              </Link>
            </div>
          </div>
        )}

        {/* ── OPEN ROLES ── */}
        {tab === "roles" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {company.openRoles.map(role => (
                <div key={role.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 4 }}>{role.title}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>📍 {role.city}</span>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>🏠 {role.type}</span>
                      <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{role.band}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/tailor`} style={{ padding: "7px 12px", borderRadius: 7, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                      Tailor Resume
                    </Link>
                    <Link href="/applications" style={{ padding: "7px 12px", borderRadius: 7, background: "var(--accent)", color: "#fff", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                      Apply →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.65 }}>
              💡 <strong style={{ color: "var(--accent)" }}>Pro tip:</strong> Tailor your resume with the exact JD keywords before applying. Candidates who tailor get 3× more callbacks on average.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
