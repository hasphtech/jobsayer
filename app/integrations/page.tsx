"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useWindowWidth } from "@/lib/useWindowWidth";

/* ── Types ─────────────────────────────────────────────────── */
type Platform = "slack" | "teams" | "whatsapp" | "telegram";
type Status = "connected" | "disconnected" | "pending";

interface Integration {
  platform: Platform;
  status: Status;
  workspace?: string;
  connectedAt?: string;
}

/* ── Platform Config ─────────────────────────────────────────── */
const PLATFORMS: {
  key: Platform; name: string; icon: string; color: string; bg: string;
  tagline: string; features: string[]; setupSteps: string[];
  webhookPath: string; docUrl: string;
}[] = [
  {
    key: "slack", name: "Slack", icon: "ti-brand-slack", color: "#611f69", bg: "#611f6918",
    tagline: "Hire inside the channel your team already uses",
    features: [
      "Post new verified candidates directly to #hiring",
      "Slash command: /jobsayer search react bangalore",
      "One-click shortlist from any Slack message",
      "Daily digest of top matches at 9 AM",
      "Interview schedule updates in thread",
    ],
    setupSteps: [
      "Click 'Add to Slack' — authorize jobSayer in your workspace",
      "Choose the channel for hiring notifications",
      "Optionally set a daily digest time",
      "Type /jobsayer help in any channel to confirm",
    ],
    webhookPath: "/api/integrations/slack/webhook",
    docUrl: "https://docs.jobsayer.com/integrations/slack",
  },
  {
    key: "teams", name: "Microsoft Teams", icon: "ti-brand-teams", color: "#4b53bc", bg: "#4b53bc18",
    tagline: "Your hiring workflow inside Teams — no new tab needed",
    features: [
      "Candidate cards delivered to your HR channel",
      "Approve/reject shortlists from the Teams chat",
      "@jobsayer bot answers 'How many applicants for role X?'",
      "Interview reminders and panel feedback collection",
      "BGV status updates in conversation thread",
    ],
    setupSteps: [
      "Install the jobSayer app from Microsoft AppSource",
      "Grant permissions in your Teams admin portal",
      "Pin the jobSayer tab in your HR team channel",
      "Run @jobsayer status to verify connection",
    ],
    webhookPath: "/api/integrations/teams/webhook",
    docUrl: "https://docs.jobsayer.com/integrations/teams",
  },
  {
    key: "whatsapp", name: "WhatsApp Business", icon: "ti-brand-whatsapp", color: "#25d366", bg: "#25d36618",
    tagline: "Reach candidates and hiring managers on WhatsApp instantly",
    features: [
      "Notify shortlisted candidates via WhatsApp — 98% open rate",
      "Send interview invites and reminders",
      "Candidates confirm availability with a single reply",
      "Hiring manager approvals via WhatsApp",
      "Auto-responses for common candidate queries",
    ],
    setupSteps: [
      "Enter your WhatsApp Business phone number",
      "Verify ownership via OTP",
      "jobSayer will provision a business number for your account",
      "Test with 'Hi' to your assigned number to confirm",
    ],
    webhookPath: "/api/integrations/whatsapp/webhook",
    docUrl: "https://docs.jobsayer.com/integrations/whatsapp",
  },
  {
    key: "telegram", name: "Telegram", icon: "ti-brand-telegram", color: "#2ca5e0", bg: "#2ca5e018",
    tagline: "Lightweight bot for fast-moving technical teams",
    features: [
      "/search command — find candidates by skill and city",
      "/pipeline — see your open role status at a glance",
      "/approve [id] — shortlist a candidate inline",
      "Instant alerts when a candidate accepts an offer",
      "Works in group chats and private DMs",
    ],
    setupSteps: [
      "Search @jobsayer_bot in Telegram",
      "Send /start and follow the authentication link",
      "Add the bot to your team group chat if needed",
      "Run /connect to link your jobSayer employer account",
    ],
    webhookPath: "/api/integrations/telegram/webhook",
    docUrl: "https://docs.jobsayer.com/integrations/telegram",
  },
];

