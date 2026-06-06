"use client";
/**
 * AppShell — hybrid desktop shell (replaces AppNav)
 *
 * Structure:
 *   [full-width topbar: logo | ⌘K command bar | user info]
 *   [sidebar: labeled nav + career assets + user pill] | [content] | [AI coach panel?]
 *
 * Mobile (<768px): topbar + hamburger drawer (sidebar hidden).
 * Pass aiPanel={false} to suppress the right panel (e.g. full-width tool pages).
 */
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import AiCoachPanel from "./AiCoachPanel";

/* ── Nav structure ───────────────────────────────────────────── */
const TOOL_LINKS = [
  { href: "/dashboard",    label: "Dashboard",    icon: "ti-layout-dashboard" },
  { href: "/builder",      label: "Builder",      icon: "ti-file-text" },
  { href: "/score",        label: "ATS Score",    icon: "ti-target" },
  { href: "/tailor",       label: "JD Tailor",    icon: "ti-scissors" },
  { href: "/cover-letter", label: "Cover Letter", icon: "ti-mail" },
  { href: "/interview",    label: "Interview",    icon: "ti-microphone" },
];

const INSIGHT_LINKS = [
  { href: "/jobs",           label: "Jobs",        icon: "ti-briefcase" },
  { href: "/applications",   label: "Tracker",     icon: "ti-list-check" },
  { href: "/career-gps",    label: "Career GPS",   icon: "ti-compass" },
  { href: "/career-health", label: "Health",       icon: "ti-heart-rate-monitor" },
  { href: "/salary",        label: "Salaries",     icon: "ti-coin" },
  { href: "/employer-trust",label: "Trust",        icon: "ti-shield-check" },
  { href: "/bgv",           label: "BGV",          icon: "ti-certificate" },
  { href: "/linkedin",      label: "LinkedIn",     icon: "ti-brand-linkedin" },
];

const ALL_LINKS = [...TOOL_LINKS, ...INSIGHT_LINKS];

/* ── Helpers ─────────────────────────────────────────────────── */
function useWidth() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const u = () => setW(window.innerWidth);
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
  return w;
}

/* ── Sidebar nav link ────────────────────────────────────────── */
function NavLink({
  href, label, icon, active, onClick,
}: {
  href: string; label: string; icon: string; active: boolean; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "7px 10px", borderRadius: 7,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active
          ? "var(--shell-link-active-col)"
          : hovered
            ? "var(--shell-link-hover-col)"
            : "var(--shell-link-col)",
        background: active ? "var(--shell-link-active-bg)" : "transparent",
        textDecoration: "none",
        transition: "color .12s, background .12s",
        whiteSpace: "nowrap",
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      <i className={`ti ${icon}`} style={{
        fontSize: 14, width: 16, textAlign: "center", flexShrink: 0,
        color: active ? "var(--accent)" : "inherit",
      }} />
      {label}
    </Link>
  );
}

/* ── Section label ───────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: "var(--shell-section-col)",
      textTransform: "uppercase", letterSpacing: "0.5px",
      padding: "4px 10px", marginTop: 6, marginBottom: 2,
    }}>
      {children}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────── */
interface AppShellProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Show right AI coach panel. Default true on ≥1200px screens. */
  aiPanel?: boolean;
}

