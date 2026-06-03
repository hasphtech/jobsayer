import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "jobSayer — Your Job Search, Smarter",
    short_name: "jobSayer",
    description: "AI resume builder, ATS scoring, job matching, interview prep, and career GPS — built for the Indian job market.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080c",
    theme_color: "#6366f1",
    categories: ["productivity", "careers", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Resume Builder",
        short_name: "Builder",
        description: "Build or edit your resume",
        url: "/builder",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Matched Jobs",
        short_name: "Jobs",
        description: "View jobs matched to your resume",
        url: "/jobs",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Application Tracker",
        short_name: "Tracker",
        description: "Track your job applications",
        url: "/applications",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Interview Prep",
        short_name: "Interview",
        description: "AI-powered mock interview",
        url: "/interview",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/og.png",
        sizes: "1200x630",
        type: "image/png",
      },
    ],
  };
}
