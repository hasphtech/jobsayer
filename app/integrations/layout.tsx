import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Bot Integrations — Slack, WhatsApp, Teams, Telegram | jobSayer",
  description:
    "Get daily career tips, interview prep reminders, job alerts, and salary nudges inside Slack, WhatsApp, Microsoft Teams, or Telegram. Your career assistant wherever you work.",
  keywords: [
    "career bot Slack", "job alerts WhatsApp", "interview prep bot", "career assistant Telegram",
    "Microsoft Teams career bot", "job search automation", "career notifications bot",
    "daily career tips bot", "resume bot integration", "AI career assistant",
  ],
  alternates: { canonical: "https://jobsayer.com/integrations" },
  openGraph: {
    title: "Career Bot Integrations | jobSayer",
    description: "Daily career tips, job alerts, and interview prep inside Slack, WhatsApp, Teams, and Telegram.",
    url: "https://jobsayer.com/integrations",
    images: [{ url: "https://jobsayer.com/og.png", width: 1200, height: 630, alt: "jobSayer Bot Integrations" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@jobsayer",
    title: "Career Bot Integrations — jobSayer",
    description: "Your AI career assistant in Slack, WhatsApp, Teams & Telegram. Job alerts, tips, interview prep.",
    images: ["https://jobsayer.com/og.png"],
  },
};

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
