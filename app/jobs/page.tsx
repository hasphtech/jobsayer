"use client";
/**
 * /jobs — Matched Jobs Feed + Honest JD Scanner
 * Ranks the static job pool against the candidate's resume using
 * the existing jdMatcher keyword engine. Shows match %, JD Trust,
 * ghost job flags, and a sticky detail panel.
 * Tab 2: Paste any JD for ghost-job analysis, red-flag detection and resume match.
 */
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target, Shield, AlertTriangle, Clock, Users, MapPin, Briefcase, RefreshCw, Search, ChevronRight } from "lucide-react";

/* ── JD Scanner ─────────────────────────────────────────────────── */

interface GhostSignal {
  label: string;
  severity: "red" | "amber" | "ok";
  detail: string;
}

interface ScanResult {
  trustScore: number;        // 0–100
  verdict: string;
  signals: GhostSignal[];
  resumeMatch: number | null;
  matchFound: string[];
  matchMissing: string[];
  salaryReality: string;
  redFlags: string[];
}

function analyseJd(jdText: string, resumeText: string): ScanResult {
  const text = jdText.toLowerCase();
  const signals: GhostSignal[] = [];
  let trustScore = 100;

  // ── Ghost signals ──
  const wordCount = jdText.trim().split(/\s+/).length;
  if (wordCount < 80) {
    signals.push({ label: "Very short JD", severity: "red", detail: `Only ${wordCount} words — legitimate postings typically have 150+ words.` });
    trustScore -= 20;
  }

  const yearsMatches = text.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/g) ?? [];
  const highYearsReq = yearsMatches.some(m => {
    const n = parseInt(m);
    return n >= 8;
  });
  if (highYearsReq) {
    signals.push({ label: "Unrealistic experience requirement", severity: "amber", detail: "8+ years experience requirement detected — common in inflated JDs that may never get filled." });
    trustScore -= 15;
  }

  if (!text.includes("salary") && !text.includes("lpa") && !text.includes("ctc") && !text.includes("₹") && !text.includes("compensation") && !text.includes("package")) {
    signals.push({ label: "No salary disclosed", severity: "amber", detail: "Salary not mentioned — likely to filter out lower-budget roles or collect market data." });
    trustScore -= 10;
  }

  const stackCount = (text.match(/\b(react|angular|vue|node\.js|django|flask|spring|rails|fastapi|express)\b/g) ?? []).length;
  if (stackCount >= 5) {
    signals.push({ label: "Too many tech stacks", severity: "amber", detail: `${stackCount} different frameworks/stacks mentioned — possibly a catch-all or recycled JD.` });
    trustScore -= 10;
  }

  if (!text.match(/\b(apply|send|submit|email|portal|link|form)\b/i)) {
    signals.push({ label: "No application instructions", severity: "amber", detail: "No clear application method found — may not be actively hiring." });
    trustScore -= 10;
  }

  if (text.includes("urgent") || text.includes("immediate joiner") || text.includes("asap")) {
    signals.push({ label: "Urgency language", severity: "amber", detail: '"Urgent" or "immediate joiner" language is often added to appear active without real urgency.' });
    trustScore -= 5;
  }

  const certCount = (text.match(/\b(aws certified|gcp certified|azure certified|pmp|cissp|cka|ckad)\b/gi) ?? []).length;
  if (certCount >= 3) {
    signals.push({ label: "Excessive certification requirements", severity: "amber", detail: `${certCount} certifications required — uncommon in real postings, may be requirements padding.` });
    trustScore -= 8;
  }

  if (yearsMatches.length === 0) {
    signals.push({ label: "No experience range specified", severity: "amber", detail: "Vague experience requirements can mean the role is not well-defined." });
    trustScore -= 5;
  }

  if (signals.filter(s => s.severity === "red").length === 0 &&
      signals.filter(s => s.severity === "amber").length === 0) {
    signals.push({ label: "No major red flags detected", severity: "ok", detail: "JD looks standard for the market." });
  }

  // ── Red flags (text-based) ──
  const redFlags: string[] = [];
  if (text.includes("unpaid") || text.includes("no salary")) redFlags.push("Possible unpaid/commission-only role");
  if (text.includes("multi-level") || text.includes("mlm")) redFlags.push("MLM-style language detected");
  if (text.includes("own laptop") || text.includes("bring your own")) redFlags.push("Requires candidate to bring own equipment");
  if ((text.match(/skills?/g) ?? []).length > 15) redFlags.push("Unusually high skill keyword density — possibly keyword stuffing");

  // ── Salary reality ──
  const salaryMatch = jdText.match(/₹?\s*(\d+[\.,]?\d*)\s*[-–to]+\s*(\d+[\.,]?\d*)\s*(lpa|l\.p\.a|ctc|lakh)/i);
  let salaryReality = "Salary not disclosed — research on Glassdoor/Levels.fyi before applying.";
  if (salaryMatch) {
    const low = parseFloat(salaryMatch[1].replace(",", ""));
    const high = parseFloat(salaryMatch[2].replace(",", ""));
    const avg = (low + high) / 2;
    salaryReality = avg < 8
      ? `₹${low}–${high} LPA is below market for most tech roles. Research comparable roles before negotiating.`
      : avg < 20
      ? `₹${low}–${high} LPA — in line with market for mid-level roles.`
      : `₹${low}–${high} LPA — competitive for senior roles.`;
  }

  // ── Resume match ──
  let resumeMatch: number | null = null;
  let matchFound: string[] = [];
  let matchMissing: string[] = [];

  // ── Verdict ──
  const clampedScore = Math.max(0, Math.min(100, trustScore));
  const verdict =
    clampedScore >= 75 ? "Looks Legit" :
    clampedScore >= 50 ? "Proceed with Caution" :
    "Likely Ghost / Low Quality";

  return { trustScore: clampedScore, verdict, signals, resumeMatch, matchFound, matchMissing, salaryReality, redFlags };
}

