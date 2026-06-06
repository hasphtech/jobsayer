"use client";
/**
 * /cover-letter — AI Cover Letter Builder
 *
 * Linked to saved resumes:
 *   - Resume picker auto-fills name / skills / experience from ResumeData
 *   - Generated letters are saved and shown under the selected resume
 *   - "Saved letters" panel shows all past letters for the chosen resume
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import {
  listResumes, loadResumeSave,
  saveCoverLetter, listCoverLetters, deleteCoverLetter,
  type ResumeRecord, type CoverLetterRecord,
} from "@/lib/resumeDb";
import type { ResumeData } from "@/lib/types";
import { trackAction } from "@/lib/activityTracker";

/* ── Types ────────────────────────────────────────────────── */
type Tone   = "professional" | "enthusiastic" | "concise";
type Length = "short" | "medium" | "long";

/* ── Constants ───────────────────────────────────────────── */
const TONES: { value: Tone; label: string; desc: string; icon: string }[] = [
  { value: "professional",  label: "Professional", desc: "Polished & confident",  icon: "🎩" },
  { value: "enthusiastic",  label: "Enthusiastic", desc: "Warm & energetic",      icon: "⚡" },
  { value: "concise",       label: "Concise",      desc: "Direct & crisp",        icon: "✂️" },
];
const LENGTHS: { value: Length; label: string; words: string }[] = [
  { value: "short",  label: "Short",  words: "~175 words" },
  { value: "medium", label: "Medium", words: "~275 words" },
  { value: "long",   label: "Long",   words: "~375 words" },
];

/* ── Helpers ─────────────────────────────────────────────── */
function Char({ val, max }: { val: string; max: number }) {
  const over = val.length > max;
  return (
    <span style={{ fontSize: 11, color: over ? "var(--danger)" : "var(--text3)", float: "right", marginTop: 3 }}>
      {val.length}/{max}
    </span>
  );
}

/** Extract the most useful experience line from resume work history */
function extractExperience(data: ResumeData): string {
  const recent = data.work?.[0];
  if (!recent) return "";
  const firstBullet = recent.desc?.split("\n").find(l => l.trim()) ?? "";
  return `${recent.role} at ${recent.company}${firstBullet ? `. ${firstBullet.replace(/^[•\-]\s*/, "")}` : ""}`.slice(0, 400);
}

