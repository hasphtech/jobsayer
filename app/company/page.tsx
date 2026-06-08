"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

const COMPANIES = [
  // FinTech
  { slug: "razorpay",     name: "Razorpay",       tagline: "FinTech · Bangalore",      logo: "R", verified: true,  score: 7.8, tag: "🔥 Hot"     },
  { slug: "phonepe",      name: "PhonePe",         tagline: "FinTech · Bangalore",      logo: "P", verified: true,  score: 7.4, tag: "🔥 Hot"     },
  { slug: "groww",        name: "Groww",           tagline: "FinTech · Bangalore",      logo: "G", verified: false, score: 7.1, tag: null          },
  { slug: "cred",         name: "CRED",            tagline: "FinTech · Bangalore",      logo: "C", verified: false, score: 6.8, tag: null          },
  { slug: "juspay",       name: "Juspay",          tagline: "FinTech · Bangalore",      logo: "J", verified: false, score: 7.3, tag: "🚀 Rising"   },
  { slug: "zerodha",      name: "Zerodha",         tagline: "FinTech · Bangalore",      logo: "Z", verified: false, score: 7.5, tag: null          },
  { slug: "paytm",        name: "Paytm",           tagline: "FinTech · Noida",          logo: "P", verified: false, score: 5.8, tag: null          },
  // Food & Quick Commerce
  { slug: "swiggy",       name: "Swiggy",          tagline: "Food-Tech · Bangalore",    logo: "S", verified: true,  score: 7.2, tag: null          },
  { slug: "zomato",       name: "Zomato",          tagline: "Food-Tech · Gurgaon",      logo: "Z", verified: false, score: 7.0, tag: null          },
  { slug: "zepto",        name: "Zepto",           tagline: "Q-Commerce · Mumbai",      logo: "Z", verified: false, score: 6.9, tag: "🚀 Rising"   },
  { slug: "blinkit",      name: "Blinkit (Zomato)",tagline: "Q-Commerce · Gurgaon",     logo: "B", verified: false, score: 6.7, tag: null          },
  // E-Commerce
  { slug: "flipkart",     name: "Flipkart",        tagline: "E-Commerce · Bangalore",   logo: "F", verified: false, score: 6.5, tag: null          },
  { slug: "meesho",       name: "Meesho",          tagline: "E-Commerce · Bangalore",   logo: "M", verified: false, score: 6.6, tag: null          },
  { slug: "myntra",       name: "Myntra",          tagline: "E-Commerce · Bangalore",   logo: "M", verified: false, score: 6.4, tag: null          },
  { slug: "nykaa",        name: "Nykaa",           tagline: "E-Commerce · Mumbai",      logo: "N", verified: false, score: 6.2, tag: null          },
  // Big Tech India
  { slug: "google",       name: "Google India",    tagline: "Big Tech · Hyderabad",     logo: "G", verified: false, score: 8.1, tag: null          },
  { slug: "microsoft",    name: "Microsoft India", tagline: "Big Tech · Hyderabad",     logo: "M", verified: false, score: 7.9, tag: null          },
  { slug: "amazon",       name: "Amazon India",    tagline: "Big Tech · Hyderabad",     logo: "A", verified: false, score: 7.3, tag: null          },
  { slug: "meta",         name: "Meta India",      tagline: "Big Tech · Hyderabad",     logo: "M", verified: false, score: 7.6, tag: null          },
  { slug: "adobe",        name: "Adobe India",     tagline: "Big Tech · Bangalore",     logo: "A", verified: false, score: 7.8, tag: null          },
  // SaaS / Product
  { slug: "freshworks",   name: "Freshworks",      tagline: "SaaS · Chennai",           logo: "F", verified: true,  score: 7.6, tag: "🔥 Hot"     },
  { slug: "zoho",         name: "Zoho",            tagline: "SaaS · Chennai",           logo: "Z", verified: false, score: 7.0, tag: null          },
  { slug: "browserstack", name: "BrowserStack",    tagline: "DevTools · Mumbai",        logo: "B", verified: false, score: 7.9, tag: "🚀 Rising"   },
  { slug: "chargebee",    name: "Chargebee",       tagline: "SaaS · Chennai",           logo: "C", verified: false, score: 7.2, tag: null          },
  { slug: "postman",      name: "Postman",         tagline: "DevTools · Bangalore",     logo: "P", verified: false, score: 7.7, tag: null          },
  // IT Services
  { slug: "infosys",      name: "Infosys",         tagline: "IT Services · Bangalore",  logo: "I", verified: false, score: 5.5, tag: null          },
  { slug: "tcs",          name: "TCS",             tagline: "IT Services · Mumbai",     logo: "T", verified: false, score: 5.2, tag: null          },
  { slug: "wipro",        name: "Wipro",           tagline: "IT Services · Bangalore",  logo: "W", verified: false, score: 5.3, tag: null          },
  { slug: "hcl",          name: "HCL Technologies",tagline: "IT Services · Noida",      logo: "H", verified: false, score: 5.4, tag: null          },
  // Mobility & Logistics
  { slug: "ola",          name: "Ola",             tagline: "Mobility · Bangalore",     logo: "O", verified: false, score: 6.0, tag: null          },
  { slug: "rapido",       name: "Rapido",          tagline: "Mobility · Bangalore",     logo: "R", verified: false, score: 6.5, tag: "🚀 Rising"   },
  { slug: "porter",       name: "Porter",          tagline: "Logistics · Bangalore",    logo: "P", verified: false, score: 6.8, tag: null          },
  // EdTech
  { slug: "byjus",        name: "BYJU'S",          tagline: "EdTech · Bangalore",       logo: "B", verified: false, score: 4.5, tag: null          },
  { slug: "unacademy",    name: "Unacademy",       tagline: "EdTech · Bangalore",       logo: "U", verified: false, score: 5.8, tag: null          },
  { slug: "scaler",       name: "Scaler Academy",  tagline: "EdTech · Bangalore",       logo: "S", verified: false, score: 6.9, tag: null          },
];

