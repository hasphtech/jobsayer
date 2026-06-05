import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hire Growth-Minded Professionals — Recruiter Portal",
  description: "Connect with career-focused professionals on jobSayer. AI-matched, BGV-verified candidates who are actively growing their skills. No ghost jobs allowed.",
  keywords: ["hire growth professionals India", "recruit software engineers India", "career-focused candidates India", "employer portal India", "hire developers Bangalore"],
  openGraph: {
    title: "Hire Growth-Minded Talent — jobSayer",
    description: "Reach career-focused professionals. AI-matched, BGV-verified, ghost-job free.",
    url: "https://jobsayer.com/recruit",
  },
  alternates: { canonical: "https://jobsayer.com/recruit" },
};

export default function RecruitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
