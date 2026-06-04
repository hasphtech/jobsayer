import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career GPS — AI Career Path Advisor",
  description: "Get a personalised career roadmap powered by AI. See skill gaps vs your target role, recommended learning paths, and estimated timelines. Built for the Indian job market.",
  keywords: ["career path India", "career guidance AI", "skill gap analysis India", "career roadmap software engineer", "career GPS India"],
  openGraph: {
    title: "Career GPS — jobSayer",
    description: "Personalised AI career roadmap. See your skill gaps and the fastest path to your target role.",
    url: "https://jobsayer.com/career-gps",
  },
  alternates: { canonical: "https://jobsayer.com/career-gps" },
};

export default function CareerGpsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
