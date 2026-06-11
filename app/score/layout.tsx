import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume ATS Score — Know Your Market Value | jobSayer",
  description: "Understand your real market value. See how Workday, Taleo, Greenhouse and Lever rank your resume, fix keyword gaps, and maximise your chances with every application.",
  keywords: ["ATS score checker", "resume market value", "resume keyword analysis", "Workday ATS resume", "Greenhouse resume score", "resume compatibility checker"],
  openGraph: {
    title: "Resume ATS Score — jobSayer",
    description: "Know your market value. Per-ATS score, keyword gaps, parser compatibility — with specific fixes.",
    url: "https://jobsayer.com/score",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Resume ATS Score — jobSayer",
    description: "Real ATS scores for Workday, Taleo, Greenhouse & Lever. Keyword gaps, parser issues, and specific fixes.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/score" },
};

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Resume ATS Scorer", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "Score your resume against major ATS platforms and fix keyword gaps to increase your interview chances.", "url": "https://jobsayer.com/score"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What is an ATS score?", "acceptedAnswer": {"@type": "Answer", "text": "An ATS (Applicant Tracking System) score measures how well your resume is parsed and ranked by hiring software like Workday, Taleo, Greenhouse, and Lever. A higher score means more recruiters see your resume."}}, {"@type": "Question", "name": "How do I improve my ATS score?", "acceptedAnswer": {"@type": "Answer", "text": "Add role-specific keywords, use standard section headings, avoid tables and graphics in your resume, and use the exact phrases from the job description you're applying to."}}, {"@type": "Question", "name": "Is the ATS score checker free?", "acceptedAnswer": {"@type": "Answer", "text": "Yes \u2014 jobSayer offers a free ATS score check at /score/free with no sign-up required. Full per-platform breakdowns and fix suggestions require a free account."}}]}) }} />
      {children}
    </>
  );
}
