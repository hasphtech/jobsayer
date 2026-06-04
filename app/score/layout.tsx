import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ATS Score Checker",
  description: "Check your resume's ATS score instantly. See how Naukri, Workday, and Taleo rank your resume. Get keyword gap analysis and improvement tips.",
  keywords: ["ATS score checker", "resume ATS score India", "resume score", "ATS resume checker", "JD matching resume"],
  openGraph: {
    title: "ATS Score Checker — jobSayer",
    description: "Instantly score your resume against any job description. See keyword gaps and get tips.",
    url: "https://jobsayer.com/score",
  },
  alternates: { canonical: "https://jobsayer.com/score" },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
