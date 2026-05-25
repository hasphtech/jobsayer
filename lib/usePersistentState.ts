"use client";
/**
 * usePersistentState — drop-in useState replacement that syncs to localStorage.
 *
 * Why this exists:
 *   Calculator inputs (sliders, text fields, tab selection) reset on page
 *   refresh or when navigating away and back. This hook persists them so the
 *   user's in-progress work survives refreshes, tab changes, and menu navigation.
 *
 * Key design choices:
 *   - SSR-safe: reads from localStorage only after mount, so server render
 *     matches the client render on first paint (no hydration mismatch).
 *   - Sync write: persists on every setState so the next page load sees the
 *     latest value. Simple and reliable — no debounce needed because the writes
 *     are tiny JSON payloads.
 *   - Namespaced keys: caller passes "emi24:tool:<id>" style keys so the
 *     localStorage namespace stays tidy and we can wipe per-tool state cleanly.
 *   - Versioned keys: caller includes a "-v1" suffix so we can invalidate old
 *     shapes by bumping the version (e.g. when adding a new field).
 *   - Cross-tab sync via `storage` event, so editing on one tab keeps the
 *     other tabs in sync when the user returns to them.
 *
 * Usage:
 *   const [principal, setPrincipal] = usePersistentState("emi24:emi:principal:v1", 2500000);
 *   const [tab, setTab]             = usePersistentState<TabId>("emi24:home:tab:v1", "emi");
 */
import { useCallback, useEffect, useState } from "react";

type SetStateAction<T> = T | ((prev: T) => T);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceededError or storage-disabled (private browsing) — ignore.
  }
}

export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (next: SetStateAction<T>) => void] {
  // Start with the caller's initial value so SSR and first client render agree.
  // The real persisted value is swapped in via an effect right after mount.
  const [value, setValue] = useState<T>(initial);

  // ── Hydrate from localStorage on mount ─────────────────────────
  useEffect(() => {
    const stored = read<T>(key, initial);
    setValue(stored);
    // We intentionally only hydrate once on mount; don't re-hydrate when
    // `initial` or `key` change (callers should treat the key as stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: There is intentionally NO "persist on value change" useEffect here.
  // That pattern is unsafe: on mount, effects run in declaration order, so a
  // persist effect fires with value=initial BEFORE React applies the hydration
  // state update, clobbering stored data. In React Strict Mode (Next.js dev)
  // this happens on every mount of the second pass.
  // The `set` callback below writes synchronously on every user-triggered
  // change, which is both safer and sufficient. Hydration and cross-tab
  // syncs are reads FROM localStorage and must never be written back.

  // ── Cross-tab sync: pick up changes made in other tabs ─────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const set = useCallback(
    (next: SetStateAction<T>) => {
      setValue(prev => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        // Write synchronously so a reload immediately after a set sees it.
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}

/** Clear a single namespaced key. Handy for "Reset" buttons. */
export function clearPersistentState(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

/** Clear every key under a prefix — e.g. clearPersistentPrefix("emi24:emi:"). */
export function clearPersistentPrefix(prefix: string): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach(k => window.localStorage.removeItem(k));
  } catch {}
}
