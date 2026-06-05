import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Cover Letter Builder — Tell Your Career Story | jobSayer",
  description: "Generate tailored cover letters in 30 seconds. Role-specific, company-aware, tone-matched — linked directly to your saved resume. Free to try.",
  keywords: ["AI cover letter generator", "cover letter builder free", "professional cover letter", "cover letter for job application", "tailored cover letter AI"],
  openGraph: {
    title: "AI Cover Letter Builder — jobSayer",
    description: "Tell your career story in 30 seconds. AI-powered, role-specific, tone-matched cover letters.",
    url: "https://jobsayer.com/cover-letter",
  },
  alternates: { canonical: "https://jobsayer.com/cover-letter" },
};

export default function CoverLetterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
