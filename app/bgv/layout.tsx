import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BGV — Show Up Credentialed",
  description: "Build employer trust before they even meet you. Get identity, education, and employment verified. Share your BGV badge and skip the offer-stage delays that stall career growth.",
  keywords: ["BGV India", "professional credentials India", "background verification career India", "verified professional India", "employer trust India"],
  openGraph: {
    title: "Show Up Credentialed — jobSayer Career Growth",
    description: "Verified identity, education, and employment. Share your BGV badge. Skip offer delays.",
    url: "https://jobsayer.com/bgv",
  },
  alternates: { canonical: "https://jobsayer.com/bgv" },
};

export default function BgvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
