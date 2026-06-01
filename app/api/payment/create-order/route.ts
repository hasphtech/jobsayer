/**
 * POST /api/payment/create-order
 * Creates a Razorpay order for a subscription upgrade.
 *
 * Body:   { plan: "starter" | "pro", interval: "monthly" | "annual" }
 * Returns: { orderId, amount, currency, key }
 *
 * Env vars needed (Vercel + .env.local):
 *   RAZORPAY_KEY_ID     — from Razorpay Dashboard → API Keys
 *   RAZORPAY_KEY_SECRET — from Razorpay Dashboard → API Keys
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const PRICES: Record<string, Record<string, number>> = {
  starter: { monthly: 19900, annual: 199000 },  // paise (₹199 / ₹1990)
  pro:     { monthly: 49900, annual: 499000 },  // paise (₹499 / ₹4990)
};

export async function POST(req: NextRequest) {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
  }

  // Verify user is signed in
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { plan?: string; interval?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { plan = "pro", interval = "monthly" } = body;
  const amount = PRICES[plan]?.[interval];
  if (!amount) return NextResponse.json({ error: "Invalid plan or interval" }, { status: 400 });

  // Create Razorpay order via REST API (no SDK needed)
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const receipt = `js_${user.id.slice(0, 8)}_${Date.now()}`;

  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt,
      notes: { user_id: user.id, plan, interval },
    }),
  });

  if (!rzpRes.ok) {
    const err = await rzpRes.text();
    console.error("Razorpay create order failed:", err);
    return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
  }

  const order = await rzpRes.json() as { id: string; amount: number; currency: string };
  return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, key: keyId });
}
