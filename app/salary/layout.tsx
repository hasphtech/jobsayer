import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Salary Intelligence — Know Your Worth | jobSayer",
  description: "Real salary data across North America, Europe, Asia Pacific and the Middle East. Multi-currency benchmarks, underpaid detector, and AI negotiation coach with word-for-word scripts.",
  keywords: ["global salary data", "salary negotiation coach", "tech salary benchmark", "am I underpaid", "salary by country", "software engineer salary", "negotiation scripts", "salary intelligence"],
  openGraph: {
    title: "Global Salary Intelligence — jobSayer",
    description: "Benchmark your salary globally, find out if you're underpaid, and negotiate with data-backed scripts.",
    url: "https://jobsayer.com/salary",
  },
  alternates: { canonical: "https://jobsayer.com/salary" },
};

export default function SalaryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
