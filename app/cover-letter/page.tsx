"use client";
/**
 * /cover-letter — AI Cover Letter Builder
 *
 * Generates a tailored cover letter using Groq LLM.
 * Supports tone selection, length control, copy & download.
 */
import React, { useState, useRef } from "react";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/lib/auth";

/* ── Types ────────────────────────────────────────────────── */
type Tone   = "professional" | "enthusiastic" | "concise";
type Length = "short" | "medium" | "long";

/* ── Constants ───────────────────────────────────────────── */
const TONES: { value: Tone; label: string; desc: string; icon: string }[] = [
  { value: "professional",  label: "Professional", desc: "Polished & confident",  icon: "🎩" },
  { value: "enthusiastic",  label: "Enthusiastic", desc: "Warm & energetic",      icon: "⚡" },
  { value: "concise",       label: "Concise",      desc: "Direct & crisp",        icon: "⚡" },
];
const LENGTHS: { value: Length; label: string; words: string }[] = [
  { value: "short",  label: "Short",  words: "~175 words" },
  { value: "medium", label: "Medium", words: "~275 words" },
  { value: "long",   label: "Long",   words: "~375 words" },
];

/* ── Character counter util ──────────────────────────────── */
function Char({ val, max }: { val: string; max: number }) {
  const len = val.length;
  const over = len > max;
  return (
    <span style={{ fontSize: 11, color: over ? "var(--danger)" : "var(--text3)", float: "right", marginTop: 3 }}>
      {len}/{max}
    </span>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function CoverLetterPage() {
  const { user } = useAuth();

  /* form */
  const [name,       setName]       = useState(user?.user_metadata?.full_name ?? "");
  const [jobTitle,   setJobTitle]   = useState("");
  const [company,    setCompany]    = useState("");
  const [jobDesc,    setJobDesc]    = useState("");
  const [skills,     setSkills]     = useState("");
  const [experience, setExperience] = useState("");
  const [tone,       setTone]       = useState<Tone>("professional");
  const [length,     setLength]     = useState<Length>("medium");

  /* result */
  const [letter,   setLetter]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState(false);
  const [edited,   setEdited]   = useState(false);

  const textRef = useRef<HTMLTextAreaElement>(null);

  /* ── Generate ──────────────────────────────────────────── */
  async function generate() {
    if (!jobTitle.trim() || !company.trim()) {
      setError("Job title and company name are required.");
      return;
    }
    setError("");
    setLoading(true);
    setLetter("");
    setEdited(false);

    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, jobTitle, company, jobDesc, skills, experience, tone, targetLength: length }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setLetter(json.letter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Copy ──────────────────────────────────────────────── */
  async function copyToClipboard() {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Download ──────────────────────────────────────────── */
  function downloadTxt() {
    const blob = new Blob([letter], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cover-letter-${company.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
  }

  /* ── Styles ────────────────────────────────────────────── */
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 14, padding: 20, marginBottom: 16,
  };
  const label: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "var(--text2)",
    textTransform: "uppercase", letterSpacing: ".04em",
    display: "block", marginBottom: 6,
  };
  const field: React.CSSProperties = {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text1)", fontSize: 13,
    padding: "8px 10px", outline: "none",
  };

  return (
    <>
      <AppNav />
      <div className="pg" style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            ✉️ Cover Letter Builder
          </h1>
          <p style={{ color: "var(--text2)", fontSize: 13 }}>
            AI-tailored cover letters in 30 seconds — specific to the role, company, and your background.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Left: Input form ─────────────────────────────── */}
          <div>

            {/* Basic info */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "var(--text1)" }}>
                📋 Role details
              </p>

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Your name</label>
                <input style={field} placeholder="e.g. Priya Sharma"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={label}>Job title <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input style={field} placeholder="e.g. Senior Product Manager"
                    value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div>
                  <label style={label}>Company <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input style={field} placeholder="e.g. Razorpay"
                    value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={label}>Job description / key requirements</label>
                <Char val={jobDesc} max={1200} />
                <textarea style={{ ...field, minHeight: 90, resize: "vertical" }}
                  placeholder="Paste key responsibilities or requirements from the JD…"
                  value={jobDesc} onChange={e => setJobDesc(e.target.value.slice(0, 1200))} />
              </div>
            </div>

            {/* Your background */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "var(--text1)" }}>
                🧠 Your background (optional — improves quality)
              </p>

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Relevant skills</label>
                <Char val={skills} max={300} />
                <input style={field} placeholder="e.g. React, TypeScript, Agile, 3 years in fintech"
                  value={skills} onChange={e => setSkills(e.target.value.slice(0, 300))} />
              </div>

              <div>
                <label style={label}>Key experience / achievement to highlight</label>
                <Char val={experience} max={400} />
                <textarea style={{ ...field, minHeight: 70, resize: "vertical" }}
                  placeholder="e.g. Led a team of 5 to ship a payments feature used by 2M users"
                  value={experience} onChange={e => setExperience(e.target.value.slice(0, 400))} />
              </div>
            </div>

            {/* Tone */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text1)" }}>
                🎭 Tone
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {TONES.map(t => (
                  <button key={t.value} onClick={() => setTone(t.value)}
                    style={{
                      flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${tone === t.value ? "var(--accent)" : "var(--border)"}`,
                      background: tone === t.value ? "var(--accdim)" : "var(--surface2)",
                      textAlign: "center" as const,
                    }}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: tone === t.value ? "var(--accent)" : "var(--text1)" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div style={{ ...card, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text1)" }}>
                📏 Length
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {LENGTHS.map(l => (
                  <button key={l.value} onClick={() => setLength(l.value)}
                    style={{
                      flex: 1, padding: "9px 8px", borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${length === l.value ? "var(--accent)" : "var(--border)"}`,
                      background: length === l.value ? "var(--accdim)" : "var(--surface2)",
                      textAlign: "center" as const,
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: length === l.value ? "var(--accent)" : "var(--text1)" }}>{l.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{l.words}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            {error && (
              <div style={{ background: "var(--dangerdim)", border: "1px solid var(--danger)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: loading ? "var(--surface2)" : "var(--accent)", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                  Generating…
                </>
              ) : (
                "✨ Generate cover letter"
              )}
            </button>
          </div>

          {/* ── Right: Output ─────────────────────────────────── */}
          <div>
            {!letter && !loading && (
              <div style={{
                ...card,
                minHeight: 420, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
                color: "var(--text3)", textAlign: "center",
              }}>
                <div style={{ fontSize: 48 }}>✉️</div>
                <p style={{ fontSize: 13 }}>
                  Fill in the role details on the left and click<br />
                  <strong style={{ color: "var(--text2)" }}>"Generate cover letter"</strong>
                </p>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, textAlign: "left", maxWidth: 280 }}>
                  {["Role-specific opening — no generic intros", "Highlights your skills and achievements", "Naturally references the company", "Adjustable tone and length"].map(tip => (
                    <div key={tip} style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--success)", flexShrink: 0 }}>✓</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div style={{
                ...card, minHeight: 420, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16,
              }}>
                <div className="spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                <p style={{ color: "var(--text2)", fontSize: 13 }}>Crafting your cover letter…</p>
              </div>
            )}

            {letter && !loading && (
              <div>
                {/* Toolbar */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <button onClick={generate}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", fontSize: 12, cursor: "pointer" }}>
                    🔄 Regenerate
                  </button>
                  <button onClick={copyToClipboard}
                    style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${copied ? "var(--success)" : "var(--border)"}`, background: copied ? "rgba(34,197,94,.1)" : "var(--surface2)", color: copied ? "var(--success)" : "var(--text2)", fontSize: 12, cursor: "pointer" }}>
                    {copied ? "✓ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={downloadTxt}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", fontSize: 12, cursor: "pointer" }}>
                    ⬇ Download .txt
                  </button>
                  {edited && (
                    <span style={{ fontSize: 11, color: "var(--warn)", alignSelf: "center" }}>● Edited</span>
                  )}
                </div>

                {/* Editable letter */}
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                      Cover Letter — {company}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>
                      {letter.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  <textarea
                    ref={textRef}
                    value={letter}
                    onChange={e => { setLetter(e.target.value); setEdited(true); }}
                    style={{
                      width: "100%", minHeight: 380, resize: "vertical",
                      background: "transparent", border: "none", outline: "none",
                      color: "var(--text1)", fontSize: 13, lineHeight: 1.8,
                      fontFamily: "inherit", padding: 0,
                    }}
                  />
                </div>

                {/* Tips */}
                <div style={{ background: "var(--accdim)", border: "1px solid var(--accborder)", borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>💡 Before you send</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {[
                      "Add the hiring manager's name if you know it",
                      "Include today's date and your contact details above",
                      "Paste into Gmail / Word and format as needed",
                      "Tailor the opening if you know someone at the company",
                    ].map(tip => (
                      <div key={tip} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ color: "var(--accent)", flexShrink: 0 }}>→</span> {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mobile responsiveness */}
      <style>{`
        @media (max-width: 700px) {
          .pg > div > div:first-child + div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
