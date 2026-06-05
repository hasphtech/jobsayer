import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Know Your Worth — Salary Growth Intelligence India",
  description: "Negotiate from data, not hope. IT services vs product company salary gaps, job-switch hike calculator, and 2026 salary benchmarks for 30+ Indian tech roles.",
  keywords: ["salary negotiation India", "career salary growth India", "IT services vs product salary India", "tech salary India 2026", "salary hike calculator India", "know your worth India"],
  openGraph: {
    title: "Know Your Worth — jobSayer Career Growth",
    description: "Services vs product salary gaps, hike calculator, and negotiation benchmarks for Indian tech.",
    url: "https://jobsayer.com/salary",
  },
  alternates: { canonical: "https://jobsayer.com/salary" },
};

export default function SalaryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