/* ── Bot Command Demo ────────────────────────────────────────── */
const BOT_DEMOS: Record<Platform, { messages: { from: "user" | "bot"; text: string }[] }> = {
  slack: { messages: [
    { from: "user", text: "/jobsayer search backend bangalore 7-day notice" },
    { from: "bot", text: "**7 matches found.** Top match: **Asha Patel · 94%** — Backend Engineer, 6 yrs, BGV cleared, 7-day notice. React to shortlist →" },
    { from: "user", text: "/jobsayer schedule asha.patel@email.com Mon 3pm" },
    { from: "bot", text: "Interview scheduled — Mon 9 Jun 3:00 PM. Calendar invite sent to Asha and the panel." },
  ]},
  teams: { messages: [
    { from: "user", text: "@jobsayer how many applicants for Stripe backend role?" },
    { from: "bot", text: "**Stripe — Backend Engineer (Bangalore):** 47 applicants · 12 BGV cleared · 5 shortlisted · 2 interviews scheduled." },
    { from: "user", text: "@jobsayer approve offer for Vikram Suri" },
    { from: "bot", text: "Offer letter sent to Vikram Suri (vikram@email.com). He has 48 hours to accept." },
  ]},
  whatsapp: { messages: [
    { from: "bot", text: "Hi Asha ✋ You've been shortlisted for Senior Backend Engineer at Razorpay. Interview: Tue 10 Jun, 2 PM. Confirm?" },
    { from: "user", text: "Yes, confirmed!" },
    { from: "bot", text: "Great! ✓ Calendar invite sent. Details: Razorpay HQ, Koramangala. Your interviewer: Kavitha S. Prep tip: system design round first." },
  ]},
  telegram: { messages: [
    { from: "user", text: "/search react bangalore 15-day" },
    { from: "bot", text: "Found **5 candidates**:\n1. Priya M · 96% · React 6yr · BGV ✓\n2. Rahul K · 91% · React 4yr · BGV ✓\nReply /approve 1 to shortlist Priya" },
    { from: "user", text: "/pipeline stripe-backend" },
    { from: "bot", text: "Stripe Backend: 23 applied · 7 verified · 3 interview · 1 offer sent" },
  ]},
};

