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
  themeColor: "#0f1117",
};

export const metadata: Metadata = {
  title: { default: "JobSayer", template: "%s | JobSayer" },
  description: "Build job-winning resumes with AI. Templates, PDF/DOCX export, ATS scoring, JD matching.",
  keywords: ["resume builder", "CV maker", "India", "job application", "professional resume", "AI resume"],
  authors: [{ name: "JobSayer", url: "https://jobsayer.com" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "https://jobsayer.com",
    siteName: "JobSayer",
    title: "JobSayer — Professional Resume Builder",
    description: "Build job-winning resumes with AI. Templates, PDF/DOCX export, ATS scoring.",
    images: [{ url: "https://jobsayer.com/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "JobSayer — Professional Resume Builder",
    description: "Build professional resumes with AI assistance.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico",               sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

const FOUC_SCRIPT = `(function(){
  var t=localStorage.getItem('jobsayer-theme');
  if(t==='light'){document.body.classList.add('light');document.documentElement.style.setProperty('background','#f8fafc');}
  else{document.documentElement.style.setProperty('background','#08080c');}
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Resume builder font palette — professional global standards */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Raleway:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&family=Nunito:wght@400;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body className={inter.variable}>
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  );
}
