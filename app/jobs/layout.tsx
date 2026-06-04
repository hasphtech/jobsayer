import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Job Search India — Tech, Product & Finance Jobs",
  description: "Search verified tech and non-tech jobs in India. Ghost-job detection, JD trust scores, and one-click apply with your AI-built resume. Updated daily.",
  keywords: ["jobs in India", "tech jobs India", "software jobs Bangalore", "product manager jobs India", "verified job listings India"],
  openGraph: {
    title: "Job Search India — jobSayer",
    description: "Verified job listings with ghost-job detection. Search, match, and apply with your AI resume.",
    url: "https://jobsayer.com/jobs",
  },
  alternates: { canonical: "https://jobsayer.com/jobs" },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
