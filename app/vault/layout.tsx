import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Vault — Secure Document Storage",
  description: "Store, organise, and share your career documents — offer letters, salary slips, experience letters, certificates. One-click BGV pack. Verified by jobSayer.",
  alternates: { canonical: "https://jobsayer.com/vault" },
  robots: { index: false, follow: false }, // Auth-gated
};

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
