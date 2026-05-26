"use client";
/**
 * /recruit — Recruiter Portal (Phase 1 — UI only)
 * Sections: Landing hero → Post a Job form → Candidate Pool view → Recruiter Dashboard
 */
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Plus, Search, Filter, Users, Briefcase, TrendingUp, CheckCircle2, Star } from "lucide-react";

/* ── Mock candidate pool ── */
const MOCK_CANDIDATES = [
  { id: "c1", name: "Priya Sharma", title: "Full Stack Engineer", location: "Bangalore", exp: "4 yrs", skills: ["React", "Node.js", "TypeScript", "AWS"], score: 82, openTo: "remote", avatar: "PS" },
  { id: "c2", name: "Arjun Mehta", title: "Backend Engineer", location: "Pune", exp: "3 yrs", skills: ["Go", "PostgreSQL", "Kubernetes", "Docker"], score: 76, openTo: "hybrid", avatar: "AM" },
  { id: "c3", name: "Sneha Reddy", title: "Frontend Developer", location: "Hyderabad", exp: "2 yrs", skills: ["React", "TypeScript", "Next.js", "CSS"], score: 71, openTo: "onsite", avatar: "SR" },
  { id: "c4", name: "Karthik Nair", title: "DevOps Engineer", location: "Bangalore", exp: "5 yrs", skills: ["Kubernetes", "Terraform", "AWS", "CI/CD"], score: 88, openTo: "remote", avatar: "KN" },
  { id: "c5", name: "Divya Patel", title: "Python Backend Engineer", location: "Mumbai", exp: "3 yrs", skills: ["Python", "Django", "Redis", "PostgreSQL"], score: 74, openTo: "hybrid", avatar: "DP" },
  { id: "c6", name: "Rahul Verma", title: "Full Stack Developer", location: "Delhi", exp: "2 yrs", skills: ["React", "Node.js", "MongoDB", "Docker"], score: 68, openTo: "remote", avatar: "RV" },
];

type View = "landing" | "post" | "pool" | "dashboard";

