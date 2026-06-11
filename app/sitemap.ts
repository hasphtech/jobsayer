import type { MetadataRoute } from "next";

const BASE = "https://jobsayer.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  return [
    // ── Landing ────────────────────────────────────────────────
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },

    // ── Core product pages ─────────────────────────────────────
    {
      url: `${BASE}/builder`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${BASE}/score`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/score/free`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.92,         // top acquisition funnel — high priority
    },
    {
      url: `${BASE}/cover-letter`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.88,
    },
    {
      url: `${BASE}/tailor`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE}/jobs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE}/interview`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.83,
    },
    {
      url: `${BASE}/linkedin`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.82,
    },
    {
      url: `${BASE}/learn`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.82,
    },
    {
      url: `${BASE}/career-gps`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.78,
    },
    {
      url: `${BASE}/salary`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.78,
    },
    {
      url: `${BASE}/career-health`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${BASE}/employer-trust`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${BASE}/bgv`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.72,
    },
    {
      url: `${BASE}/integrations`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },

    // ── Recruiter / employer ──────────────────────────────────
    {
      url: `${BASE}/recruit`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.72,
    },
    {
      url: `${BASE}/upgrade`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.60,
    },

    // ── Static / legal ────────────────────────────────────────
    {
      url: `${BASE}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
