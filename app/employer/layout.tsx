import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Portal — API Access | jobSayer",
  description: "Search and hire pre-verified candidates via API. Skills-based matching, consent-first data access, ATS-compatible REST API.",
  openGraph: {
    title: "Employer Portal — jobSayer",
    description: "Access jobSayer's opt-in candidate pool via API. Skills search, profile data, webhook events.",
    url: "https://jobsayer.com/employer",
  },
  alternates: { canonical: "https://jobsayer.com/employer" },
};

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
