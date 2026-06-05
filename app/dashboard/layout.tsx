import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Dashboard — Your Progress | jobSayer",
  description: "Track your career XP, resume score history, weekly goals, interview practice streaks, and badges. Your career command center.",
  openGraph: {
    title: "Career Dashboard — jobSayer",
    description: "Career XP, goals, badges, and your complete progress — all in one view.",
    url: "https://jobsayer.com/dashboard",
  },
  alternates: { canonical: "https://jobsayer.com/dashboard" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
