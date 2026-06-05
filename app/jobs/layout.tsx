import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Roles You're Built For — India",
  description: "Discover verified tech and product roles matched to your career profile. Ghost-job detection, JD trust scores, and one-click apply with your career resume.",
  keywords: ["career matched jobs India", "tech jobs India", "software jobs Bangalore", "product manager jobs India", "verified job listings India"],
  openGraph: {
    title: "Find Roles You're Built For — jobSayer",
    description: "Career-matched job listings with ghost-job detection. Apply with your AI-built resume.",
    url: "https://jobsayer.com/jobs",
  },
  alternates: { canonical: "https://jobsayer.com/jobs" },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
