import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Resume Builder",
  description: "Build a job-winning resume in minutes with AI. 20+ ATS-friendly templates, PDF & DOCX export, JD matching, and instant ATS score. Free for Indian job seekers.",
  keywords: ["resume builder India", "AI resume builder", "ATS resume", "CV maker India", "resume templates", "free resume builder"],
  openGraph: {
    title: "AI Resume Builder — jobSayer",
    description: "Build ATS-friendly resumes in minutes. AI-powered, 20+ templates, PDF & DOCX export.",
    url: "https://jobsayer.com/builder",
  },
  alternates: { canonical: "https://jobsayer.com/builder" },
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
