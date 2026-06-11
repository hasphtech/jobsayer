/**
 * @jobsayer/employerActivity
 * Server-side helper to log HR team actions into employer_activity_log.
 * Call from API routes whenever an employer/HR user takes a meaningful action.
 *
 * Usage:
 *   import { logEmployerActivity } from "@/lib/employerActivity";
 *   await logEmployerActivity({ employerId, userId, action: "job.posted", entityType: "job", entityId: job.id, entityLabel: job.title });
 */

import { createServiceClient } from "@/lib/adminAuth";

export type EmployerAction =
  | "job.posted"
  | "job.updated"
  | "job.deleted"
  | "job.renewed"
  | "job.approved"
  | "candidate.shortlisted"
  | "candidate.rejected"
  | "candidate.viewed"
  | "bgv.initiated"
  | "bgv.updated"
  | "member.invited"
  | "member.removed"
  | "member.role_changed"
  | "settings.updated"
  | "report.exported";

export interface LogActivityParams {
  employerId:   string;
  userId?:      string | null;
  memberEmail?: string | null;
  memberName?:  string | null;
  action:       EmployerAction | string;
  entityType?:  "job" | "candidate" | "bgv" | "member" | "settings" | "report";
  entityId?:    string;
  entityLabel?: string;
  metadata?:    Record<string, unknown>;
  ipAddress?:   string;
}

export async function logEmployerActivity(params: LogActivityParams): Promise<void> {
  try {
    const sb = createServiceClient();
    await sb.from("employer_activity_log").insert({
      employer_id:  params.employerId,
      user_id:      params.userId ?? null,
      member_email: params.memberEmail ?? null,
      member_name:  params.memberName ?? null,
      action:       params.action,
      entity_type:  params.entityType ?? null,
      entity_id:    params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      metadata:     params.metadata ?? {},
      ip_address:   params.ipAddress ?? null,
    });
  } catch (err) {
    // Non-fatal — log but don't break the main flow
    console.error("[employerActivity] Failed to log activity:", err);
  }
}

/** Fetch activity log for an employer with optional filters */
export async function getEmployerActivity(params: {
  employerId: string;
  userId?:    string;
  action?:    string;
  from?:      string;
  to?:        string;
  limit?:     number;
  offset?:    number;
}) {
  const sb = createServiceClient();
  let query = sb
    .from("employer_activity_log")
    .select("*")
    .eq("employer_id", params.employerId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 50)
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

  if (params.userId)  query = query.eq("user_id", params.userId);
  if (params.action)  query = query.eq("action", params.action);
  if (params.from)    query = query.gte("created_at", params.from);
  if (params.to)      query = query.lte("created_at", params.to);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Per-member stats summary */
export async function getMemberStats(employerId: string) {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("employer_activity_log")
    .select("user_id, member_email, member_name, action, created_at")
    .eq("employer_id", employerId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // last 30 days

  if (error) throw error;

  // Group by user
  const statsMap: Record<string, {
    email: string; name: string;
    total: number; jobs: number; bgvs: number; candidates: number; lastActive: string;
  }> = {};

  for (const row of data ?? []) {
    const key = row.user_id ?? row.member_email ?? "unknown";
    if (!statsMap[key]) {
      statsMap[key] = { email: row.member_email ?? "", name: row.member_name ?? "", total: 0, jobs: 0, bgvs: 0, candidates: 0, lastActive: row.created_at };
    }
    statsMap[key].total++;
    if (row.action?.startsWith("job."))       statsMap[key].jobs++;
    if (row.action?.startsWith("bgv."))       statsMap[key].bgvs++;
    if (row.action?.startsWith("candidate.")) statsMap[key].candidates++;
    if (row.created_at > statsMap[key].lastActive) statsMap[key].lastActive = row.created_at;
  }

  return Object.entries(statsMap).map(([id, s]) => ({ id, ...s }));
}
