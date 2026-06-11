import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Health Score — Monthly Career Checkup | jobSayer",
  description: "Track your career fitness with a monthly checkup. Skill freshness, resume recency, market visibility, and actionable recommendations — not just when you're job hunting.",
  keywords: ["career health score", "career checkup", "skill decay", "career growth tracker", "career fitness"],
  openGraph: {
    title: "Career Health Score — jobSayer",
    description: "Monthly career checkup: skill freshness, market position, profile strength, and salary drift alerts.",
    url: "https://jobsayer.com/career-health",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Career Health Score — Monthly Career Checkup | jobSayer",
    description: "Monthly career fitness checkup: skill freshness, market visibility, salary drift, and action items.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/career-health" },
};

export default function CareerHealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Career Health Score", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "Monthly career checkup that tracks skill freshness, market position, and profile strength over time.", "url": "https://jobsayer.com/career-health"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What is the Career Health Score?", "acceptedAnswer": {"@type": "Answer", "text": "The Career Health Score is a monthly checkup that measures four dimensions of your professional fitness: skill freshness (are your skills still in demand?), market visibility (can recruiters find you?), resume recency, and salary position relative to market."}}, {"@type": "Question", "name": "How often is it updated?", "acceptedAnswer": {"@type": "Answer", "text": "Your score is recalculated monthly. You'll get an email digest each month with your score change and priority actions."}}, {"@type": "Question", "name": "Do I need to be job hunting to use this?", "acceptedAnswer": {"@type": "Answer", "text": "No \u2014 Career Health is designed for continuous career management, not just job-search mode. It's most useful when you're employed and want to stay market-ready."}}]}) }} />
      {children}
    </>
  );
}
