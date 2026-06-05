import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume ATS Score — Know Your Market Value | jobSayer",
  description: "Understand your real market value. See how Workday, Taleo, Greenhouse and Lever rank your resume, fix keyword gaps, and maximise your chances with every application.",
  keywords: ["ATS score checker", "resume market value", "resume keyword analysis", "Workday ATS resume", "Greenhouse resume score", "resume compatibility checker"],
  openGraph: {
    title: "Resume ATS Score — jobSayer",
    description: "Know your market value. Per-ATS score, keyword gaps, parser compatibility — with specific fixes.",
    url: "https://jobsayer.com/score",
  },
  alternates: { canonical: "https://jobsayer.com/score" },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
