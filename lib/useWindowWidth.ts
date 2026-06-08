"use client";
import { useState, useEffect } from "react";

/** Returns current window width, updates on resize. SSR-safe (defaults to 1200). */
export function useWindowWidth(): number {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}
