"use client";
/**
 * useTheme — site-wide dark/light mode toggle
 * Persists in localStorage under "jobsayer-theme".
 * Light is the default. Dark mode applies "dark" class on document.body.
 */
import { useState, useEffect, useCallback } from "react";

const KEY = "jobsayer-theme";

export function useTheme() {
  const [dark, setDark] = useState(false); // default light

  // Sync from localStorage on mount
  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const isDark = stored === "dark";
    setDark(isDark);
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, []);

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add("dark");
        localStorage.setItem(KEY, "dark");
      } else {
        document.body.classList.remove("dark");
        localStorage.setItem(KEY, "light");
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
