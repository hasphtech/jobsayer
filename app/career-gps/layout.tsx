import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career GPS — Navigate Your Path to Growth",
  description: "Know exactly where your career is going. AI maps your skill gaps vs your target role, builds a prioritised learning plan, and shows the fastest route to your next level.",
  keywords: ["career path India", "career growth roadmap India", "skill gap analysis India", "career navigation India", "IT services to product career India"],
  openGraph: {
    title: "Career GPS — jobSayer Career Growth",
    description: "Navigate your career path with AI. Skill gaps, learning plan, and salary projection for your target role.",
    url: "https://jobsayer.com/career-gps",
  },
  alternates: { canonical: "https://jobsayer.com/career-gps" },
};

export default function CareerGpsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
