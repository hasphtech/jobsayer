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
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Global Salary Intelligence — jobSayer",
    description: "Know if you're underpaid. Benchmark your salary globally and negotiate with data-backed scripts.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/salary" },
};

export default function SalaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Global Salary Intelligence", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "Real salary benchmarks across 50+ countries with multi-currency support and AI negotiation coaching.", "url": "https://jobsayer.com/salary"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "How does jobSayer know if I'm underpaid?", "acceptedAnswer": {"@type": "Answer", "text": "jobSayer compares your current compensation against verified market data for your exact role, experience level, and location \u2014 then flags you as underpaid if you're in the bottom 30th percentile for your market."}}, {"@type": "Question", "name": "Does the salary tool cover my country?", "acceptedAnswer": {"@type": "Answer", "text": "Yes \u2014 salary data covers 50+ countries across North America, Europe, Asia Pacific, the Middle East, and Latin America. All figures are shown in local currency."}}, {"@type": "Question", "name": "How does the AI negotiation coach work?", "acceptedAnswer": {"@type": "Answer", "text": "Enter your target salary and current offer. The AI generates a complete negotiation script with word-for-word language tailored to your seniority, industry, and location \u2014 including counter-offer responses."}}]}) }} />
      {children}
    </>
  );
}
