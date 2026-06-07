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
  { href: "/tailor",       label: "JD Tailor",      icon: "ti-scissors" },
  { href: "/cover-letter", label: "Cover Letter",   icon: "ti-mail" },
  { href: "/interview",    label: "Interview",      icon: "ti-microphone" },
];

const INSIGHT_LINKS = [
  { href: "/jobs",             label: "Jobs",        icon: "ti-briefcase" },
  { href: "/applications",     label: "Tracker",     icon: "ti-list-check" },
  { href: "/career-gps",       label: "Career GPS",  icon: "ti-compass" },
  { href: "/career-health",    label: "Health",      icon: "ti-heart-rate-monitor" },
  { href: "/salary",           label: "Salaries",    icon: "ti-coin" },
  { href: "/learn",            label: "Courses",     icon: "ti-school" },
  { href: "/vault",            label: "Doc Vault",   icon: "ti-folder-lock" },
  { href: "/company",          label: "Companies",   icon: "ti-building-bank" },
  { href: "/employer-trust",   label: "Trust",       icon: "ti-shield-check" },
  { href: "/bgv",              label: "BGV",         icon: "ti-certificate" },
  { href: "/linkedin",         label: "LinkedIn",    icon: "ti-brand-linkedin" },
  { href: "/integrations",     label: "Bot Integ.",  icon: "ti-plug-connected" },
];

/* ── Recruiter nav ───────────────────────────────────────────── */
const RECRUITER_TOOL_LINKS = [
  { href: "/employer-dashboard",               label: "Overview",    icon: "ti-layout-dashboard" },
  { href: "/employer-dashboard?tab=pipeline",  label: "Pipeline",    icon: "ti-funnel" },
  { href: "/employer-dashboard?tab=candidates",label: "Candidates",  icon: "ti-users" },
  { href: "/employer-dashboard?tab=bgv",       label: "BGV",         icon: "ti-shield-check" },
  { href: "/jobs/post",                         label: "Post a Job",  icon: "ti-circle-plus" },
];

const RECRUITER_INSIGHT_LINKS = [
  { href: "/employer-dashboard?tab=team-tools", label: "Team Tools",  icon: "ti-tools" },
  { href: "/employer-dashboard?tab=billing",    label: "Billing",     icon: "ti-credit-card" },
  { href: "/integrations",                       label: "Bot Integ.", icon: "ti-plug-connected" },
  { href: "/company",                            label: "Companies",  icon: "ti-building-bank" },
];

const ALL_LINKS = [
  ...TOOL_LINKS, ...INSIGHT_LINKS,
  ...RECRUITER_TOOL_LINKS, ...RECRUITER_INSIGHT_LINKS,
].filter((l, i, arr) => arr.findIndex(x => x.href === l.href) === i);

/* ── Command Palette ─────────────────────────────────────────── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.trim()
    ? ALL_LINKS.filter(l =>
        l.label.toLowerCase().includes(query.toLowerCase()) ||
        l.href.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_LINKS;

  // Reset cursor when results change
  useEffect(() => { setCursor(0); }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) { setQuery(""); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && results[cursor]) {
        router.push(results[cursor].href);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, cursor, results, onClose, router]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 120,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,.5)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderBottom: "1px solid var(--border)",
        }}>
          <i className="ti ti-search" style={{ fontSize: 16, color: "var(--text3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tools, pages, features..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 14, color: "var(--text1)", fontFamily: "inherit",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
          )}
          <kbd style={{ fontSize: 10, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px" }}>
          {results.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              No results for &quot;{query}&quot;
            </div>
          ) : (
            results.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 8, textDecoration: "none",
                  background: i === cursor ? "var(--accdim)" : "transparent",
                  border: `1px solid ${i === cursor ? "var(--accborder)" : "transparent"}`,
                  transition: "background .1s",
                }}
                onMouseEnter={() => setCursor(i)}
              >
                <span style={{
                  width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                  background: i === cursor ? "var(--accent)" : "var(--surface2)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 14, color: i === cursor ? "#fff" : "var(--text2)" }} />
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: i === cursor ? "var(--accent)" : "var(--text1)" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>jobsayer.com{item.href}</div>
                </div>
                {i === cursor && (
                  <kbd style={{ marginLeft: "auto", fontSize: 10, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>↵</kbd>
                )}
              </Link>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          borderTop: "1px solid var(--border)", padding: "8px 16px",
          display: "flex", gap: 16, alignItems: "center",
        }}>
          {[["↑↓", "navigate"], ["↵", "go"], ["Esc", "close"]].map(([key, hint]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text3)" }}>
              <kbd style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px", fontSize: 10 }}>{key}</kbd>
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      {pill("candidate", "👤 Candidate")}
      {pill("recruiter", "🏢 Recruiter")}
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
  /** When true, content area is overflow:hidden + flex so children can fill it (e.g. builder). */
  contentFill?: boolean;
}

/* ── AppShell ────────────────────────────────────────────────── */
export default function AppShell({ children, actions, aiPanel = true, contentFill = false }: AppShellProps) {
  const { user, signOut } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { role, setRole } = useRole();
  const pathname = usePathname();
  const w = useWidth();
  const [cmdOpen, setCmdOpen] = useState(false);
  // Client-side search params (avoids Suspense requirement)
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  // ⌘K / Ctrl+K global hotkey
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
            position: "sticky", top: 52, zIndex: 99,
            background: "var(--surface)", borderBottom: "1px solid var(--border)",
            padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4,
          }}>
            {/* Role switcher in mobile drawer */}
            <div style={{ marginBottom: 6 }}>
              <RoleSwitcher role={role} setRole={setRole} />
            </div>
            {[...toolLinks, ...insightLinks].map(l => (
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
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
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

        {/* Command bar */}
        <div style={{ flex: 1, maxWidth: 440 }}>
          <button
            onClick={() => setCmdOpen(true)}
            style={{
              width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 14px", cursor: "text",
              display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit",
            }}
          >
            <i className="ti ti-search" style={{ fontSize: 13, color: "var(--text3)", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "var(--text3)", flex: 1, textAlign: "left" }}>
              Search tools, jobs, skills...
            </span>
            <kbd style={{
              fontSize: 10, color: "var(--text3)",
              background: "var(--border)", padding: "2px 6px", borderRadius: 4,
              border: "1px solid var(--border2)", fontFamily: "inherit",
            }}>⌘K</kbd>
          </button>
        </div>

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
            {dark ? "☀" : "🌙"}
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
    <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
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
      🔥 {streak}
    </span>
  );
}
