import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Trust Ratings — Know Before You Apply | jobSayer",
  description: "See which companies ghost candidates, respond fast, and run fair interviews. Candidate-reported employer accountability — globally, before you apply.",
  keywords: ["employer trust", "company ghost rate", "hiring transparency", "interview fairness", "employer ratings"],
  openGraph: {
    title: "Employer Trust Ratings — jobSayer",
    description: "Ghost rates, response SLAs, interview fairness scores. Know what hiring is really like before you apply.",
    url: "https://jobsayer.com/employer-trust",
  },
  alternates: { canonical: "https://jobsayer.com/employer-trust" },
};

export default function EmployerTrustLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
