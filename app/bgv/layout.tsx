import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Background Verification — Build Employer Trust | jobSayer",
  description: "Show up credentialed before you even meet employers. Get identity, education, and employment verified globally. Share your BGV badge and skip offer-stage delays.",
  keywords: ["background verification online", "professional credentials verification", "employment verification", "education verification", "BGV badge", "verified professional profile"],
  openGraph: {
    title: "Show Up Credentialed — jobSayer BGV",
    description: "Verified identity, education, and employment history. Share your BGV badge. Skip offer delays.",
    url: "https://jobsayer.com/bgv",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Background Verification — Show Up Credentialed | jobSayer",
    description: "Get verified before interviews. Identity, education, employment BGV badge. Skip offer-stage delays.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/bgv" },
};

export default function BgvLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Background Verification", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "Global background verification service for professionals \u2014 identity, education, and employment verification with a shareable BGV badge.", "url": "https://jobsayer.com/bgv"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What does background verification cover?", "acceptedAnswer": {"@type": "Answer", "text": "jobSayer BGV covers identity verification (government ID), education credentials (degrees, institutions), and employment history (company, role, dates). All checks are conducted globally."}}, {"@type": "Question", "name": "How long does verification take?", "acceptedAnswer": {"@type": "Answer", "text": "Identity verification is typically complete within 24 hours. Education and employment verification takes 3-5 business days depending on the institution or employer's response time."}}, {"@type": "Question", "name": "Can I share my BGV badge with employers?", "acceptedAnswer": {"@type": "Answer", "text": "Yes \u2014 once verified, you receive a shareable BGV badge with a unique verification link. Employers can click the link to confirm your credentials instantly, without going through a separate verification agency."}}]}) }} />
      {children}
    </>
  );
}
