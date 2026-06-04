import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salary Insights India — Tech & Product Salaries",
  description: "Real salary data for software engineers, product managers, and designers in India. Compare by role, company, city, and experience level. Know your market worth.",
  keywords: ["software engineer salary India", "product manager salary Bangalore", "tech salary India 2025", "salary comparison India", "IT salary India"],
  openGraph: {
    title: "Salary Insights India — jobSayer",
    description: "Real salary data by role, city, and experience. Know your market worth before your next offer.",
    url: "https://jobsayer.com/salary",
  },
  alternates: { canonical: "https://jobsayer.com/salary" },
};

export default function SalaryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
