/**
 * GET /api/referral — get user's referral code + stats
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(_req: NextRequest) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, reward_granted, created_at, profiles!referrals_referee_id_fkey(full_name, email)")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://jobsayer.com";

  return NextResponse.json({
    referral_code: profile?.referral_code ?? null,
    referral_url:  profile?.referral_code ? `${siteUrl}/?ref=${profile.referral_code}` : null,
    total:         (referrals ?? []).length,
    rewarded:      (referrals ?? []).filter(r => r.reward_granted).length,
    referrals:     referrals ?? [],
  });
}
