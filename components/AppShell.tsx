"use client";
/**
 * AppShell — hybrid desktop shell (replaces AppNav)
 *
 * Structure:
 *   [full-width topbar: logo | ⌘K command bar | role switcher | user info]
 *   [sidebar: labeled nav + career assets + user pill] | [content] | [AI coach panel?]
 *
 * Mobile (<768px): topbar + hamburger drawer (sidebar hidden).
 * Pass aiPanel={false} to suppress the right panel (e.g. full-width tool pages).
 *
 * Dual-role: CANDIDATE mode shows career tools; RECRUITER mode shows employer portal nav.
 * Role is persisted in localStorage via useRole().
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import { useRole, AppRole } from "@/lib/useRole";
import AiCoachPanel from "./AiCoachPanel";

/* ── Candidate nav ───────────────────────────────────────────── */
const TOOL_LINKS = [
  { href: "/dashboard",    label: "Dashboard",      icon: "ti-layout-dashboard" },
  { href: "/builder",      label: "Resume Builder", icon: "ti-file-text" },
  { href: "/score",        label: "ATS Score",      icon: "ti-target" },
  { href: "/tailor",       label: "JD Tailor",      icon: "ti-cut" },
  { href: "/cover-letter", label: "Cover Letter",   icon: "ti-mail" },
  { href: "/interview",    label: "Interview",      icon: "ti-microphone" },
];

const INSIGHT_LINKS = [
  { href: "/jobs",             label: "Jobs",        icon: "ti-briefcase" },
  { href: "/applications",     label: "Tracker",     icon: "ti-checklist" },
  { href: "/career-gps",       label: "Career GPS",  icon: "ti-compass" },
  { href: "/career-health",    label: "Health",      icon: "ti-activity" },
  { href: "/salary",           label: "Salaries",    icon: "ti-coin" },
  { href: "/learn",            label: "Courses",     icon: "ti-school" },
  { href: "/vault",            label: "Doc Vault",   icon: "ti-lock" },
  { href: "/company",          label: "Companies",   icon: "ti-building" },
  { href: "/employer-trust",   label: "Trust",       icon: "ti-shield-check" },
  { href: "/bgv",              label: "BGV",         icon: "ti-certificate" },
  { href: "/linkedin",         label: "LinkedIn",    icon: "ti-brand-linkedin" },
  { href: "/integrations",     label: "Bot Integ.",  icon: "ti-plug" },
];

/* ── Recruiter nav ───────────────────────────────────────────── */
const RECRUITER_TOOL_LINKS = [
  { href: "/employer-dashboard",               label: "Overview",    icon: "ti-layout-dashboard" },
  { href: "/employer-dashboard?tab=pipeline",  label: "Pipeline",    icon: "ti-filter" },
  { href: "/employer-dashboard?tab=candidates",label: "Candidates",  icon: "ti-users" },
  { href: "/employer-dashboard?tab=bgv",       label: "BGV",         icon: "ti-shield-check" },
  { href: "/jobs/post",                         label: "Post a Job",  icon: "ti-circle-plus" },
];

const RECRUITER_INSIGHT_LINKS = [
  { href: "/employer-dashboard?tab=team-tools", label: "Team Tools",  icon: "ti-tool" },
  { href: "/employer-dashboard?tab=billing",    label: "Billing",     icon: "ti-credit-card" },
  { href: "/integrations",                       label: "Bot Integ.", icon: "ti-plug" },
  { href: "/company",                            label: "Companies",  icon: "ti-building" },
];

const ALL_LINKS = [
  ...TOOL_LINKS, ...INSIGHT_LINKS,
  ...RECRUITER_TOOL_LINKS, ...RECRUITER_INSIGHT_LINKS,
].filter((l, i, arr) => arr.findIndex(x => x.href === l.href) === i);