/* ── AppShell ────────────────────────────────────────────────── */
export default function AppShell({ children, actions, aiPanel = true }: AppShellProps) {
  const { user } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const w = useWidth();
  const mobile = w < 768;
  const wideEnough = w >= 1200;
  const showAiPanel = aiPanel && wideEnough;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Me";
  const avatarLetter = (user?.email?.[0] ?? "?").toUpperCase();
  const hasAvatar = !!user?.user_metadata?.avatar_url;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  /* ── Mobile layout ─────────────────────────────────────────── */
  if (mobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "var(--bg)" }}>
        {/* Mobile topbar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          height: 52, background: "var(--nav-bg)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 0,
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginRight: "auto" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="jobSayer" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)", letterSpacing: "-.3px" }}>jobSayer</span>
          </Link>
          {actions && <div style={{ marginRight: 8 }}>{actions}</div>}
          <button
            onClick={() => setDrawerOpen(o => !o)}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 7,
              padding: "5px 9px", cursor: "pointer", color: "var(--text2)", fontSize: 15,
            }}
          >
            {drawerOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div style={{
            position: "sticky", top: 52, zIndex: 99,
            background: "var(--surface)", borderBottom: "1px solid var(--border)",
            padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4,
          }}>
            {ALL_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={closeDrawer} style={{
                padding: "10px 14px", borderRadius: 9, fontSize: 14, fontWeight: 500,
                color: isActive(l.href) ? "var(--accent)" : "var(--text1)",
                textDecoration: "none",
                background: isActive(l.href) ? "var(--accdim)" : "var(--surface2)",
                border: `1px solid ${isActive(l.href) ? "var(--accborder)" : "var(--border)"}`,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <i className={`ti ${l.icon}`} style={{ fontSize: 15 }} />
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    );
  }

  /* ── Desktop layout ────────────────────────────────────────── */
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh", overflow: "hidden",
      background: "var(--bg)",
    }}>

      {/* ── Topbar ── */}
      <div style={{
        height: "var(--shell-topbar-h)",
        background: "var(--shell-topbar-bg)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: 12, flexShrink: 0, zIndex: 50,
      }}>
        {/* Logo — aligns with sidebar width */}
        <div style={{ width: "var(--shell-sidebar-w)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="jobSayer" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)", letterSpacing: "-.3px" }}>jobSayer</span>
          </Link>
        </div>

        {/* Command bar */}
        <div style={{ flex: 1, maxWidth: 440 }}>
          <div style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "6px 14px",
            display: "flex", alignItems: "center", gap: 8, cursor: "text",
          }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: "var(--text3)", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "var(--text3)", flex: 1 }}>
              Search tools, jobs, skills...
            </span>
            <span style={{
              fontSize: 10, color: "var(--text3)",
              background: "var(--border)", padding: "2px 6px", borderRadius: 4,
              border: "1px solid var(--border2)",
            }}>⌘K</span>
          </div>
        </div>

        {/* Right: page actions + streak + theme + user */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {actions}

          {/* Streak badge — if present */}
          <StreakBadge />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={dark ? "Light mode" : "Dark mode"}
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: "1px solid var(--border)", background: "var(--surface2)",
              color: "var(--text2)", cursor: "pointer", fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {dark ? "☀" : "🌙"}
          </button>

          {/* User avatar */}
          {user && (
            <Link href="/profile" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 8px 4px 4px", borderRadius: 20,
              border: "1px solid var(--border)", background: "var(--surface2)",
              textDecoration: "none", color: "var(--text2)", fontSize: 12,
            }}>
              {hasAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                : (
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "var(--accdim)", border: "1px solid var(--accborder)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "var(--accent)",
                  }}>
                    {avatarLetter}
                  </span>
                )}
              {firstName}
            </Link>
          )}
        </div>
      </div>

      {/* ── Body: sidebar + content + AI panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: "var(--shell-sidebar-w)", flexShrink: 0,
          background: "var(--shell-sidebar-bg)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          overflowY: "auto", overflowX: "hidden",
        }}>
          <div style={{ padding: "12px 10px", flex: 1, display: "flex", flexDirection: "column" }}>
            <SectionLabel>Tools</SectionLabel>
            {TOOL_LINKS.map(l => (
              <NavLink key={l.href} {...l} active={isActive(l.href)} />
            ))}

            <div style={{ height: 1, background: "var(--border)", margin: "8px 10px" }} />

            <SectionLabel>Insights</SectionLabel>
            {INSIGHT_LINKS.map(l => (
              <NavLink key={l.href} {...l} active={isActive(l.href)} />
            ))}

            <div style={{ flex: 1 }} />
          </div>

          {/* User pill */}
          <div style={{ padding: "10px", borderTop: "1px solid var(--border)" }}>
            <Link href="/profile" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8,
              background: "var(--surface-hover)", border: "1px solid var(--border)",
              textDecoration: "none",
            }}>
              {hasAvatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user?.user_metadata?.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : (
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: "var(--accdim)", border: "1px solid var(--accborder)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "var(--accent)",
                  }}>
                    {avatarLetter}
                  </span>
                )}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {firstName}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>Account settings</div>
              </div>
              <i className="ti ti-settings" style={{ fontSize: 13, color: "var(--text3)", flexShrink: 0 }} />
            </Link>
          </div>
        </aside>

        {/* ── Content area ── */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </main>

        {/* ── AI Coach panel ── */}
        {showAiPanel && <AiCoachPanel />}
      </div>
    </div>
  );
}

/* ── Streak badge — reads localStorage after mount ──────────── */
function StreakBadge() {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-xp");
      if (raw) { const s = JSON.parse(raw); setStreak(s.streak ?? 0); }
    } catch { /* ignore */ }
  }, []);
  if (!streak) return null;
  return (
    <span style={{
      fontSize: 11, color: "var(--text2)",
      background: "var(--surface2)", border: "1px solid var(--border)",
      padding: "3px 9px", borderRadius: 20,
    }}>
      🔥 {streak}
    </span>
  );
}
