import { NextRequest, NextResponse } from "next/server";

// WhatsApp Cloud API (Meta) or Twilio webhook
// GET = verification challenge, POST = incoming message

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "jobsayer_wa_verify";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Meta WhatsApp Cloud API message format
  const entry    = body?.entry?.[0];
  const changes  = entry?.changes?.[0];
  const value    = changes?.value;
  const messages = value?.messages;

  if (!messages?.length) return NextResponse.json({ status: "no_message" });

  for (const message of messages) {
    const from = message.from as string; // phone number
    const text = (message.text?.body as string ?? "").toLowerCase().trim();

    const reply = await getWhatsAppReply(text, from);
    if (reply) await sendWhatsAppMessage(from, reply);
  }

  return NextResponse.json({ status: "ok" });
}

async function getWhatsAppReply(text: string, from: string): Promise<string | null> {
  if (text === "hi" || text === "hello") {
    return "👋 Hi! I'm the jobSayer hiring assistant.\n\nReply with:\n• *status* — check your application\n• *roles* — see open positions\n• *confirm* — confirm your interview\n• *help* — all commands";
  }
  if (text === "status") {
    return "📊 Your application status:\n\n✅ Applied: Senior Backend Engineer @ Razorpay\n⏳ BGV in progress (day 2 of 5)\n📅 Interview: Tue 10 Jun, 2 PM IST";
  }
  if (text === "confirm") {
    return "✅ Interview confirmed!\n\n📅 Tue 10 Jun, 2:00 PM IST\n📍 Razorpay HQ, Koramangala\n👤 Interviewer: Kavitha S.\n\nGood luck! 🎯";
  }
  if (text === "roles") {
    return "🔍 Open roles matching your profile:\n\n1. Senior Backend Eng @ Razorpay — ₹38–44 LPA\n2. Staff Eng @ Swiggy — ₹45–55 LPA\n\nReply *apply 1* or *apply 2* to express interest.";
  }
  if (text.startsWith("apply ")) {
    return "✅ Interest registered! A recruiter will reach out within 24 hours. Make sure your jobSayer profile is complete: jobsayer.com/profile";
  }
  return "I didn't understand that. Reply *help* to see what I can do.";
}

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return;

  await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}
