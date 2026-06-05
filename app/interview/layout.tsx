import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Interview Prep — Master Every Room",
  description: "Close your skill gaps through targeted interview practice. AI analyses your profile, identifies what you're missing, and drills you on exactly those gaps. Not random questions.",
  keywords: ["career interview prep India", "skill gap interview practice", "AI mock interview India", "Flipkart interview prep", "Razorpay interview questions", "career growth interview"],
  openGraph: {
    title: "Master Every Room — jobSayer Career Growth",
    description: "Skill-gap targeted interview practice. Drill what you're missing, not random questions.",
    url: "https://jobsayer.com/interview",
  },
  alternates: { canonical: "https://jobsayer.com/interview" },
};

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
