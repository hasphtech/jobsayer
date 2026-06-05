import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Health Score — Monthly Career Checkup | jobSayer",
  description: "Track your career fitness with a monthly checkup. Skill freshness, resume recency, market visibility, and actionable recommendations — not just when you're job hunting.",
  keywords: ["career health score", "career checkup", "skill decay", "career growth tracker", "career fitness"],
  openGraph: {
    title: "Career Health Score — jobSayer",
    description: "Monthly career checkup: skill freshness, market position, profile strength, and salary drift alerts.",
    url: "https://jobsayer.com/career-health",
  },
  alternates: { canonical: "https://jobsayer.com/career-health" },
};

export default function CareerHealthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
