import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Trust Ratings — Know Before You Apply | jobSayer",
  description: "See which companies ghost candidates, respond fast, and run fair interviews. Candidate-reported employer accountability — globally, before you apply.",
  keywords: ["employer trust", "company ghost rate", "hiring transparency", "interview fairness", "employer ratings"],
  openGraph: {
    title: "Employer Trust Ratings — jobSayer",
    description: "Ghost rates, response SLAs, interview fairness scores. Know what hiring is really like before you apply.",
    url: "https://jobsayer.com/employer-trust",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Employer Trust Ratings — Know Before You Apply | jobSayer",
    description: "Ghost rates, interview fairness, response SLAs — candidate-reported employer accountability globally.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/employer-trust" },
};

export default function EmployerTrustLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Employer Trust Ratings", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "Candidate-reported employer accountability ratings covering ghosting rates, interview fairness, and hiring transparency.", "url": "https://jobsayer.com/employer-trust"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What is an employer trust rating?", "acceptedAnswer": {"@type": "Answer", "text": "An employer trust rating is a candidate-reported score that measures three things: how often a company ghosts applicants, how long it takes to respond at each hiring stage, and how fairly it runs interviews (no bait-and-switch roles, accurate JDs)."}}, {"@type": "Question", "name": "How is the data collected?", "acceptedAnswer": {"@type": "Answer", "text": "Ratings are submitted by professionals who have applied to or interviewed with the company. Each submission is anonymised and verified to prevent manipulation."}}, {"@type": "Question", "name": "Can companies dispute their ratings?", "acceptedAnswer": {"@type": "Answer", "text": "Companies can submit a response to ratings and flag submissions that violate our guidelines. Verified employer accounts can add context to their profile, but raw rating data cannot be edited by employers."}}]}) }} />
      {children}
    </>
  );
}
