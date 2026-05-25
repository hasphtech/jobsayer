/**
 * useResumePlan — reads the user's JobSayer tier from jobsayer_subscriptions.
 *
 * Supabase table (run once):
 *   create table jobsayer_subscriptions (
 *     id                   uuid primary key default gen_random_uuid(),
 *     user_id              uuid not null references auth.users(id) on delete cascade,
 *     tier                 text not null default 'free',   -- 'free' | 'starter' | 'pro'
 *     status               text not null default 'active', -- 'active' | 'grace' | 'cancelled' | 'expired'
 *     interval             text,                            -- 'monthly' | 'annual'
 *     expires_at           timestamptz,
 *     grace_until          timestamptz,
 *     cancel_at_period_end boolean default false,
 *     created_at           timestamptz default now(),
 *     updated_at           timestamptz default now()
 *   );
 *   alter table jobsayer_subscriptions enable row level security;
 *   create policy "Users manage own subscription" on jobsayer_subscriptions
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *   create unique index on jobsayer_subscriptions(user_id);
 *
 * Tiers:
 *   free    — 2 saves, basic templates, PDF only, no AI
 *   starter — 5 saves, all templates, PDF + DOCX, no AI
 *   pro     — 10 saves, all templates, PDF + DOCX + JSON, AI features
 */
"use client";
import { useState, useEffect } from "react";
import { useAuth, getSupabaseAsync } from "@/lib/auth";

export type JobsayerTier = "free" | "starter" | "pro";
/** Alias kept so builder/page.tsx imports continue to resolve */
export type ResumeTier = JobsayerTier;

interface PlanState {
  tier:                  JobsayerTier;
  planName:              string;
  maxSaves:              number;
  allTemplates:          boolean;
  hasDocxExport:         boolean;
  hasJsonExport:         boolean;
  hasAiFeatures:         boolean;
  resumeUploadsPerMonth: number;
  photoUploadsPerMonth:  number;
  loading:               boolean;
}

export const PLAN_DEFAULTS: Record<JobsayerTier, Omit<PlanState, "loading">> = {
  free: {
    tier: "free", planName: "Free",
    maxSaves: 2, allTemplates: false,
    hasDocxExport: false, hasJsonExport: false, hasAiFeatures: false,
    resumeUploadsPerMonth: 2, photoUploadsPerMonth: 1,
  },
  starter: {
    tier: "starter", planName: "Starter",
    maxSaves: 5, allTemplates: true,
    hasDocxExport: true, hasJsonExport: false, hasAiFeatures: false,
    resumeUploadsPerMonth: 5, photoUploadsPerMonth: 5,
  },
  pro: {
    tier: "pro", planName: "Pro",
    maxSaves: 10, allTemplates: true,
    hasDocxExport: true, hasJsonExport: true, hasAiFeatures: true,
    resumeUploadsPerMonth: 20, photoUploadsPerMonth: 20,
  },
};

function resolveEffectiveTier(
  tier:              string,
  status:            string,
  graceUntil:        string | null,
  cancelAtPeriodEnd: boolean,
  expiresAt:         string | null,
): JobsayerTier {
  const now        = new Date();
  const inGrace    = status === "grace" && !!graceUntil && new Date(graceUntil) > now;
  const cancelSoon = cancelAtPeriodEnd && !!expiresAt && new Date(expiresAt) > now;
  const active     = status === "active" || inGrace || cancelSoon;
  if (active && (tier === "starter" || tier === "pro")) return tier as JobsayerTier;
  return "free";
}

export function useResumePlan(): PlanState {
  const { user } = useAuth();
  const [state, setState] = useState<PlanState>({ ...PLAN_DEFAULTS.free, loading: true });

  useEffect(() => {
    if (!user) {
      setState({ ...PLAN_DEFAULTS.free, loading: false });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const supabase = await getSupabaseAsync();
        const { data } = await supabase
          .from("jobsayer_subscriptions")
          .select("tier, status, grace_until, cancel_at_period_end, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const tier = data
          ? resolveEffectiveTier(
              data.tier,
              data.status,
              data.grace_until,
              data.cancel_at_period_end ?? false,
              data.expires_at,
            )
          : "free";

        setState({ ...PLAN_DEFAULTS[tier], loading: false });
      } catch {
        if (!cancelled) setState({ ...PLAN_DEFAULTS.free, loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return state;
}
