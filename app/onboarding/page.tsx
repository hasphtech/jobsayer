"use client";
/**
 * /onboarding — Guided first-run wizard
 * 5 steps: Role <i className="ti ti-arrow-right"/> Target <i className="ti ti-arrow-right"/> Location <i className="ti ti-arrow-right"/> Resume <i className="ti ti-arrow-right"/> Done
 * Saves progress to Supabase profiles table.
 * Redirected here automatically for new users (middleware / layout).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useWindowWidth } from "@/lib/useWindowWidth";
import { track } from "@/lib/analytics";
import { createBrowserClient } from "@supabase/ssr";

type Step = 1 | 2 | 3 | 4 | 5;

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

const STEP_LABELS = ["Your role", "Target role", "Location", "Resume", "Done"];

export default function OnboardingPage() {
  const router  = useRouter();
  const { user } = useAuth();
  const w       = useWindowWidth();
  const mobile  = w < 640;

  const [step,         setStep]         = useState<Step>(1);
  const [currentRole,  setCurrentRole]  = useState("");
  const [targetRole,   setTargetRole]   = useState("");
  const [location,     setLocation]     = useState("");
  const [resumeChoice, setResumeChoice] = useState<"upload" | "build" | "skip" | "">("");
  const [saving,       setSaving]       = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const progress = ((step - 1) / 4) * 100;

  async function saveAndFinish() {
    setSaving(true);
    try {
      if (user) {
        await supabase.from("profiles").upsert({
          id:                    user.id,
          current_job_role:          currentRole,
          target_role:           targetRole,
          location:              location,
          onboarding_completed:  true,
          onboarding_step:       5,
        }, { onConflict: "id" });
      }
      await track("onboarding_completed", { currentRole, targetRole, location, resumeChoice });
    } finally {
      setSaving(false);
    }
    if (resumeChoice === "build") router.push("/builder");
    else                          router.push("/dashboard");
  }

  function next() {
    track("onboarding_step_completed", { step });
    setStep(s => (s + 1) as Step);
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

        {/* ── Step 1: Current role ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>What's your current role?</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>We'll personalise your gap analysis and job matches.</p>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
              {ROLES.map(r => (
                <button key={r} onClick={() => setCurrentRole(r)} style={currentRole === r ? cardActive : card}>
                  <span style={{ fontSize: 13, fontWeight: currentRole === r ? 700 : 400, color: currentRole === r ? "var(--accent)" : "var(--text1)" }}>{r}</span>
                </button>
              ))}
            </div>
            <button onClick={next} disabled={!currentRole} style={{ marginTop: 24, width: "100%", padding: 14, borderRadius: 12, border: "none", background: currentRole ? "var(--accent)" : "var(--surface2)", color: currentRole ? "#fff" : "var(--text3)", fontWeight: 700, fontSize: 15, cursor: currentRole ? "pointer" : "not-allowed" }}>
              Continue <i className="ti ti-arrow-right"/>
            </button>
            <button onClick={() => { setCurrentRole("Other"); next(); }} style={{ marginTop: 10, width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--text3)", fontSize: 13, cursor: "pointer" }}>
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 2: Target role ── */}
        {step === 2 && (
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
              <button onClick={() => setStep(1)} style={{ flex: "0 0 auto", padding: "14px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}><i className="ti ti-arrow-left"/> Back</button>
              <button onClick={next} disabled={!targetRole} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: targetRole ? "var(--accent)" : "var(--surface2)", color: targetRole ? "#fff" : "var(--text3)", fontWeight: 700, fontSize: 15, cursor: targetRole ? "pointer" : "not-allowed" }}>
                Continue <i className="ti ti-arrow-right"/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Location ── */}
        {step === 3 && (
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
              <button onClick={() => setStep(2)} style={{ flex: "0 0 auto", padding: "14px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}><i className="ti ti-arrow-left"/> Back</button>
              <button onClick={next} disabled={!location} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: location ? "var(--accent)" : "var(--surface2)", color: location ? "#fff" : "var(--text3)", fontWeight: 700, fontSize: 15, cursor: location ? "pointer" : "not-allowed" }}>
                Continue <i className="ti ti-arrow-right"/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Resume ── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Start with your resume</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Build from scratch, import an existing one, or skip for now.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "build",  icon: "ti-pencil", title: "Build resume from scratch",   desc: "Use our AI builder with 20+ templates" },
                { key: "skip",   icon: "⏭️", title: "Skip — go to dashboard",       desc: "Add your resume later" },
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
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <button onClick={() => setStep(3)} style={{ flex: "0 0 auto", padding: "14px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text2)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}><i className="ti ti-arrow-left"/> Back</button>
              <button onClick={next} disabled={!resumeChoice} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: resumeChoice ? "var(--accent)" : "var(--surface2)", color: resumeChoice ? "#fff" : "var(--text3)", fontWeight: 700, fontSize: 15, cursor: resumeChoice ? "pointer" : "not-allowed" }}>
                Continue <i className="ti ti-arrow-right"/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}><i className="ti ti-confetti"/></div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>You're all set!</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 32, lineHeight: 1.7 }}>
              Your personalised career dashboard is ready. We've pre-loaded your target role,
              location context, and salary benchmarks.
            </p>
            <div style={{ background: "var(--accdim)", border: "1px solid var(--accborder)", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left" }}>
              {[
                { label: "Current role",  value: currentRole || "—" },
                { label: "Target role",   value: targetRole || "—" },
                { label: "Location",      value: location || "—" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid var(--accborder)" }}>
                  <span style={{ color: "var(--text3)" }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text1)" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <button onClick={saveAndFinish} disabled={saving} style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: saving ? "wait" : "pointer" }}>
              {saving ? "Saving…" : resumeChoice === "build" ? "Go to Resume Builder →" : "Go to Dashboard →"}
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