/* ── Avatar ── */
function Avatar({ initials, score }: { initials: string; score: number }) {
  const color = score >= 80 ? "#4ade80" : score >= 70 ? "#fbbf24" : "#818cf8";
  return (
    <div style={{
      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
      background: `${color}22`, border: `2px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, fontWeight: 700, color,
    }}>{initials}</div>
  );
}

/* ── Job post form ── */
function PostJobForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: "", company: "", location: "", mode: "hybrid",
    exp: "", salaryMin: "", salaryMax: "", skills: "", jd: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onSuccess, 1800);
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text1)", fontSize: 14,
    boxSizing: "border-box",
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em",
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Job Posted!</div>
        <div style={{ fontSize: 14, color: "var(--text3)" }}>We're matching candidates to your JD now…</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={label}>Job Title *</label>
          <input required value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Senior React Developer" style={input} />
        </div>
        <div>
          <label style={label}>Company Name *</label>
          <input required value={form.company} onChange={e => set("company", e.target.value)} placeholder="Your company name" style={input} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div>
          <label style={label}>Location</label>
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Bangalore" style={input} />
        </div>
        <div>
          <label style={label}>Work Mode</label>
          <select value={form.mode} onChange={e => set("mode", e.target.value)} style={{ ...input, appearance: "none" }}>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>
        <div>
          <label style={label}>Experience Required</label>
          <input value={form.exp} onChange={e => set("exp", e.target.value)} placeholder="e.g. 2–4 yrs" style={input} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={label}>Min Salary (LPA)</label>
          <input type="number" value={form.salaryMin} onChange={e => set("salaryMin", e.target.value)} placeholder="e.g. 18" style={input} />
        </div>
        <div>
          <label style={label}>Max Salary (LPA)</label>
          <input type="number" value={form.salaryMax} onChange={e => set("salaryMax", e.target.value)} placeholder="e.g. 26" style={input} />
        </div>
      </div>

      <div>
        <label style={label}>Required Skills (comma-separated)</label>
        <input value={form.skills} onChange={e => set("skills", e.target.value)} placeholder="React, Node.js, TypeScript, AWS…" style={input} />
      </div>

      <div>
        <label style={label}>Full Job Description *</label>
        <textarea
          required
          value={form.jd}
          onChange={e => set("jd", e.target.value)}
          rows={6}
          placeholder="Describe the role, responsibilities, and what you're looking for in a candidate…"
          style={{ ...input, resize: "vertical", lineHeight: 1.6 }}
        />
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
          {form.jd.trim().split(/\s+/).filter(Boolean).length} words — aim for 150+ for best matching results
        </div>
      </div>

      <div style={{
        padding: "14px 16px", borderRadius: 10,
        background: "rgba(129,140,248,.06)", border: "1px solid var(--accborder)",
        fontSize: 12, color: "var(--text2)",
      }}>
        🤖 jobSayer will automatically match your JD against our candidate pool and rank candidates by fit score. You'll see results in under 60 seconds.
      </div>

      <button type="submit" style={{
        padding: "14px", border: "none", borderRadius: 10,
        background: "var(--accent)", color: "#fff",
        fontSize: 15, fontWeight: 700, cursor: "pointer",
      }}>
        Post Job & Find Candidates →
      </button>
    </form>
  );
}

/* ── Candidate card ── */
function CandidateCard({ c, onContact }: { c: typeof MOCK_CANDIDATES[0]; onContact: () => void }) {
  const scoreColor = c.score >= 80 ? "#4ade80" : c.score >= 70 ? "#fbbf24" : "#f87171";

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "18px",
    }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Avatar initials={c.avatar} score={c.score} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>{c.name}</div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>{c.title} · {c.location}</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            {c.exp} · Open to {c.openTo}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{c.score}</div>
          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em" }}>score</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {c.skills.map(s => (
          <span key={s} style={{
            fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 500,
            background: "rgba(129,140,248,.08)", color: "var(--accent)", border: "1px solid var(--accborder)",
          }}>{s}</span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button style={{
          padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 7,
          fontSize: 12, fontWeight: 600, color: "var(--text2)", background: "var(--surface2)", cursor: "pointer",
        }}>View Profile</button>
        <button onClick={onContact} style={{
          padding: "6px 16px", border: "none", borderRadius: 7,
          fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--accent)", cursor: "pointer",
        }}>Contact →</button>
      </div>
    </div>
  );
}

/* ── Dashboard stats ── */
function RecruiterDashboard() {
  const stats = [
    { icon: "💼", label: "Active Jobs", value: "3", trend: "+1 this week" },
    { icon: "👥", label: "Candidates Reached", value: "142", trend: "+28 today" },
    { icon: "📨", label: "Interview Invites Sent", value: "18", trend: "5 pending reply" },
    { icon: "✅", label: "Offers Extended", value: "2", trend: "1 accepted" },
  ];

  const recentActivity = [
    { time: "2h ago", text: "Priya Sharma applied for Senior React Developer" },
    { time: "4h ago", text: "Karthik Nair profile matched your DevOps posting (88%)" },
    { time: "1d ago", text: "Your 'Backend Engineer' job received 12 new applications" },
    { time: "2d ago", text: "Arjun Mehta accepted interview invite" },
  ];

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 16, padding: "20px",
  };

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text1)", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>{s.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
        {/* Active jobs */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Active Job Posts</div>
          {[
            { title: "Senior React Developer", applicants: 34, top: 88, daysLeft: 12 },
            { title: "Backend Engineer (Go)", applicants: 18, top: 82, daysLeft: 8 },
            { title: "DevOps Engineer", applicants: 7, top: 76, daysLeft: 21 },
          ].map(job => (
            <div key={job.title} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{job.title}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{job.applicants} applicants · Top match: {job.top}%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{job.daysLeft}d left</div>
                <button style={{
                  marginTop: 4, padding: "4px 10px", border: "none", borderRadius: 6,
                  background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>View</button>
              </div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Activity</div>
          {recentActivity.map((a, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, marginBottom: 14, fontSize: 13,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
              <div>
                <div style={{ color: "var(--text2)", lineHeight: 1.5 }}>{a.text}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function RecruitPage() {
  const [view, setView] = useState<View>("landing");
  const [searchQ, setSearchQ] = useState("");
  const [contacted, setContacted] = useState<Set<string>>(new Set());

  const filteredCandidates = MOCK_CANDIDATES.filter(c =>
    searchQ === "" ||
    c.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.title.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.skills.some(s => s.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 16, padding: "20px",
  };

  /* ── Landing ── */
  if (view === "landing") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        {/* Nav */}
        <div style={{
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          padding: "0 24px", height: 56, display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/" style={{ color: "var(--text3)", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={14} /> Home
            </Link>
            <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>🏢 For Recruiters</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setView("dashboard")} style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--surface2)", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Recruiter Login</button>
            <button onClick={() => setView("post")} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Post a Job →</button>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{
              display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
              textTransform: "uppercase", color: "var(--accent)",
              background: "var(--accdim)", border: "1px solid var(--accborder)",
              padding: "4px 14px", borderRadius: 20, marginBottom: 20,
            }}>
              For Hiring Teams
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-.02em" }}>
              Hire top Indian tech talent<br />
              <span style={{ background: "linear-gradient(135deg,var(--accent),#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                AI-matched, not spam-filtered
              </span>
            </h1>
            <p style={{ fontSize: 16, color: "var(--text3)", lineHeight: 1.7, maxWidth: 600, margin: "0 auto 36px" }}>
              Every candidate in our pool has a verified resume score. Match your JD against pre-scored profiles
              and reach candidates who <em>actually</em> fit — not just keyword matches.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setView("post")} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "15px 32px", borderRadius: 12, border: "none",
                background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}>
                <Plus size={16} /> Post a Job — Free
              </button>
              <button onClick={() => setView("pool")} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "15px 32px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: "var(--text1)", fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}>
                <Users size={16} /> Browse Candidates
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 60 }}>
            {[
              { value: "2,400+", label: "Scored Candidates" },
              { value: "91%", label: "ATS Pass Rate" },
              { value: "3.2 days", label: "Avg Time to Match" },
              { value: "78%", label: "Reply Rate" },
            ].map(s => (
              <div key={s.label} style={{ ...card, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "var(--text3)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>Why recruiters choose jobSayer</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 60 }}>
            {[
              { icon: "🎯", title: "AI-Scored Profiles", desc: "Every candidate has a resume score (0–100) across ATS compatibility, keywords, experience clarity, and impact language." },
              { icon: "🔍", title: "JD-to-Profile Matching", desc: "Paste your JD and instantly see candidate match % — no manual shortlisting for the first 100 profiles." },
              { icon: "👻", title: "Ghost-Proof Posting", desc: "We flag JDs with ghost signals. Your posts are reviewed and verified so candidates trust your openings." },
              { icon: "⚡", title: "Fast Response Pool", desc: "Candidates in our pool are actively job hunting — average reply rate of 78%, 3x higher than job boards." },
              { icon: "📊", title: "Hiring Analytics", desc: "Track applicant flow, funnel conversion, and competitor salary benchmarks from your dashboard." },
              { icon: "🆓", title: "Free to Post (Phase 1)", desc: "Post your first 3 jobs free. Premium plans unlock unlimited posts, bulk outreach, and analytics." },
            ].map(f => (
              <div key={f.title} style={card}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            ...card,
            textAlign: "center", padding: "48px",
            background: "linear-gradient(135deg, rgba(129,140,248,.08), rgba(99,102,241,.04))",
            borderColor: "var(--accborder)",
          }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Start hiring smarter today</h2>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>
              Post your first job in under 5 minutes — no sign-up required for Phase 1.
            </p>
            <button onClick={() => setView("post")} style={{
              padding: "14px 36px", borderRadius: 12, border: "none",
              background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>
              Post a Job Free →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Post job ── */
  if (view === "post") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <div style={{
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12,
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <button onClick={() => setView("landing")} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Post a Job</span>
        </div>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Post a Job</h1>
            <p style={{ fontSize: 14, color: "var(--text3)" }}>Fill in your job details — the more complete, the better the AI matching.</p>
          </div>
          <div style={card}>
            <PostJobForm onSuccess={() => setView("pool")} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Candidate pool ── */
  if (view === "pool") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
        <div style={{
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          padding: "0 24px", height: 56, display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setView("landing")} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
              <ArrowLeft size={14} /> Recruiter Home
            </button>
            <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Candidate Pool</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setView("post")} style={{
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Plus size={13} /> Post Job
            </button>
            <button onClick={() => setView("dashboard")} style={{
              padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--surface2)", color: "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Dashboard</button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Candidate Pool</h1>
              <p style={{ fontSize: 13, color: "var(--text3)" }}>Ranked by jobSayer score · {MOCK_CANDIDATES.length} active candidates</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }} />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search candidates…"
                  style={{
                    padding: "8px 12px 8px 30px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--surface2)",
                    color: "var(--text1)", fontSize: 13, width: 200,
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {filteredCandidates.map(c => (
              <CandidateCard
                key={c.id}
                c={c}
                onContact={() => setContacted(prev => new Set([...prev, c.id]))}
              />
            ))}
          </div>

          {filteredCandidates.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text3)" }}>
              No candidates match your search.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Dashboard ── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setView("landing")} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            <ArrowLeft size={14} /> Recruiter Home
          </button>
          <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>📊 Recruiter Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("pool")} style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid var(--accborder)",
            background: "var(--accdim)", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>View Candidates</button>
          <button onClick={() => setView("post")} style={{
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Plus size={13} /> Post Job
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Recruiter Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>Welcome back — here's your hiring activity.</p>
        </div>
        <RecruiterDashboard />
      </div>
    </div>
  );
}
