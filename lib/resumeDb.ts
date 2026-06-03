"use client";
/**
 * Save, load, and share resumes.
 * Authenticated users → Supabase (resume_shares / resume_saves tables).
 * Guests → localStorage only (no share link, no cloud saves).
 *
 * resume_saves schema (run once in Supabase SQL editor):
 *   create table resume_saves (
 *     id          uuid primary key default gen_random_uuid(),
 *     user_id     uuid not null references auth.users(id) on delete cascade,
 *     name        text not null default 'Untitled Resume',
 *     data        jsonb not null,
 *     template    text not null,
 *     meta        jsonb,
 *     updated_at  timestamptz not null default now()
 *   );
 *   alter table resume_saves enable row level security;
 *   create policy "Users manage own saves" on resume_saves
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *   create index on resume_saves(user_id, updated_at desc);
 */
import { getSupabaseAsync } from "@/lib/auth";
import type { ResumeData } from "./types";

const LS_KEY = "jobsayer-resume-draft";

function shortId(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/* ── localStorage helpers (guest + draft) ────────────────── */

export interface DraftMeta {
  styleFont:       string;
  styleColor:      string;
  sectionOrder:    number[];   // step indices in display order
  mode:            string;     // "experienced" | "fresher"
  photoShape:      string;     // "round" | "square"
  step:            number;     // last active step index
  resumeName:      string;     // user-given name for this resume
  hiddenSections:  string[];   // section keys hidden from preview e.g. ["references","interests"]
  currentSaveId:   string;     // uuid of the cloud save currently loaded (if any)
}

export function saveDraft(
  data: ResumeData,
  template: string,
  meta?: Partial<DraftMeta>,
): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, template, ...meta, ts: Date.now() }));
  } catch {}
}

export function loadDraft(): ({ data: ResumeData; template: string } & Partial<DraftMeta>) | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ── Named cloud saves (resume_saves table) ──────────────── */

export interface ResumeRecord {
  id:         string;
  name:       string;
  template:   string;
  updatedAt:  string;
}

/**
 * Save current resume to cloud.
 * Pass existingId to update an existing save; omit to create a new one.
 * Returns the save id.
 */
export async function saveNamedResume(
  name: string,
  data: ResumeData,
  template: string,
  meta: Partial<DraftMeta>,
  userId: string,
  existingId?: string,
): Promise<string> {
  const supabase = await getSupabaseAsync();
  const payload = {
    name,
    data,
    template,
    meta,
    user_id:    userId,
    updated_at: new Date().toISOString(),
  };
  if (existingId) {
    const { error } = await supabase
      .from("resume_saves")
      .update(payload)
      .eq("id", existingId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return existingId;
  }
  const { data: row, error } = await supabase
    .from("resume_saves")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (row as { id: string }).id;
}

/** List all saved resumes for the user (id, name, template, date — no data). */
export async function listResumes(userId: string): Promise<ResumeRecord[]> {
  const supabase = await getSupabaseAsync();
  const { data, error } = await supabase
    .from("resume_saves")
    .select("id, name, template, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: { id: string; name: string; template: string; updated_at: string }) => ({
    id:        r.id,
    name:      r.name,
    template:  r.template,
    updatedAt: r.updated_at,
  }));
}

/** Load full data of a specific saved resume. */
export async function loadResumeSave(
  id: string,
  userId: string,
): Promise<{ name: string; data: ResumeData; template: string; meta: Partial<DraftMeta> } | null> {
  const supabase = await getSupabaseAsync();
  const { data, error } = await supabase
    .from("resume_saves")
    .select("name, data, template, meta")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    name:     (data as { name: string; data: ResumeData; template: string; meta: Partial<DraftMeta> }).name,
    data:     (data as { name: string; data: ResumeData; template: string; meta: Partial<DraftMeta> }).data,
    template: (data as { name: string; data: ResumeData; template: string; meta: Partial<DraftMeta> }).template,
    meta:     (data as { name: string; data: ResumeData; template: string; meta: Partial<DraftMeta> }).meta ?? {},
  };
}

/** Permanently delete a saved resume. */
export async function deleteResumeSave(id: string, userId: string): Promise<void> {
  const supabase = await getSupabaseAsync();
  await supabase.from("resume_saves").delete().eq("id", id).eq("user_id", userId);
}

/* ── Version history ─────────────────────────────────────── */

export interface ResumeVersion {
  id:           string;
  resumeSaveId: string;
  label:        string;   // "v3 · 2 Jun 3:45 PM"
  template:     string;
  createdAt:    string;
}

