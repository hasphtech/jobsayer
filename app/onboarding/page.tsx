"use client";
/**
 * /onboarding — Guided first-run wizard
 * 6 steps: Intent → Role → Target → Location → Resume → Done
 * Saves progress to Supabase profiles table.
 * Redirected here automatically for new users (middleware / layout).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useWindowWidth } from "@/lib/useWindowWidth";
import { track } from "@/lib/analytics";
import { createBrowserClient } from "@supabase/ssr";
import type { UserIntent } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const ROLES = [
  "Software Engineer", "Senior Engineer", "Staff / Principal Engineer",
  "Engineering Manager", "Frontend Developer", "Backend Developer",
  "Full Stack Developer", "DevOps / SRE", "Data Scientist", "ML Engineer",
  "Data Engineer", "Product Manager", "Designer", "Student / Fresher", "Other",
];

const TARGET_ROLES = [
  "SDE-1 / Junior Engineer", "SDE-2 / Mid Engineer", "Senior Engineer",
  "Staff Engineer", "Engineering Manager", "Tech Lead",
  "Full Stack Developer", "Frontend Engineer", "Backend Engineer",
  "Data Scientist", "ML Engineer", "Product Manager", "Other",
];

const LOCATIONS = [
  "Bangalore 🇮🇳", "Mumbai 🇮🇳", "Delhi / NCR 🇮🇳", "Hyderabad 🇮🇳", "Pune 🇮🇳",
  "Remote India 🇮🇳", "San Francisco 🇺🇸", "New York 🇺🇸", "London 🇬🇧",
  "Singapore 🇸🇬", "Dubai 🇦🇪", "Berlin 🇩🇪", "Remote / Worldwide 🌐", "Other",
];

const STEP_LABELS = ["Intent", "Your role", "Target role", "Location", "Resume", "Done"];

const INTENT_OPTIONS: { key: UserIntent; emoji: string; title: string; desc: string }[] = [
  { key: "candidate", emoji: "👨‍💼", title: "Find a Job",   desc: "Build your resume, prep for interviews, track applications" },
  { key: "recruiter", emoji: "🏢",   title: "Hire Talent",  desc: "Post jobs, review candidates, manage your pipeline" },
  { key: "both",      emoji: "🔄",   title: "Both",         desc: "I'm hiring and also open to opportunities" },
];

export default function OnboardingPage() {
  const router   = useRouter();
  const { user } = useAuth();
  const w        = useWindowWidth();
  const mobile   = w < 640;

  const [step,         setStep]         = useState<Step>(1);
  const [intent,       setIntent]       = useState<UserIntent | "">("");
  const [currentRole,  setCurrentRole]  = useState("");
  const [targetRole,   setTargetRole]   = useState("");
  const [location,     setLocation]     = useState("");
  const [resumeChoice, setResumeChoice] = useState<"upload" | "build" | "skip" | "">("");
  const [saving,       setSaving]       = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const progress = ((step - 1) / 5) * 100;

  async function saveAndFinish() {
    setSaving(true);
    try {
      if (user) {
        await supabase.from("profiles").upsert({
          id:                   user.id,
          user_intent:          intent || "candidate",
          recruiter_level:      "basic",
          current_job_role:     currentRole,
          target_role:          targetRole,
          location:             location,
          onboarding_completed: true,
          onboarding_step:      6,
        }, { onConflict: "id" });
      }
      await track("onboarding_completed", { intent, currentRole, targetRole, location, resumeChoice });
    } finally {
      setSaving(false);
    }
    if (resumeChoice === "build") router.push("/builder");
    else if (intent === "recruiter") router.push("/employer-dashboard");
    else router.push("/dashboard");
  }

  function next() {
    track("onboarding_step_completed", { step });
    setStep(s => (s + 1) as Step);
  }

  // Recruiter-only path skips "target role" (step 3) — they don't have one
  function nextFromRole() {
    track("onboarding_step_completed", { step: 2 });
    if (intent === "recruiter") {
      setStep(4); // skip target role
    } else {
      setStep(3);
    }
  }

  const card: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "14px 16px",
    cursor: "pointer",
    transition: "border-color .15s",
  };
  const cardActive: React.CSSProperties = {
    ...card,
    borderColor: "var(--accent)",
    background: "var(--accdim)",
  };

  // Shared back button
  const BackBtn = ({ to }: { to: Step }) => (
    <button
      onClick={() => setStep(to)}
      style={{ flex: "0 0 auto", padding: "14px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
    >
      <i className="ti ti-arrow-left" /> Back
    </button>
  );

  const ContinueBtn = ({ disabled, onClick, label }: { disabled: boolean; onClick?: () => void; label?: string }) => (
    <button
      onClick={onClick ?? next}
      disabled={disabled}
      style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: disabled ? "var(--surface2)" : "var(--accent)", color: disabled ? "var(--text3)" : "#fff", fontWeight: 700, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {label ?? "Continue"} {!disabled && <i className="ti ti-arrow-right" />}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mobile ? "24px 16px" : "40px 24px" }}>

      {/* Logo */}
      <div style={{ marginBottom: 32, fontWeight: 800, fontSize: 22, color: "var(--accent)" }}>jobSayer</div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          {STEP_LABELS.map((l, i) => (
            <span key={l} style={{
              fontSize: 11, fontWeight: 600,
              color: i + 1 <= step ? "var(--accent)" : "var(--text3)",
            }}>{l}</span>
          ))}
        </div>
        <div style={{ height: 4, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", transition: "width .3s ease", borderRadius: 4 }} />
        </div>
      </div>

      {/* Step card */}
      <div style={{ width: "100%", maxWidth: 520, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: mobile ? 24 : 36 }}>

        {/* ── Step 1: Intent ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>What brings you here?</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>We'll personalise your entire experience around your goal.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {INTENT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setIntent(opt.key)}
                  style={{
                    ...(intent === opt.key ? cardActive : card),
                    display: "flex", alignItems: "center", gap: 16, textAlign: "left" as const,
                  }}
                >
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{opt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: intent === opt.key ? "var(--accent)" : "var(--text1)" }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{opt.desc}</div>
                  </div>
                  {intent === opt.key && <i className="ti ti-circle-check" style={{ fontSize: 20, color: "var(--accent)", flexShrink: 0 }} />}
                </button>
              ))}
            </div>

            {/* Recruiter verification nudge — shown when recruiter or both is selected */}
            {(intent === "recruiter" || intent === "both") && (
              <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 10, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: "var(--accent)" }}>🏅 Recruiter tip:</span>{" "}
                Sign up with a <strong>company email</strong> to earn a <em>Verified Recruiter</em> badge — candidates trust verified recruiters more.
                You can always verify later from your profile.
              </div>
            )}

            <ContinueBtn disabled={!intent} />
          </div>
        )}

        {/* ── Step 2: Current role ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>What's your current role?</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>
              {intent === "recruiter"
                ? "We'll tailor the recruiter dashboard to your seniority."
                : "We'll personalise your gap analysis and job matches."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
              {ROLES.map(r => (
                <button key={r} onClick={() => setCurrentRole(r)} style={currentRole === r ? cardActive : card}>
                  <span style={{ fontSize: 13, fontWeight: currentRole === r ? 700 : 400, color: currentRole === r ? "var(--accent)" : "var(--text1)" }}>{r}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <BackBtn to={1} />
              <ContinueBtn disabled={!currentRole} onClick={nextFromRole} />
            </div>
            <button onClick={() => { setCurrentRole("Other"); nextFromRole(); }} style={{ marginTop: 10, width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--text3)", fontSize: 13, cursor: "pointer" }}>
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 3: Target role (candidate / both only) ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>What role are you targeting?</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Your career GPS roadmap and interview prep will focus here.</p>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
              {TARGET_ROLES.map(r => (
                <button key={r} onClick={() => setTargetRole(r)} style={targetRole === r ? cardActive : card}>
                  <span style={{ fontSize: 13, fontWeight: targetRole === r ? 700 : 400, color: targetRole === r ? "var(--accent)" : "var(--text1)" }}>{r}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <BackBtn to={2} />
              <ContinueBtn disabled={!targetRole} />
            </div>
          </div>
        )}

        {/* ── Step 4: Location ── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Where are you based?</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>We'll show salary benchmarks and jobs relevant to your market.</p>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
              {LOCATIONS.map(l => (
                <button key={l} onClick={() => setLocation(l)} style={location === l ? cardActive : card}>
                  <span style={{ fontSize: 13, fontWeight: location === l ? 700 : 400, color: location === l ? "var(--accent)" : "var(--text1)" }}>{l}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              {/* Back goes to step 3 for candidate/both, step 2 for recruiter-only */}
              <BackBtn to={intent === "recruiter" ? 2 : 3} />
              <ContinueBtn disabled={!location} />
            </div>
          </div>
        )}

        {/* ── Step 5: Resume ── */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              {intent === "recruiter" ? "Set up your recruiter profile" : "Start with your resume"}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>
              {intent === "recruiter"
                ? "You can post your first job right away or finish setup later."
                : "Build from scratch, import an existing one, or skip for now."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {intent === "recruiter" ? (
                <>
                  {[
                    { key: "build", icon: "ti-building", title: "Complete company profile",  desc: "Add your company details, logo, and culture info" },
                    { key: "skip",  icon: "⏭️",           title: "Skip — go to dashboard",    desc: "Post jobs and complete your profile later" },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setResumeChoice(opt.key as any)} style={{
                      ...(resumeChoice === opt.key ? cardActive : card),
                      display: "flex", alignItems: "center", gap: 14, textAlign: "left" as const,
                    }}>
                      {opt.icon.startsWith("ti-") ? <i className={`ti ${opt.icon}`} style={{ fontSize: 24, color: "var(--accent)" }} /> : <span style={{ fontSize: 24 }}>{opt.icon}</span>}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: resumeChoice === opt.key ? "var(--accent)" : "var(--text1)" }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { key: "build", icon: "ti-pencil", title: "Build resume from scratch",  desc: "Use our AI builder with 20+ templates" },
                    { key: "skip",  icon: "⏭️",         title: "Skip — go to dashboard",     desc: "Add your resume later" },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setResumeChoice(opt.key as any)} style={{
                      ...(resumeChoice === opt.key ? cardActive : card),
                      display: "flex", alignItems: "center", gap: 14, textAlign: "left" as const,
                    }}>
                      {opt.icon.startsWith("ti-") ? <i className={`ti ${opt.icon}`} style={{ fontSize: 24, color: "var(--accent)" }} /> : <span style={{ fontSize: 24 }}>{opt.icon}</span>}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: resumeChoice === opt.key ? "var(--accent)" : "var(--text1)" }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <BackBtn to={4} />
              <ContinueBtn disabled={!resumeChoice} />
            </div>
          </div>
        )}

        {/* ── Step 6: Done ── */}
        {step === 6 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>
              {intent === "recruiter" ? "🏢" : "🎉"}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>You're all set!</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 32, lineHeight: 1.7 }}>
              {intent === "recruiter"
                ? "Your recruiter dashboard is ready. Post your first job and start finding great candidates."
                : "Your personalised career dashboard is ready. We've pre-loaded your target role, location context, and salary benchmarks."}
            </p>

            {/* Summary card */}
            <div style={{ background: "var(--accdim)", border: "1px solid var(--accborder)", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left" }}>
              {[
                { label: "You're here to",  value: intent === "candidate" ? "Find a Job 👨‍💼" : intent === "recruiter" ? "Hire Talent 🏢" : "Both 🔄" },
                { label: "Current role",    value: currentRole || "—" },
                ...(intent !== "recruiter" ? [{ label: "Target role", value: targetRole || "—" }] : []),
                { label: "Location",        value: location || "—" },
                ...(intent === "recruiter" ? [{ label: "Verification", value: "Basic Recruiter (upgrade anytime)" }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13, borderBottom: "1px solid var(--accborder)" }}>
                  <span style={{ color: "var(--text3)" }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text1)" }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={saveAndFinish}
              disabled={saving}
              style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: saving ? "wait" : "pointer" }}
            >
              {saving ? "Saving…" : intent === "recruiter" ? "Go to Recruiter Dashboard →" : resumeChoice === "build" ? "Go to Resume Builder →" : "Go to Dashboard →"}
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
        By continuing you agree to our{" "}
        <a href="/terms" style={{ color: "var(--accent)" }}>Terms</a>{" & "}
        <a href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>
      </p>
    </div>
  );
}