function JdScannerTab({ resumeText }: { resumeText: string }) {
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  function handleScan() {
    if (jdText.trim().length < 30) return;
    setScanning(true);
    setTimeout(() => {
      const base = analyseJd(jdText, resumeText);
      // Compute resume match using matchJd
      if (resumeText.trim()) {
        const mr = matchJd(resumeText, jdText);
        base.resumeMatch = mr.score;
        base.matchFound = mr.found;
        base.matchMissing = mr.missing.slice(0, 10);
      }
      setResult(base);
      setScanning(false);
    }, 600);
  }

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 14, padding: "18px",
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Input */}
      <div style={{ ...card, marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 10 }}>
          Paste a Job Description
        </label>
        <textarea
          value={jdText}
          onChange={e => { setJdText(e.target.value); setResult(null); }}
          placeholder="Paste the full job description here — we'll analyse it for ghost signals, red flags, inflated requirements, and match it against your resume…"
          rows={8}
          style={{
            width: "100%", padding: "12px 14px",
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text1)", fontSize: 14,
            resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            {jdText.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <button
            onClick={handleScan}
            disabled={scanning || jdText.trim().length < 30}
            style={{
              padding: "10px 24px", borderRadius: 8,
              background: jdText.trim().length >= 30 ? "var(--accent)" : "var(--surface2)",
              color: jdText.trim().length >= 30 ? "#fff" : "var(--text3)",
              border: "none", fontSize: 14, fontWeight: 600,
              cursor: jdText.trim().length >= 30 ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {scanning
              ? <><span style={{ display: "inline-block", animation: "jsspin 1s linear infinite" }}>⏳</span> Scanning…</>
              : <><Search size={14} /> Scan JD</>
            }
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Trust score */}
          <div style={{ ...card, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800,
              background: result.trustScore >= 75 ? "rgba(74,222,128,.12)" : result.trustScore >= 50 ? "rgba(251,191,36,.12)" : "rgba(248,113,113,.12)",
              border: `3px solid ${result.trustScore >= 75 ? "#4ade80" : result.trustScore >= 50 ? "#fbbf24" : "#f87171"}`,
              color: result.trustScore >= 75 ? "#4ade80" : result.trustScore >= 50 ? "#fbbf24" : "#f87171",
            }}>{result.trustScore}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text1)" }}>{result.verdict}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>JD Trust Score · {result.signals.length} signals detected</div>
            </div>
          </div>

          {/* Signals */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🔍 Analysis Signals</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.signals.map((sig, i) => {
                const c = sig.severity === "red" ? "#f87171" : sig.severity === "amber" ? "#fbbf24" : "#4ade80";
                return (
                  <div key={i} style={{
                    padding: "10px 14px", borderRadius: 8, borderLeft: `3px solid ${c}`,
                    background: "var(--surface2)",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c, marginBottom: 3 }}>
                      {sig.severity === "red" ? "🔴" : sig.severity === "amber" ? "🟡" : "🟢"} {sig.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{sig.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Red flags */}
          {result.redFlags.length > 0 && (
            <div style={{ ...card, borderLeft: "3px solid #f87171" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 10 }}>🚨 Red Flags</div>
              {result.redFlags.map((f, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>• {f}</div>
              ))}
            </div>
          )}

          {/* Salary reality */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💰 Salary Reality Check</div>
            <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{result.salaryReality}</div>
          </div>

          {/* Resume match */}
          {result.resumeMatch !== null && (
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>🎯 Your Resume Match</div>
                <div style={{
                  fontSize: 18, fontWeight: 800,
                  color: result.resumeMatch >= 70 ? "#4ade80" : result.resumeMatch >= 45 ? "#fbbf24" : "#f87171",
                }}>{result.resumeMatch}%</div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, marginBottom: 14 }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${result.resumeMatch}%`,
                  background: result.resumeMatch >= 70 ? "#4ade80" : result.resumeMatch >= 45 ? "#fbbf24" : "#f87171",
                  transition: "width .7s ease",
                }} />
              </div>

              {result.matchFound.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#4ade80", marginBottom: 6 }}>✅ Skills you have ({result.matchFound.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.matchFound.slice(0, 12).map(s => (
                      <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(74,222,128,.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,.2)", fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.matchMissing.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#f87171", marginBottom: 6 }}>❌ Missing skills ({result.matchMissing.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.matchMissing.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(248,113,113,.08)", color: "#f87171", border: "1px solid rgba(248,113,113,.2)", fontWeight: 500, textDecoration: "line-through", opacity: .8 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <Link href="/builder" style={{
                  padding: "9px 20px", background: "var(--accent)", borderRadius: 8,
                  color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
                }}>
                  Add missing skills →
                </Link>
                <Link href="/score" style={{
                  padding: "9px 20px", background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text1)", fontSize: 13, fontWeight: 600, textDecoration: "none",
                }}>
                  View full score
                </Link>
              </div>
            </div>
          )}

          {!resumeText && (
            <div style={{
              ...card, textAlign: "center",
              background: "rgba(251,191,36,.06)", borderColor: "rgba(251,191,36,.2)",
            }}>
              <div style={{ fontSize: 13, color: "#fbbf24", marginBottom: 8 }}>
                ⚠ No resume found — can't compute your match against this JD.
              </div>
              <Link href="/builder" style={{
                padding: "8px 20px", background: "var(--accent)", borderRadius: 8,
                color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                Build your resume first →
              </Link>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes jsspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
import { matchJd, resumeToText } from "@/lib/jdMatcher";
import JOBS, { type Job } from "@/lib/jobPool";
import type { ResumeData } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────── */
interface ScoredJob extends Job { matchPct: number }

/* ── Helpers ───────────────────────────────────────────────────── */
function matchColor(pct: number) {
  return pct >= 75 ? "#4ade80" : pct >= 55 ? "#fbbf24" : "#f87171";
}
function trustLabel(t: Job["trust"]) {
  return t === "high" ? { label: "🛡 JD Trust: High",   bg: "rgba(74,222,128,.1)",   color: "#4ade80"  }
       : t === "medium" ? { label: "⚠ JD Trust: Medium", bg: "rgba(251,191,36,.1)",  color: "#fbbf24" }
       : { label: "🔍 Unverified",                        bg: "rgba(248,113,113,.08)", color: "#f87171" };
}
function daysAgo(d: number) {
  return d === 0 ? "Posted today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

/* ── Job Card ───────────────────────────────────────────────────── */
function JobCard({ job, selected, onClick }: { job: ScoredJob; selected: boolean; onClick: () => void }) {
  const trust = trustLabel(job.trust);
  const mColor = matchColor(job.matchPct);

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 14, padding: "18px", cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
        boxShadow: selected ? "0 4px 20px rgba(129,140,248,.15)" : "none",
        opacity: job.ghost ? .7 : 1,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: "var(--surface2)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>{job.logo}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>{job.title}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>{job.company} · {job.location}</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>{job.exp}</span><span>{job.salary}</span>
            <span style={{ textTransform: "capitalize" }}>{job.mode}</span>
            {job.verified && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 10, background: "rgba(129,140,248,.1)", color: "var(--accent)", border: "1px solid var(--accborder)" }}>✓ Verified</span>
            )}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: mColor, lineHeight: 1 }}>{job.matchPct}%</div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text3)" }}>match</div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {job.postedDays <= 1 && (
          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "rgba(129,140,248,.1)", color: "var(--accent)", fontWeight: 500 }}>
            {daysAgo(job.postedDays)}
          </span>
        )}
        {job.ghost && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(251,191,36,.1)", color: "#fbbf24" }}>⚠ Possible ghost job</span>
        )}
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: trust.bg, color: trust.color }}>{trust.label}</span>
      </div>

      {/* Skills */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {job.skills.slice(0, 6).map(sk => {
          const inResume = (window as any).__jsResumeText?.toLowerCase().includes(sk);
          return (
            <span key={sk} style={{
              fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 500,
              background: inResume ? "rgba(74,222,128,.08)" : "rgba(248,113,113,.08)",
              color: inResume ? "#4ade80" : "#f87171",
              border: `1px solid ${inResume ? "rgba(74,222,128,.2)" : "rgba(248,113,113,.2)"}`,
              textDecoration: inResume ? "none" : "line-through", opacity: inResume ? 1 : .8,
            }}>{sk}</span>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          {daysAgo(job.postedDays)} · {job.applicants > 0 ? `${job.applicants} applicants` : "No data"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{
            padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 7,
            fontSize: 12, fontWeight: 600, color: "var(--text2)", background: "var(--surface2)", cursor: "pointer",
          }}>🔖 Save</button>
          <button style={{
            padding: "5px 14px", border: "none", borderRadius: 7,
            fontSize: 12, fontWeight: 600, color: "#fff",
            background: job.ghost ? "var(--text3)" : "var(--accent)", cursor: "pointer",
          }}>
            {job.ghost ? "View ›" : "Apply →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Panel ───────────────────────────────────────────────── */
function DetailPanel({ job, resumeText }: { job: ScoredJob; resumeText: string }) {
  const mColor = matchColor(job.matchPct);
  const trust = trustLabel(job.trust);
  const rt = resumeText.toLowerCase();

  return (
    <div style={{
      background: "var(--surface)", border: "1.5px solid var(--border)",
      borderRadius: 16, padding: 22, position: "sticky", top: 72, height: "fit-content",
    }}>
      {/* Company */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{job.logo}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)" }}>{job.title}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>{job.company}</div>
        </div>
      </div>

      {/* Match pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: job.matchPct >= 70 ? "rgba(74,222,128,.08)" : "rgba(251,191,36,.08)",
        borderRadius: 10, padding: "12px 14px", marginBottom: 16,
        border: `1px solid ${job.matchPct >= 70 ? "rgba(74,222,128,.15)" : "rgba(251,191,36,.15)"}`,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800,
          background: `linear-gradient(135deg,${mColor}88,${mColor})`, color: "#000",
        }}>{job.matchPct}%</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
            {job.matchPct >= 75 ? "Strong match" : job.matchPct >= 55 ? "Good match" : "Partial match"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>
            {job.skills.filter(s => rt.includes(s)).length} of {job.skills.length} required skills matched
          </div>
        </div>
      </div>

      {/* Details */}
      {[
        { icon: "💰", text: job.salary },
        { icon: "📍", text: `${job.location} · ${job.mode.charAt(0).toUpperCase() + job.mode.slice(1)}` },
        { icon: "🧑‍💻", text: `${job.exp} experience` },
        { icon: "⏱", text: `${daysAgo(job.postedDays)} · ${job.applicants} applicants` },
      ].map(row => (
        <div key={row.text} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 13, color: "var(--text2)" }}>
          <span style={{ fontSize: 14 }}>{row.icon}</span>{row.text}
        </div>
      ))}
      {job.verified && (
        <div style={{ marginBottom: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(129,140,248,.1)", color: "var(--accent)", border: "1px solid var(--accborder)" }}>✓ Employer Verified</span>
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "14px 0" }} />

      {/* Skill fit */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text3)", marginBottom: 8 }}>Your skill fit</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {job.skills.map(sk => {
            const has = rt.includes(sk);
            return (
              <span key={sk} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 500,
                background: has ? "rgba(74,222,128,.08)" : "rgba(248,113,113,.08)",
                color: has ? "#4ade80" : "#f87171",
                border: `1px solid ${has ? "rgba(74,222,128,.2)" : "rgba(248,113,113,.2)"}`,
                textDecoration: has ? "none" : "line-through", opacity: has ? 1 : .8,
              }}>{sk} {has ? "✓" : "✗"}</span>
            );
          })}
        </div>
      </div>

      <button style={{
        width: "100%", padding: "12px", border: "none", borderRadius: 10,
        fontSize: 14, fontWeight: 700, color: "#fff",
        background: "linear-gradient(135deg,var(--accent),#6366f1)",
        cursor: "pointer", marginBottom: 8,
      }}>⚡ Quick Apply with jobSayer</button>

      <Link href="/builder" style={{
        display: "block", width: "100%", padding: "10px", textAlign: "center",
        border: "1.5px solid var(--accborder)", borderRadius: 10,
        fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none",
      }}>🎤 Prep for this interview →</Link>

      {job.avgResponseDays < 10 && (
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
          {job.company} avg response: <strong style={{ color: "#4ade80" }}>{job.avgResponseDays} days</strong> · Reply rate: <strong style={{ color: "#4ade80" }}>{job.replyRate}%</strong>
        </div>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
type Filter = "best" | "remote" | "fresh";
type Tab = "jobs" | "scanner";

export default function JobsPage() {
  const [resumeText, setResumeText] = useState("");
  const [filter, setFilter] = useState<Filter>("best");
  const [selectedId, setSelectedId] = useState<string>(JOBS[0].id);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("jobs");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        const data: ResumeData = parsed.data ?? parsed;
        const text = resumeToText(data);
        setResumeText(text);
        (window as any).__jsResumeText = text;
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const scored: ScoredJob[] = useMemo(() => {
    return JOBS.map(job => {
      const result = resumeText
        ? matchJd(resumeText, job.jdText)
        : { score: 0 };
      return { ...job, matchPct: result.score };
    }).sort((a, b) => b.matchPct - a.matchPct);
  }, [resumeText]);

  const filtered = useMemo(() => {
    if (filter === "remote") return scored.filter(j => j.mode === "remote");
    if (filter === "fresh")  return scored.filter(j => j.postedDays <= 2);
    return scored;
  }, [scored, filter]);

  const selected = scored.find(j => j.id === selectedId) ?? scored[0];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Matching jobs to your resume…</div>
    </div>
  );

  const filterBtnStyle = (f: Filter): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "6px 14px", border: "1px solid",
    borderColor: filter === f ? "var(--accborder)" : "var(--border)",
    borderRadius: 20, fontSize: 12, fontWeight: 500,
    color: filter === f ? "var(--accent)" : "var(--text2)",
    background: filter === f ? "var(--accdim)" : "var(--surface)",
    cursor: "pointer", whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      {/* Top bar */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/score" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>
            <ArrowLeft size={14} /> Score
          </Link>
          <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => setTab("jobs")} style={{
              padding: "5px 14px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === "jobs" ? "var(--accdim)" : "transparent",
              color: tab === "jobs" ? "var(--accent)" : "var(--text3)",
            }}>💼 Matched Jobs</button>
            <button onClick={() => setTab("scanner")} style={{
              padding: "5px 14px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === "scanner" ? "var(--accdim)" : "transparent",
              color: tab === "scanner" ? "var(--accent)" : "var(--text3)",
            }}>🔍 JD Scanner</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/score" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: "var(--accdim)", border: "1px solid var(--accborder)",
            borderRadius: 8, color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            <Target size={13} /> My Score
          </Link>
          <Link href="/builder" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: "var(--accent)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            Edit Resume
          </Link>
        </div>
      </div>

      {tab === "scanner" ? (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🔍 Honest JD Scanner</h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              Paste any job description — we'll score it for ghost-job signals, red flags, requirement inflation, and match it against your resume.
            </p>
          </div>
          <JdScannerTab resumeText={resumeText} />
        </div>
      ) : (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
          {/* Header + filters */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
                {filtered.filter(j => !j.ghost).length} jobs matched to your resume
              </h1>
              <p style={{ fontSize: 13, color: "var(--text3)" }}>Ranked by match score · Updated just now</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setFilter("best")}   style={filterBtnStyle("best")}>⭐ Best Match</button>
              <button onClick={() => setFilter("remote")} style={filterBtnStyle("remote")}>🌐 Remote only</button>
              <button onClick={() => setFilter("fresh")}  style={filterBtnStyle("fresh")}>⚡ Posted today</button>
            </div>
          </div>

          {/* Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
            {/* Job list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedId === job.id}
                  onClick={() => setSelectedId(job.id)}
                />
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text3)", fontSize: 14 }}>
                  No jobs match this filter. Try "Best Match".
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selected && <DetailPanel job={selected} resumeText={resumeText} />}
          </div>
        </div>
      )}
    </div>
  );
}
