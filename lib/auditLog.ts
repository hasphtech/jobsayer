/**
 * lib/auditLog.ts
 * Server-side audit logging. Fire on every sensitive action.
 *
 * Events to log (minimum):
 *   auth.login, auth.logout, auth.signup
 *   resume.export, resume.delete, resume.share
 *   plan.upgrade, plan.cancel, plan.admin_override
 *   bgv.initiated, bgv.document_uploaded, bgv.completed
 *   vault.upload, vault.delete, vault.share
 *   admin.suspend_user, admin.impersonate, admin.flag_toggle
 *   api.rate_limited
 */

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

export type AuditAction =
  | "auth.login" | "auth.logout" | "auth.signup"
  | "resume.export" | "resume.delete" | "resume.share" | "resume.created"
  | "plan.upgrade" | "plan.cancel" | "plan.admin_override"
  | "bgv.initiated" | "bgv.document_uploaded" | "bgv.completed"
  | "vault.upload" | "vault.delete" | "vault.share"
  | "admin.suspend_user" | "admin.unsuspend_user"
  | "admin.impersonate" | "admin.flag_toggle" | "admin.plan_override"
  | "api.rate_limited"
  | (string & {}); // allow ad-hoc strings

export interface AuditEvent {
  userId:   string;
  action:   AuditAction;
  resource?: string;     // e.g. "resume:abc-123"
  meta?:    Record<string, unknown>;
  actorId?: string;      // admin acting on behalf of user
}

/** Log an audit event. Safe to fire and forget — errors are swallowed. */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !svcKey) {
      // Dev fallback — log to console
      if (process.env.NODE_ENV !== "production") {
        console.log("[audit]", event.action, event.resource ?? "", event.meta ?? "");
      }
      return;
    }

    const db = createClient(url, svcKey, { auth: { persistSession: false } });

    // Try to grab IP / UA from server headers (works in API routes)
    let ip: string | undefined;
    let ua: string | undefined;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;
      ua = h.get("user-agent") ?? undefined;
    } catch { /* headers() throws outside request context */ }

    await db.from("audit_logs").insert({
      user_id:    event.userId,
      actor_id:   event.actorId ?? null,
      action:     event.action,
      resource:   event.resource ?? null,
      meta:       event.meta ?? {},
      ip_address: ip ?? null,
      user_agent: ua ?? null,
    });
  } catch (err) {
    // Never throw — audit logging must not break user flows
    console.error("[audit] log failed:", err);
  }
}

/** Convenience: log and return a 429 response */
export async function logRateLimit(userId: string, route: string) {
  await logAuditEvent({ userId, action: "api.rate_limited", resource: route });
}
