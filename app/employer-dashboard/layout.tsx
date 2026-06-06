import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Dashboard | jobSayer",
  description: "Hire faster with BGV-cleared, verified candidates. Manage pipeline, BGV, team career tools, and bot integrations in one place.",
  robots: { index: false, follow: false },
};

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