/* ── Role switcher pill ──────────────────────────────────────── */
function RoleSwitcher({ role, setRole }: { role: AppRole; setRole: (r: AppRole) => void }) {
  const router = useRouter();
  const [hov, setHov] = useState<AppRole | null>(null);

  function handleSwitch(r: AppRole) {
    setRole(r);
    if (r === "recruiter") router.push("/employer-dashboard");
    else router.push("/dashboard");
  }

  const pill = (r: AppRole, label: string) => {
    const active = role === r;
    const hovered = hov === r;
    return (
      <button
        key={r}
        onClick={() => handleSwitch(r)}
        onMouseEnter={() => setHov(r)}
        onMouseLeave={() => setHov(null)}
        style={{
          padding: "4px 11px", border: "none", cursor: "pointer",
          background: active ? "var(--accent)" : hovered ? "var(--surface)" : "transparent",
          color: active ? "#fff" : hovered ? "var(--text1)" : "var(--text3)",
          fontFamily: "inherit", fontSize: 11, fontWeight: 700,
          transition: "background .12s, color .12s",
          borderRadius: 6,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "var(--surface2)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 2, gap: 1,
    }}>
      {pill("candidate", "Candidate")}
      {pill("recruiter", "Recruiter")}
    </div>
  );
}

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
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", borderRadius: 7,
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        color: active
          ? "var(--accent)"
          : hovered
            ? "var(--shell-link-hover-col)"
            : "var(--shell-link-col)",
        background: active
          ? "var(--accdim)"
          : hovered
            ? "var(--surface2)"
            : "transparent",
        textDecoration: "none",
        transition: "color .12s, background .12s",
        whiteSpace: "nowrap",
        borderTop: "1px solid transparent",
        borderRight: "1px solid transparent",
        borderBottom: "1px solid transparent",
        borderLeft: active ? "2px solid var(--accent)" : "1px solid transparent",
        ...(active ? { borderColor: "var(--accborder)", borderLeftColor: "var(--accent)" } : {}),
      }}
    >
      <i className={`ti ${icon}`} style={{
        fontSize: 15, width: 16, textAlign: "center", flexShrink: 0,
        color: active ? "var(--accent)" : hovered ? "var(--shell-link-hover-col)" : "var(--shell-link-col)",
      }} />
      <span style={{ flex: 1 }}>{label}</span>
      {active && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--accent)", flexShrink: 0,
        }} />
      )}
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
  /** When true, content area is overflow:hidden + flex so children can fill it (e.g. builder). */
  contentFill?: boolean;
  /** When true, hide the ⌘K search bar — use when the page has its own toolbar (e.g. builder). */
  noSearch?: boolean;
}