const FILTERS = ["All", "FinTech", "Food-Tech", "E-Commerce", "Big Tech", "SaaS", "IT Services", "DevTools", "Q-Commerce", "Mobility", "EdTech", "Logistics"];

export default function CompanyIndexPage() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const visible = COMPANIES.filter(c => {
    const matchFilter = filter === "All" || c.tagline.includes(filter);
    const matchQuery  = !query || c.name.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <AppShell aiPanel={false}>
      <div style={{ padding: "28px 28px", maxWidth: 820 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)", margin: 0 }}>Employer Intelligence</h1>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
            Verified salary bands, attrition rates, interview intel, and culture scores — not marketing copy.
          </p>
        </div>

        {/* Search + filter row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text3)" }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search companies..."
              style={{
                width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text1)", padding: "8px 12px 8px 32px",
                fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
                background: filter === f ? "var(--accent)" : "var(--surface2)",
                color: filter === f ? "#fff" : "var(--text3)",
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Company grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map(c => (
            <Link key={c.slug} href={`/company/${c.slug}`} style={{ textDecoration: "none" }}>
              <div
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, transition: "border-color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accdim)", border: "1px solid var(--accborder)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "var(--accent)", flexShrink: 0 }}>
                  {c.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    {c.name}
                    {c.tag && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6, background: "var(--accdim)", color: "var(--accent)" }}>{c.tag}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.tagline}</div>
                </div>
                {c.verified && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,.1)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)", flexShrink: 0 }}>
                    ✓ Verified
                  </span>
                )}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: c.score >= 7.5 ? "var(--success)" : c.score >= 6.5 ? "var(--warn)" : "var(--danger)" }}>
                    {c.score}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text3)" }}>/ 10</div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize: 14, color: "var(--text3)", flexShrink: 0 }} />
              </div>
            </Link>
          ))}

          {visible.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              No companies match &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.65 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
          More companies added weekly. Data sourced from anonymous verified employee submissions and cross-referenced with public filings. Scores are computed, not paid placements.
        </div>
      </div>
    </AppShell>
  );
}
