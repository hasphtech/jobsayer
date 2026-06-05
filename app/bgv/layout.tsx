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
  alternates: { canonical: "https://jobsayer.com/bgv" },
};

export default function BgvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
