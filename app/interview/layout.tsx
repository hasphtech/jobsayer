import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Interview Prep — Master Every Interview | jobSayer",
  description: "Close your skill gaps through targeted interview practice. AI analyses your profile, identifies what you're missing, and drills you on exactly those gaps — not random questions.",
  keywords: ["AI interview prep", "mock interview online", "skill gap interview practice", "behavioral interview practice", "technical interview preparation", "career interview coaching"],
  openGraph: {
    title: "Master Every Interview — jobSayer",
    description: "Skill-gap targeted interview practice. AI identifies what you're missing and drills you on exactly that.",
    url: "https://jobsayer.com/interview",
  },
  alternates: { canonical: "https://jobsayer.com/interview" },
};

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
