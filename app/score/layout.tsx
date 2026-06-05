import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Score — Know Your Market Value",
  description: "Understand your real market value. See how Naukri, Workday, and Taleo rank your resume, fix skill gaps, and maximise what you're worth to employers.",
  keywords: ["career score India", "resume market value", "ATS score checker India", "resume keyword gap analysis", "career value India"],
  openGraph: {
    title: "Career Score — jobSayer Career Growth",
    description: "Know your market value. Per-ATS score, keyword gaps, parser compatibility — with specific fixes.",
    url: "https://jobsayer.com/score",
  },
  alternates: { canonical: "https://jobsayer.com/score" },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
