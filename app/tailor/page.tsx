"use client";
/**
 * /tailor — AI Resume JD Tailor
 * Paste a JD → AI rewrites your resume bullets to match keywords.
 * Shows before/after diff with keyword highlighting.
 */
import React, { useState, useEffect } from "react";
import { useWindowWidth } from "@/lib/useWindowWidth";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { trackAction } from "@/lib/activityTracker";
import type { ResumeData } from "@/lib/types";

/* ── Types ───────────────────────────────────────────────────── */
interface TailoredBullet {
  original:  string;
  rewritten: string;
  keywords:  string[];
}
interface TailorResult {
  tailored:    TailoredBullet[];
  newKeywords: string[];
}

/* ── Keyword highlighter ─────────────────────────────────────── */
function HighlightedText({ text, keywords, color }: { text: string; keywords: string[]; color: string }) {
  if (!keywords.length) return <span>{text}</span>;
  const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts   = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        keywords.some(k => k.toLowerCase() === part.toLowerCase())
          ? <mark key={i} style={{ background: color + "33", color, borderRadius: 3, padding: "0 2px", fontWeight: 600 }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function TailorPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [jdText,    setJdText]    = useState("");
  const [bullets,   setBullets]   = useState<string[]>([]);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [result,    setResult]    = useState<TailorResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [copied,    setCopied]    = useState<number | null>(null);
  const [tab,       setTab]       = useState<"work"|"projects">("work");
  const [selectedBullets, setSelectedBullets] = useState<Set<number>>(new Set());
  const [allSelected, setAllSelected] = useState(true);

  // Load resume bullets from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-resume-draft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const data: ResumeData = parsed.data ?? parsed;
      const workBullets = (data.work ?? []).flatMap(w =>
        (w.desc ?? "").split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(l => l.length > 10)
      );
      const projBullets = (data.projects ?? []).flatMap(p =>
        (p.desc ?? "").split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(l => l.length > 10)
      );
      const all = tab === "work" ? workBullets : projBullets;
      setBullets(all.slice(0, 20));
      setSelectedBullets(new Set(all.slice(0, 20).map((_, i) => i)));
      setResumeLoaded(true);
    } catch { /* ignore */ }
  }, [tab]);

  async function handleTailor() {
    if (!jdText.trim()) { setError("Paste a job description first."); return; }
    const activeBullets = bullets.filter((_, i) => selectedBullets.has(i));
    if (!activeBullets.length) { setError("Select at least one bullet to tailor."); return; }

    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, bullets: activeBullets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tailoring failed");
      setResult(data);
      trackAction("resume_updated", 30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function copyBullet(text: string, i: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(i);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  function copyAll() {
    const all = result?.tailored.map(t => `• ${t.rewritten}`).join("\n") ?? "";
    navigator.clipboard.writeText(all).then(() => {
      setCopied(-1);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  function toggleBullet(i: number) {
    setSelectedBullets(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 };

  const matchScore = result ? Math.min(100, Math.round(
    (result.tailored.reduce((sum, t) => sum + (t.keywords?.length ?? 0), 0) / Math.max(1, result.tailored.length)) * 18
  )) : null;

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            ✂️ AI-Powered · Keyword-Matched
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>Resume JD Tailor</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6, maxWidth: 560 }}>
            Paste any job description → AI rewrites your resume bullets to match its keywords and requirements.
            See exactly what changed and why.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>

          {/* Left: JD input */}
          <div style={{ ...card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>📋 Job Description</div>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here…"
              style={{
                flex: 1, minHeight: 320, padding: "12px 14px", borderRadius: 10,
                background: "var(--surface2)", border: "1px solid var(--border)",
                color: "var(--text1)", fontSize: 13, fontFamily: "inherit",
                resize: "vertical", lineHeight: 1.6, outline: "none",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={e =>  (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {jdText.split(/\s+/).filter(Boolean).length} words · First 600 words used for analysis
            </div>
          </div>

          {/* Right: Bullet selector */}
          <div style={{ ...card, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>📝 Your Resume Bullets</div>
              {!resumeLoaded && (
                <Link href="/builder" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                  Build resume first →
                </Link>
              )}
            </div>

            {/* Source tabs */}
            <div style={{ display: "flex", gap: 2, background: "var(--surface2)", borderRadius: 8, padding: 3, width: "fit-content" }}>
              {(["work", "projects"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600,
                  background: tab === t ? "var(--surface)" : "transparent",
                  color: tab === t ? "var(--text1)" : "var(--text3)",
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.15)" : "none",
                }}>{t === "work" ? "Work experience" : "Projects"}</button>
              ))}
            </div>

            {/* Select all toggle */}
            {bullets.length > 0 && (
              <button onClick={() => {
                if (selectedBullets.size === bullets.length) { setSelectedBullets(new Set()); setAllSelected(false); }
                else { setSelectedBullets(new Set(bullets.map((_, i) => i))); setAllSelected(true); }
              }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 600, textAlign: "left", padding: 0, fontFamily: "inherit" }}>
                {selectedBullets.size === bullets.length ? "Deselect all" : `Select all (${bullets.length})`}
              </button>
            )}

            <div style={{ flex: 1, overflowY: "auto", maxHeight: 280, display: "flex", flexDirection: "column", gap: 6 }}>
              {bullets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)", fontSize: 13 }}>
                  {resumeLoaded ? `No ${tab} bullets found.` : "No resume detected. Build one first."}
                </div>
              ) : bullets.map((bullet, i) => (
                <label key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px",
                  borderRadius: 8, cursor: "pointer",
                  background: selectedBullets.has(i) ? "var(--accdim)" : "var(--surface2)",
                  border: `1px solid ${selectedBullets.has(i) ? "var(--accborder)" : "var(--border)"}`,
                  transition: "all .12s",
                }}>
                  <input type="checkbox" checked={selectedBullets.has(i)} onChange={() => toggleBullet(i)}
                    style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--accent)" }} />
                  <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{bullet}</span>
                </label>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {selectedBullets.size} of {bullets.length} bullets selected
            </div>
          </div>
        </div>

        {/* Tailor button */}
        {error && (
          <div style={{ padding: "10px 16px", borderRadius: 9, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <button onClick={handleTailor} disabled={loading || !jdText.trim()} style={{
            padding: "12px 32px", borderRadius: 10, background: "var(--accent)", color: "#fff",
            border: "none", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8,
          }}>
            {loading ? (
              <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Tailoring…</>
            ) : "✂️ Tailor resume to this JD"}
          </button>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            ~10 seconds · Uses Groq AI · Powered by Llama 3.3
          </span>
        </div>

        {/* Results */}
        {result && (
          <div>
            {/* Summary bar */}
            <div style={{ ...card, padding: "16px 22px", marginBottom: 16, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor: "var(--accborder)" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Bullets tailored</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--success)" }}>{result.tailored.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Keywords injected</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent)" }}>
                  {result.tailored.reduce((sum, t) => sum + (t.keywords?.length ?? 0), 0)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>New keywords missing from your current resume</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.newKeywords.map(kw => (
                    <span key={kw} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "rgba(234,179,8,.1)", border: "1px solid rgba(234,179,8,.25)", color: "var(--warn)" }}>
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={copyAll} style={{ padding: "9px 20px", borderRadius: 9, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                {copied === -1 ? "✓ Copied all!" : "Copy all bullets"}
              </button>
            </div>

            {/* Before / after cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.tailored.map((item, i) => (
                <div key={i} style={{ ...card, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 0 }}>
                    {/* Before */}
                    <div style={{ padding: "16px 18px", borderRight: "1px solid var(--border2)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text3)", marginBottom: 8 }}>
                        Before
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, margin: 0 }}>
                        {item.original}
                      </p>
                    </div>
                    {/* After */}
                    <div style={{ padding: "16px 18px", background: "rgba(34,197,94,.03)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--success)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>After — keywords matched</span>
                        <button onClick={() => copyBullet(item.rewritten, i)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", fontSize: 10, color: "var(--text3)", cursor: "pointer", fontFamily: "inherit" }}>
                          {copied === i ? "✓" : "Copy"}
                        </button>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                        <HighlightedText text={item.rewritten} keywords={item.keywords ?? []} color="var(--success)" />
                      </p>
                      {item.keywords?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          {item.keywords.map(kw => (
                            <span key={kw} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "rgba(34,197,94,.1)", color: "var(--success)", fontWeight: 600 }}>{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply CTA */}
            <div style={{ ...card, padding: "20px 24px", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "var(--accdim)", borderColor: "var(--accborder)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 4 }}>Ready to apply these changes?</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Copy individual bullets above or open the builder to paste them in directly.</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={copyAll} style={{ padding: "9px 18px", borderRadius: 9, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {copied === -1 ? "✓ Copied!" : "Copy all"}
                </button>
                <Link href="/builder" style={{ padding: "9px 18px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  Open Builder →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
