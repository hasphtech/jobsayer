import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hire Growth-Minded Professionals — Employer Portal | jobSayer",
  description: "Access jobSayer's opt-in candidate pool via API or portal. Skills-matched, BGV-verified professionals actively growing their careers. No ghost jobs. Global reach.",
  keywords: ["hire software engineers", "tech recruiting platform", "employer candidate search", "skills-based hiring", "verified candidate pool", "global talent search API"],
  openGraph: {
    title: "Hire Growth-Minded Talent — jobSayer",
    description: "Skills-matched, BGV-verified candidates globally. API access, opt-in consent, ghost-job free.",
    url: "https://jobsayer.com/recruit",
  },
  alternates: { canonical: "https://jobsayer.com/recruit" },
};

export default function RecruitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
