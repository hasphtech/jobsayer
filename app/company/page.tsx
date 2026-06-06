"use client";

import Link from "next/link";

const FEATURED = [
  { slug: "razorpay", name: "Razorpay", tagline: "FinTech · Bangalore", logo: "R", verified: true, score: 7.8 },
  { slug: "swiggy",   name: "Swiggy",   tagline: "Food-Tech · Bangalore", logo: "S", verified: true, score: 7.2 },
];

export default function CompanyIndexPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #08080c)", color: "var(--text1)", fontFamily: "var(--font-inter, Inter, sans-serif)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>🏢 Employer Intelligence</h1>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>
            Verified salary bands, attrition rates, interview intel, and culture scores — from real employees, not marketing copy.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURED.map(c => (
            <Link key={c.slug} href={`/company/${c.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, transition: "border-color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                  {c.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.tagline}</div>
                </div>
                {c.verified && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,.2)" }}>✓ Verified</span>}
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>{c.score}/10</div>
                <span style={{ fontSize: 12, color: "var(--accent)" }}>→</span>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 24, padding: "16px", background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.65 }}>
          More companies added weekly. All data is sourced from anonymous verified employee submissions and cross-referenced with public filings.
        </div>
      </div>
    </div>
  );
}
