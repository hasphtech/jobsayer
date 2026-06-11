import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Roles You're Built For — Global Job Board | jobSayer",
  description: "Discover verified roles matched to your career profile worldwide. Ghost-job detection, JD trust scores, and one-click apply with your AI-built resume.",
  keywords: ["career matched jobs", "tech jobs worldwide", "software engineer jobs", "product manager jobs", "verified job listings", "remote jobs", "global tech careers"],
  openGraph: {
    title: "Find Roles You're Built For — jobSayer",
    description: "Career-matched job listings globally. Ghost-job detection, JD trust scores, apply with your AI-built resume.",
    url: "https://jobsayer.com/jobs",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Find Roles You're Built For — jobSayer",
    description: "Career-matched job listings globally. Ghost-job detection, JD trust scores, one-click apply with AI resume.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/jobs" },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "jobSayer Job Board", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "Global career-matched job board with ghost-job detection, JD trust scores, and one-click apply.", "url": "https://jobsayer.com/jobs"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What makes jobSayer jobs different from other job boards?", "acceptedAnswer": {"@type": "Answer", "text": "jobSayer calculates a match score between each listing and your career profile, flags ghost jobs, shows employer trust ratings (ghosting rate, interview fairness), and lets you apply with your AI-built resume in one click."}}, {"@type": "Question", "name": "What is a JD trust score?", "acceptedAnswer": {"@type": "Answer", "text": "A JD (Job Description) trust score rates how genuine and transparent a job posting is \u2014 based on specificity of requirements, salary disclosure, interviewer information, and employer ghost rate."}}, {"@type": "Question", "name": "Are the jobs verified?", "acceptedAnswer": {"@type": "Answer", "text": "jobSayer aggregates listings from verified sources and applies a freshness filter to remove roles closed more than 30 days ago. Ghost-job detection runs on every listing weekly."}}]}) }} />
      {children}
    </>
  );
}
