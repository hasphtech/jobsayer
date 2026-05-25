import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobSayer",
    short_name: "JobSayer",
    description: "AI-powered resume builder",
    start_url: "/builder",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#0f1117",
    icons: [],
  };
}
