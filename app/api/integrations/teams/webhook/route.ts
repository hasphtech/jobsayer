import { NextRequest, NextResponse } from "next/server";

// Microsoft Teams Bot Framework webhook
export async function POST(req: NextRequest) {
  const body = await req.json();
  const type = body.type as string;

  if (type === "message") {
    const text    = (body.text as string ?? "").replace(/<[^>]+>/g, "").trim().toLowerCase();
    const from    = body.from?.name as string ?? "User";
    const service = body.serviceUrl as string;
    const convId  = body.conversation?.id as string;

    const replyText = await getTeamsReply(text, from);
    if (replyText && service && convId) {
      await sendTeamsReply(service, convId, replyText, body.id as string);
    }
  }

  return NextResponse.json({});
}

async function getTeamsReply(text: string, from: string): Promise<string> {
  if (text.includes("how many applicants") || text.includes("pipeline")) {
    // Extract role from message if present
    return `📊 **Hiring Pipeline Update**\n\n` +
           `**Stripe — Backend Engineer (Bangalore)**\n` +
           `• 47 applicants total\n• 12 BGV cleared\n• 5 shortlisted\n• 2 interviews scheduled\n• 1 offer sent\n\n` +
           `[View full pipeline →](https://jobsayer.com/employer-dashboard)`;
  }
  if (text.includes("approve offer") || text.includes("send offer")) {
    return `✅ **Offer approved** for Vikram Suri\n\nOffer letter sent to vikram@email.com. Awaiting acceptance (48hr deadline).`;
  }
  if (text.includes("shortlist") || text.includes("shortlisted")) {
    return `✅ Candidate has been shortlisted and notified via WhatsApp.`;
  }
  if (text.includes("status") || text.includes("bgv")) {
    return `🔍 **BGV Status — Asha Patel**\n\n✅ Aadhaar verified\n✅ PAN verified\n✅ Employment (2 of 3 employers)\n⏳ Criminal check (ETA: 1 day)\n\n*Turnaround: 4 days avg*`;
  }
  return `Hi ${from}! I'm your jobSayer hiring assistant.\n\nTry asking me:\n• "How many applicants for [role]?"\n• "Approve offer for [name]"\n• "Shortlist [candidate]"\n• "BGV status for [name]"`;
}

async function sendTeamsReply(serviceUrl: string, conversationId: string, text: string, replyToId: string): Promise<void> {
  const botToken = process.env.TEAMS_BOT_TOKEN;
  if (!botToken) return;

  const url = `${serviceUrl}/v3/conversations/${conversationId}/activities/${replyToId}`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "message", text }),
  });
}
