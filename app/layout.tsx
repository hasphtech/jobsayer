import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ClientAuthProvider from "@/components/ClientAuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export const metadata: Metadata = {
  title: { default: "jobSayer — Global Career Growth Platform", template: "%s | jobSayer" },
  description: "The platform that grows your career — globally. Close skill gaps, build a standout resume, ace interviews, negotiate salary, and track your progress. Used by professionals in 50+ countries.",
  keywords: [
    "career growth platform", "AI resume builder", "global career development",
    "interview prep", "salary negotiation", "skill gap analysis",
    "ATS resume checker", "cover letter builder", "career GPS",
    "career advancement", "professional growth", "job search tools",
    "resume tailoring", "LinkedIn optimizer", "career health score",
  ],
  authors: [{ name: "jobSayer", url: "https://jobsayer.com" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://jobsayer.com" },
  openGraph: {
    type: "website",
    url: "https://jobsayer.com",
    siteName: "jobSayer",
    title: "jobSayer — The Platform That Grows Your Career",
    description: "Close skill gaps, build a standout resume, ace every interview, and negotiate your worth — all in one place. Trusted by professionals worldwide.",
    images: [{ url: "https://jobsayer.com/og.png", width: 1200, height: 630, alt: "jobSayer — AI Career Growth Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "jobSayer — AI Career Growth Platform",
    description: "Resume builder, salary intelligence, interview prep, career health score and more. Used by 50K+ professionals globally.",
    images: ["https://jobsayer.com/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico",                      sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/icons/icon-192.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  metadataBase: new URL("https://jobsayer.com"),
  appleWebApp: {
    capable:    true,
    title:      "jobSayer",
    statusBarStyle: "black-translucent",
  },
};

const FOUC_SCRIPT = `(function(){
  var t=localStorage.getItem('jobsayer-theme');
  if(t==='dark'){document.body.classList.add('dark');document.documentElement.style.setProperty('background','#08080c');}
  else{document.documentElement.style.setProperty('background','#f8fafc');}
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* impact.com / Udemy affiliate verification */}
        {/* eslint-disable-next-line @next/next/no-head-element */}
        <meta name="impact-site-verification" content="2e2d81c2-759c-4ea9-a35e-a9df5a139d8e" />
        <link rel="preconnect" href="https://supabase.co" />
        {/* Tabler icons webfont — used by AppShell sidebar */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Resume builder font palette — professional global standards */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Raleway:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&family=Nunito:wght@400;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
        {/* JSON-LD: Organization */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "jobSayer",
          url: "https://jobsayer.com",
          logo: "https://jobsayer.com/logo.png",
          sameAs: [
            "https://twitter.com/jobsayer",
            "https://linkedin.com/company/jobsayer",
          ],
          contactPoint: { "@type": "ContactPoint", email: "hello@jobsayer.com", contactType: "customer support" },
        }) }} />
        {/* JSON-LD: WebSite with Sitelinks SearchBox */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "jobSayer",
          url: "https://jobsayer.com",
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: "https://jobsayer.com/jobs?q={search_term_string}" },
            "query-input": "required name=search_term_string",
          },
        }) }} />
        {/* JSON-LD: SoftwareApplication */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "jobSayer",
          operatingSystem: "Web",
          applicationCategory: "BusinessApplication",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: "AI-powered career growth platform — resume builder, ATS scorer, interview prep, salary insights and more.",
          url: "https://jobsayer.com",
        }) }} />
      </head>
      <body className={inter.variable}>
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  );
}
