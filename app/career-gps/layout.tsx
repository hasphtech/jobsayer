import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career GPS — Navigate Your Path to Growth | jobSayer",
  description: "Pick your target role, see your exact skill gaps, and get a personalised learning roadmap. Global role blueprints for Engineering, AI, Product, Design and Security — with real salary ranges.",
  keywords: ["career roadmap", "skill gap analysis", "career path planner", "career GPS", "how to become software engineer", "ML engineer roadmap", "product manager skills", "career growth plan"],
  openGraph: {
    title: "Career GPS — Navigate Your Path | jobSayer",
    description: "Target role → skill gaps → personalised learning roadmap. Global salary ranges and top companies.",
    url: "https://jobsayer.com/career-gps",
  },
  alternates: { canonical: "https://jobsayer.com/career-gps" },
};

export default function CareerGpsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