/* ── AppShell ────────────────────────────────────────────────── */
export default function AppShell({ children, actions, aiPanel = true, contentFill = false, noSearch = false }: AppShellProps) {
  const { user, signOut } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { role, setRole } = useRole();
  const pathname = usePathname();
  const w = useWidth();
  // Client-side search params (avoids Suspense requirement)
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  // Inline search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const searchResults = searchQuery.trim()
    ? ALL_LINKS.filter(l =>
        l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.href.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ALL_LINKS.slice(0, 8);

  useEffect(() => { setSearchCursor(0); }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Keyboard nav in inline search
  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchCursor(c => Math.min(c + 1, searchResults.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSearchCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && searchResults[searchCursor]) {
      router.push(searchResults[searchCursor].href);
      setSearchQuery(""); setSearchFocused(false);
    }
    if (e.key === "Escape") { setSearchFocused(false); setSearchQuery(""); }
  }
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

  // Active check — handles both clean paths and ?tab= query params
  const isActive = (href: string) => {
    if (href.includes("?")) {
      const [hPath, hSearch] = href.split("?");
      if (pathname !== hPath) return false;
      const hTab = new URLSearchParams(hSearch).get("tab");
      const curTab = new URLSearchParams(search).get("tab");
      return curTab === hTab;
    }
    // /employer-dashboard (no tab) = overview — not active when a tab is selected
    if (href === "/employer-dashboard") {
      if (pathname !== "/employer-dashboard") return false;
      const curTab = new URLSearchParams(search).get("tab");
      return !curTab || curTab === "overview";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Current mode's nav links
  const toolLinks    = role === "recruiter" ? RECRUITER_TOOL_LINKS    : TOOL_LINKS;
  const insightLinks = role === "recruiter" ? RECRUITER_INSIGHT_LINKS : INSIGHT_LINKS;
  const toolLabel    = role === "recruiter" ? "Hiring" : "Tools";
  const insightLabel = role === "recruiter" ? "Settings" : "Insights";

  /* ── Mobile layout ─────────────────────────────────────────── */
  if (mobile) {
    return (
      <>
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
            position: "fixed", top: 52, left: 0, right: 0, bottom: 0, zIndex: 99,
            background: "var(--surface)",
            padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4,
            overflowY: "auto",
          }}>
            {/* Role switcher + theme toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <RoleSwitcher role={role} setRole={setRole} />
              <button
                onClick={toggleTheme}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--surface2)",
                  color: "var(--text2)", fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <i className={dark ? "ti ti-sun" : "ti ti-moon"}/> {dark ? "Light" : "Dark"}
              </button>
            </div>

            {/* Nav links */}
            {[...toolLinks, ...insightLinks].map(l => {
              const a = isActive(l.href);
              return (
                <Link key={l.href} href={l.href} onClick={closeDrawer} style={{
                  padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: a ? 700 : 500,
                  color: a ? "var(--accent)" : "var(--text1)",
                  textDecoration: "none",
                  background: a ? "var(--accdim)" : "var(--surface2)",
                  border: `1px solid ${a ? "var(--accborder)" : "var(--border)"}`,
                  borderLeft: a ? "3px solid var(--accent)" : `1px solid var(--border)`,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <i className={`ti ${l.icon}`} style={{ fontSize: 15, color: a ? "var(--accent)" : "inherit" }} />
                  <span style={{ flex: 1 }}>{l.label}</span>
                  {a && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
                </Link>
              );
            })}

            {/* Divider */}
            <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />

            {/* Upgrade */}
            {role === "candidate" && (
              <Link href="/upgrade" onClick={closeDrawer} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                color: "var(--accent)", textDecoration: "none",
                background: "var(--accdim)", border: "1px solid var(--accborder)",
              }}>
                <i className="ti ti-star" style={{ fontSize: 15 }} />
                Upgrade Plan
              </Link>
            )}

            {/* Profile */}
            <Link href="/profile" onClick={closeDrawer} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
              color: "var(--text1)", textDecoration: "none",
              background: "var(--surface2)", border: "1px solid var(--border)",
            }}>
              <i className="ti ti-user-circle" style={{ fontSize: 15 }} />
              <span style={{ flex: 1 }}>My Profile</span>
              {user?.email && <span style={{ fontSize: 11, color: "var(--text3)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>}
            </Link>

            {/* Admin — only for admins */}
            {(() => {
              const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
                .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
              if (!user?.email || !adminEmails.includes(user.email.toLowerCase())) return null;
              return (
                <Link href="/admin" onClick={closeDrawer} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                  color: "var(--text3)", textDecoration: "none",
                  background: "var(--surface2)", border: "1px solid var(--border)",
                }}>
                  <i className="ti ti-shield-lock" style={{ fontSize: 15 }} />
                  Admin Panel
                </Link>
              );
            })()}

            {/* Sign out */}
            <button
              onClick={() => { signOut(); closeDrawer(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                color: "var(--danger)", background: "rgba(239,68,68,.07)",
                border: "1px solid rgba(239,68,68,.2)",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <i className="ti ti-logout" style={{ fontSize: 15 }} />
              Sign Out
            </button>
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1 }}>{children}</main>
      </div>
      </>
    );
  }

  /* ── Desktop layout ────────────────────────────────────────── */
  return (
    <>
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

        {/* Inline search bar */}
        {!noSearch && (
          <div ref={searchContainerRef} style={{ flex: 1, maxWidth: 440, position: "relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--surface2)", border: `1px solid ${searchFocused ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 8, padding: "6px 14px", transition: "border-color .15s",
            }}>
              <i className="ti ti-search" style={{ fontSize: 13, color: "var(--text3)", flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchFocused(true); setSearchCursor(0); }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={onSearchKey}
                placeholder="Search tools, pages, features..."
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: 12.5, color: "var(--text1)", fontFamily: "inherit",
                }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 0, fontSize: 14, lineHeight: 1 }}>✕</button>
              )}
            </div>

            {/* Dropdown results */}
            {searchFocused && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 200,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,.18)",
                overflow: "hidden", maxHeight: 360, overflowY: "auto",
              }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
                    No results for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <>
                    {!searchQuery && (
                      <div style={{ padding: "8px 12px 4px", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Quick links
                      </div>
                    )}
                    {searchResults.map((item, i) => (
                      <Link key={item.href} href={item.href}
                        onClick={() => { setSearchQuery(""); setSearchFocused(false); }}
                        onMouseEnter={() => setSearchCursor(i)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", textDecoration: "none",
                          background: i === searchCursor ? "var(--accdim)" : "transparent",
                          borderLeft: `3px solid ${i === searchCursor ? "var(--accent)" : "transparent"}`,
                          transition: "background .08s",
                        }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          background: i === searchCursor ? "var(--accent)" : "var(--surface2)",
                          border: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <i className={`ti ${item.icon}`} style={{ fontSize: 13, color: i === searchCursor ? "#fff" : "var(--text2)" }} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: i === searchCursor ? "var(--accent)" : "var(--text1)" }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>jobsayer.com{item.href}</div>
                        </div>
                        {i === searchCursor && (
                          <kbd style={{ marginLeft: "auto", fontSize: 10, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>↵</kbd>
                        )}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right: page actions + role switcher + streak + theme + upgrade */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {actions}

          {/* Role switcher */}
          <RoleSwitcher role={role} setRole={setRole} />

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
            <i className={dark ? "ti ti-sun" : "ti ti-moon"}/>
          </button>

          {/* Upgrade link — only in candidate mode */}
          {user && role === "candidate" && (
            <Link href="/upgrade" style={{
              fontSize: 11, fontWeight: 700, color: "var(--accent)",
              background: "var(--accdim)", border: "1px solid var(--accborder)",
              borderRadius: 7, padding: "4px 10px", textDecoration: "none",
            }}>
              Upgrade
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
            <SectionLabel>{toolLabel}</SectionLabel>
            {toolLinks.map(l => (
              <NavLink key={l.href} {...l} active={isActive(l.href)} />
            ))}

            <div style={{ height: 1, background: "var(--border)", margin: "8px 10px" }} />

            <SectionLabel>{insightLabel}</SectionLabel>
            {insightLinks.map(l => (
              <NavLink key={l.href} {...l} active={isActive(l.href)} />
            ))}

            <div style={{ flex: 1 }} />
          </div>

          {/* Admin shortcut — only visible to admin emails */}
          {(() => {
            const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
              .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
            const isAdmin = !!user?.email && adminEmails.includes(user.email.toLowerCase());
            if (!isAdmin) return null;
            return (
              <div style={{ padding: "0 10px 8px" }}>
                <a href="/admin" style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 7,
                  background: "transparent", border: "1px solid transparent",
                  textDecoration: "none", fontSize: 11.5, fontWeight: 600,
                  color: "var(--text3)",
                  transition: "color .12s, background .12s",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface2)";
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--text1)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--text3)";
                  }}
                >
                  <i className="ti ti-shield-lock" style={{ fontSize: 13 }} />
                  Admin Panel
                </a>
              </div>
            );
          })()}

          {/* User pill + sign out */}
          <div style={{ padding: "10px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
            <Link href="/profile" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8,
              background: "var(--surface2)", border: "1px solid var(--border)",
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
                <div style={{ fontSize: 10, color: "var(--text3)" }}>View profile</div>
              </div>
              <i className="ti ti-settings" style={{ fontSize: 13, color: "var(--text3)", flexShrink: 0 }} />
            </Link>
            <button
              onClick={() => signOut()}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "7px 10px", borderRadius: 8,
                background: "none", border: "1px solid var(--border)",
                cursor: "pointer", fontFamily: "inherit",
                color: "var(--text3)", fontSize: 12, fontWeight: 500,
              }}
            >
              <i className="ti ti-logout" style={{ fontSize: 13 }} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Content area ── */}
        <main style={{
          flex: 1,
          overflowY: contentFill ? "hidden" : "auto",
          overflowX: "hidden",
          display: contentFill ? "flex" : undefined,
          flexDirection: contentFill ? "column" : undefined,
        }}>
          {children}
        </main>

        {/* ── AI Coach panel ── */}
        {showAiPanel && <AiCoachPanel />}
      </div>
    </div>
    </>
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
      <i className="ti ti-flame" style={{color:"#f97316", marginRight:3}}/>{streak}
    </span>
  );
}
