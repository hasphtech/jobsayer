import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Cover Letter Builder",
  description: "Generate tailored cover letters in 30 seconds with AI. Role-specific, company-aware, tone-adjustable. Free for Indian job seekers.",
  keywords: ["cover letter builder India", "AI cover letter", "cover letter generator", "job application letter India"],
  openGraph: {
    title: "AI Cover Letter Builder — jobSayer",
    description: "Tailored cover letters in 30 seconds. AI-powered, role-specific, free.",
    url: "https://jobsayer.com/cover-letter",
  },
  alternates: { canonical: "https://jobsayer.com/cover-letter" },
};

export default function CoverLetterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