/* ── Main page ───────────────────────────────────────────── */
export default function CoverLetterPage() {
  const { user } = useAuth();

  /* resume list */
  const [resumes,         setResumes]         = useState<ResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [loadingResumes,  setLoadingResumes]  = useState(false);

  /* form */
  const [name,       setName]       = useState("");
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

  /* save / history */
  const [saving,       setSaving]       = useState(false);
  const [savedId,      setSavedId]      = useState<string | null>(null);
  const [savedLetters, setSavedLetters] = useState<CoverLetterRecord[]>([]);
  const [viewingId,    setViewingId]    = useState<string | null>(null);

  const textRef = useRef<HTMLTextAreaElement>(null);

  /* ── Load resumes on mount ─────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    setLoadingResumes(true);
    listResumes(user.id)
      .then(setResumes)
      .finally(() => setLoadingResumes(false));
    // Pre-fill name from auth metadata
    setName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
  }, [user]);

  /* ── Auto-fill from selected resume ───────────────────── */
  const loadResumeData = useCallback(async (resumeId: string) => {
    if (!user || !resumeId) {
      setSelectedResumeId("");
      setSavedLetters([]);
      return;
    }
    setSelectedResumeId(resumeId);

    // Load resume data for auto-fill
    const saved = await loadResumeSave(resumeId, user.id);
    if (saved) {
      const d: ResumeData = saved.data;
      if (d.name)   setName(d.name);
      if (d.skills) setSkills(d.skills.slice(0, 300));
      const exp = extractExperience(d);
      if (exp)      setExperience(exp);
    }

    // Load saved cover letters for this resume
    const letters = await listCoverLetters(user.id, resumeId);
    setSavedLetters(letters);
    setSavedId(null);
    setLetter("");
    setEdited(false);
  }, [user]);

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
    setSavedId(null);

    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, jobTitle, company, jobDesc, skills, experience, tone, targetLength: length }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setLetter(json.letter);
      trackAction("cover_letter_generated", 30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Save ──────────────────────────────────────────────── */
  async function saveLetter() {
    if (!user || !letter) return;
    setSaving(true);
    try {
      const id = await saveCoverLetter(
        user.id, jobTitle, company, letter, tone,
        selectedResumeId || undefined,
      );
      setSavedId(id);
      setEdited(false);
      // Refresh saved list
      const updated = await listCoverLetters(user.id, selectedResumeId || undefined);
      setSavedLetters(updated);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete saved letter ───────────────────────────────── */
  async function handleDelete(id: string) {
    if (!user) return;
    await deleteCoverLetter(id, user.id);
    setSavedLetters(p => p.filter(l => l.id !== id));
    if (viewingId === id) setViewingId(null);
  }

  /* ── Copy / download ───────────────────────────────────── */
  async function copyToClipboard() {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
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
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "var(--text2)",
    textTransform: "uppercase", letterSpacing: ".04em",
    display: "block", marginBottom: 6,
  };
  const field: React.CSSProperties = {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text1)", fontSize: 13,
    padding: "8px 10px", outline: "none",
  };

  const viewingLetter = viewingId
    ? savedLetters.find(l => l.id === viewingId)
    : null;

  return (
    <AppShell>
      <div className="pg" style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>✉️ Cover Letter Builder</h1>
          <p style={{ color: "var(--text2)", fontSize: 13 }}>
            AI-tailored cover letters linked to your saved resumes.
          </p>
        </div>

        {/* ── Resume picker ────────────────────────────────── */}
        {user && (
          <div style={{ ...card, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", flexShrink: 0 }}>
              📄 Link to resume:
            </span>
            <select
              value={selectedResumeId}
              onChange={e => loadResumeData(e.target.value)}
              style={{ ...field, width: "auto", flex: 1, minWidth: 200, maxWidth: 360 }}
              disabled={loadingResumes}
            >
              <option value="">— No resume selected —</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.template} · {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </option>
              ))}
            </select>
            {selectedResumeId && (
              <span style={{ fontSize: 12, color: "var(--success)" }}>
                ✓ Fields auto-filled from resume
              </span>
            )}
            {!user && (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                Sign in to link letters to your resumes
              </span>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Left: Input form ─────────────────────────────── */}
          <div>

            {/* Role details */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>📋 Role details</p>

              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Your name</label>
                <input style={field} placeholder="e.g. Priya Sharma"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Job title <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input style={field} placeholder="e.g. Senior PM"
                    value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Company <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input style={field} placeholder="e.g. Razorpay"
                    value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={lbl}>Job description / key requirements</label>
                <Char val={jobDesc} max={1200} />
                <textarea style={{ ...field, minHeight: 80, resize: "vertical" }}
                  placeholder="Paste key responsibilities or requirements from the JD…"
                  value={jobDesc} onChange={e => setJobDesc(e.target.value.slice(0, 1200))} />
              </div>
            </div>

            {/* Background */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🧠 Your background</p>
              {selectedResumeId && (
                <p style={{ fontSize: 11, color: "var(--success)", marginBottom: 12 }}>✓ Auto-filled from selected resume — edit as needed</p>
              )}
              {!selectedResumeId && (
                <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>Select a resume above to auto-fill these fields</p>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Relevant skills</label>
                <Char val={skills} max={300} />
                <input style={field} placeholder="e.g. React, TypeScript, Agile, 3 yrs fintech"
                  value={skills} onChange={e => setSkills(e.target.value.slice(0, 300))} />
              </div>

              <div>
                <label style={lbl}>Key experience / achievement</label>
                <Char val={experience} max={400} />
                <textarea style={{ ...field, minHeight: 60, resize: "vertical" }}
                  placeholder="e.g. Led a team of 5 to ship payments feature used by 2M users"
                  value={experience} onChange={e => setExperience(e.target.value.slice(0, 400))} />
              </div>
            </div>

            {/* Tone */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🎭 Tone</p>
              <div style={{ display: "flex", gap: 8 }}>
                {TONES.map(t => (
                  <button key={t.value} onClick={() => setTone(t.value)}
                    style={{
                      flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${tone === t.value ? "var(--accent)" : "var(--border)"}`,
                      background: tone === t.value ? "var(--accdim)" : "var(--surface2)",
                      textAlign: "center" as const,
                    }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: tone === t.value ? "var(--accent)" : "var(--text1)" }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div style={{ ...card, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📏 Length</p>
              <div style={{ display: "flex", gap: 8 }}>
                {LENGTHS.map(l => (
                  <button key={l.value} onClick={() => setLength(l.value)}
                    style={{
                      flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer",
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

            {error && (
              <div style={{ background: "var(--dangerdim)", border: "1px solid var(--danger)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <button onClick={generate} disabled={loading} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: loading ? "var(--surface2)" : "var(--accent)", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                  Generating…
                </>
              ) : "✨ Generate cover letter"}
            </button>
          </div>

          {/* ── Right: Output + saved letters ─────────────────── */}
          <div>
            {/* Empty state */}
            {!letter && !loading && (
              <div style={{ ...card, minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text3)", textAlign: "center" }}>
                <div style={{ fontSize: 44 }}>✉️</div>
                <p style={{ fontSize: 13 }}>
                  Fill in the role details and click<br />
                  <strong style={{ color: "var(--text2)" }}>"Generate cover letter"</strong>
                </p>
                {selectedResumeId && (
                  <p style={{ fontSize: 12, color: "var(--success)" }}>Resume linked — skills & experience pre-filled ✓</p>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ ...card, minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <div className="spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                <p style={{ color: "var(--text2)", fontSize: 13 }}>Crafting your cover letter…</p>
              </div>
            )}

            {/* Generated letter */}
            {letter && !loading && (
              <div>
                {/* Toolbar */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <button onClick={generate} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", fontSize: 12, cursor: "pointer" }}>
                    🔄 Regenerate
                  </button>
                  <button onClick={copyToClipboard} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${copied ? "var(--success)" : "var(--border)"}`, background: copied ? "rgba(34,197,94,.1)" : "var(--surface2)", color: copied ? "var(--success)" : "var(--text2)", fontSize: 12, cursor: "pointer" }}>
                    {copied ? "✓ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={downloadTxt} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", fontSize: 12, cursor: "pointer" }}>
                    ⬇ .txt
                  </button>
                  {user && (
                    <button onClick={saveLetter} disabled={saving || !!savedId} style={{
                      padding: "7px 12px", borderRadius: 8, fontSize: 12, cursor: saving || savedId ? "not-allowed" : "pointer",
                      border: `1px solid ${savedId ? "var(--success)" : "var(--accent)"}`,
                      background: savedId ? "rgba(34,197,94,.1)" : "var(--accdim)",
                      color: savedId ? "var(--success)" : "var(--accent)",
                      fontWeight: 600,
                    }}>
                      {saving ? "Saving…" : savedId ? "✓ Saved" : selectedResumeId ? "💾 Save to resume" : "💾 Save"}
                    </button>
                  )}
                  {edited && !savedId && <span style={{ fontSize: 11, color: "var(--warn)", alignSelf: "center" }}>● Unsaved edits</span>}
                </div>

                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {company} — {jobTitle}
                      </span>
                      {selectedResumeId && resumes.find(r => r.id === selectedResumeId) && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text3)" }}>
                          · {resumes.find(r => r.id === selectedResumeId)?.name}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>
                      {letter.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea ref={textRef} value={letter}
                    onChange={e => { setLetter(e.target.value); setEdited(true); setSavedId(null); }}
                    style={{ width: "100%", minHeight: 340, resize: "vertical", background: "transparent", border: "none", outline: "none", color: "var(--text1)", fontSize: 13, lineHeight: 1.8, fontFamily: "inherit", padding: 0 }}
                  />
                </div>

                <div style={{ background: "var(--accdim)", border: "1px solid var(--accborder)", borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>💡 Before you send</p>
                  {["Add hiring manager's name if known", "Add date and your contact details above", "Paste into Gmail / Word and format as needed"].map(t => (
                    <div key={t} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 4 }}>
                      <span style={{ color: "var(--accent)", flexShrink: 0 }}>→</span> {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Saved letters for this resume ───────────────── */}
            {user && selectedResumeId && savedLetters.length > 0 && (
              <div style={{ ...card, marginTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "var(--text1)" }}>
                  💾 Saved letters for this resume
                  <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>({savedLetters.length})</span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {savedLetters.map(sl => (
                    <div key={sl.id} style={{
                      borderRadius: 10, border: `1px solid ${viewingId === sl.id ? "var(--accent)" : "var(--border)"}`,
                      background: viewingId === sl.id ? "var(--accdim)" : "var(--surface2)",
                      overflow: "hidden",
                    }}>
                      {/* Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {sl.company} — {sl.jobTitle}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                            {sl.tone} · {new Date(sl.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                        <button onClick={() => setViewingId(viewingId === sl.id ? null : sl.id)}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                          {viewingId === sl.id ? "Hide" : "View"}
                        </button>
                        <button onClick={() => {
                          setLetter(sl.letter);
                          setJobTitle(sl.jobTitle);
                          setCompany(sl.company);
                          setTone(sl.tone as Tone);
                          setSavedId(sl.id);
                          setEdited(false);
                          setViewingId(null);
                        }}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--accent)", background: "var(--accdim)", color: "var(--accent)", fontSize: 11, cursor: "pointer", flexShrink: 0, fontWeight: 600 }}>
                          Load
                        </button>
                        <button onClick={() => handleDelete(sl.id)}
                          style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(239,68,68,.2)", background: "none", color: "var(--danger)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                          ✕
                        </button>
                      </div>
                      {/* Expanded preview */}
                      {viewingId === sl.id && viewingLetter && (
                        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
                          <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, marginTop: 10, whiteSpace: "pre-wrap" }}>
                            {viewingLetter.letter}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .pg > div > div + div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppShell>
  );
}
