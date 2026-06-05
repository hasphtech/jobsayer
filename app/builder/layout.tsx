import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Free AI Resume Builder — ATS-Friendly Templates | jobSayer",
  description:
    "Build a job-winning resume in minutes with AI. 20+ ATS-friendly templates for Workday, Taleo, Greenhouse & Lever. PDF & DOCX export, real-time ATS score, JD tailoring. Free to start — used by professionals in 50+ countries.",
  keywords: [
    "free AI resume builder",
    "ATS friendly resume builder",
    "resume builder online free",
    "CV maker free",
    "professional resume templates",
    "ATS resume checker",
    "resume with ATS score",
    "resume builder PDF download",
    "job description resume tailoring",
    "AI cover letter generator",
  ],
  authors: [{ name: "jobSayer", url: "https://jobsayer.com" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://jobsayer.com/builder" },
  openGraph: {
    type: "website",
    siteName: "jobSayer",
    title: "Free AI Resume Builder — ATS-Friendly | jobSayer",
    description:
      "Create a professional, ATS-ready resume in minutes. 20+ templates, real-time ATS score, JD tailoring, and PDF/DOCX export. Free to start.",
    url: "https://jobsayer.com/builder",
    images: [
      {
        url: "https://jobsayer.com/og.png",
        width: 1200,
        height: 630,
        alt: "jobSayer Resume Builder — Free AI Resume Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Resume Builder — jobSayer",
    description:
      "Build an ATS-ready resume in minutes. 20+ templates, real-time score, JD tailoring, PDF export. Free.",
    images: ["https://jobsayer.com/og.png"],
    site: "@jobsayer",
  },
};

/* ── JSON-LD structured data ────────────────────────────────── */
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "jobSayer Resume Builder",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "ResumeBuilder",
  "operatingSystem": "Web",
  "url": "https://jobsayer.com/builder",
  "description":
    "Free AI-powered resume builder for professionals worldwide. Create ATS-friendly resumes with 20+ templates, get a real-time ATS score, match against job descriptions, and export as PDF or DOCX.",
  "screenshot": "https://jobsayer.com/og.png",
  "featureList": [
    "AI-powered content suggestions",
    "20+ ATS-ready templates",
    "Real-time ATS score across Workday, Taleo, Greenhouse, and Lever",
    "JD keyword matching",
    "PDF and DOCX export",
    "Fresher and experienced mode",
    "Cover letter builder",
    "Cloud save with version history",
    "Skill gap analysis",
    "Standard and regional resume formats",
  ],
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free tier available. Starter plan from $9/month.",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "3200",
    "bestRating": "5",
    "worstRating": "1",
  },
  "provider": {
    "@type": "Organization",
    "name": "jobSayer",
    "url": "https://jobsayer.com",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is jobSayer's resume builder free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The free tier lets you build, preview, and export your resume as PDF with 4 basic templates and 1 cloud save. Paid plans (from $9/month) unlock all 20+ templates, DOCX export, AI writing, and multiple saves.",
      },
    },
    {
      "@type": "Question",
      "name": "Is the resume ATS-friendly for Workday and Greenhouse?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. jobSayer shows a live ATS score broken down by platform — Workday (needs 80+), Taleo, Greenhouse, and Lever. Each section has specific improvement hints to maximise your score on the platforms used by your target company.",
      },
    },
    {
      "@type": "Question",
      "name": "Can freshers use this resume builder?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely. jobSayer has a dedicated Fresher mode that reorders sections (Education first, Projects highlighted), uses 'Career Objective' instead of 'Professional Summary', and prompts for CGPA, internships, and hackathon wins.",
      },
    },
    {
      "@type": "Question",
      "name": "Does the resume builder support DOCX format?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. DOCX export is available on the Starter and Pro plans. Many ATS platforms parse DOCX better than PDF, so the builder flags this and recommends the best format based on your target platform.",
      },
    },
    {
      "@type": "Question",
      "name": "Does the resume builder support regional resume formats?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The builder supports region-specific formats including optional Declaration sections, varied date formats, and layout conventions common in different markets. You can enable or disable each section as needed.",
      },
    },
    {
      "@type": "Question",
      "name": "Can I import my LinkedIn profile into the resume builder?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. You can import your LinkedIn profile by exporting it as a PDF from LinkedIn (More → Save to PDF) and uploading it to jobSayer. The builder will parse your work history, education, and skills and pre-fill the relevant sections.",
      },
    },
    {
      "@type": "Question",
      "name": "How many resume templates are available?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "jobSayer has 20+ professionally designed templates including Classic, Minimal, Slate, Crisp, Modern, Creative, Executive, and more. Each template shows its ATS score so you can pick the best one for your target role.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "jobSayer", "item": "https://jobsayer.com" },
    { "@type": "ListItem", "position": 2, "name": "Resume Builder", "item": "https://jobsayer.com/builder" },
  ],
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="builder-jsonld-app"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        strategy="beforeInteractive"
      />
      <Script
        id="builder-jsonld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        strategy="beforeInteractive"
      />
      <Script
        id="builder-jsonld-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
