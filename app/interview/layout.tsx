import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Interview Prep — Mock Interviews & Question Banks",
  description: "Prepare for tech and product interviews with AI-powered mock interviews. Company-specific questions for Flipkart, Swiggy, Razorpay, and more. STAR method feedback.",
  keywords: ["interview prep India", "mock interview AI", "Flipkart interview questions", "Swiggy interview prep", "product manager interview India", "software engineer interview"],
  openGraph: {
    title: "AI Interview Prep — jobSayer",
    description: "Company-specific mock interviews with AI feedback. Prep for India's top tech companies.",
    url: "https://jobsayer.com/interview",
  },
  alternates: { canonical: "https://jobsayer.com/interview" },
};

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
