"use client";
/**
 * Root page — redirect to /builder
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/builder"); }, [router]);
  return null;
}
