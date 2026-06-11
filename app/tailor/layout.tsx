import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Resume JD Tailor — Match Any Job Description | jobSayer",
  description: "Paste a job description and AI rewrites your resume bullets to match its keywords and requirements. Before/after diff view, keyword highlights, one-click copy.",
  keywords: ["resume tailoring", "resume JD match", "tailor resume to job description", "ATS keyword optimizer", "resume keyword match", "job description resume fit"],
  openGraph: {
    title: "AI Resume JD Tailor — jobSayer",
    description: "Paste any JD → AI rewrites your bullets to match. See keyword gaps, before/after diff, copy in one click.",
    url: "https://jobsayer.com/tailor",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "AI Resume JD Tailor — jobSayer",
    description: "Paste any job description → AI rewrites your resume bullets to match. Before/after diff, keyword gaps.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/tailor" },
};

export default function TailorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "AI Resume JD Tailor", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "AI tool that rewrites resume bullets to match any job description with keyword gap analysis and before/after diff.", "url": "https://jobsayer.com/tailor"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "How does the resume tailoring tool work?", "acceptedAnswer": {"@type": "Answer", "text": "Paste a job description and jobSayer's AI identifies the top keywords, compares them against your resume, then rewrites your bullet points to naturally incorporate the missing terms \u2014 without fabricating experience."}}, {"@type": "Question", "name": "Will it change my actual resume?", "acceptedAnswer": {"@type": "Answer", "text": "The tailor shows a before/after diff that you review and approve. Nothing is saved to your resume until you explicitly apply the changes."}}, {"@type": "Question", "name": "How many tailors can I do per month?", "acceptedAnswer": {"@type": "Answer", "text": "Free users get 3 tailors per month. Pro users get unlimited tailoring across all their saved resumes."}}]}) }} />
      {children}
    </>
  );
}
