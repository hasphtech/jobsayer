import { NextRequest, NextResponse } from "next/server";

// Telegram Bot API webhook
export async function POST(req: NextRequest) {
  const body   = await req.json();
  const msg    = body.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat?.id as number;
  const text   = (msg.text as string ?? "").trim();

  const reply = await getTelegramReply(text);
  if (reply) await sendTelegramMessage(chatId, reply);

  return NextResponse.json({ ok: true });
}

async function getTelegramReply(text: string): Promise<string | null> {
  const cmd = text.split("@")[0]; // strip bot username suffix

  if (cmd === "/start") {
    return `👋 Welcome to *jobSayer Bot*\\!\n\nI help you manage hiring from Telegram\\.\n\n*Commands:*\n/search \\[role\\] \\[city\\] \\- find candidates\n/pipeline \\[role\\-id\\] \\- open role status\n/approve \\[id\\] \\- shortlist a candidate\n/bgv \\[id\\] \\- check BGV status\n/help \\- show all commands\n\n[Connect your account →](https://jobsayer.com/integrations)`;
  }

  if (cmd.startsWith("/search")) {
    const query = text.replace("/search", "").trim() || "all";
    return `🔍 *Search: ${escMd(query)}*\n\nFound *5 candidates*:\n\n1\\. *Priya M* · 96% · React 6yr · BGV ✓ · 7d notice\n2\\. *Rahul K* · 91% · React 4yr · BGV ✓ · 15d notice\n3\\. *Meena S* · 88% · React 3yr · BGV pending · 30d notice\n\nReply /approve 1 to shortlist Priya`;
  }

  if (cmd.startsWith("/pipeline")) {
    const role = text.replace("/pipeline", "").trim() || "all roles";
    return `📊 *Pipeline — ${escMd(role)}*\n\n• 23 applied\n• 7 BGV verified\n• 3 in interview\n• 1 offer sent\n\n[View full pipeline](https://jobsayer.com/employer\\-dashboard)`;
  }

  if (cmd.startsWith("/approve")) {
    return `✅ Candidate shortlisted\\! They'll be notified on WhatsApp within 5 minutes\\.`;
  }

  if (cmd.startsWith("/bgv")) {
    return `🛡️ *BGV Status — Asha Patel*\n\n✅ Aadhaar\n✅ PAN\n✅ Employment \\(2/3\\)\n⏳ Criminal check \\(ETA: 1d\\)\n\nOverall: *In Progress* \\(Day 3/5\\)`;
  }

  if (cmd === "/help") {
    return `*jobSayer Bot Commands:*\n\n/search \\[role\\] \\[city\\] \\[notice\\]\n/pipeline \\[role\\-id\\]\n/approve \\[candidate\\-id\\]\n/bgv \\[candidate\\-id\\]\n/help`;
  }

  return null;
}

function escMd(s: string) {
  return s.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2", disable_web_page_preview: true }),
  });
}
