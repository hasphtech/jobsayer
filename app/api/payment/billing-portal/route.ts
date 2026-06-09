/**
 * POST /api/payment/billing-portal
 *
 * Creates a Stripe Customer Portal session for the authenticated user.
 * Redirects them to manage subscription, invoices, and payment method.
 *
 * Returns: { url } — redirect to Stripe-hosted portal
 *
 * Requires: STRIPE_SECRET_KEY, NEXT_PUBLIC_SITE_URL
 * Note: Activate Customer Portal in Stripe Dashboard → Billing → Customer portal
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

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

  const { allowed } = await rateLimit(`billing-portal:${user.id}`, 5, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Fetch stripe_customer_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  const stripe   = new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" });
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  let customerId = profile?.stripe_customer_id as string | null;

  // Create customer if missing (edge case: paid via admin grant)
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${siteUrl}/profile`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[billing-portal] error:", err);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
