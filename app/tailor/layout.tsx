import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Resume JD Tailor — Match Any Job Description | jobSayer",
  description: "Paste a job description and AI rewrites your resume bullets to match its keywords and requirements. Before/after diff view, keyword highlights, one-click copy.",
  keywords: ["resume tailoring", "resume JD match", "tailor resume to job description", "ATS keyword optimizer", "resume keyword match", "job description resume fit"],
  openGraph: {
    title: "AI Resume JD Tailor — jobSayer",
    description: "Paste any JD → AI rewrites your bullets to match. See keyword gaps, before/after diff, copy in one click.",
    url: "https://jobsayer.com/tailor",
  },
  alternates: { canonical: "https://jobsayer.com/tailor" },
};

export default function TailorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
