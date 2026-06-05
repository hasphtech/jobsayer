import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cover Letter Builder — Tell Your Career Story",
  description: "Generate tailored cover letters that tell your career story in 30 seconds. Role-specific, company-aware, linked to your saved resumes.",
  keywords: ["cover letter builder India", "AI cover letter", "career story cover letter", "professional cover letter India"],
  openGraph: {
    title: "Cover Letter Builder — jobSayer Career Growth",
    description: "Tell your career story in 30 seconds. AI-powered, role-specific, linked to your resume.",
    url: "https://jobsayer.com/cover-letter",
  },
  alternates: { canonical: "https://jobsayer.com/cover-letter" },
};

export default function CoverLetterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
