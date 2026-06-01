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
              background: result.trustScore >= 75 ? "rgba(34,197,94,.12)" : result.trustScore >= 50 ? "rgba(234,179,8,.12)" : "rgba(239,68,68,.12)",
              border: `3px solid ${result.trustScore >= 75 ? "var(--success)" : result.trustScore >= 50 ? "var(--warn)" : "var(--danger)"}`,
              color: result.trustScore >= 75 ? "var(--success)" : result.trustScore >= 50 ? "var(--warn)" : "var(--danger)",
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
                const c = sig.severity === "red" ? "var(--danger)" : sig.severity === "amber" ? "var(--warn)" : "var(--success)";
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
            <div style={{ ...card, borderLeft: "3px solid var(--danger)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)", marginBottom: 10 }}>🚨 Red Flags</div>
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
                  color: result.resumeMatch >= 70 ? "var(--success)" : result.resumeMatch >= 45 ? "var(--warn)" : "var(--danger)",
                }}>{result.resumeMatch}%</div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, marginBottom: 14 }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${result.resumeMatch}%`,
                  background: result.resumeMatch >= 70 ? "var(--success)" : result.resumeMatch >= 45 ? "var(--warn)" : "var(--danger)",
                  transition: "width .7s ease",
                }} />
              </div>

              {result.matchFound.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--success)", marginBottom: 6 }}>✅ Skills you have ({result.matchFound.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.matchFound.slice(0, 12).map(s => (
                      <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(34,197,94,.08)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)", fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.matchMissing.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--danger)", marginBottom: 6 }}>❌ Missing skills ({result.matchMissing.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.matchMissing.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(239,68,68,.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,.2)", fontWeight: 500, textDecoration: "line-through", opacity: .8 }}>{s}</span>
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
              background: "rgba(234,179,8,.06)", borderColor: "rgba(234,179,8,.2)",
            }}>
              <div style={{ fontSize: 13, color: "var(--warn)", marginBottom: 8 }}>
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
import JOBS, { type Job, type JdTrust, type WorkMode } from "@/lib/jobPool";
import type { ResumeData } from "@/lib/types";

/* ── DB → Job mapper ───────────────────────────────────────────── */
function mapDbJob(j: Record<string, unknown>): Job {
  const postedAt = j.posted_at ? new Date(j.posted_at as string) : new Date();
  const postedDays = Math.max(0, Math.round((Date.now() - postedAt.getTime()) / 86_400_000));
  return {
    id:              String(j.id ?? ""),
    title:           String(j.title ?? ""),
    company:         String(j.company ?? ""),
    logo:            String(j.logo ?? "🏢"),
    location:        String(j.location ?? "India"),
    mode:            ((j.mode as string) || "onsite") as WorkMode,
    exp:             String(j.exp ?? ""),
    salary:          String(j.salary ?? "Not disclosed"),
    skills:          Array.isArray(j.skills) ? (j.skills as unknown[]).map(String) : [],
    postedDays,
    applicants:      Number(j.applicants ?? 0),
    trust:           ((j.trust as string) || "medium") as JdTrust,
    verified:        Boolean(j.verified),
    ghost:           Boolean(j.ghost),
    avgResponseDays: Number(j.avg_response_days ?? 30),
    replyRate:       Number(j.reply_rate ?? 0),
    jdText:          String(j.jd_text ?? j.description ?? ""),
    applyUrl:        String(j.apply_url ?? j.source_url ?? ""),
  };
}

/* ── Types ─────────────────────────────────────────────────────── */
interface ScoredJob extends Job { matchPct: number }

/* ── Helpers ───────────────────────────────────────────────────── */
function matchColor(pct: number) {
  return pct >= 75 ? "var(--success)" : pct >= 55 ? "var(--warn)" : "var(--danger)";
}
function trustLabel(t: Job["trust"]) {
  return t === "high" ? { label: "🛡 JD Trust: High",   bg: "rgba(34,197,94,.1)",   color: "var(--success)"  }
       : t === "medium" ? { label: "⚠ JD Trust: Medium", bg: "rgba(234,179,8,.1)",  color: "var(--warn)" }
       : { label: "🔍 Unverified",                        bg: "rgba(239,68,68,.08)", color: "var(--danger)" };
}
function daysAgo(d: number) {
  return d === 0 ? "Posted today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

/* ── Save Job Button ────────────────────────────────────────────── */
const LS_SAVED = "jobsayer-saved-jobs";
function getSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_SAVED) ?? "[]"); } catch { return []; }
}
function SaveJobButton({ jobId }: { jobId: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(getSaved().includes(jobId)); }, [jobId]);
  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const list = getSaved();
    const next = list.includes(jobId) ? list.filter(id => id !== jobId) : [...list, jobId];
    localStorage.setItem(LS_SAVED, JSON.stringify(next));
    setSaved(!list.includes(jobId));
  }
  return (
    <button onClick={toggle} title={saved ? "Unsave" : "Save job"} style={{
      padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 7,
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      background: saved ? "rgba(99,102,241,.12)" : "var(--surface2)",
      color: saved ? "var(--accent)" : "var(--text2)",
    }}>{saved ? "🔖 Saved" : "🔖 Save"}</button>
  );
}

/* ── Job Card ───────────────────────────────────────────────────── */
function JobCard({ job, selected, onClick }: { job: ScoredJob; selected: boolean; onClick: () => void }) {
  const mColor = matchColor(job.matchPct);

  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
        borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
        cursor: "pointer", background: selected ? "rgba(99,102,241,.04)" : "none",
        transition: "background .15s, border-left-color .15s",
        opacity: job.ghost ? .75 : 1,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,.02)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "none"; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>{job.company} · {job.location}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: mColor, lineHeight: 1, letterSpacing: "-.02em" }}>{job.matchPct}<span style={{ fontSize: 11, fontWeight: 500 }}>%</span></div>
          <div style={{ fontSize: 10, color: "var(--text3)" }}>match</div>
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, background: "rgba(255,255,255,.05)", color: "var(--text2)", border: "1px solid var(--border)" }}>{job.mode}</span>
        <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, background: "rgba(255,255,255,.05)", color: "var(--text2)", border: "1px solid var(--border)" }}>{job.salary}</span>
        {job.postedDays <= 1 && <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, background: "var(--accdim)", color: "var(--accent)", border: "1px solid var(--accborder)" }}>{daysAgo(job.postedDays)}</span>}
        {job.ghost && <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, background: "rgba(234,179,8,.08)", color: "var(--warn)", border: "1px solid rgba(234,179,8,.2)" }}>⚠ Ghost risk</span>}
        {job.verified && <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, background: "rgba(34,197,94,.08)", color: "var(--success)", border: "1px solid rgba(34,197,94,.15)" }}>✓ Verified</span>}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          {daysAgo(job.postedDays)} · {job.applicants > 0 ? `${job.applicants} applicants` : "No data"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <SaveJobButton jobId={job.id} />
          <a
            href={job.applyUrl || "#"}
            target={job.applyUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={e => { if (!job.applyUrl) e.preventDefault(); }}
            style={{
              padding: "5px 14px", border: "none", borderRadius: 7,
              fontSize: 12, fontWeight: 600, color: "#fff", textDecoration: "none",
              background: job.ghost ? "var(--text3)" : "var(--accent)", cursor: "pointer",
              opacity: job.applyUrl ? 1 : 0.5, display: "inline-flex", alignItems: "center",
            }}
          >
            {job.ghost ? "View ›" : "Apply →"}
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Panel ───────────────────────────────────────────────── */
function DetailPanel({ job, resumeText }: { job: ScoredJob; resumeText: string }) {
  const mColor = matchColor(job.matchPct);
  const rt = resumeText.toLowerCase();
  const circ = 2 * Math.PI * 22;
  const matched = job.skills.filter(s => rt.includes(s)).length;

  return (
    <div style={{ padding: "20px", position: "sticky", top: 56 }}>
      {/* Company header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{job.logo}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{job.title}</div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>{job.company}</div>
        </div>
      </div>

      {/* Score ring + match */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", background: `${mColor}0d`, border: `1px solid ${mColor}30`, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
          <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
            <circle cx="26" cy="26" r="22" fill="none" stroke={mColor} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - job.matchPct / 100)} />
          </svg>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 12, fontWeight: 800, color: mColor }}>{job.matchPct}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{job.matchPct >= 75 ? "Strong match" : job.matchPct >= 55 ? "Good match" : "Partial match"}</div>
          <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>{matched} of {job.skills.length} skills matched</div>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
        {[
          { icon: "💰", text: job.salary },
          { icon: "📍", text: `${job.location} · ${job.mode}` },
          { icon: "🧑‍💻", text: `${job.exp} experience` },
          { icon: "⏱",  text: `${daysAgo(job.postedDays)} · ${job.applicants || "—"} applicants` },
        ].map(row => (
          <div key={row.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)" }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{row.icon}</span>{row.text}
          </div>
        ))}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
          {job.verified && <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 99, background: "rgba(34,197,94,.08)", color: "var(--success)", border: "1px solid rgba(34,197,94,.15)", fontWeight: 600 }}>🏅 Verified Employer</span>}
          {job.ghost   && <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 99, background: "rgba(234,179,8,.08)", color: "var(--warn)", border: "1px solid rgba(234,179,8,.2)", fontWeight: 600 }}>⚠ Ghost risk</span>}
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

      {/* Skill fit */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8, textTransform: "uppercase" }}>Skill fit</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {job.skills.map(sk => {
            const has = rt.includes(sk);
            return (
              <span key={sk} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 99, fontWeight: 500,
                background: has ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.06)",
                color: has ? "var(--success)" : "var(--danger)",
                border: `1px solid ${has ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.15)"}`,
                textDecoration: has ? "none" : "line-through", opacity: has ? 1 : .7,
              }}>{sk} {has ? "✓" : "✗"}</span>
            );
          })}
        </div>
      </div>

      <a
        href={job.applyUrl || "#"}
        target={job.applyUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={e => { if (!job.applyUrl) e.preventDefault(); }}
        style={{
          display: "block", width: "100%", padding: "12px", border: "none", borderRadius: 10,
          fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", textAlign: "center",
          background: job.applyUrl ? "linear-gradient(135deg,var(--accent),#6366f1)" : "var(--surface2)",
          cursor: job.applyUrl ? "pointer" : "not-allowed", marginBottom: 8,
          opacity: job.applyUrl ? 1 : 0.5,
          boxSizing: "border-box" as const,
        }}
      >
        {job.applyUrl ? "⚡ Apply Now →" : "⚡ No Apply Link"}
      </a>

      <Link href="/builder" style={{
        display: "block", width: "100%", padding: "10px", textAlign: "center",
        border: "1.5px solid var(--accborder)", borderRadius: 10,
        fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none",
      }}>🎤 Prep for this interview →</Link>

      {job.avgResponseDays < 10 && (
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
          {job.company} avg response: <strong style={{ color: "var(--success)" }}>{job.avgResponseDays} days</strong> · Reply rate: <strong style={{ color: "var(--success)" }}>{job.replyRate}%</strong>
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
  const [jobs, setJobs] = useState<Job[]>(JOBS);
  const [selectedId, setSelectedId] = useState<string>(JOBS[0].id);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("jobs");

  // Load resume from localStorage
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

  // Fetch live jobs from Supabase — falls back to static JOBS if DB is empty
  useEffect(() => {
    let cancelled = false;
    async function loadJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok || cancelled) return;
        const { jobs: dbJobs } = await res.json();
        if (!cancelled && Array.isArray(dbJobs) && dbJobs.length > 0) {
          const mapped = (dbJobs as Record<string, unknown>[]).map(mapDbJob);
          setJobs(mapped);
          setSelectedId(mapped[0].id);
        }
      } catch { /* keep static fallback */ }
    }
    loadJobs();
    return () => { cancelled = true; };
  }, []);

  const scored: ScoredJob[] = useMemo(() => {
    return jobs.map(job => {
      const result = resumeText
        ? matchJd(resumeText, job.jdText)
        : { score: 0 };
      return { ...job, matchPct: result.score };
    }).sort((a, b) => b.matchPct - a.matchPct);
  }, [resumeText, jobs]);

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

  const chip = (f: Filter): React.CSSProperties => ({
    padding: "6px 16px", border: "1px solid",
    borderColor: filter === f ? "var(--accborder)" : "var(--border)",
    borderRadius: 99, fontSize: 12, fontWeight: 500,
    color: filter === f ? "var(--accent)" : "var(--text2)",
    background: filter === f ? "var(--accdim)" : "none",
    cursor: "pointer", whiteSpace: "nowrap" as const,
    fontFamily: "inherit", transition: "all .18s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      {/* Top bar */}
      <div style={{
        background: "rgba(8,8,12,.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>
            <ArrowLeft size={14} />
          </Link>
          <span style={{ color: "var(--border)" }}>|</span>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 1, background: "rgba(255,255,255,.05)", borderRadius: 10, padding: 3 }}>
            {(["jobs", "scanner"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                background: tab === t ? "var(--surface)" : "transparent",
                color: tab === t ? "var(--text1)" : "var(--text3)",
                transition: "all .18s", letterSpacing: "-.01em",
              }}>
                {t === "jobs" ? "Matched Jobs" : "JD Scanner"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/score" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: "var(--accdim)", border: "1px solid var(--accborder)",
            borderRadius: 9, color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            <Target size={13} /> Score
          </Link>
          <Link href="/builder" style={{
            padding: "7px 16px", background: "var(--accent)", borderRadius: 9,
            color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
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
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0" }}>
          {/* Pill filters strip */}
          <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6, alignItems: "center", overflowX: "auto", scrollbarWidth: "none" as const }}>
            <button onClick={() => setFilter("best")}   style={chip("best")}>All jobs</button>
            <button onClick={() => setFilter("remote")} style={chip("remote")}>🌐 Remote</button>
            <button onClick={() => setFilter("fresh")}  style={chip("fresh")}>⚡ Today</button>
            <div style={{ height: 16, width: 1, background: "var(--border)", flexShrink: 0, margin: "0 6px" }} />
            <span style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" as const }}>
              <span style={{ fontWeight: 700, color: "var(--text1)" }}>{filtered.filter(j => !j.ghost).length}</span> roles · ranked by match
            </span>
          </div>

          {/* Split layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", minHeight: "calc(100vh - 112px)" }}>
            {/* Job list */}
            <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto" }}>
              {filtered.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedId === job.id}
                  onClick={() => setSelectedId(job.id)}
                />
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "var(--text2)", fontSize: 14 }}>
                  No jobs match this filter.
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div style={{ overflowY: "auto" }}>
              {selected && <DetailPanel job={selected} resumeText={resumeText} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
