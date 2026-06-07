import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Courses & Certifications | jobSayer",
  description:
    "Curated free certifications from Google, AWS, Microsoft, IBM, Meta, NPTEL and more. Boost your career with skill-gap-matched courses.",
  openGraph: {
    title: "Free Courses & Certifications | jobSayer",
    description:
      "Close skill gaps with 60+ free certifications from top providers. Linked to your Career GPS skill analysis.",
    url: "https://jobsayer.com/learn",
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
