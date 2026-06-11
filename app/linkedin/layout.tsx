import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LinkedIn Profile Optimizer — Score & Rewrite | jobSayer",
  description: "Score your LinkedIn headline, about section and skills against a target role. Get AI-rewritten copy ready to paste. Identify missing keywords recruiters search for.",
  keywords: ["LinkedIn profile optimizer", "LinkedIn headline rewrite", "LinkedIn about section", "LinkedIn keywords", "LinkedIn profile score", "optimize LinkedIn for jobs"],
  openGraph: {
    title: "LinkedIn Profile Optimizer — jobSayer",
    description: "Score your LinkedIn profile against your target role. AI rewrites your headline, about, and skills. Drop-in copy ready to paste.",
    url: "https://jobsayer.com/linkedin",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "LinkedIn Profile Optimizer — jobSayer",
    description: "Score your LinkedIn against your target role. AI rewrites headline, about & skills. Drop-in copy.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/linkedin" },
};

export default function LinkedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "LinkedIn Profile Optimizer", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "AI tool that scores and rewrites your LinkedIn headline, about section, and skills for your target role.", "url": "https://jobsayer.com/linkedin"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What parts of my LinkedIn profile does it optimise?", "acceptedAnswer": {"@type": "Answer", "text": "jobSayer scores and rewrites your headline, about/summary section, and skills list \u2014 the three sections recruiters and LinkedIn's algorithm weight most heavily."}}, {"@type": "Question", "name": "How do I use the rewritten copy?", "acceptedAnswer": {"@type": "Answer", "text": "The optimizer generates drop-in ready text for each section. Copy it directly into your LinkedIn profile. No reformatting needed."}}, {"@type": "Question", "name": "Will optimising my LinkedIn help me get more recruiter messages?", "acceptedAnswer": {"@type": "Answer", "text": "Yes \u2014 profiles with keyword-rich headlines and about sections appear in more recruiter searches. Users typically see a 40-60% increase in profile views within 2 weeks of optimising."}}]}) }} />
      {children}
    </>
  );
}
