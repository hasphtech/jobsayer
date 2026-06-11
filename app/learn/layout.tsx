import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Courses & Certifications | jobSayer",
  description:
    "60+ free and audit-free certifications from Google, AWS, Microsoft, IBM, Meta, NPTEL, Harvard, freeCodeCamp and more. Boost your career with skill-gap-matched courses.",
  keywords: [
    "free online courses", "free certifications", "Google certificates", "AWS certification free",
    "Microsoft learn free", "IBM data science certificate", "freeCodeCamp certification",
    "NPTEL certificate", "Harvard CS50 free", "free career courses", "skill gap courses",
    "online certifications for jobs", "free coding bootcamp", "data science free course",
    "cloud computing certification free", "Meta developer certificate",
  ],
  alternates: { canonical: "https://jobsayer.com/learn" },
  openGraph: {
    title: "Free Courses & Certifications | jobSayer",
    description:
      "60+ free certifications from Google, AWS, Microsoft, IBM, Meta, NPTEL, Harvard & more. Matched to your Career GPS skill gaps.",
    url: "https://jobsayer.com/learn",
    images: [{ url: "https://jobsayer.com/og.png", width: 1200, height: 630, alt: "jobSayer Free Courses & Certifications" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Free Courses & Certifications — jobSayer",
    description: "60+ free certs from Google, AWS, Microsoft, IBM, Harvard & more. Matched to your skill gaps.",
    images: ["https://jobsayer.com/og.png"],
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
