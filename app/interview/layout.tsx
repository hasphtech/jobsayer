import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Interview Prep — Master Every Interview | jobSayer",
  description: "Close your skill gaps through targeted interview practice. AI analyses your profile, identifies what you're missing, and drills you on exactly those gaps — not random questions.",
  keywords: ["AI interview prep", "mock interview online", "skill gap interview practice", "behavioral interview practice", "technical interview preparation", "career interview coaching"],
  openGraph: {
    title: "Master Every Interview — jobSayer",
    description: "Skill-gap targeted interview practice. AI identifies what you're missing and drills you on exactly that.",
    url: "https://jobsayer.com/interview",
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "AI Interview Prep — Master Every Interview | jobSayer",
    description: "Skill-gap targeted practice. AI finds your weakest areas and drills you on exactly those — not random questions.",
    images: ["https://jobsayer.com/og.png"],
  },
  alternates: { canonical: "https://jobsayer.com/interview" },
};

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "AI Interview Coach", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": "AI-powered interview preparation that identifies skill gaps and delivers targeted practice for your exact role.", "url": "https://jobsayer.com/interview"}) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "How is jobSayer interview prep different from generic question banks?", "acceptedAnswer": {"@type": "Answer", "text": "jobSayer analyses your resume and target role to find your specific skill gaps, then builds a practice plan targeting exactly those gaps \u2014 so you're improving where it matters, not rehearsing what you already know."}}, {"@type": "Question", "name": "What types of interviews does it cover?", "acceptedAnswer": {"@type": "Answer", "text": "Behavioural (STAR method), technical (coding, system design, SQL), product (case studies, metrics), and leadership interviews across Software, Data, Product, Design, and Operations roles."}}, {"@type": "Question", "name": "Can I practice for a specific company?", "acceptedAnswer": {"@type": "Answer", "text": "Yes \u2014 paste the job description and jobSayer tailors the question set to the company's known interview style, role requirements, and common question themes."}}]}) }} />
      {children}
    </>
  );
}
