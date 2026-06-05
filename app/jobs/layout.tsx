import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Roles You're Built For — Global Job Board | jobSayer",
  description: "Discover verified roles matched to your career profile worldwide. Ghost-job detection, JD trust scores, and one-click apply with your AI-built resume.",
  keywords: ["career matched jobs", "tech jobs worldwide", "software engineer jobs", "product manager jobs", "verified job listings", "remote jobs", "global tech careers"],
  openGraph: {
    title: "Find Roles You're Built For — jobSayer",
    description: "Career-matched job listings globally. Ghost-job detection, JD trust scores, apply with your AI-built resume.",
    url: "https://jobsayer.com/jobs",
  },
  alternates: { canonical: "https://jobsayer.com/jobs" },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
