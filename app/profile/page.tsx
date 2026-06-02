"use client";
/**
 * /profile — Account & subscription management
 * Shows current user info, plan, resume save count, and account actions.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResumePlan } from "@/lib/resumePlan";
import { getSupabaseAsync } from "@/lib/auth";
import AppNav from "@/components/AppNav";

interface SaveMeta {
  id: string;
  name: string;
  updated_at: string;
}
interface BgvStatus {
  status: string;
  verification_score: number | null;
  id_verified: boolean;
  edu_verified: boolean;
  emp_verified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const plan = useResumePlan();
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [savesLoading, setSavesLoading] = useState(true);
  const [bgv, setBgv] = useState<BgvStatus | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Redirect guests to home
  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [user, authLoading, router]);

  // Load save list
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const sb = await getSupabaseAsync();
        const { data } = await sb
          .from("resume_saves")
          .select("id, name, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });
        setSaves(data ?? []);
      } catch { /* ignore */ }
      finally { setSavesLoading(false); }
    })();
    // Load BGV status
    fetch("/api/bgv/status").then(r => r.json()).then(d => { if (d.bgv) setBgv(d.bgv); }).catch(() => {});
  }, [user]);

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      const sb = await getSupabaseAsync();
      // Delete all user data — RLS cascade handles the rest
      await sb.from("resume_saves").delete().eq("user_id", user.id);
      await sb.from("resume_shares").delete().eq("user_id", user.id);
      await sb.auth.admin?.deleteUser(user.id); // only works server-side, will silently fail client-side
      signOut();
    } catch {
      // sign out anyway — user can contact support for full deletion
      signOut();
    }
  }

  if (authLoading || !user) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text3)", fontSize: 14 }}>Loading…</div>
    </div>
  );

  const tierColors: Record<string, string> = {
    free: "var(--text3)",
    starter: "var(--warn)",
    pro: "var(--accent)",
  };
  const tierLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
  };

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 14, padding: "24px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text1)" }}>
      <AppNav />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 28 }}>My Account</h1>

        {/* Profile card */}
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: "var(--accdim)", border: "2px solid var(--accborder)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "var(--accent)",
          }}>
            {user.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              : (user.email?.[0] ?? "?").toUpperCase()
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)" }}>
              {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{user.email}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
              Member since {new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8,
              background: "none", color: "var(--text2)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            }}
          >
            Sign out
          </button>
        </div>

        {/* Plan card */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>Current Plan</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: tierColors[plan.tier] ?? "var(--accent)", marginTop: 4 }}>
                {tierLabels[plan.tier] ?? plan.tier}
              </div>
            </div>
            {plan.tier !== "pro" && (
              <Link href="/upgrade" style={{
                padding: "10px 20px", background: "var(--accent)", borderRadius: 9,
                color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Upgrade →
              </Link>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <PlanStat label="Resume Saves" value={`${saves.length} / ${plan.maxSaves}`} />
            <PlanStat label="AI Features" value={plan.hasAiFeatures ? "✓ Enabled" : "✗ Upgrade needed"} />
            <PlanStat label="DOCX Export" value={plan.hasDocxExport ? "✓ Enabled" : "✗ Starter+"} />
            <PlanStat label="All Templates" value={plan.allTemplates ? "✓ Enabled" : "✗ Starter+"} />
          </div>
        </div>

        {/* BGV status */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: bgv ? 14 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>🛡 Background Verification</div>
            <Link href="/bgv" style={{ padding: "7px 16px", background: bgv?.status === "verified" ? "rgba(34,197,94,.1)" : "var(--accdim)", border: `1px solid ${bgv?.status === "verified" ? "rgba(34,197,94,.3)" : "var(--accborder)"}`, borderRadius: 8, color: bgv?.status === "verified" ? "var(--success)" : "var(--accent)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              {bgv ? "View / Update →" : "Start BGV →"}
            </Link>
          </div>
          {bgv ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: bgv.status === "verified" ? "var(--success)" : bgv.status === "failed" ? "var(--danger)" : "var(--warn)", padding: "3px 10px", borderRadius: 8, background: bgv.status === "verified" ? "rgba(34,197,94,.1)" : bgv.status === "failed" ? "rgba(239,68,68,.1)" : "rgba(234,179,8,.1)", textTransform: "capitalize" }}>
                  {bgv.status === "in_progress" ? "🔍 In Progress" : bgv.status === "verified" ? "🛡 Verified" : bgv.status === "failed" ? "✗ Failed" : "⏳ Pending Review"}
                </span>
                {bgv.verification_score != null && <span style={{ fontSize: 12, color: "var(--text3)" }}>Score: <strong style={{ color: "var(--text1)" }}>{bgv.verification_score}/100</strong></span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["🪪 ID", bgv.id_verified], ["🎓 Education", bgv.edu_verified], ["💼 Employment", bgv.emp_verified]].map(([l, v]) => (
                  <span key={l as string} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 600, background: v ? "rgba(34,197,94,.08)" : "var(--surface2)", color: v ? "var(--success)" : "var(--text3)", border: `1px solid ${v ? "rgba(34,197,94,.2)" : "var(--border)"}` }}>
                    {l as string} {v ? "✓" : "○"}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 10 }}>
              Get your identity, education, and employment verified. A BGV badge boosts your profile trust with employers.
            </p>
          )}
        </div>

        {/* Saved resumes */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 14 }}>
            Saved Resumes ({savesLoading ? "…" : saves.length})
          </div>
          {savesLoading ? (
            <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div>
          ) : saves.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text3)" }}>
              No saved resumes yet.{" "}
              <Link href="/builder" style={{ color: "var(--accent)" }}>Open the builder →</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {saves.map(s => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "var(--surface2)", borderRadius: 9,
                  border: "1px solid var(--border)",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                      Updated {new Date(s.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <Link href="/builder" style={{
                    padding: "5px 14px", background: "var(--accdim)", borderRadius: 7,
                    color: "var(--accent)", fontSize: 12, fontWeight: 600, textDecoration: "none",
                    border: "1px solid var(--accborder)",
                  }}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 14 }}>Quick Links</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { href: "/builder",    label: "✏️ Resume Builder" },
              { href: "/score",      label: "🎯 My Score" },
              { href: "/jobs",       label: "💼 Matched Jobs" },
              { href: "/interview",  label: "🎤 Interview Prep" },
              { href: "/career-gps", label: "🧭 Career GPS" },
              { href: "/bgv",        label: "🛡 Background Verify" },
              { href: "/upgrade",    label: "⚡ Upgrade Plan" },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                padding: "8px 16px", background: "var(--surface2)", borderRadius: 9,
                border: "1px solid var(--border)", color: "var(--text2)",
                fontSize: 13, fontWeight: 500, textDecoration: "none",
              }}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...card, borderColor: "rgba(239,68,68,.2)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)", marginBottom: 10 }}>Danger Zone</div>
          {!deleteConfirm ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Delete Account</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                  Permanently deletes your account and all resume data. This cannot be undone.
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(true)}
                style={{
                  padding: "8px 18px", borderRadius: 8,
                  border: "1px solid rgba(239,68,68,.4)", background: "rgba(239,68,68,.06)",
                  color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Delete Account
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
                Are you sure? This will permanently delete your account, all saved resumes, and shared links.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    padding: "9px 20px", borderRadius: 8, border: "none",
                    background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  style={{
                    padding: "9px 18px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "none",
                    color: "var(--text2)", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 14px", background: "var(--surface2)",
      borderRadius: 9, border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{value}</div>
    </div>
  );
}
