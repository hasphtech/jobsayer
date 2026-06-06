import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Upgrade — Starter & Pro Plans | jobSayer",
  description: "Unlock the full jobSayer platform. Starter from $9/month: unlimited resumes, AI writing, DOCX export, JD tailoring. Pro from $19/month: everything plus salary intelligence, interview coach, and career health tracking.",
  keywords: [
    "jobSayer pricing", "resume builder pricing", "career platform plans",
    "AI resume builder cost", "upgrade jobSayer", "pro career tools",
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://jobsayer.com/upgrade" },
  openGraph: {
    type: "website",
    siteName: "jobSayer",
    title: "Upgrade Your Career — jobSayer Plans",
    description: "Free, Starter, and Pro plans. Build a better resume, ace interviews, and negotiate your worth — from $9/month.",
    url: "https://jobsayer.com/upgrade",
    images: [{ url: "https://jobsayer.com/og.png", width: 1200, height: 630, alt: "jobSayer Pricing Plans" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "jobSayer Plans — Free, Starter & Pro",
    description: "Resume builder, salary intelligence, interview prep and more. Start free, upgrade when ready.",
    images: ["https://jobsayer.com/og.png"],
  },
};

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "jobSayer Pricing Plans",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "ATS scoring, JD matching, shareable resume link. No credit card required.",
        url: "https://jobsayer.com/upgrade",
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "Offer",
        name: "Starter",
        price: "9",
        priceCurrency: "USD",
        description: "Unlimited resumes, AI writing, DOCX export, JD tailoring, cover letter builder.",
        url: "https://jobsayer.com/upgrade",
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "Offer",
        name: "Pro",
        price: "19",
        priceCurrency: "USD",
        description: "Everything in Starter plus salary intelligence, interview coach, career health score, and priority support.",
        url: "https://jobsayer.com/upgrade",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "jobSayer", item: "https://jobsayer.com" },
    { "@type": "ListItem", position: 2, name: "Pricing", item: "https://jobsayer.com/upgrade" },
  ],
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="upgrade-jsonld-pricing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
        strategy="beforeInteractive"
      />
      <Script
        id="upgrade-jsonld-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
