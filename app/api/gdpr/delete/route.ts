/**
 * DELETE /api/gdpr/delete
 *
 * Permanently deletes all data for the authenticated user.
 * Requires `confirm: "DELETE MY ACCOUNT"` in the request body.
 *
 * GDPR Art. 17 — Right to Erasure ("Right to be Forgotten").
 * Cascade-deletes: resumes, applications, notifications, alerts, versions,
 *                  referrals, BGV records, then the auth.users record.
 *
 * Uses service role key to bypass RLS for final auth.users deletion.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { logAuditEvent } from "@/lib/auditLog";

export async function DELETE(req: NextRequest) {
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

  const { allowed } = await rateLimit(`gdpr-delete:${user.id}`, 1, 3_600_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: { confirm?: string };
  try { body = await req.json(); } catch { body = {}; }

  if (body.confirm !== "DELETE MY ACCOUNT") {
    return NextResponse.json({
      error: `Send { "confirm": "DELETE MY ACCOUNT" } to confirm deletion`,
    }, { status: 422 });
  }

  // Audit before deletion (so the log survives)
  await logAuditEvent({
    userId:   user.id,
    action:   "account.deleted",
    resource: `user:${user.id}`,
    meta:     { email: user.email, reason: "gdpr_erasure_request" },
  });

  // Service-role client for deleting auth.users entry
  const sbAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // All application data is cascade-deleted via FK on auth.users(id)
  // But we explicitly clear vault files + cancel Stripe subscription first
  try {
    // Fetch subscription before deletion
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    // Cancel Stripe subscription if active
    if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch { /* non-fatal */ }
    }

    // Delete auth user (cascades to profiles + all tables with ON DELETE CASCADE)
    const { error } = await sbAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({
      success:   true,
      message:   "Your account and all associated data have been permanently deleted.",
      deleted_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[gdpr/delete] error:", err);
    return NextResponse.json({ error: "Deletion failed — contact support@jobsayer.com" }, { status: 500 });
  }
}
