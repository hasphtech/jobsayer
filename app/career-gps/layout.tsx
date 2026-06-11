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
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Career GPS — Navigate Your Path | jobSayer",
    description: "Target a role → see skill gaps → get a personalised learning roadmap with real salary ranges.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/career-gps" },
};

export default function CareerGpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Career GPS", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "AI career path planner that identifies skill gaps and builds a personalised learning roadmap for any target role.", "url": "https://jobsayer.com/career-gps"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What is Career GPS?", "acceptedAnswer": {"@type": "Answer", "text": "Career GPS is an AI-powered tool that takes your current skills and your target role, then maps the exact skill gaps between where you are and where you want to be \u2014 with a personalised learning roadmap to bridge them."}}, {"@type": "Question", "name": "How accurate are the salary ranges?", "acceptedAnswer": {"@type": "Answer", "text": "Salary data is aggregated from job postings, verified professional profiles, and recruiter submissions across 50+ countries. All figures are shown in local currency with PPP context."}}, {"@type": "Question", "name": "Which roles does Career GPS support?", "acceptedAnswer": {"@type": "Answer", "text": "Career GPS covers 200+ roles across Software Engineering, AI/ML, Product Management, Design, Data Science, Cybersecurity, DevOps, and more \u2014 with global market data for each."}}]}) }} />
      {children}
    </>
  );
}
