import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Slack slash command / event handler
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // Slack sends URL verification challenge
  if (contentType.includes("application/json")) {
    const body = await req.json();
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }
    // Handle Slack events
    return handleSlackEvent(body);
  }

  // Slash command (application/x-www-form-urlencoded)
  const formData = await req.formData();
  const command  = formData.get("command") as string;
  const text     = formData.get("text") as string;
  const userId   = formData.get("user_id") as string;
  const teamId   = formData.get("team_id") as string;

  if (command === "/jobsayer") {
    return handleSlashCommand(text.trim(), userId, teamId);
  }

  return NextResponse.json({ text: "Unknown command." });
}

async function handleSlashCommand(text: string, slackUserId: string, teamId: string) {
  const parts = text.split(" ").filter(Boolean);
  const sub   = parts[0]?.toLowerCase();

  if (!sub || sub === "help") {
    return NextResponse.json({
      response_type: "ephemeral",
      text: [
        "*jobSayer Commands:*",
        "`/jobsayer search [role] [city] [notice]` — find candidates",
        "`/jobsayer pipeline [role-id]` — view open role status",
        "`/jobsayer shortlist [candidate-id]` — shortlist a candidate",
        "`/jobsayer schedule [email] [date] [time]` — schedule interview",
        "`/jobsayer approve [candidate-id]` — send offer",
      ].join("\n"),
    });
  }

  if (sub === "search") {
    const query = parts.slice(1).join(" ") || "all roles";
    // In production: query Supabase for matching candidates
    return NextResponse.json({
      response_type: "in_channel",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*🔍 Search: "${query}"*\nFound *7 verified candidates* matching your criteria.` } },
        { type: "section", text: { type: "mrkdwn", text: "*1. Asha Patel — 94% match*\nBackend Engineer · 6 yrs · Bangalore · BGV ✓ · 7-day notice\n₹28–42 LPA band · Go, Postgres, K8s" } },
        { type: "actions", elements: [
          { type: "button", text: { type: "plain_text", text: "Shortlist Asha" }, style: "primary", action_id: "shortlist_candidate", value: "asha_patel_001" },
          { type: "button", text: { type: "plain_text", text: "See all 7" }, action_id: "view_all", value: query },
        ]},
      ],
    });
  }

  if (sub === "pipeline") {
    const roleId = parts[1] ?? "all";
    return NextResponse.json({
      response_type: "ephemeral",
      text: `*Pipeline — ${roleId}:*\n23 applied · 7 BGV cleared · 3 interview · 1 offer sent`,
    });
  }

  return NextResponse.json({ response_type: "ephemeral", text: `Unknown subcommand. Try \`/jobsayer help\`` });
}

async function handleSlackEvent(event: Record<string, unknown>) {
  // Handle interactive components (button clicks, etc.)
  if (event.type === "block_actions") {
    const actions = event.actions as { action_id: string; value: string }[];
    for (const action of actions ?? []) {
      if (action.action_id === "shortlist_candidate") {
        return NextResponse.json({ text: `✅ Candidate shortlisted. They'll be notified by WhatsApp/email.` });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
