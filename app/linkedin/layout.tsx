import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn Profile Optimizer — Score & Rewrite | jobSayer",
  description: "Score your LinkedIn headline, about section and skills against a target role. Get AI-rewritten copy ready to paste. Identify missing keywords recruiters search for.",
  keywords: ["LinkedIn profile optimizer", "LinkedIn headline rewrite", "LinkedIn about section", "LinkedIn keywords", "LinkedIn profile score", "optimize LinkedIn for jobs"],
  openGraph: {
    title: "LinkedIn Profile Optimizer — jobSayer",
    description: "Score your LinkedIn profile against your target role. AI rewrites your headline, about, and skills. Drop-in copy ready to paste.",
    url: "https://jobsayer.com/linkedin",
  },
  alternates: { canonical: "https://jobsayer.com/linkedin" },
};

export default function LinkedInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
