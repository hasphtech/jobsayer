"use client";
/**
 * /linkedin — LinkedIn Profile Optimizer
 *
 * Two modes:
 *   1. TIPS DASHBOARD  — personalized health score + tips once user connects LinkedIn
 *   2. MANUAL ANALYZER — paste headline / about / skills and get AI rewrites
 */
import React, { useState, useCallback } from "react";
import { useWindowWidth } from "@/lib/useWindowWidth";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { trackAction } from "@/lib/activityTracker";
import { track } from "@/lib/analytics";

/* ─────────────────────────────────────────────── types ── */
interface Tip {
  id: string; title: string; impact: "High" | "Medium";
  effort: string; why: string; howTo: string[];
}
interface SectionTip {
  section: string; score: number;
  status: "Missing" | "Weak" | "Good" | "Strong";
  tip: string; example: string;
}
interface GrowthTip {
  id: string; category: "Algorithm" | "Network" | "Content" | "Engagement";
  title: string; description: string; frequency: string;
}
interface WeekPlan { week: number; theme: string; tasks: string[]; }
interface LinkedInTips {
  healthScore: number; quickWins: Tip[]; sectionGuide: SectionTip[];
  growthPlaybook: GrowthTip[]; thirtyDayPlan: WeekPlan[]; roleKeywords: string[];
}
interface SectionScore { score: number; reason: string; }
interface LinkedInResult {
  scores: { headline: SectionScore; about: SectionScore; skills: SectionScore };
  rewrites: { headline: string; about: string; skills: string };
  missingKeywords: string[]; overallScore: number; topTip: string;
}

/* ─────────────────────────────────────────────── constants ── */
const TARGET_ROLES = [
  "Software Engineer","Senior Software Engineer","Staff Engineer",
  "Frontend Engineer","Backend Engineer","Full Stack Engineer",
  "ML / AI Engineer","Data Scientist","Data Engineer",
  "Product Manager","Senior Product Manager","Product Designer",
  "DevOps / SRE Engineer","Security Engineer",
  "Engineering Manager","VP of Engineering",
  "Marketing Manager","Growth Manager","Sales Executive",
  "Finance Analyst","Operations Manager",
];
const STATUS_COLOR: Record<string, string> = {
  Missing:"var(--danger)", Weak:"var(--warn)", Good:"var(--success)", Strong:"var(--accent)",
};
const SECTION_ICON: Record<string, string> = {
  Photo:"ti-camera", Banner:"ti-photo", Headline:"ti-pencil", About:"ti-note", Featured:"ti-star",
  Experience:"ti-briefcase", Skills:"ti-tools", Recommendations:"ti-handshake", "Custom URL":"ti-link", "Open to Work":"ti-circle",
};
const CAT_COLOR: Record<string, string> = {
  Algorithm:"var(--accent)", Network:"var(--success)", Content:"var(--warn)", Engagement:"#a855f7",
};

