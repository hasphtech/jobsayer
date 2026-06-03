"use client";
/**
 * useTheme — site-wide dark/light mode toggle
 * Persists in localStorage under "jobsayer-theme".
 * Applies by toggling the "light" class on document.body.
 */
import { useState, useEffect, useCallback } from "react";

const KEY = "jobsayer-theme";

export function useTheme() {
  const [dark, setDark] = useState(true); // default dark

  // Sync from localStorage on mount
  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const isLight = stored === "light";
    setDark(!isLight);
    if (isLight) {
      document.body.classList.add("light");
    } else {
      document.body.classList.remove("light");
    }
  }, []);

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.remove("light");
        localStorage.setItem(KEY, "dark");
      } else {
        document.body.classList.add("light");
        localStorage.setItem(KEY, "light");
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
