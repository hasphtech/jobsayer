"use client";
import { useState, useEffect, useCallback } from "react";

export type AppRole = "candidate" | "recruiter";
const ROLE_KEY = "jobsayer-role";

export function useRole() {
  const [role, setRoleState] = useState<AppRole>("candidate");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROLE_KEY) as AppRole | null;
      if (saved === "recruiter" || saved === "candidate") setRoleState(saved);
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const setRole = useCallback((r: AppRole) => {
    setRoleState(r);
    try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ }
  }, []);

  return {
    role: mounted ? role : ("candidate" as AppRole),
    setRole,
    mounted,
  };
}
