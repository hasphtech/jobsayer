import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const name = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
  return {
    title: `${name} — Salary Bands, Interview Process & Company Insights | jobSayer`,
    description: `Verified salary data, attrition rates, interview rounds, and culture scores for ${name}. Real intelligence from verified employees.`,
    openGraph: {
      title: `${name} Company Intelligence | jobSayer`,
      description: `Salary bands, interview intel, and attrition signals for ${name}.`,
    },
  };
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
