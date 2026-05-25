/**
 * Monthly upload usage tracking.
 * Stored in localStorage (keyed by YYYY-MM) for immediate enforcement.
 * Works for both guests and authenticated users.
 */

export type UploadType = "resume" | "photo";

function monthKey(type: UploadType): string {
  const ym = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  return `emi24-resume-${type}-uploads-${ym}`;
}

export function getUploadCount(type: UploadType): number {
  try {
    return parseInt(localStorage.getItem(monthKey(type)) ?? "0", 10);
  } catch {
    return 0;
  }
}

/** Returns true if the user is within their monthly limit. */
export function canUpload(type: UploadType, limit: number): boolean {
  return getUploadCount(type) < limit;
}

/** Call after a successful upload to increment the counter. */
export function recordUpload(type: UploadType): void {
  try {
    const key   = monthKey(type);
    const count = parseInt(localStorage.getItem(key) ?? "0", 10);
    localStorage.setItem(key, String(count + 1));
  } catch {}
}
