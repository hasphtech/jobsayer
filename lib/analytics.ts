"use client";
/**
 * lib/analytics.ts
 * Thin wrapper around Posthog with graceful no-op when DSN is absent.
 *
 * Setup:
 *   pnpm add posthog-js
 *   Add to .env.local:
 *     NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
 *     NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com   (or EU: https://eu.posthog.com)
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("resume_created", { template: "modern", source: "builder" });
 */

type Properties = Record<string, string | number | boolean | null | undefined>;

let _ph: typeof import("posthog-js").default | null = null;
let _initialised = false;

async function getPosthog() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (_ph && _initialised) return _ph;

  const posthog = (await import("posthog-js")).default;

  if (!_initialised) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host:              process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      capture_pageview:      false, // we fire page events manually
      capture_pageleave:     true,
      autocapture:           false, // explicit events only — avoids noisy noise
      disable_session_recording: false,
      persistence:           "localStorage+cookie",
      respect_dnt:           true,   // honour Do Not Track
      loaded:                (ph) => {
        if (process.env.NODE_ENV !== "production") ph.opt_out_capturing();
      },
    });
    _initialised = true;
  }

  _ph = posthog;
  return posthog;
}

/** Identify user after sign-in. */
export async function identifyUser(userId: string, traits?: Properties) {
  const ph = await getPosthog();
  ph?.identify(userId, traits);
}

/** Reset identity on sign-out. */
export async function resetUser() {
  const ph = await getPosthog();
  ph?.reset();
}

/** Fire a named event with optional properties. */
export async function track(event: AnalyticsEvent, properties?: Properties) {
  const ph = await getPosthog();
  ph?.capture(event, properties);
}

/** Fire a page view (call from layout or page components). */
export async function pageView(url: string) {
  const ph = await getPosthog();
  ph?.capture("$pageview", { $current_url: url });
}

/* ── Typed event catalogue ──────────────────────────────── */
export type AnalyticsEvent =
  // Acquisition
  | "page_viewed"
  | "sign_up_started"
  | "sign_up_completed"
  | "sign_in"
  // Resume
  | "resume_created"
  | "resume_saved"
  | "resume_exported"        // pdf | docx
  | "resume_shared"
  | "ats_scored"
  | "jd_tailored"
  // Jobs
  | "job_viewed"
  | "job_applied"
  | "job_saved"
  // Career tools
  | "interview_session_started"
  | "career_gps_viewed"
  | "salary_insights_viewed"
  | "linkedin_optimised"
  | "bgv_initiated"
  | "vault_document_uploaded"
  // Monetisation
  | "upgrade_page_viewed"
  | "upgrade_cta_clicked"
  | "plan_purchased"
  | "plan_cancelled"
  // Onboarding
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_skipped"
  // Enterprise
  | "enterprise_contact_clicked"
  | "sso_login_attempted"
  // Engagement
  | "feature_used"
  | "ai_feedback_requested";
