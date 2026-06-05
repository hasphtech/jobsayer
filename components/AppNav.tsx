"use client";
/**
 * AppNav — shared top nav for all inner candidate pages
 * (builder, score, jobs, interview, career-gps, bgv, profile)
 *
 * Shows logo + all nav links with active highlighting + profile avatar.
 * Pass `actions` for page-specific buttons on the right side.
 */
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";

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

const NAV_LINKS = [
  { href: "/dashboard",      label: "Dashboard",      icon: "📊" },
  { href: "/builder",        label: "Builder",        icon: "✏️" },
  { href: "/cover-letter",   label: "Cover Letter",   icon: "✉️" },
  { href: "/score",          label: "Score",          icon: "🎯" },
  { href: "/jobs",           label: "Jobs",           icon: "💼" },
  { href: "/applications",   label: "Tracker",        icon: "📋" },
  { href: "/interview",      label: "Interview",      icon: "🎤" },
  { href: "/career-gps",     label: "Career GPS",     icon: "🧭" },
  { href: "/career-health",  label: "Health",         icon: "🏥" },
  { href: "/bgv",            label: "BGV",            icon: "🛡" },
  { href: "/salary",         label: "Salaries",       icon: "💰" },
  { href: "/employer-trust", label: "Trust",          icon: "⭐" },
];

export default function AppNav({ actions }: { actions?: React.ReactNode }) {
  const { user } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const w = useWidth();
  const mobile = w < 768;
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || "";

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--nav-bg)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        height: 56, display: "flex", alignItems: "center",
        padding: "0 20px", gap: 0,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0, marginRight: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="jobSayer" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)", letterSpacing: "-.3px" }}>jobSayer</span>
        </Link>

        {/* Desktop nav links */}
        {!mobile && (
          <div style={{ display: "flex", gap: 1, flex: 1, overflowX: "auto" }}>
            {NAV_LINKS.map(l => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link key={l.href} href={l.href} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 13, whiteSpace: "nowrap",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--text1)" : "var(--text2)",
                  textDecoration: "none",
                  background: active ? "var(--nav-active-bg)" : "transparent",
                  transition: "color .15s, background .15s",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--nav-hover-col)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--text2)"; }}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile: show current page name */}
        {mobile && (
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text1)" }}>
            {NAV_LINKS.find(l => pathname.startsWith(l.href))?.label ?? ""}
          </span>
        )}

        {/* Right side: page actions + profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: mobile ? 0 : 12, flexShrink: 0 }}>
          {!mobile && actions}

          {/* Theme toggle */}
          {!mobile && (
            <button onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"}
              style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {dark ? "☀" : "🌙"}
            </button>
          )}

          {/* Profile avatar */}
          {!mobile && user && (
            <Link href="/profile" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 8, textDecoration: "none",
              color: "var(--text3)", fontSize: 12, fontWeight: 500,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text1)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
            >
              {user.user_metadata?.avatar_url
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                : <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accdim)", border: "1px solid var(--accborder)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                    {(user.email?.[0] ?? "?").toUpperCase()}
                  </span>
              }
              {firstName}
            </Link>
          )}

          {/* Mobile hamburger */}
          {mobile && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 9px", cursor: "pointer", color: "var(--text2)", fontFamily: "inherit", fontSize: 15 }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobile && menuOpen && (
        <div style={{
          position: "sticky", top: 56, zIndex: 99,
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8,
        }}>
          {NAV_LINKS.map(l => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{
                padding: "11px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                color: active ? "var(--accent)" : "var(--text1)", textDecoration: "none",
                background: active ? "var(--accdim)" : "var(--surface2)",
                border: `1px solid ${active ? "var(--accborder)" : "var(--border)"}`,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span>{l.icon}</span> {l.label}
              </Link>
            );
          })}
          {actions && (
            <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
              {actions}
            </div>
          )}
          {user && (
            <Link href="/profile" onClick={() => setMenuOpen(false)} style={{
              padding: "11px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500,
              color: "var(--text1)", textDecoration: "none",
              background: "var(--surface2)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              👤 My Account
            </Link>
          )}
        </div>
      )}
    </>
  );
}
