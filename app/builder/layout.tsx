import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Builder — Craft Your Career Story",
  description: "Build a career-defining resume with AI. 20+ ATS-ready templates, skill-matched content, PDF & DOCX export. Part of India's career growth platform.",
  keywords: ["resume builder India", "AI resume builder", "career story resume", "ATS resume India", "CV maker India", "professional resume templates"],
  openGraph: {
    title: "Resume Builder — jobSayer Career Growth",
    description: "Craft your career story with AI. ATS-ready, 20+ templates, PDF & DOCX export.",
    url: "https://jobsayer.com/builder",
  },
  alternates: { canonical: "https://jobsayer.com/builder" },
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
