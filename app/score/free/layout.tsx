import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free ATS Resume Score — Check Your Resume Instantly | jobSayer",
  description:
    "Get your resume ATS score free — no sign-up required. See how Workday, Taleo, Greenhouse and Lever score your resume. Fix keyword gaps in 60 seconds.",
  keywords: [
    "free ATS score", "resume ATS checker free", "ATS resume score no sign up",
    "check resume ATS free", "resume scanner free", "ATS compatibility checker",
    "resume keyword checker free", "Workday ATS score", "Greenhouse resume score",
    "Taleo ATS checker", "free resume analysis", "ATS friendly resume checker",
  ],
  alternates: { canonical: "https://jobsayer.com/score/free" },
  openGraph: {
    title: "Free Resume ATS Score — No Sign-Up | jobSayer",
    description: "Check your resume ATS score free. See per-platform scores for Workday, Taleo, Greenhouse & Lever. Fix gaps in 60 seconds.",
    url: "https://jobsayer.com/score/free",
    images: [{ url: "https://jobsayer.com/og.png", width: 1200, height: 630, alt: "Free ATS Resume Score — jobSayer" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Free ATS Resume Score — No Sign-Up | jobSayer",
    description: "Instant ATS score for Workday, Taleo, Greenhouse & Lever. No sign-up. Fix keyword gaps in 60 seconds.",
    images: ["https://jobsayer.com/og.png"],
  },
};

export default function ScoreFreeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