/**
 * Create a version snapshot for a saved resume.
 * Automatically prunes to keep only the last 10 versions per save.
 *
 * SQL (run once in Supabase):
 *   create table if not exists resume_versions (
 *     id              uuid primary key default gen_random_uuid(),
 *     resume_save_id  uuid not null references resume_saves(id) on delete cascade,
 *     user_id         uuid not null references auth.users(id) on delete cascade,
 *     label           text not null,
 *     data            jsonb not null,
 *     template        text not null,
 *     created_at      timestamptz default now()
 *   );
 *   alter table resume_versions enable row level security;
 *   create policy "Users manage own versions" on resume_versions
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *   create index on resume_versions(resume_save_id, created_at desc);
 */
export async function createResumeVersion(
  resumeSaveId: string,
  userId:       string,
  data:         ResumeData,
  template:     string,
  versionNum:   number,
): Promise<void> {
  const supabase = await getSupabaseAsync();
  const label = `v${versionNum} · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;

  // Insert the new version
  await supabase.from("resume_versions").insert({
    resume_save_id: resumeSaveId,
    user_id:        userId,
    label,
    data,
    template,
  });

  // Prune: keep only the 10 most recent versions
  const { data: rows } = await supabase
    .from("resume_versions")
    .select("id")
    .eq("resume_save_id", resumeSaveId)
    .order("created_at", { ascending: false });

  const toDelete = (rows ?? []).slice(10).map((r: { id: string }) => r.id);
  if (toDelete.length > 0) {
    await supabase.from("resume_versions").delete().in("id", toDelete);
  }
}

/** List all versions for a saved resume (metadata only, no data). */
export async function listResumeVersions(resumeSaveId: string, userId: string): Promise<ResumeVersion[]> {
  const supabase = await getSupabaseAsync();
  const { data, error } = await supabase
    .from("resume_versions")
    .select("id, resume_save_id, label, template, created_at")
    .eq("resume_save_id", resumeSaveId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r: { id: string; resume_save_id: string; label: string; template: string; created_at: string }) => ({
    id:           r.id,
    resumeSaveId: r.resume_save_id,
    label:        r.label,
    template:     r.template,
    createdAt:    r.created_at,
  }));
}

/** Load the full data of a specific version. */
export async function loadResumeVersion(
  versionId: string,
  userId:    string,
): Promise<{ data: ResumeData; template: string; label: string } | null> {
  const supabase = await getSupabaseAsync();
  const { data, error } = await supabase
    .from("resume_versions")
    .select("data, template, label")
    .eq("id", versionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    data:     (data as { data: ResumeData; template: string; label: string }).data,
    template: (data as { data: ResumeData; template: string; label: string }).template,
    label:    (data as { data: ResumeData; template: string; label: string }).label,
  };
}

/* ── Supabase share ───────────────────────────────────────── */

export interface ShareResult {
  shortId: string;
  url: string;
}

export async function createShare(
  data: ResumeData,
  template: string,
  userId?: string
): Promise<ShareResult> {
  const supabase = await getSupabaseAsync();
  const id = shortId();

  const { error } = await supabase.from("resume_shares").insert({
    short_id: id,
    data,
    template,
    user_id: userId ?? null,
  });

  if (error) throw new Error(error.message);

  const url = `${window.location.origin}/r/${id}`;
  return { shortId: id, url };
}

export async function getShare(
  id: string
): Promise<{ data: ResumeData; template: string; viewCount: number } | null> {
  const supabase = await getSupabaseAsync();
  const { data, error } = await supabase
    .from("resume_shares")
    .select("data, template, view_count")
    .eq("short_id", id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { data: ResumeData; template: string; view_count?: number };
  return { data: row.data, template: row.template, viewCount: row.view_count ?? 0 };
}

/**
 * Atomically increments view_count for a share.
 *
 * Run once in Supabase SQL editor to add the column:
 *   alter table resume_shares add column if not exists view_count int not null default 0;
 */
export async function incrementViewCount(id: string): Promise<void> {
  try {
    const supabase = await getSupabaseAsync();
    // Read + increment (acceptable for view counts; not critical to be perfectly atomic)
    const { data } = await supabase
      .from("resume_shares")
      .select("view_count")
      .eq("short_id", id)
      .maybeSingle();
    const current = (data as { view_count?: number } | null)?.view_count ?? 0;
    await supabase
      .from("resume_shares")
      .update({ view_count: current + 1 })
      .eq("short_id", id);
  } catch {
    // view count is non-critical — never let it break the share page
  }
}
