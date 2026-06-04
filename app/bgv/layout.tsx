import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Background Verification (BGV) — Get Verified Before You Apply",
  description: "Get your identity, education, and employment verified before job hunting. Share your jobSayer BGV badge with recruiters and skip the offer-stage delays.",
  keywords: ["BGV India", "background verification India", "employment verification India", "education verification India", "pre-employment verification"],
  openGraph: {
    title: "Background Verification — jobSayer",
    description: "Get verified upfront. Share your BGV badge and speed up every offer process.",
    url: "https://jobsayer.com/bgv",
  },
  alternates: { canonical: "https://jobsayer.com/bgv" },
};

export default function BgvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
