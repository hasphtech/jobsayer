"use client";
/**
 * NotificationBell — shows unread count badge + dropdown list.
 * Drop into AppNav or AppShell header.
 *
 * Usage:
 *   import NotificationBell from "@/components/NotificationBell";
 *   <NotificationBell />
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Notification {
  id:         string;
  type:       "info" | "success" | "warn" | "alert";
  title:      string;
  body?:      string;
  link?:      string;
  read:       boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  info:    "ti-info-circle",
  success: "ti-circle-check",
  warn:    "ti-alert-triangle",
  alert:   "ti-alert-circle",
};

const TYPE_COLOR: Record<string, string> = {
  info:    "var(--accent)",
  success: "var(--success)",
  warn:    "var(--warn)",
  alert:   "var(--danger)",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.notifications ?? []);
      setUnread(json.unread ?? 0);
    } catch {}
  }, []);

  // Poll every 60s
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAllRead() {
    setLoading(true);
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    setLoading(false);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "relative", background: "none", border: "none",
          cursor: "pointer", padding: "4px 6px", borderRadius: 8,
          color: "var(--text2)", fontSize: 18, lineHeight: 1,
          display: "flex", alignItems: "center",
        }}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <i className="ti ti-bell" style={{ fontSize: 18 }} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            background: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 700, lineHeight: 1,
            width: 16, height: 16, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 340, maxHeight: 480,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,.18)",
          zIndex: 200, overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text1)" }}>
              Notifications {unread > 0 && (
                <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, marginLeft: 4 }}>
                  {unread}
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent)" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
                <div style={{ marginBottom: 8 }}><i className="ti ti-bell-off" style={{ fontSize: 28, color: "var(--text3)" }} /></div>
                No notifications
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  style={{
                    display: "flex", gap: 10, padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: n.read ? "transparent" : "rgba(99,102,241,.04)",
                    cursor: n.read ? "default" : "pointer",
                    transition: "background .15s",
                  }}
                >
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <i className={`ti ${TYPE_ICON[n.type] ?? "ti-info-circle"}`} style={{ fontSize: 16, color: TYPE_COLOR[n.type] ?? "var(--accent)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: n.read ? 400 : 600, fontSize: 13, color: "var(--text1)" }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span style={{ width: 6, height: 6, background: "#6366f1", borderRadius: "50%", flexShrink: 0 }} />
                      )}
                    </div>
                    {n.body && (
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>{n.body}</p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>{timeAgo(n.created_at)}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {n.link && (
                          <Link href={n.link} onClick={() => setOpen(false)}
                            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
                            View →
                          </Link>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text3)", padding: 0 }}
                        >
                          <i className="ti ti-x" style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