/* ── Platform Card ───────────────────────────────────────────── */
function PlatformCard({
  p, integration, onConnect, onDisconnect,
}: {
  p: typeof PLATFORMS[0];
  integration?: Integration;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
}) {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [expanded, setExpanded] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const isConnected = integration?.status === "connected";
  const demo = BOT_DEMOS[p.key];

  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${isConnected ? p.color + "40" : "var(--border)"}`, borderRadius: 14, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`ti ${p.icon}`} style={{ fontSize: 22, color: p.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)" }}>{p.name}</span>
            {isConnected && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(34,197,94,.12)", color: "var(--success)", border: "1px solid rgba(34,197,94,.25)", textTransform: "uppercase" }}>
                ● Connected
              </span>
            )}
            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(34,197,94,.1)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Free
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{p.tagline}</div>
        </div>
        <button
          onClick={() => isConnected ? onDisconnect(p.key) : onConnect(p.key)}
          style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            background: isConnected ? "transparent" : p.color,
            border: isConnected ? "1px solid var(--border)" : "none",
            color: isConnected ? "var(--text3)" : "#fff",
          }}>
          {isConnected ? "Disconnect" : "Connect"}
        </button>
      </div>

      {/* Features list */}
      <div style={{ padding: "0 20px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {p.features.slice(0, 3).map(f => (
          <span key={f} style={{ fontSize: 11, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>
            {f}
          </span>
        ))}
      </div>

      {/* Expand toggle */}
      <button onClick={() => setExpanded(e => !e)}
        style={{ width: "100%", padding: "10px 20px", background: "var(--surface)", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text3)", fontFamily: "inherit", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{expanded ? "Hide" : "See live demo & setup steps"}</span>
        <i className={`ti ti-chevron-${expanded ? "up" : "down"}`} style={{ fontSize: 12 }} />
      </button>

      {expanded && (
        <div style={{ padding: "18px 20px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 20 }}>

          {/* Chat demo */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Live Preview</div>
            <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 10, padding: "12px", minHeight: 160, display: "flex", flexDirection: "column", gap: 8 }}>
              {demo.messages.slice(0, demoStep + 1).map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%", padding: "7px 10px", borderRadius: 10, fontSize: 11, lineHeight: 1.5,
                    background: m.from === "user" ? p.color : "var(--surface2)",
                    color: m.from === "user" ? "#fff" : "var(--text2)",
                    whiteSpace: "pre-line",
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            {demoStep < demo.messages.length - 1 && (
              <button onClick={() => setDemoStep(s => s + 1)}
                style={{ marginTop: 8, width: "100%", padding: "7px 0", borderRadius: 7, background: `${p.color}20`, border: `1px solid ${p.color}40`, color: p.color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Next <i className="ti ti-arrow-right"/>
              </button>
            )}
            {demoStep === demo.messages.length - 1 && (
              <button onClick={() => setDemoStep(0)}
                style={{ marginTop: 8, width: "100%", padding: "7px 0", borderRadius: 7, background: "transparent", border: "1px solid var(--border)", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                Replay
              </button>
            )}
          </div>

          {/* Setup steps */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Setup ({p.setupSteps.length} steps)</div>
            <ol style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {p.setupSteps.map((step, i) => (
                <li key={i} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
                  {step}
                </li>
              ))}
            </ol>
            <a href={p.docUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              <i className="ti ti-book" style={{ fontSize: 12 }} /> Full documentation
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const [integrations, setIntegrations] = useState<Integration[]>([
    { platform: "slack", status: "connected", workspace: "acme-eng.slack.com", connectedAt: "2026-05-12" },
  ]);

  function getIntegration(platform: Platform) {
    return integrations.find(i => i.platform === platform);
  }

  function handleConnect(platform: Platform) {
    setIntegrations(prev => {
      const filtered = prev.filter(i => i.platform !== platform);
      return [...filtered, { platform, status: "connected", connectedAt: new Date().toISOString().split("T")[0] }];
    });
  }

  function handleDisconnect(platform: Platform) {
    setIntegrations(prev => prev.filter(i => i.platform !== platform));
  }

  const connectedCount = integrations.filter(i => i.status === "connected").length;

  return (
    <AppShell>
      <div style={{ padding: "24px 24px 48px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)", margin: 0 }}>Bot Integrations</h1>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20, background: "rgba(34,197,94,.12)", color: "var(--success)", border: "1px solid rgba(34,197,94,.25)", textTransform: "uppercase" }}>
              All Free
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
            Hire where your team already works — no new app to learn.
            {connectedCount > 0 && <span style={{ color: "var(--success)", fontWeight: 600 }}> {connectedCount} platform{connectedCount > 1 ? "s" : ""} connected.</span>}
          </p>
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
          {[
            { v: "All 4", label: "Platforms", icon: "ti-plug-connected", c: "var(--accent)" },
            { v: "Free", label: "Forever", icon: "ti-heart", c: "var(--success)" },
            { v: "<2 min", label: "Setup time", icon: "ti-clock", c: "#f59e0b" },
            { v: "98%", label: "WhatsApp open rate", icon: "ti-mail-opened", c: "#25d366" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 13, color: s.c }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)" }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Integration cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PLATFORMS.map(p => (
            <PlatformCard
              key={p.key}
              p={p}
              integration={getIntegration(p.key)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>

        {/* Webhook info for developers */}
        <div style={{ marginTop: 32, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text1)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-code" style={{ color: "var(--accent)" }} /> Developer Webhooks
          </div>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14, lineHeight: 1.6 }}>
            Each integration sends event webhooks you can use to build custom automations — new candidate matched, interview scheduled, offer accepted.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PLATFORMS.map(p => (
              <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
                <i className={`ti ${p.icon}`} style={{ color: p.color, width: 16 }} />
                <code style={{ flex: 1, color: "var(--text2)", background: "rgba(0,0,0,.3)", padding: "3px 8px", borderRadius: 5, fontFamily: "monospace" }}>
                  POST https://jobsayer.com{p.webhookPath}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
