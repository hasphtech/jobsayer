import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post Jobs & Hire Smarter — Recruiter Portal",
  description: "Post jobs on jobSayer and get AI-matched, BGV-verified candidates. No ghost-job allowances. Founding employer pricing available for Bangalore tech companies.",
  keywords: ["post jobs India", "hire software engineers India", "recruiter portal India", "employer job posting India", "hire developers Bangalore"],
  openGraph: {
    title: "Hire Smarter — jobSayer Recruiter Portal",
    description: "Post jobs, get AI-matched candidates, skip the ghosting. Verified employers only.",
    url: "https://jobsayer.com/recruit",
  },
  alternates: { canonical: "https://jobsayer.com/recruit" },
};

export default function RecruitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
