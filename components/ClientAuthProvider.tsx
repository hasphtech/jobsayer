"use client";
import dynamic from "next/dynamic";
import type React from "react";

// Resume builder is fully accessible to guests — no auth gate.
// Auth context is provided so useResumePlan / useAuth work,
// but users are never forced to sign in to use the builder.
const DynamicAuthProvider = dynamic(
  () => import("@/lib/auth").then((m) => ({ default: m.AuthProvider })),
  { ssr: false, loading: () => null }
);

export default function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <DynamicAuthProvider>
      {children}
    </DynamicAuthProvider>
  );
}