/* ─────────────────────────────────────────────── small components ── */
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size / 2) - 6, circ = 2 * Math.PI * r;
  const col = score >= 75 ? "var(--success)" : score >= 50 ? "var(--warn)" : "var(--danger)";
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={6}
          strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 0.9s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size*0.26, fontWeight:900, color:col }}>{score}</span>
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(()=>setDone(false),1800); }); }}
      style={{ padding:"5px 12px", borderRadius:7, background:done?"rgba(34,197,94,.1)":"var(--surface2)", border:`1px solid ${done?"rgba(34,197,94,.25)":"var(--border)"}`, color:done?"var(--success)":"var(--text3)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
      {done ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Spinner() {
  return <span style={{ display:"inline-block", width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>;
}

/* ════════════════════════════════════ page ═════════════════════════════════ */
export default function LinkedInPage() {
  const w = useWindowWidth(), mobile = w < 640;
  const { user, signInWithLinkedIn } = useAuth();

  const isLinkedInConnected = !!(
    user?.app_metadata?.provider === "linkedin_oidc" ||
    (user?.identities ?? []).some((i: { provider: string }) => i.provider === "linkedin_oidc")
  );

  /* tips state */
  const [targetRole,  setTargetRole]  = useState("");
  const [customRole,  setCustomRole]  = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [connections, setConnections] = useState("");
  const [tipHeadline, setTipHeadline] = useState("");
  const [tipAbout,    setTipAbout]    = useState("");
  const [tipSkills,   setTipSkills]   = useState("");
  const [tips,        setTips]        = useState<LinkedInTips | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError,   setTipsError]   = useState("");
  const [tipsTab,     setTipsTab]     = useState<"wins"|"sections"|"growth"|"plan">("wins");
  const [checkedWins, setCheckedWins] = useState<Set<string>>(new Set());

  /* linkedin import state */
  const [importText,     setImportText]     = useState("");
  const [importLoading,  setImportLoading]  = useState(false);
  const [importResult,   setImportResult]   = useState<Record<string, unknown> | null>(null);
  const [importError,    setImportError]    = useState("");
  const [showImport,     setShowImport]     = useState(false);

  async function handleImport() {
    if (!importText.trim() || importText.length < 50) { setImportError("Paste more profile text (at least 50 characters)."); return; }
    setImportLoading(true); setImportError(""); setImportResult(null);
    try {
      const res  = await fetch("/api/linkedin/import", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ profileText: importText }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setImportResult(data.resume);
      // Store in localStorage so builder can pick it up
      localStorage.setItem("jobsayer-linkedin-import", JSON.stringify(data.resume));
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally { setImportLoading(false); }
  }

  /* manual analyzer state */
  const [headline,    setHeadline]    = useState("");
  const [about,       setAbout]       = useState("");
  const [skills,      setSkills]      = useState("");
  const [analyzeRole, setAnalyzeRole] = useState("");
  const [customARole, setCustomARole] = useState("");
  const [result,      setResult]      = useState<LinkedInResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [activeTab,   setActiveTab]   = useState<"headline"|"about"|"skills">("headline");

  const role      = targetRole  === "Other" ? customRole  : targetRole;
  const analyRole = analyzeRole === "Other" ? customARole : analyzeRole;

  /* generate tips */
  const handleGenerateTips = useCallback(async () => {
    if (!role.trim()) { setTipsError("Select your target role."); return; }
    setTipsLoading(true); setTipsError(""); setTips(null);
    try {
      const res  = await fetch("/api/linkedin/tips", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ targetRole:role, headline:tipHeadline, about:tipAbout,
          skills:tipSkills, linkedinUrl, connections: connections ? parseInt(connections) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tips generation failed");
      setTips(data);
      trackAction("profile_completed", 40);
      track("linkedin_tips_generated", { role, connected: isLinkedInConnected });
    } catch (e: unknown) {
      setTipsError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setTipsLoading(false); }
  }, [role, tipHeadline, tipAbout, tipSkills, linkedinUrl, connections, isLinkedInConnected]);

  /* manual analyze */
  async function handleAnalyze() {
    if (!analyRole.trim()) { setError("Select or enter your target role."); return; }
    if (!headline.trim() && !about.trim()) { setError("Add your headline or about section."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await fetch("/api/linkedin", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ headline, about, skills, targetRole:analyRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data); trackAction("profile_completed", 30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  const card: React.CSSProperties = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14 };

  /* ── render ── */
  return (
    <AppShell>
      <div style={{ padding:"24px 24px 60px", maxWidth:960, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:99, background:"var(--accdim)", border:"1px solid var(--accborder)", fontSize:11, fontWeight:700, color:"var(--accent)", marginBottom:12 }}>
            <i className="ti ti-briefcase"/> AI-Powered · Role-Targeted · LinkedIn Connected
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, marginBottom:8, letterSpacing:"-.02em" }}>LinkedIn Profile Optimizer</h1>
          <p style={{ fontSize:14, color:"var(--text3)", lineHeight:1.6, maxWidth:580 }}>
            Connect your LinkedIn to get a personalised health score, prioritised action tips, and a 30-day growth plan. Or paste your profile text below for instant AI rewrites.
          </p>
        </div>

        {/* ══════ TIPS DASHBOARD ══════ */}
        <div style={{ ...card, padding:0, marginBottom:24, overflow:"hidden" }}>

          {/* LinkedIn connection bar */}
          <div style={{ padding:"14px 20px", background:isLinkedInConnected?"linear-gradient(90deg,rgba(10,102,194,.12),rgba(10,102,194,.04))":"var(--surface2)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isLinkedInConnected?"#0a66c2":"var(--text3)"}>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text1)" }}>
                  {isLinkedInConnected ? "LinkedIn Connected ✓" : "Connect LinkedIn for personalised tips"}
                </div>
                <div style={{ fontSize:11, color:"var(--text3)", marginTop:1 }}>
                  {isLinkedInConnected
                    ? `Signed in as ${user?.user_metadata?.full_name ?? user?.email}`
                    : "We never post on your behalf — read-only connection"}
                </div>
              </div>
            </div>
            {!isLinkedInConnected && (
              <button onClick={() => signInWithLinkedIn(typeof window !== "undefined" ? window.location.pathname : "/linkedin")}
                style={{ padding:"8px 18px", borderRadius:9, background:"#0a66c2", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Sign in with LinkedIn
              </button>
            )}
          </div>

          {/* Tips form */}
          <div style={{ padding:"20px 24px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--text1)", marginBottom:14 }}>
              {isLinkedInConnected ? "Generate your personalised LinkedIn tips" : "Get LinkedIn tips (no LinkedIn account required)"}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:12, marginBottom:14 }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:6 }}>Target Role *</label>
                <select value={targetRole} onChange={e=>setTargetRole(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}>
                  <option value="">Select role…</option>
                  {TARGET_ROLES.map(r=><option key={r}>{r}</option>)}
                  <option value="Other">Other (type below)</option>
                </select>
                {targetRole === "Other" && (
                  <input value={customRole} onChange={e=>setCustomRole(e.target.value)} placeholder="e.g. Founding Engineer"
                    style={{ width:"100%", marginTop:6, padding:"9px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>
                )}
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:6 }}>Your LinkedIn URL</label>
                <input value={linkedinUrl} onChange={e=>setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/yourname"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>
              </div>
            </div>

            <details style={{ marginBottom:14 }}>
              <summary style={{ fontSize:12, fontWeight:600, color:"var(--accent)", cursor:"pointer", userSelect:"none", marginBottom:10 }}>
                + Add current headline / about for more personalised tips (optional)
              </summary>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:10 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:5 }}>Current Headline</label>
                  <input value={tipHeadline} onChange={e=>setTipHeadline(e.target.value)} maxLength={220} placeholder="e.g. Senior Software Engineer | React · TypeScript"
                    style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:5 }}>About Section</label>
                  <textarea value={tipAbout} onChange={e=>setTipAbout(e.target.value)} maxLength={2600} placeholder="Paste your About section…"
                    style={{ width:"100%", minHeight:80, padding:"9px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit", resize:"vertical" }}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:5 }}>Skills</label>
                    <input value={tipSkills} onChange={e=>setTipSkills(e.target.value)} placeholder="React, TypeScript, Node.js…"
                      style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:5 }}>Connections (approx)</label>
                    <input value={connections} onChange={e=>setConnections(e.target.value)} type="number" min={0} placeholder="e.g. 350"
                      style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>
                  </div>
                </div>
              </div>
            </details>

            {tipsError && (
              <div style={{ padding:"10px 16px", borderRadius:9, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", fontSize:13, color:"var(--danger)", marginBottom:12 }}>{tipsError}</div>
            )}

            <button onClick={handleGenerateTips} disabled={tipsLoading || !role.trim()} style={{ padding:"11px 24px", borderRadius:10, background:"var(--accent)", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:tipsLoading?"not-allowed":"pointer", fontFamily:"inherit", opacity:tipsLoading?0.7:1, display:"inline-flex", alignItems:"center", gap:8 }}>
              {tipsLoading ? <><Spinner/> Generating tips…</> : "Generate my LinkedIn tips"}
            </button>
          </div>

          {/* ── Tips results ── */}
          {tips && (
            <div style={{ borderTop:"1px solid var(--border)" }}>

              {/* Health score */}
              <div style={{ padding:"20px 24px", background:"linear-gradient(135deg,rgba(99,102,241,.06),transparent)", display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
                <ScoreRing score={tips.healthScore} size={88}/>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>
                    Profile Health: {tips.healthScore>=80?"Strong":tips.healthScore>=60?"Moderate":"Needs work"}
                  </div>
                  <div style={{ fontSize:13, color:"var(--text3)", lineHeight:1.6, marginBottom:10 }}>
                    Based on your profile data for <strong>{role}</strong> roles.
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {(tips.roleKeywords ?? []).slice(0,10).map(kw=>(
                      <span key={kw} style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600, background:"var(--accdim)", border:"1px solid var(--accborder)", color:"var(--accent)" }}>{kw}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tab bar */}
              <div style={{ display:"flex", gap:0, borderBottom:"1px solid var(--border)", padding:"0 24px", overflowX:"auto" }}>
                {([{key:"wins",label:"Quick Wins"},{key:"sections",label:"Section Guide"},{key:"growth",label:"Growth Playbook"},{key:"plan",label:"30-Day Plan"}] as const).map(t=>(
                  <button key={t.key} onClick={()=>setTipsTab(t.key)} style={{ padding:"11px 18px", fontSize:13, fontWeight:700, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", color:tipsTab===t.key?"var(--accent)":"var(--text3)", borderBottom:tipsTab===t.key?"2px solid var(--accent)":"2px solid transparent" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding:"20px 24px" }}>

                {/* Quick Wins */}
                {tipsTab==="wins" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <p style={{ fontSize:12, color:"var(--text3)", margin:"0 0 4px" }}>Check off each win as you complete it. Start with High impact, low effort items.</p>
                    {(tips.quickWins??[]).map(tip=>{
                      const done = checkedWins.has(tip.id);
                      return (
                        <div key={tip.id} style={{ ...card, padding:"14px 16px", opacity:done?0.55:1, borderColor:done?"var(--border)":tip.impact==="High"?"var(--accborder)":"var(--border)", background:done?"var(--surface2)":tip.impact==="High"?"var(--accdim)":"var(--surface)", transition:"all .2s" }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                            <button onClick={()=>{ const n=new Set(checkedWins); done?n.delete(tip.id):n.add(tip.id); setCheckedWins(n); }}
                              style={{ width:20, height:20, borderRadius:6, border:`2px solid ${done?"var(--success)":"var(--border)"}`, background:done?"var(--success)":"transparent", color:"#fff", fontSize:12, cursor:"pointer", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>
                              {done?"✓":""}
                            </button>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                                <span style={{ fontSize:13, fontWeight:700, color:"var(--text1)", textDecoration:done?"line-through":"none" }}>{tip.title}</span>
                                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:tip.impact==="High"?"rgba(99,102,241,.15)":"rgba(234,179,8,.1)", color:tip.impact==="High"?"var(--accent)":"var(--warn)" }}>{tip.impact} Impact</span>
                                <span style={{ fontSize:10, color:"var(--text3)", fontWeight:600 }}>⏱ {tip.effort}</span>
                              </div>
                              <div style={{ fontSize:12, color:"var(--text3)", marginBottom:8 }}>{tip.why}</div>
                              {(tip.howTo??[]).map((step,i)=>(
                                <div key={i} style={{ display:"flex", gap:8, fontSize:12, color:"var(--text2)", marginBottom:3 }}>
                                  <span style={{ color:"var(--accent)", fontWeight:700, flexShrink:0 }}>{i+1}.</span><span>{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {checkedWins.size>0 && <div style={{ fontSize:12, color:"var(--success)", fontWeight:700, textAlign:"center", padding:8 }}>✓ {checkedWins.size}/{tips.quickWins.length} wins completed — great progress!</div>}
                  </div>
                )}

                {/* Section Guide */}
                {tipsTab==="sections" && (
                  <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:12 }}>
                    {(tips.sectionGuide??[]).map(s=>(
                      <div key={s.section} style={{ ...card, padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <i className={`ti ${SECTION_ICON[s.section] ?? "ti-pin"}`} style={{ fontSize:16, color:"var(--text2)" }} />
                            <span style={{ fontSize:13, fontWeight:700 }}>{s.section}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, border:`1px solid ${STATUS_COLOR[s.status]}`, color:STATUS_COLOR[s.status], background:`${STATUS_COLOR[s.status]}18` }}>{s.status}</span>
                            <span style={{ fontSize:16, fontWeight:900, color:STATUS_COLOR[s.status] }}>{s.score}</span>
                          </div>
                        </div>
                        <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5, marginBottom:s.example?6:0 }}>{s.tip}</div>
                        {s.example && <div style={{ fontSize:11, color:"var(--text3)", padding:"8px 10px", background:"var(--surface2)", borderRadius:8, borderLeft:"3px solid var(--accent)", fontStyle:"italic", lineHeight:1.5 }}>{s.example}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Growth Playbook */}
                {tipsTab==="growth" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {(tips.growthPlaybook??[]).map(tip=>(
                      <div key={tip.id} style={{ ...card, padding:"14px 18px", display:"flex", gap:14 }}>
                        <div style={{ flexShrink:0 }}>
                          <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:8, fontSize:10, fontWeight:700, background:`${CAT_COLOR[tip.category]}18`, color:CAT_COLOR[tip.category], border:`1px solid ${CAT_COLOR[tip.category]}40` }}>{tip.category}</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:"var(--text1)" }}>{tip.title}</span>
                            <span style={{ fontSize:10, color:"var(--text3)", fontWeight:600, padding:"2px 8px", borderRadius:99, border:"1px solid var(--border)" }}>{tip.frequency}</span>
                          </div>
                          <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.6 }}>{tip.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 30-Day Plan */}
                {tipsTab==="plan" && (
                  <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:14 }}>
                    {(tips.thirtyDayPlan??[]).map(week=>(
                      <div key={week.week} style={{ ...card, padding:"16px 18px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                          <div style={{ width:32, height:32, borderRadius:99, background:"var(--accdim)", border:"1px solid var(--accborder)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"var(--accent)", flexShrink:0 }}>{week.week}</div>
                          <div>
                            <div style={{ fontSize:11, color:"var(--text3)", fontWeight:600 }}>Week {week.week}</div>
                            <div style={{ fontSize:13, fontWeight:800, color:"var(--text1)" }}>{week.theme}</div>
                          </div>
                        </div>
                        {(week.tasks??[]).map((task,i)=>(
                          <div key={i} style={{ display:"flex", gap:8, fontSize:12, color:"var(--text2)", marginBottom:6 }}>
                            <span style={{ color:"var(--accent)", fontWeight:700, flexShrink:0 }}><i className="ti ti-arrow-right"/></span>
                            <span style={{ lineHeight:1.5 }}>{task}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Full keyword list */}
              {(tips.roleKeywords?.length??0)>0 && (
                <div style={{ padding:"0 24px 20px" }}>
                  <div style={{ ...card, padding:"14px 18px" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--text2)", marginBottom:10 }}><i className="ti ti-key"/> Top recruiter keywords for <strong>{role}</strong> — add to your Skills &amp; About</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {tips.roleKeywords.map(kw=>(
                        <span key={kw} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 12px", borderRadius:99, fontSize:12, fontWeight:600, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text2)" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ══════ LINKEDIN PROFILE IMPORT ══════ */}
        <div style={{ marginBottom:16 }}>
          <button
            onClick={() => setShowImport(o => !o)}
            style={{ width:"100%", padding:"14px 20px", borderRadius:12, border:"1px solid var(--border)", background:"var(--surface)", textAlign:"left", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"space-between" }}
          >
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--text1)" }}><i className="ti ti-download"/> Import from LinkedIn</div>
              <div style={{ fontSize:12, color:"var(--text3)", marginTop:2 }}>Paste your LinkedIn profile text <i className="ti ti-arrow-right"/> auto-fill the resume builder</div>
            </div>
            <span style={{ fontSize:16, color:"var(--text3)" }}>{showImport ? "▲" : "▼"}</span>
          </button>
          {showImport && (
            <div style={{ marginTop:8, padding:"20px", background:"var(--surface)", borderRadius:12, border:"1px solid var(--border)" }}>
              <p style={{ margin:"0 0 12px", fontSize:13, color:"var(--text2)" }}>
                On LinkedIn, go to your profile <i className="ti ti-arrow-right"/> select all text (Ctrl+A) <i className="ti ti-arrow-right"/> paste it below. No API key needed — our AI extracts everything.
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Paste your LinkedIn profile text here…&#10;&#10;Example:&#10;John Smith&#10;Senior Software Engineer at Google&#10;San Francisco, CA · 500+ connections&#10;&#10;About&#10;I'm a software engineer with 8 years of experience..."
                rows={8}
                style={{ width:"100%", padding:"12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text1)", fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}
              />
              {importError && <div style={{ color:"var(--danger)", fontSize:12, marginTop:6 }}>{importError}</div>}
              {importResult && (
                <div style={{ marginTop:10, padding:"12px 16px", background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.2)", borderRadius:8 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--success)", marginBottom:4 }}><i className="ti ti-circle-check"/> Profile parsed!</div>
                  <div style={{ fontSize:12, color:"var(--text2)", marginBottom:10 }}>
                    Found: <strong>{(importResult as { name?: string }).name}</strong> ·{" "}
                    {Array.isArray((importResult as { work?: unknown[] }).work) ? (importResult as { work: unknown[] }).work.length : 0} jobs ·{" "}
                    {Array.isArray((importResult as { edu?: unknown[] }).edu) ? (importResult as { edu: unknown[] }).edu.length : 0} education entries
                  </div>
                  <a href="/builder?from=linkedin" style={{ fontSize:13, fontWeight:600, color:"var(--accent)", textDecoration:"none" }}>
                    Open Builder with imported data <i className="ti ti-arrow-right"/>
                  </a>
                </div>
              )}
              <button
                onClick={handleImport}
                disabled={importLoading || !importText.trim()}
                style={{ marginTop:10, padding:"10px 22px", borderRadius:8, background:"var(--accent)", color:"#fff", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity: importLoading ? .6 : 1 }}
              >
                {importLoading ? "Parsing…" : "Parse & Import"}
              </button>
            </div>
          )}
        </div>

        {/* ══════ MANUAL REWRITER ══════ */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--text2)", marginBottom:4 }}>✏️ Profile Copy Rewriter</div>
          <div style={{ fontSize:12, color:"var(--text3)" }}>Paste your current headline, about, and skills to get AI-rewritten versions optimised for your target role.</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:16 }}>

          {/* Inputs */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ ...card, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>Target Role</label>
              <select value={analyzeRole} onChange={e=>setAnalyzeRole(e.target.value)}
                style={{ width:"100%", padding:"10px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit", marginBottom:analyzeRole==="Other"?8:0 }}>
                <option value="">Select your target role…</option>
                {TARGET_ROLES.map(r=><option key={r}>{r}</option>)}
                <option value="Other">Other</option>
              </select>
              {analyzeRole==="Other" && <input value={customARole} onChange={e=>setCustomARole(e.target.value)} placeholder="e.g. Founding Engineer" style={{ width:"100%", padding:"10px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>}
            </div>
            <div style={{ ...card, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>Current Headline <span style={{ fontWeight:400, textTransform:"none" }}>(under 220 chars)</span></label>
              <input value={headline} onChange={e=>setHeadline(e.target.value)} maxLength={220} placeholder="e.g. Senior Software Engineer | React · TypeScript"
                style={{ width:"100%", padding:"10px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>
              <div style={{ fontSize:11, color:"var(--text3)", marginTop:5 }}>{headline.length}/220</div>
            </div>
            <div style={{ ...card, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>About Section</label>
              <textarea value={about} onChange={e=>setAbout(e.target.value)} maxLength={2600} placeholder="Paste your LinkedIn About section here…"
                style={{ width:"100%", minHeight:120, padding:"10px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit", resize:"vertical", lineHeight:1.6, outline:"none" }}
                onFocus={e=>(e.currentTarget.style.borderColor="var(--accent)")} onBlur={e=>(e.currentTarget.style.borderColor="var(--border)")}/>
              <div style={{ fontSize:11, color:"var(--text3)", marginTop:5 }}>{about.length}/2,600</div>
            </div>
            <div style={{ ...card, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>Current Skills (comma-separated)</label>
              <input value={skills} onChange={e=>setSkills(e.target.value)} placeholder="React, TypeScript, Node.js, PostgreSQL…"
                style={{ width:"100%", padding:"10px 12px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontFamily:"inherit" }}/>
            </div>
            {error && <div style={{ padding:"10px 16px", borderRadius:9, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", fontSize:13, color:"var(--danger)" }}>{error}</div>}
            <button onClick={handleAnalyze} disabled={loading||!analyRole.trim()} style={{ padding:"13px 28px", borderRadius:10, background:"var(--accent)", color:"#fff", border:"none", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", opacity:loading?0.7:1, display:"flex", alignItems:"center", gap:8 }}>
              {loading ? <><Spinner/> Analysing…</> : "Analyse & rewrite"}
            </button>
          </div>

          {/* Results */}
          <div>
            {!result ? (
              <div style={{ ...card, padding:"40px 28px", textAlign:"center", minHeight:280, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
                <div style={{ fontSize:48 }}>✏️</div>
                <div style={{ fontSize:15, fontWeight:700, color:"var(--text2)" }}>AI rewrites will appear here</div>
                <div style={{ fontSize:13, color:"var(--text3)", lineHeight:1.6, maxWidth:300 }}>Paste your profile copy on the left and click Analyse for scored, rewritten text you can copy straight into LinkedIn.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ ...card, padding:"20px 24px", display:"flex", gap:20, alignItems:"center", background:"linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor:"var(--accborder)" }}>
                  <ScoreRing score={result.overallScore} size={80}/>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800, color:result.overallScore>=75?"var(--success)":result.overallScore>=50?"var(--warn)":"var(--danger)", marginBottom:4 }}>
                      {result.overallScore>=75?"Strong profile":result.overallScore>=50?"Needs improvement":"Significant gaps"}
                    </div>
                    <div style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, maxWidth:280 }}>{result.topTip}</div>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  {(["headline","about","skills"] as const).map(section=>{
                    const s = result.scores[section];
                    const col = s.score>=75?"var(--success)":s.score>=50?"var(--warn)":"var(--danger)";
                    return (
                      <button key={section} onClick={()=>setActiveTab(section)} style={{ ...card, padding:"12px 14px", textAlign:"center", cursor:"pointer", borderColor:activeTab===section?"var(--accent)":"var(--border)", background:activeTab===section?"var(--accdim)":"var(--surface)", fontFamily:"inherit" }}>
                        <div style={{ fontSize:20, fontWeight:900, color:col }}>{s.score}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", textTransform:"capitalize", marginTop:2 }}>{section}</div>
                        <div style={{ fontSize:10, color:"var(--text3)", marginTop:4, lineHeight:1.4 }}>{s.reason}</div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ ...card, padding:"18px 20px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, textTransform:"capitalize" }}><i className="ti ti-sparkles"/> AI-rewritten {activeTab}</div>
                    <CopyBtn text={result.rewrites[activeTab]}/>
                  </div>
                  <div style={{ padding:"14px 16px", background:"var(--surface2)", borderRadius:10, border:"1px solid var(--border)", fontSize:13, color:"var(--text1)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                    {result.rewrites[activeTab]}
                  </div>
                  <div style={{ marginTop:10, fontSize:11, color:"var(--text3)" }}>Click Copy <i className="ti ti-arrow-right"/> paste into LinkedIn <i className="ti ti-arrow-right"/> Edit profile <i className="ti ti-arrow-right"/> {activeTab.charAt(0).toUpperCase()+activeTab.slice(1)}</div>
                </div>

                {result.missingKeywords.length>0 && (
                  <div style={{ ...card, padding:"16px 18px" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--warn)", marginBottom:10 }}>⚠ Keywords missing from your profile</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                      {result.missingKeywords.map(kw=>(
                        <span key={kw} style={{ padding:"4px 12px", borderRadius:99, fontSize:12, fontWeight:600, background:"rgba(234,179,8,.1)", border:"1px solid rgba(234,179,8,.25)", color:"var(--warn)" }}>+ {kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <Link href="/builder" style={{ padding:"9px 18px", borderRadius:9, background:"var(--accdim)", border:"1px solid var(--accborder)", color:"var(--accent)", fontSize:13, fontWeight:700, textDecoration:"none" }}>Update resume to match <i className="ti ti-arrow-right"/></Link>
                  <Link href="/career-gps" style={{ padding:"9px 18px", borderRadius:9, background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text1)", fontSize:13, fontWeight:600, textDecoration:"none" }}>Close skill gaps <i className="ti ti-arrow-right"/></Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );
}
