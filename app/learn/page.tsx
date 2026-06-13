"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";

/* ── Affiliate link helper ───────────────────────────────────────
 * For Udemy + Coursera: fetches a tracked URL from impact.com.
 * Falls back to direct URL if campaign not yet approved or on error.
 * ──────────────────────────────────────────────────────────────── */
function isAffiliateCourse(provider: string): "udemy" | "coursera" | null {
  if (provider.toLowerCase().includes("udemy"))    return "udemy";
  if (provider.toLowerCase().includes("coursera")) return "coursera";
  return null;
}

async function getAffiliateUrl(url: string, brand: "udemy" | "coursera", courseId: string): Promise<string> {
  try {
    const res = await fetch("/api/affiliate/tracking-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, brand, subId: courseId }),
    });
    if (!res.ok) return url;
    const data = await res.json() as { trackingUrl?: string };
    return data.trackingUrl ?? url;
  } catch {
    return url;
  }
}

/* ── Types ───────────────────────────────────────────────────── */
type Cost    = "free" | "freemium" | "paid";
type Level   = "Beginner" | "Intermediate" | "Advanced";

interface Course {
  id: string;
  title: string;
  provider: string;
  providerLogo: string;        // tabler icon class e.g. "ti-brand-google"
  providerColor?: string;      // icon accent colour
  url: string;
  cost: Cost;
  level: Level;
  durationHrs: number;         // approx hours
  skills: string[];
  roles: string[];             // target job roles
  hasCert: boolean;            // issues certificate on completion
  certName?: string;           // official cert name
  rating: number;              // 1–5
  enrolled: string;            // e.g. "2.4M"
  highlight?: string;          // short hook
}

/* ── Course database ─────────────────────────────────────────── */
const COURSES: Course[] = [

  /* ── Google ── */
  {
    id: "goog-it",
    title: "Google IT Support Professional Certificate",
    provider: "Google / Coursera", providerLogo: "ti-brand-google", providerColor: "#4285f4",
    url: "https://grow.google/certificates/it-support/",
    cost: "freemium", level: "Beginner", durationHrs: 120,
    skills: ["networking", "linux", "cloud computing", "cybersecurity", "troubleshooting"],
    roles: ["IT Support", "Sysadmin", "DevOps"],
    hasCert: true, certName: "Google IT Support Certificate",
    rating: 4.8, enrolled: "1.5M",
    highlight: "Industry-recognised entry-level IT cert — free to audit",
  },
  {
    id: "goog-da",
    title: "Google Data Analytics Professional Certificate",
    provider: "Google / Coursera", providerLogo: "ti-brand-google", providerColor: "#4285f4",
    url: "https://grow.google/certificates/data-analytics/",
    cost: "freemium", level: "Beginner", durationHrs: 180,
    skills: ["sql", "r", "tableau", "spreadsheets", "data visualisation", "analytics"],
    roles: ["Data Analyst", "Business Analyst", "Product Analyst"],
    hasCert: true, certName: "Google Data Analytics Certificate",
    rating: 4.8, enrolled: "2.4M",
    highlight: "Most enrolled data cert worldwide",
  },
  {
    id: "goog-pm",
    title: "Google Project Management Professional Certificate",
    provider: "Google / Coursera", providerLogo: "ti-brand-google", providerColor: "#4285f4",
    url: "https://grow.google/certificates/project-management/",
    cost: "freemium", level: "Beginner", durationHrs: 180,
    skills: ["project management", "agile", "scrum", "risk management"],
    roles: ["Project Manager", "Scrum Master", "Product Manager"],
    hasCert: true, certName: "Google Project Management Certificate",
    rating: 4.8, enrolled: "900K",
    highlight: "No degree required — equivalent to PMP prep",
  },
  {
    id: "goog-ux",
    title: "Google UX Design Professional Certificate",
    provider: "Google / Coursera", providerLogo: "ti-brand-google", providerColor: "#4285f4",
    url: "https://grow.google/certificates/ux-design/",
    cost: "freemium", level: "Beginner", durationHrs: 200,
    skills: ["figma", "user research", "wireframing", "prototyping", "usability testing"],
    roles: ["UX Designer", "Product Designer", "UI Designer"],
    hasCert: true, certName: "Google UX Design Certificate",
    rating: 4.8, enrolled: "600K",
    highlight: "Build a 3-case portfolio during the course",
  },
  {
    id: "goog-cyber",
    title: "Google Cybersecurity Professional Certificate",
    provider: "Google / Coursera", providerLogo: "ti-brand-google", providerColor: "#4285f4",
    url: "https://grow.google/certificates/cybersecurity/",
    cost: "freemium", level: "Beginner", durationHrs: 170,
    skills: ["cybersecurity", "linux", "python", "siem", "networking", "sql"],
    roles: ["Security Analyst", "SOC Analyst", "IT Security"],
    hasCert: true, certName: "Google Cybersecurity Certificate",
    rating: 4.8, enrolled: "400K",
    highlight: "Prepares for CompTIA Security+ exam",
  },
  {
    id: "goog-ml",
    title: "Machine Learning Crash Course",
    provider: "Google / ML Education", providerLogo: "ti-brand-google", providerColor: "#4285f4",
    url: "https://developers.google.com/machine-learning/crash-course",
    cost: "free", level: "Intermediate", durationHrs: 15,
    skills: ["machine learning", "tensorflow", "python", "neural networks"],
    roles: ["ML Engineer", "Data Scientist", "AI Engineer"],
    hasCert: false, rating: 4.6, enrolled: "1.2M",
    highlight: "Completely free — no account required",
  },

  /* ── AWS ── */
  {
    id: "aws-ccp-train",
    title: "AWS Cloud Practitioner Essentials",
    provider: "AWS Training", providerLogo: "ti-cloud", providerColor: "#ff9900",
    url: "https://aws.amazon.com/training/learn-about/cloud-practitioner/",
    cost: "free", level: "Beginner", durationHrs: 6,
    skills: ["aws", "cloud computing", "s3", "ec2", "iam", "billing"],
    roles: ["Cloud Engineer", "DevOps", "Solutions Architect", "SDE"],
    hasCert: false, rating: 4.7, enrolled: "800K",
    highlight: "Official prep for AWS CCP exam — totally free",
  },
  {
    id: "aws-quest",
    title: "AWS Cloud Quest: Cloud Practitioner",
    provider: "AWS Skill Builder", providerLogo: "ti-cloud", providerColor: "#ff9900",
    url: "https://aws.amazon.com/training/digital/aws-cloud-quest/",
    cost: "free", level: "Beginner", durationHrs: 12,
    skills: ["aws", "ec2", "s3", "vpc", "rds", "lambda"],
    roles: ["Cloud Engineer", "DevOps", "SDE"],
    hasCert: true, certName: "AWS Cloud Quest Badge",
    rating: 4.5, enrolled: "500K",
    highlight: "Game-based learning — earn a digital badge",
  },
  {
    id: "aws-saa",
    title: "AWS Solutions Architect – Associate (SAA-C03) Study Path",
    provider: "AWS Skill Builder", providerLogo: "ti-cloud", providerColor: "#ff9900",
    url: "https://skillbuilder.aws/exam-prep/solutions-architect-associate",
    cost: "freemium", level: "Intermediate", durationHrs: 40,
    skills: ["aws", "ec2", "s3", "rds", "vpc", "iam", "load balancers", "system design"],
    roles: ["Solutions Architect", "Cloud Engineer", "DevOps"],
    hasCert: false, rating: 4.8, enrolled: "1.1M",
    highlight: "SAA is the #1 cloud cert for SDE roles in India",
  },

  /* ── Microsoft ── */
  {
    id: "msft-az900",
    title: "Microsoft Azure Fundamentals (AZ-900)",
    provider: "Microsoft Learn", providerLogo: "ti-brand-windows", providerColor: "#0078d4",
    url: "https://learn.microsoft.com/en-us/certifications/azure-fundamentals/",
    cost: "free", level: "Beginner", durationHrs: 10,
    skills: ["azure", "cloud computing", "cloud services", "networking"],
    roles: ["Cloud Engineer", "DevOps", "SDE", "Solutions Architect"],
    hasCert: true, certName: "Microsoft Certified: Azure Fundamentals",
    rating: 4.7, enrolled: "2M",
    highlight: "Free exam voucher sometimes available via Microsoft events",
  },
  {
    id: "msft-ai900",
    title: "Azure AI Fundamentals (AI-900)",
    provider: "Microsoft Learn", providerLogo: "ti-brand-windows", providerColor: "#0078d4",
    url: "https://learn.microsoft.com/en-us/certifications/azure-ai-fundamentals/",
    cost: "free", level: "Beginner", durationHrs: 8,
    skills: ["azure", "machine learning", "cognitive services", "ai", "nlp"],
    roles: ["AI Engineer", "Data Scientist", "ML Engineer"],
    hasCert: true, certName: "Microsoft Certified: Azure AI Fundamentals",
    rating: 4.6, enrolled: "700K",
    highlight: "Great entry cert for AI/ML career switchers",
  },
  {
    id: "msft-pl900",
    title: "Power Platform Fundamentals (PL-900)",
    provider: "Microsoft Learn", providerLogo: "ti-brand-windows", providerColor: "#0078d4",
    url: "https://learn.microsoft.com/en-us/certifications/power-platform-fundamentals/",
    cost: "free", level: "Beginner", durationHrs: 8,
    skills: ["power bi", "power automate", "power apps", "analytics"],
    roles: ["Business Analyst", "Data Analyst", "Operations"],
    hasCert: true, certName: "Microsoft Certified: Power Platform Fundamentals",
    rating: 4.5, enrolled: "400K",
    highlight: "Power BI alone drives 40%+ of analyst job requirements",
  },

  /* ── IBM ── */
  {
    id: "ibm-ds",
    title: "IBM Data Science Professional Certificate",
    provider: "IBM / Coursera", providerLogo: "ti-brand-ibm", providerColor: "#1192e8",
    url: "https://www.coursera.org/professional-certificates/ibm-data-science",
    cost: "freemium", level: "Beginner", durationHrs: 200,
    skills: ["python", "sql", "machine learning", "data visualisation", "jupyter", "pandas", "scikit-learn"],
    roles: ["Data Scientist", "Data Analyst", "ML Engineer"],
    hasCert: true, certName: "IBM Data Science Professional Certificate",
    rating: 4.6, enrolled: "900K",
    highlight: "Covers full DS stack from SQL to deep learning",
  },
  {
    id: "ibm-fullstack",
    title: "IBM Full Stack Software Developer Certificate",
    provider: "IBM / Coursera", providerLogo: "ti-brand-ibm", providerColor: "#1192e8",
    url: "https://www.coursera.org/professional-certificates/ibm-full-stack-cloud-developer",
    cost: "freemium", level: "Beginner", durationHrs: 240,
    skills: ["html", "css", "javascript", "react", "node.js", "docker", "kubernetes", "cloud"],
    roles: ["Full Stack Developer", "Frontend Engineer", "Backend Engineer"],
    hasCert: true, certName: "IBM Full Stack Software Developer Certificate",
    rating: 4.5, enrolled: "300K",
    highlight: "React + Node + Cloud in one path",
  },
  {
    id: "ibm-ai",
    title: "IBM AI Engineering Professional Certificate",
    provider: "IBM / Coursera", providerLogo: "ti-brand-ibm", providerColor: "#1192e8",
    url: "https://www.coursera.org/professional-certificates/ai-engineer",
    cost: "freemium", level: "Intermediate", durationHrs: 180,
    skills: ["machine learning", "deep learning", "pytorch", "tensorflow", "keras", "python"],
    roles: ["AI Engineer", "ML Engineer", "Data Scientist"],
    hasCert: true, certName: "IBM AI Engineering Certificate",
    rating: 4.6, enrolled: "200K",
    highlight: "PyTorch + TensorFlow + deployment covered",
  },

  /* ── Meta ── */
  {
    id: "meta-fe",
    title: "Meta Front-End Developer Professional Certificate",
    provider: "Meta / Coursera", providerLogo: "ti-brand-meta", providerColor: "#1877f2",
    url: "https://www.coursera.org/professional-certificates/meta-front-end-developer",
    cost: "freemium", level: "Beginner", durationHrs: 240,
    skills: ["html", "css", "javascript", "react", "ux", "testing"],
    roles: ["Frontend Engineer", "React Developer", "Full Stack Developer"],
    hasCert: true, certName: "Meta Front-End Developer Certificate",
    rating: 4.7, enrolled: "500K",
    highlight: "Built by engineers who created React",
  },
  {
    id: "meta-be",
    title: "Meta Back-End Developer Professional Certificate",
    provider: "Meta / Coursera", providerLogo: "ti-brand-meta", providerColor: "#1877f2",
    url: "https://www.coursera.org/professional-certificates/meta-back-end-developer",
    cost: "freemium", level: "Beginner", durationHrs: 240,
    skills: ["python", "django", "rest api", "sql", "linux", "version control"],
    roles: ["Backend Engineer", "Python Developer", "Full Stack Developer"],
    hasCert: true, certName: "Meta Back-End Developer Certificate",
    rating: 4.6, enrolled: "350K",
    highlight: "Python + Django + REST APIs — most in-demand stack",
  },
  {
    id: "meta-ds",
    title: "Meta Data Analyst Professional Certificate",
    provider: "Meta / Coursera", providerLogo: "ti-brand-meta", providerColor: "#1877f2",
    url: "https://www.coursera.org/professional-certificates/facebook-data-analyst",
    cost: "freemium", level: "Beginner", durationHrs: 150,
    skills: ["sql", "python", "statistics", "analytics", "excel", "tableau"],
    roles: ["Data Analyst", "Business Analyst", "Marketing Analyst"],
    hasCert: true, certName: "Meta Data Analyst Certificate",
    rating: 4.5, enrolled: "200K",
    highlight: "Covers statistical foundations often missed in boot camps",
  },

  /* ── freeCodeCamp ── */
  {
    id: "fcc-webdev",
    title: "Responsive Web Design Certification",
    provider: "freeCodeCamp", providerLogo: "ti-flame", providerColor: "#0a0a23",
    url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
    cost: "free", level: "Beginner", durationHrs: 300,
    skills: ["html", "css", "responsive design", "accessibility", "flexbox", "grid"],
    roles: ["Frontend Engineer", "Full Stack Developer", "Web Developer"],
    hasCert: true, certName: "freeCodeCamp Responsive Web Design",
    rating: 4.7, enrolled: "3M",
    highlight: "100% free forever — no paywall, no expiry",
  },
  {
    id: "fcc-js",
    title: "JavaScript Algorithms and Data Structures",
    provider: "freeCodeCamp", providerLogo: "ti-flame", providerColor: "#0a0a23",
    url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
    cost: "free", level: "Beginner", durationHrs: 300,
    skills: ["javascript", "algorithms", "data structures", "oop", "functional programming"],
    roles: ["Frontend Engineer", "Full Stack Developer", "SDE"],
    hasCert: true, certName: "freeCodeCamp JS Algorithms & Data Structures",
    rating: 4.8, enrolled: "2.5M",
    highlight: "Best free DSA prep for JS interviews",
  },
  {
    id: "fcc-ds",
    title: "Data Analysis with Python Certification",
    provider: "freeCodeCamp", providerLogo: "ti-flame", providerColor: "#0a0a23",
    url: "https://www.freecodecamp.org/learn/data-analysis-with-python/",
    cost: "free", level: "Beginner", durationHrs: 300,
    skills: ["python", "pandas", "numpy", "matplotlib", "data analysis"],
    roles: ["Data Analyst", "Data Scientist", "Business Analyst"],
    hasCert: true, certName: "freeCodeCamp Data Analysis with Python",
    rating: 4.7, enrolled: "1.2M",
    highlight: "Pandas + NumPy + Matplotlib in one cert",
  },

  /* ── Kaggle ── */
  {
    id: "kaggle-python",
    title: "Python for Data Science",
    provider: "Kaggle", providerLogo: "ti-brand-python", providerColor: "#20beff",
    url: "https://www.kaggle.com/learn/python",
    cost: "free", level: "Beginner", durationHrs: 5,
    skills: ["python", "pandas", "data science"],
    roles: ["Data Scientist", "Data Analyst", "ML Engineer"],
    hasCert: true, certName: "Kaggle Python Certificate",
    rating: 4.7, enrolled: "600K",
    highlight: "Get cert in as little as 5 hours",
  },
  {
    id: "kaggle-ml",
    title: "Intro to Machine Learning",
    provider: "Kaggle", providerLogo: "ti-brand-python", providerColor: "#20beff",
    url: "https://www.kaggle.com/learn/intro-to-machine-learning",
    cost: "free", level: "Beginner", durationHrs: 4,
    skills: ["machine learning", "python", "scikit-learn", "decision trees", "random forest"],
    roles: ["ML Engineer", "Data Scientist"],
    hasCert: true, certName: "Kaggle Intro to ML Certificate",
    rating: 4.8, enrolled: "800K",
    highlight: "Hands-on Kaggle notebooks — cert in 4 hours",
  },
  {
    id: "kaggle-sql",
    title: "Intro to SQL + Advanced SQL",
    provider: "Kaggle", providerLogo: "ti-brand-python", providerColor: "#20beff",
    url: "https://www.kaggle.com/learn/intro-to-sql",
    cost: "free", level: "Beginner", durationHrs: 6,
    skills: ["sql", "bigquery", "data analysis"],
    roles: ["Data Analyst", "Data Engineer", "Business Analyst"],
    hasCert: true, certName: "Kaggle SQL Certificate",
    rating: 4.7, enrolled: "700K",
    highlight: "Uses BigQuery — most in-demand SQL platform",
  },

  /* ── NPTEL (India) ── */
  {
    id: "nptel-ds",
    title: "Programming, Data Structures and Algorithms using Python",
    provider: "NPTEL / IIT Madras", providerLogo: "ti-school", providerColor: "#e63946",
    url: "https://nptel.ac.in/courses/106106145",
    cost: "free", level: "Beginner", durationHrs: 120,
    skills: ["python", "data structures", "algorithms", "programming"],
    roles: ["SDE", "Data Scientist", "ML Engineer"],
    hasCert: true, certName: "NPTEL Elite Certificate (proctored exam)",
    rating: 4.6, enrolled: "400K",
    highlight: "IIT faculty · proctored exam for NPTEL Elite cert",
  },
  {
    id: "nptel-ml",
    title: "Introduction to Machine Learning",
    provider: "NPTEL / IIT Kharagpur", providerLogo: "ti-school", providerColor: "#e63946",
    url: "https://nptel.ac.in/courses/106105152",
    cost: "free", level: "Intermediate", durationHrs: 120,
    skills: ["machine learning", "probability", "statistics", "python"],
    roles: ["ML Engineer", "Data Scientist", "AI Engineer"],
    hasCert: true, certName: "NPTEL ML Certificate",
    rating: 4.7, enrolled: "350K",
    highlight: "Best free theory-heavy ML course in India",
  },
  {
    id: "nptel-dbms",
    title: "Database Management Systems",
    provider: "NPTEL / IIT Madras", providerLogo: "ti-school", providerColor: "#e63946",
    url: "https://nptel.ac.in/courses/106106093",
    cost: "free", level: "Intermediate", durationHrs: 80,
    skills: ["sql", "dbms", "postgresql", "indexing", "transactions"],
    roles: ["Backend Engineer", "Data Engineer", "Full Stack Developer"],
    hasCert: true, certName: "NPTEL DBMS Certificate",
    rating: 4.5, enrolled: "280K",
    highlight: "Strong theory foundation for DB interviews",
  },
  {
    id: "nptel-os",
    title: "Operating Systems and System Programming",
    provider: "NPTEL / IIT Bombay", providerLogo: "ti-school", providerColor: "#e63946",
    url: "https://nptel.ac.in/courses/106101183",
    cost: "free", level: "Intermediate", durationHrs: 80,
    skills: ["linux", "os concepts", "c", "concurrency", "memory management"],
    roles: ["SDE", "Systems Engineer", "DevOps"],
    hasCert: true, certName: "NPTEL OS Certificate",
    rating: 4.6, enrolled: "200K",
    highlight: "Essential for SDE interviews at top-tier companies",
  },

  /* ── The Odin Project ── */
  {
    id: "odin-fullstack",
    title: "Full Stack JavaScript Path",
    provider: "The Odin Project", providerLogo: "ti-sword", providerColor: "#d35f1e",
    url: "https://www.theodinproject.com/paths/full-stack-javascript",
    cost: "free", level: "Beginner", durationHrs: 1000,
    skills: ["html", "css", "javascript", "react", "node.js", "express", "postgresql", "git"],
    roles: ["Frontend Engineer", "Full Stack Developer", "Backend Engineer"],
    hasCert: false, rating: 4.9, enrolled: "500K",
    highlight: "Most respected free full-stack curriculum — portfolio-first",
  },

  /* ── CS50 (Harvard / edX) ── */
  {
    id: "cs50-main",
    title: "CS50: Introduction to Computer Science",
    provider: "Harvard / edX", providerLogo: "ti-building-castle", providerColor: "#a51c30",
    url: "https://cs50.harvard.edu/x/",
    cost: "free", level: "Beginner", durationHrs: 100,
    skills: ["c", "python", "sql", "html", "css", "javascript", "algorithms"],
    roles: ["SDE", "Full Stack Developer", "Backend Engineer"],
    hasCert: true, certName: "HarvardX CS50 Certificate (paid) / free completion",
    rating: 4.9, enrolled: "4M",
    highlight: "Most loved CS course in the world — completely free",
  },
  {
    id: "cs50-python",
    title: "CS50's Introduction to Python",
    provider: "Harvard / edX", providerLogo: "ti-building-castle", providerColor: "#a51c30",
    url: "https://cs50.harvard.edu/python/",
    cost: "free", level: "Beginner", durationHrs: 40,
    skills: ["python", "oop", "testing", "regular expressions", "libraries"],
    roles: ["Backend Engineer", "Data Scientist", "ML Engineer"],
    hasCert: true, certName: "HarvardX CS50P Certificate",
    rating: 4.9, enrolled: "600K",
    highlight: "Best Python fundamentals course available",
  },
  {
    id: "cs50-sql",
    title: "CS50's Introduction to Databases with SQL",
    provider: "Harvard / edX", providerLogo: "ti-building-castle", providerColor: "#a51c30",
    url: "https://cs50.harvard.edu/sql/",
    cost: "free", level: "Beginner", durationHrs: 30,
    skills: ["sql", "sqlite", "postgresql", "database design", "indexing"],
    roles: ["Backend Engineer", "Data Analyst", "Data Engineer"],
    hasCert: true, certName: "HarvardX CS50 SQL Certificate",
    rating: 4.8, enrolled: "200K",
    highlight: "By the CS50 team — best SQL fundamentals course",
  },

  /* ── Kubernetes / Docker / Cloud Native ── */
  {
    id: "cncf-k8s",
    title: "Introduction to Kubernetes (LFS158)",
    provider: "Linux Foundation / edX", providerLogo: "ti-brand-debian", providerColor: "#f47920",
    url: "https://www.edx.org/learn/kubernetes/the-linux-foundation-introduction-to-kubernetes",
    cost: "free", level: "Intermediate", durationHrs: 20,
    skills: ["kubernetes", "docker", "containers", "microservices", "devops"],
    roles: ["DevOps", "SRE", "Cloud Engineer", "Backend Engineer"],
    hasCert: false, rating: 4.6, enrolled: "300K",
    highlight: "Official Kubernetes intro by Linux Foundation",
  },
  {
    id: "docker-official",
    title: "Docker Get Started + Docker Deep Dive",
    provider: "Docker / Play with Docker", providerLogo: "ti-brand-docker", providerColor: "#2496ed",
    url: "https://docs.docker.com/get-started/",
    cost: "free", level: "Beginner", durationHrs: 10,
    skills: ["docker", "containers", "microservices", "devops"],
    roles: ["DevOps", "Backend Engineer", "SRE", "Full Stack Developer"],
    hasCert: false, rating: 4.7, enrolled: "1M",
    highlight: "Browser-based Docker playground — no install needed",
  },

  /* ── HubSpot ── */
  {
    id: "hs-digital",
    title: "Digital Marketing Certification",
    provider: "HubSpot Academy", providerLogo: "ti-brand-hubspot", providerColor: "#ff7a59",
    url: "https://academy.hubspot.com/courses/digital-marketing",
    cost: "free", level: "Beginner", durationHrs: 5,
    skills: ["digital marketing", "seo", "content marketing", "social media", "email marketing"],
    roles: ["Marketing Manager", "Growth Hacker", "Product Manager"],
    hasCert: true, certName: "HubSpot Digital Marketing Certification",
    rating: 4.6, enrolled: "800K",
    highlight: "Free + globally recognised marketing cert",
  },
  {
    id: "hs-content",
    title: "Content Marketing Certification",
    provider: "HubSpot Academy", providerLogo: "ti-brand-hubspot", providerColor: "#ff7a59",
    url: "https://academy.hubspot.com/courses/content-marketing",
    cost: "free", level: "Beginner", durationHrs: 7,
    skills: ["content marketing", "storytelling", "seo", "content strategy"],
    roles: ["Content Manager", "Marketing Manager", "Growth"],
    hasCert: true, certName: "HubSpot Content Marketing Certification",
    rating: 4.5, enrolled: "500K",
    highlight: "Industry-standard content cert — renews annually",
  },

  /* ── MongoDB / Databases ── */
  {
    id: "mongo-university",
    title: "MongoDB for Developers (M101)",
    provider: "MongoDB University", providerLogo: "ti-leaf", providerColor: "#00ed64",
    url: "https://learn.mongodb.com/learning-paths/introduction-to-mongodb",
    cost: "free", level: "Beginner", durationHrs: 10,
    skills: ["mongodb", "nosql", "aggregation", "indexing", "node.js"],
    roles: ["Backend Engineer", "Full Stack Developer", "Data Engineer"],
    hasCert: true, certName: "MongoDB Associate Developer Badge",
    rating: 4.6, enrolled: "400K",
    highlight: "Free course + free associate badge from MongoDB",
  },

  /* ── HashiCorp / Terraform ── */
  {
    id: "hashi-terraform",
    title: "Terraform Fundamentals",
    provider: "HashiCorp / Developer Portal", providerLogo: "ti-diamond", providerColor: "#7b42bc",
    url: "https://developer.hashicorp.com/terraform/tutorials",
    cost: "free", level: "Intermediate", durationHrs: 12,
    skills: ["terraform", "aws", "infrastructure as code", "devops", "cloud"],
    roles: ["DevOps", "Cloud Engineer", "SRE"],
    hasCert: false, rating: 4.7, enrolled: "300K",
    highlight: "Hands-on tutorials — official Terraform docs + labs",
  },

  /* ── Salesforce ── */
  {
    id: "sf-trailhead",
    title: "Salesforce Admin + Developer Trailhead",
    provider: "Salesforce Trailhead", providerLogo: "ti-cloud", providerColor: "#ff9900",
    url: "https://trailhead.salesforce.com/content/learn/trails/force_com_dev_beginner",
    cost: "free", level: "Beginner", durationHrs: 40,
    skills: ["salesforce", "crm", "apex", "soql", "lightning"],
    roles: ["Salesforce Admin", "CRM Developer", "Solutions Engineer"],
    hasCert: false, rating: 4.6, enrolled: "600K",
    highlight: "Gamified learning with Trailblazer badges",
  },

  /* ── Scrum / Agile ── */
  {
    id: "scrum-org-psm",
    title: "Professional Scrum Master I (PSM I) Prep",
    provider: "Scrum.org", providerLogo: "ti-refresh", providerColor: "#009dc4",
    url: "https://www.scrum.org/pathway/scrum-master",
    cost: "free", level: "Beginner", durationHrs: 16,
    skills: ["scrum", "agile", "sprint planning", "product backlog", "retrospectives"],
    roles: ["Scrum Master", "Product Manager", "Project Manager", "Engineering Manager"],
    hasCert: false, rating: 4.7, enrolled: "700K",
    highlight: "Free learning path — PSM I exam is ₹15K (~$150)",
  },

  /* ── GitHub ── */
  {
    id: "github-foundations",
    title: "GitHub Foundations Certification",
    provider: "GitHub", providerLogo: "ti-brand-github", providerColor: "#24292f",
    url: "https://resources.github.com/learn/certifications/",
    cost: "free", level: "Beginner", durationHrs: 8,
    skills: ["git", "github", "version control", "pull requests", "github actions"],
    roles: ["SDE", "DevOps", "Full Stack Developer", "Data Scientist"],
    hasCert: true, certName: "GitHub Foundations Certificate",
    rating: 4.6, enrolled: "200K",
    highlight: "New in 2024 — GitHub's first official free cert",
  },

  /* ── Great Learning (India-focused) ── */
  {
    id: "gl-python",
    title: "Python for Machine Learning",
    provider: "Great Learning", providerLogo: "ti-book", providerColor: "#0063e0",
    url: "https://www.mygreatlearning.com/academy/learn-for-free/courses/python-for-machine-learning",
    cost: "free", level: "Beginner", durationHrs: 6,
    skills: ["python", "machine learning", "pandas", "scikit-learn"],
    roles: ["ML Engineer", "Data Scientist", "Data Analyst"],
    hasCert: true, certName: "Great Learning Python for ML Certificate",
    rating: 4.4, enrolled: "800K",
    highlight: "Popular in India — free cert shareable on LinkedIn",
  },
  {
    id: "gl-sql",
    title: "SQL for Data Science",
    provider: "Great Learning", providerLogo: "ti-book", providerColor: "#0063e0",
    url: "https://www.mygreatlearning.com/academy/learn-for-free/courses/sql-for-data-science1",
    cost: "free", level: "Beginner", durationHrs: 4,
    skills: ["sql", "data science", "queries", "joins", "aggregations"],
    roles: ["Data Analyst", "Data Scientist", "Backend Engineer"],
    hasCert: true, certName: "Great Learning SQL Certificate",
    rating: 4.3, enrolled: "600K",
    highlight: "Shareable LinkedIn cert — free forever",
  },

  /* ── Stanford / DeepLearning.AI ── */
  {
    id: "dlai-ml",
    title: "Machine Learning Specialization",
    provider: "DeepLearning.AI / Coursera", providerLogo: "ti-brain", providerColor: "#ef4444",
    url: "https://www.coursera.org/specializations/machine-learning-introduction",
    cost: "freemium", level: "Intermediate", durationHrs: 90,
    skills: ["machine learning", "python", "tensorflow", "neural networks", "supervised learning"],
    roles: ["ML Engineer", "Data Scientist", "AI Engineer"],
    hasCert: true, certName: "ML Specialization Certificate (Andrew Ng)",
    rating: 4.9, enrolled: "1.5M",
    highlight: "Andrew Ng's legendary course — reshaped ML education",
  },
  {
    id: "dlai-dl",
    title: "Deep Learning Specialization",
    provider: "DeepLearning.AI / Coursera", providerLogo: "ti-brain", providerColor: "#ef4444",
    url: "https://www.coursera.org/specializations/deep-learning",
    cost: "freemium", level: "Advanced", durationHrs: 120,
    skills: ["deep learning", "cnn", "rnn", "nlp", "pytorch", "tensorflow"],
    roles: ["ML Engineer", "AI Engineer", "Research Scientist"],
    hasCert: true, certName: "Deep Learning Specialization Certificate",
    rating: 4.9, enrolled: "700K",
    highlight: "Industry standard for serious ML/AI careers",
  },
];

/* ── ROI signals (per cert — shown on cards with hasCert) ───── */
const ROI_SIGNALS: Record<string, { multiplier: string; roles: string; salaryDelta?: string }> = {
  "goog-it":          { multiplier: "2.1×", roles: "IT Support & Sysadmin",    salaryDelta: "+18%" },
  "goog-da":          { multiplier: "2.8×", roles: "Data Analyst",             salaryDelta: "+22%" },
  "goog-pm":          { multiplier: "2.4×", roles: "Project Manager",          salaryDelta: "+20%" },
  "goog-ux":          { multiplier: "2.3×", roles: "UX / Product Designer",    salaryDelta: "+19%" },
  "aws-clf":          { multiplier: "3.1×", roles: "Cloud & DevOps",           salaryDelta: "+28%" },
  "aws-saa":          { multiplier: "3.6×", roles: "Cloud Architect",          salaryDelta: "+34%" },
  "az-fundamentals":  { multiplier: "2.9×", roles: "Cloud / Azure roles",      salaryDelta: "+26%" },
  "ms-pl300":         { multiplier: "2.5×", roles: "Data Analyst (Power BI)",  salaryDelta: "+21%" },
  "ibm-da":           { multiplier: "2.6×", roles: "Data Analyst",             salaryDelta: "+20%" },
  "meta-fe":          { multiplier: "2.2×", roles: "Frontend / React roles",   salaryDelta: "+17%" },
  "fcc-js":           { multiplier: "1.9×", roles: "Frontend Developer",       salaryDelta: "+15%" },
  "nptel-dsa":        { multiplier: "2.0×", roles: "SDE / Backend",            salaryDelta: "+16%" },
  "cs50-x":           { multiplier: "2.7×", roles: "SDE (entry level)",        salaryDelta: "+24%" },
  "cs50-python":      { multiplier: "2.4×", roles: "Backend / Data Science",   salaryDelta: "+21%" },
  "cs50-sql":         { multiplier: "2.3×", roles: "Data Analyst / Backend",   salaryDelta: "+19%" },
  "hs-digital":       { multiplier: "1.8×", roles: "Digital Marketing",        salaryDelta: "+14%" },
  "hs-content":       { multiplier: "1.7×", roles: "Content & Growth",         salaryDelta: "+13%" },
  "mongo-university": { multiplier: "2.0×", roles: "Backend / Full Stack",     salaryDelta: "+16%" },
  "scrum-org-psm":    { multiplier: "2.2×", roles: "Scrum Master / PM",        salaryDelta: "+18%" },
  "github-foundations":{ multiplier: "1.9×", roles: "SDE & DevOps",            salaryDelta: "+14%" },
  "gl-python":        { multiplier: "2.1×", roles: "ML / Data Science",        salaryDelta: "+17%" },
  "gl-sql":           { multiplier: "1.8×", roles: "Data Analyst",             salaryDelta: "+13%" },
  "dlai-ml":          { multiplier: "3.2×", roles: "ML Engineer",              salaryDelta: "+30%" },
  "dlai-dl":          { multiplier: "3.8×", roles: "AI / Deep Learning",       salaryDelta: "+38%" },
};

/* ── Filter constants ────────────────────────────────────────── */
const PROVIDERS = ["All", "Google", "AWS", "Microsoft", "IBM", "Meta", "freeCodeCamp",
                   "Kaggle", "NPTEL", "Harvard", "DeepLearning.AI", "HubSpot", "GitHub", "Other"];

const ROLES_FILTER = ["All Roles", "Software Engineer", "Data Scientist", "ML Engineer",
                      "DevOps / Cloud", "Product Manager", "UX Designer", "Data Analyst",
                      "Marketing", "Cybersecurity"];

const ROLE_KEYWORD_MAP: Record<string, string[]> = {
  "Software Engineer": ["sde", "developer", "engineer", "full stack", "backend", "frontend"],
  "Data Scientist":    ["data scientist", "data science"],
  "ML Engineer":       ["ml engineer", "ai engineer", "machine learning"],
  "DevOps / Cloud":    ["devops", "cloud", "sre", "infrastructure"],
  "Product Manager":   ["product manager"],
  "UX Designer":       ["ux designer", "ui designer", "product designer"],
  "Data Analyst":      ["data analyst", "business analyst", "analytics"],
  "Marketing":         ["marketing"],
  "Cybersecurity":     ["security", "cybersecurity", "soc"],
};

const PROVIDER_KEYWORD_MAP: Record<string, string[]> = {
  "Google":          ["google"],
  "AWS":             ["aws"],
  "Microsoft":       ["microsoft"],
  "IBM":             ["ibm"],
  "Meta":            ["meta"],
  "freeCodeCamp":    ["freecodecamp"],
  "Kaggle":          ["kaggle"],
  "NPTEL":           ["nptel"],
  "Harvard":         ["harvard"],
  "DeepLearning.AI": ["deeplearning"],
  "HubSpot":         ["hubspot"],
  "GitHub":          ["github"],
  "Other": [],
};

/* ── Helpers ─────────────────────────────────────────────────── */
function costColor(cost: Cost) {
  if (cost === "free")      return { bg: "rgba(34,197,94,.1)",  color: "var(--success)",       border: "rgba(34,197,94,.25)"  };
  if (cost === "freemium")  return { bg: "rgba(99,102,241,.1)", color: "var(--accent)",  border: "var(--accborder)"     };
  return                           { bg: "rgba(245,158,11,.1)", color: "#f59e0b",       border: "rgba(245,158,11,.25)" };
}

function costLabel(cost: Cost) {
  if (cost === "free")     return "Free";
  if (cost === "freemium") return "Audit Free";
  return "Paid";
}

function levelColor(level: Level) {
  if (level === "Beginner")     return "var(--success)";
  if (level === "Intermediate") return "#f59e0b";
  return "var(--danger)";
}

/* ── Star rating (visual) ───────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[1,2,3,4,5].map(i => {
        const filled = rating >= i;
        const half   = !filled && rating >= i - 0.5;
        return (
          <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={filled ? "#f59e0b" : half ? "url(#half)" : "none"} stroke="#f59e0b" strokeWidth="2">
            {half && (
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="#f59e0b"/>
                  <stop offset="50%" stopColor="transparent"/>
                </linearGradient>
              </defs>
            )}
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        );
      })}
    </span>
  );
}

/* ── Duration bar ───────────────────────────────────────────── */
function DurationBar({ hrs }: { hrs: number }) {
  const maxHrs = 300;
  const pct = Math.min(100, (hrs / maxHrs) * 100);
  const label = hrs < 10 ? `${hrs}h` : hrs < 40 ? `~${hrs}h` : hrs < 100 ? `~${hrs}h` : `~${Math.round(hrs/40)}w`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 2, opacity: 0.7 }} />
      </div>
      <span style={{ fontSize: 10, color: "var(--text3)", whiteSpace: "nowrap", minWidth: 26 }}>{label}</span>
    </div>
  );
}

/* ── Card ────────────────────────────────────────────────────── */
function CourseCard({ c }: { c: Course }) {
  const [expanded, setExpanded] = useState(false);
  const cc = costColor(c.cost);
  const iconColor = c.providerColor ?? "var(--accent)";
  const brand = isAffiliateCourse(c.provider);

  const handleOpen = useCallback(async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    if (brand) {
      const finalUrl = await getAffiliateUrl(c.url, brand, c.id);
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } else {
      window.open(c.url, "_blank", "noopener,noreferrer");
    }
  }, [brand, c.url, c.id]);

  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${expanded ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 12, overflow: "hidden",
      transition: "border-color .15s, box-shadow .15s",
      boxShadow: expanded ? "0 4px 24px rgba(99,102,241,.1)" : "none",
    }}
      onMouseEnter={e => { if (!expanded) { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(99,102,241,.08)"; } }}
      onMouseLeave={e => { if (!expanded) { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; } }}
    >
      {/* ── Collapsed view (always visible) ── */}
      <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpanded(x => !x)}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9, flexShrink: 0,
            background: `${iconColor}18`, border: `1px solid ${iconColor}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className={`ti ${c.providerLogo}`} style={{ fontSize: 18, color: iconColor }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", lineHeight: 1.4, marginBottom: 2 }}>
              {c.title}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.provider}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 10,
              background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`, whiteSpace: "nowrap",
            }}>
              {costLabel(c.cost)}
            </span>
            {c.hasCert && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--success)", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", padding: "2px 7px", borderRadius: 10 }}>
                <i className="ti ti-award" style={{ marginRight: 2 }}/>Cert
              </span>
            )}
          </div>
        </div>

        {/* Rating + meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <StarRating rating={c.rating} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>{c.rating}</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>({c.enrolled} enrolled)</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>·</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: levelColor(c.level), background: `${levelColor(c.level)}18`, padding: "1px 7px", borderRadius: 6 }}>{c.level}</span>
        </div>

        {/* Duration bar */}
        <DurationBar hrs={c.durationHrs} />

        {/* Highlight */}
        {c.highlight && (
          <div style={{
            fontSize: 11, color: "var(--accent)", background: "var(--accdim)",
            border: "1px solid var(--accborder)", borderRadius: 6,
            padding: "5px 9px", marginTop: 8, lineHeight: 1.4,
          }}>
            <i className="ti ti-sparkles" style={{ marginRight: 4, fontSize: 11 }}/>{c.highlight}
          </div>
        )}

        {/* Skills (first 4) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {c.skills.slice(0, 4).map(s => (
            <span key={s} style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 6,
              background: "var(--surface2)", border: "1px solid var(--border)",
              color: "var(--text2)", whiteSpace: "nowrap",
            }}>{s}</span>
          ))}
          {c.skills.length > 4 && (
            <span style={{ fontSize: 10, color: "var(--text3)", padding: "2px 4px" }}>+{c.skills.length - 4} more</span>
          )}
        </div>

        {/* Expand toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
            {expanded ? "▲ Less details" : "▼ See full details"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>~{c.durationHrs}h total</span>
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)", padding: "14px 16px" }}>
          {/* All skills */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>
              Skills covered
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {c.skills.map(s => (
                <span key={s} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 6,
                  background: "var(--accdim)", border: "1px solid var(--accborder)",
                  color: "var(--accent)", fontWeight: 600,
                }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Target roles */}
          {c.roles.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>
                Best for roles
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {c.roles.map(r => (
                  <span key={r} style={{
                    fontSize: 11, padding: "3px 9px", borderRadius: 6,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    color: "var(--text2)",
                  }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Cert info */}
          {c.hasCert && c.certName && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.18)",
              borderRadius: 8, padding: "8px 12px", marginBottom: 12,
            }}>
              <i className="ti ti-award" style={{ color: "var(--success)", fontSize: 16, flexShrink: 0 }}/>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>Certificate: {c.certName}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>Issued on completion · Shareable on LinkedIn</div>
              </div>
            </div>
          )}

          {/* ROI signal */}
          {c.hasCert && ROI_SIGNALS[c.id] && (() => {
            const roi = ROI_SIGNALS[c.id];
            return (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)",
                borderRadius: 8, padding: "8px 12px", marginBottom: 12,
              }}>
                <i className="ti ti-trending-up" style={{ fontSize: 14, color: "var(--accent)", marginTop: 1, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--accent)" }}>{roi.multiplier} more interview calls</strong> · {roi.roles}
                  {roi.salaryDelta && <> · Avg salary lift: <strong>{roi.salaryDelta}</strong></>}
                </span>
              </div>
            );
          })()}

          {/* Rating breakdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b", lineHeight: 1 }}>{c.rating}</div>
              <StarRating rating={c.rating} />
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{c.enrolled} learners</div>
            </div>
            <div style={{ flex: 1 }}>
              {[5,4,3,2,1].map(star => {
                const approxPct = star === 5 ? 72 : star === 4 ? 18 : star === 3 ? 6 : star === 2 ? 2 : 2;
                return (
                  <div key={star} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "var(--text3)", width: 8 }}>{star}</span>
                    <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${approxPct}%`, height: "100%", background: "#f59e0b", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text3)", width: 26 }}>{approxPct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button onClick={handleOpen} style={{
            width: "100%", padding: "11px 0", borderRadius: 9, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}>
            <i className="ti ti-external-link" style={{ fontSize: 13 }}/>
            {c.cost === "free" ? "Start for free" : c.cost === "freemium" ? "Audit for free" : "Enroll now"} →
          </button>
        </div>
      )}
    </div>
  );
}


/* ── Suggested course shape from API ─────────────────────────── */
interface CourseSuggestion {
  courseId:      string;
  title:         string;
  provider:      string;
  reason:        string;
  skillsCovered: string[];
  priority:      1 | 2 | 3;
  isFree:        boolean;
}

/* ── Learning log entry ──────────────────────────────────────── */
interface LearningLog {
  id:           string;
  course_id:    string;
  course_title: string;
  provider:     string;
  status:       "started" | "completed" | "dropped";
  started_at:   string;
  completed_at?: string | null;
  skill_tag?:   string | null;
}

/* ── Suggested tab ───────────────────────────────────────────── */
function SuggestedTab({ logs }: { logs: LearningLog[] }) {
  const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
  const [summary, setSummary]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [fetched, setFetched]         = useState(false);

  const completedIds = logs.filter(l => l.status === "completed").map(l => l.course_id);
  const startedIds   = logs.filter(l => l.status === "started").map(l => l.course_id);

  async function fetchSuggestions() {
    setLoading(true); setError("");
    try {
      // Get skills from localStorage resume
      let currentSkills: string[] = [];
      let targetRole = "";
      try {
        const raw = localStorage.getItem("jobsayer-resume-draft");
        if (raw) {
          const parsed = JSON.parse(raw);
          const data = parsed.data ?? parsed;
          if (data.skills) currentSkills = data.skills.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
          if (data.title) targetRole = data.title;
        }
      } catch { /* ignore */ }

      const res = await fetch("/api/learn/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentSkills, targetRole, completedIds, preferFree: false }),
      });
      if (!res.ok) { setError("Could not load suggestions. Try again."); return; }
      const data = await res.json() as { suggestions: CourseSuggestion[]; summary: string };
      setSuggestions(data.suggestions ?? []);
      setSummary(data.summary ?? "");
      setFetched(true);
    } catch {
      setError("Network error. Please try again.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void fetchSuggestions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function trackStart(s: CourseSuggestion) {
    // Find matching course in COURSES array
    const course = COURSES.find(c => c.id === s.courseId);
    const url = course?.url ?? "#";
    // Log as started
    try {
      await fetch("/api/learn/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: s.courseId, courseTitle: s.title,
          provider: s.provider, skillTag: s.skillsCovered[0] ?? null,
          affiliateUrl: url, status: "started",
        }),
      });
    } catch { /* non-blocking */ }
    // Get affiliate URL if needed
    const brand = isAffiliateCourse(s.provider);
    const finalUrl = brand ? await getAffiliateUrl(url, brand, s.courseId) : url;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  }

  const priorityLabel: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "Critical gap", color: "var(--danger)",  bg: "rgba(239,68,68,.08)"   },
    2: { label: "High value",   color: "var(--accent)",  bg: "var(--accdim)"          },
    3: { label: "Nice to have", color: "var(--text3)",   bg: "var(--surface2)"        },
  };

  function scoreBoost(s: CourseSuggestion): number {
    const c = COURSES.find(x => x.id === s.courseId);
    let pts = s.priority === 1 ? 14 : s.priority === 2 ? 9 : 4;
    if (c?.hasCert) pts += 5;
    if ((c?.durationHrs ?? 0) > 100) pts += 3;
    return pts;
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      {[0,1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
    </div>
  );

  if (error) return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
      <div style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</div>
      <button onClick={() => void fetchSuggestions()} style={{
        padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "#fff",
        border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
      }}>Retry</button>
    </div>
  );

  return (
    <div>
      {summary && (
        <div style={{
          background: "var(--accdim)", border: "1px solid var(--accborder)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 20,
          fontSize: 13, color: "var(--text2)", lineHeight: 1.6,
        }}>
          <i className="ti ti-sparkles" style={{ color: "var(--accent)", marginRight: 6 }}/>
          {summary}
        </div>
      )}

      {suggestions.length === 0 && fetched && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
          No suggestions yet — add skills to your resume and try again.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {suggestions.map(s => {
          const pl     = priorityLabel[s.priority] ?? priorityLabel[3];
          const isStarted   = startedIds.includes(s.courseId);
          const isCompleted = completedIds.includes(s.courseId);
          const course = COURSES.find(c => c.id === s.courseId);
          const iconColor = course?.providerColor ?? "var(--accent)";

          return (
            <div key={s.courseId} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "16px 18px",
              display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              {/* Provider icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${iconColor}18`, border: `1px solid ${iconColor}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`ti ${course?.providerLogo ?? "ti-school"}`} style={{ fontSize: 18, color: iconColor }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 10,
                    background: pl.bg, color: pl.color, border: `1px solid ${pl.color}30`,
                  }}>{pl.label}</span>
                  {/* Score boost badge */}
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 10,
                    background: "rgba(34,197,94,.1)", color: "var(--success)",
                    border: "1px solid rgba(34,197,94,.25)", display: "inline-flex", alignItems: "center", gap: 2,
                  }}>
                    <i className="ti ti-trending-up" style={{ fontSize: 9 }}/>+{scoreBoost(s)} pts
                  </span>
                  {s.isFree && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "rgba(34,197,94,.08)", color: "var(--success)", border: "1px solid rgba(34,197,94,.2)" }}>Free</span>}
                  {isCompleted && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "rgba(34,197,94,.08)", color: "var(--success)" }}>✓ Completed</span>}
                  {isStarted && !isCompleted && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "var(--accdim)", color: "var(--accent)" }}>In progress</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>{s.provider}</div>

                {/* AI reason */}
                <div style={{
                  fontSize: 12, color: "var(--text2)", lineHeight: 1.5,
                  background: "var(--surface2)", borderRadius: 7, padding: "6px 10px", marginBottom: 10,
                }}>
                  <i className="ti ti-robot" style={{ color: "var(--accent)", marginRight: 5, fontSize: 11 }}/>
                  {s.reason}
                </div>

                {/* Skills covered */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {s.skillsCovered.slice(0, 4).map(sk => (
                    <span key={sk} style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 6,
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      color: "var(--text2)",
                    }}>{sk}</span>
                  ))}
                </div>
              </div>

              {/* Action button */}
              <button
                onClick={() => void trackStart(s)}
                disabled={isCompleted}
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: "none", cursor: isCompleted ? "default" : "pointer",
                  background: isCompleted ? "var(--surface2)" : "var(--accent)",
                  color: isCompleted ? "var(--text3)" : "#fff",
                  flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                {isCompleted ? "Done ✓" : isStarted ? "Resume →" : "Start →"}
              </button>
            </div>
          );
        })}
      </div>

      {fetched && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button onClick={() => { setFetched(false); void fetchSuggestions(); }} style={{
            padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer",
          }}>
            <i className="ti ti-refresh"/> Refresh suggestions
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Progress tab (In Progress + Completed) ──────────────────── */
function ProgressTab({ logs, onRefresh }: { logs: LearningLog[]; onRefresh: () => void }) {
  const inProgress = logs.filter(l => l.status === "started");
  const completed  = logs.filter(l => l.status === "completed");

  async function markComplete(log: LearningLog) {
    try {
      await fetch("/api/learn/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: log.course_id, courseTitle: log.course_title,
          provider: log.provider, skillTag: log.skill_tag ?? null, status: "completed",
        }),
      });
      onRefresh();
    } catch { /* ignore */ }
  }

  if (logs.length === 0) return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text3)" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
      <div style={{ fontSize: 14, marginBottom: 6 }}>No courses tracked yet</div>
      <div style={{ fontSize: 12 }}>Click &quot;Start&quot; on a suggestion or Browse tab to begin tracking</div>
    </div>
  );

  return (
    <div>
      {inProgress.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>
            In Progress ({inProgress.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inProgress.map(l => (
              <div key={l.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{l.course_title}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                    {l.provider} · Started {new Date(l.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                </div>
                <button onClick={() => void markComplete(l)} style={{
                  padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: "rgba(34,197,94,.1)", color: "var(--success)", fontSize: 12, fontWeight: 700,
                }}>
                  Mark done ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Completed ({completed.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {completed.map(l => (
              <div key={l.id} style={{
                background: "rgba(34,197,94,.04)", border: "1px solid rgba(34,197,94,.15)",
                borderRadius: 10, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <i className="ti ti-circle-check" style={{ fontSize: 18, color: "var(--success)", flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{l.course_title}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                    {l.provider}
                    {l.completed_at && <> · Completed {new Date(l.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
                    {l.skill_tag && <> · <strong style={{ color: "var(--success)" }}>+{l.skill_tag}</strong></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function LearnPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"suggested" | "progress" | "browse">(user ? "suggested" : "browse");
  const [logs, setLogs]           = useState<LearningLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  // Load learning logs when signed in
  useEffect(() => {
    if (!user) { setLogsLoaded(true); return; }
    fetch("/api/learn/log")
      .then(r => r.json())
      .then((d: { logs?: LearningLog[] }) => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLogsLoaded(true));
  }, [user]);

  function refreshLogs() {
    if (!user) return;
    fetch("/api/learn/log")
      .then(r => r.json())
      .then((d: { logs?: LearningLog[] }) => setLogs(d.logs ?? []))
      .catch(() => {});
  }

  const inProgressCount = logs.filter(l => l.status === "started").length;
  const completedCount  = logs.filter(l => l.status === "completed").length;

  const [search,      setSearch]      = useState("");
  const [provider,    setProvider]    = useState("All");
  const [roleFilter,  setRoleFilter]  = useState("All Roles");
  const [costFilter,  setCostFilter]  = useState<"all" | Cost>("all");
  const [certOnly,    setCertOnly]    = useState(false);
  const [sortBy,      setSortBy]      = useState<"rating" | "enrolled" | "duration">("rating");

  const visible = useMemo(() => {
    return COURSES
      .filter(c => {
        // search
        if (search) {
          const q = search.toLowerCase();
          if (!c.title.toLowerCase().includes(q) &&
              !c.provider.toLowerCase().includes(q) &&
              !c.skills.some(s => s.includes(q))) return false;
        }
        // provider
        if (provider !== "All") {
          const kw = PROVIDER_KEYWORD_MAP[provider] ?? [];
          if (kw.length > 0 && !kw.some(k => c.provider.toLowerCase().includes(k))) {
            // "Other" = nothing matched known providers
            if (provider === "Other") {
              const knownMatch = Object.entries(PROVIDER_KEYWORD_MAP)
                .filter(([k]) => k !== "Other")
                .some(([, kws]) => kws.some(k => c.provider.toLowerCase().includes(k)));
              if (knownMatch) return false;
            } else {
              return false;
            }
          }
        }
        // role
        if (roleFilter !== "All Roles") {
          const kw = ROLE_KEYWORD_MAP[roleFilter] ?? [];
          const matchesRole = c.roles.some(r =>
            kw.some(k => r.toLowerCase().includes(k))
          );
          if (!matchesRole) return false;
        }
        // cost
        if (costFilter !== "all" && c.cost !== costFilter) return false;
        // cert only
        if (certOnly && !c.hasCert) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating")   return b.rating - a.rating;
        if (sortBy === "duration") return a.durationHrs - b.durationHrs;
        // enrolled — parse "2.4M" etc.
        const parse = (s: string) => {
          const n = parseFloat(s);
          return s.endsWith("M") ? n * 1_000_000 : s.endsWith("K") ? n * 1_000 : n;
        };
        return parse(b.enrolled) - parse(a.enrolled);
      });
  }, [search, provider, roleFilter, costFilter, certOnly, sortBy]);

  const freeCount = COURSES.filter(c => c.cost === "free").length;
  const certCount = COURSES.filter(c => c.hasCert).length;

  return (
    <AppShell aiPanel={false}>
      <div style={{ padding: "24px 28px", maxWidth: 1000 }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)", margin: 0 }}>
            Courses & Certifications
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, marginBottom: 0 }}>
            {COURSES.length} curated courses · {freeCount} completely free · {certCount} issue certificates ·
            {" "}sourced from Google, AWS, Microsoft, IBM, Meta, NPTEL, Harvard &amp; more
          </p>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--border)", marginBottom: 24 }}>
          {([
            { key: "suggested", label: "✦ Suggested", show: !!user },
            { key: "progress",  label: `My Progress${inProgressCount + completedCount > 0 ? ` (${inProgressCount + completedCount})` : ""}`, show: !!user },
            { key: "browse",    label: "Browse All",  show: true },
          ] as { key: string; label: string; show: boolean }[]).filter(t => t.show).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as "suggested" | "progress" | "browse")}
              style={{
                padding: "9px 16px", fontSize: 13, fontWeight: 700, border: "none",
                cursor: "pointer", fontFamily: "inherit", borderRadius: "8px 8px 0 0",
                background: activeTab === t.key ? "var(--accent)" : "transparent",
                color:      activeTab === t.key ? "#fff"         : "var(--text3)",
                borderBottom: activeTab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Suggested tab */}
        {activeTab === "suggested" && user && logsLoaded && (
          <SuggestedTab logs={logs} />
        )}

        {/* Progress tab */}
        {activeTab === "progress" && user && logsLoaded && (
          <ProgressTab logs={logs} onRefresh={refreshLogs} />
        )}

        {/* Browse tab wrapper */}
        {activeTab === "browse" && (<>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "ti-certificate", label: "With Certificate",  value: certCount,                   color: "var(--success)" },
            { icon: "ti-gift",        label: "100% Free",          value: freeCount,                   color: "var(--accent)" },
            { icon: "ti-building",    label: "Top Providers",      value: "12+",                       color: "#f59e0b" },
            { icon: "ti-users",       label: "Total Enrolled",     value: "50M+",                      color: "#8b5cf6" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 13, color: s.color }} />
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text1)", margin: "4px 0 2px" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Career GPS link */}
        <div style={{
          background: "var(--accdim)", border: "1px solid var(--accborder)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <i className="ti ti-compass" style={{ fontSize: 18, color: "var(--accent)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>
              Get personalised recommendations
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              Run Career GPS to detect your skill gaps — we&apos;ll surface the exact courses to close them.
            </div>
          </div>
          <a href="/career-gps" style={{
            padding: "7px 14px", borderRadius: 8, background: "var(--accent)", color: "#fff",
            fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0,
          }}>
            Run GPS <i className="ti ti-arrow-right"/>
          </a>
        </div>

        {/* Filters */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text3)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by course name, provider, or skill..."
              style={{
                width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text1)", padding: "8px 12px 8px 32px",
                fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Cost */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "free", "freemium"] as const).map(c => (
                <button key={c} onClick={() => setCostFilter(c)} style={{
                  padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
                  background: costFilter === c ? "var(--accent)" : "var(--surface2)",
                  color:      costFilter === c ? "#fff"          : "var(--text3)",
                }}>
                  {c === "all" ? "All" : c === "free" ? "Free only" : "Audit free"}
                </button>
              ))}
            </div>

            {/* Cert toggle */}
            <button onClick={() => setCertOnly(o => !o)} style={{
              padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
              background: certOnly ? "var(--accent)" : "var(--surface2)",
              color:      certOnly ? "#fff"          : "var(--text3)",
            }}>
              <i className="ti ti-award"/> With cert
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text2)", padding: "5px 10px",
                fontSize: 11, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              <option value="rating">Sort: Highest rated</option>
              <option value="enrolled">Sort: Most enrolled</option>
              <option value="duration">Sort: Shortest first</option>
            </select>

            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)" }}>
              {visible.length} result{visible.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Role filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {ROLES_FILTER.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
              background: roleFilter === r ? "var(--accdim)" : "transparent",
              color:      roleFilter === r ? "var(--accent)" : "var(--text3)",
              borderColor: roleFilter === r ? "var(--accborder)" : "var(--border)",
            }}>
              {r}
            </button>
          ))}
        </div>

        {/* Provider pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {PROVIDERS.map(p => (
            <button key={p} onClick={() => setProvider(p)} style={{
              padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
              background: provider === p ? "var(--accent)" : "var(--surface2)",
              color:      provider === p ? "#fff"          : "var(--text3)",
            }}>
              {p}
            </button>
          ))}
        </div>

        {/* Results grid */}
        {visible.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
            No courses match your filters. Try widening the search.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {visible.map(c => <CourseCard key={c.id} c={c} />)}
          </div>
        )}

        {/* Bottom tip */}
        <div style={{
          marginTop: 28, padding: "14px 16px", background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 10,
          fontSize: 12, color: "var(--text3)", lineHeight: 1.7,
        }}>
          <strong style={{ color: "var(--text2)" }}><i className="ti ti-bulb"/> Pro tip:</strong>{" "}
          &quot;Audit free&quot; courses (marked "Audit free") are free to learn but charge for the certificate.
          Many employers value the skill over the cert — audit freely, pay only if you need the badge for your resume.
          NPTEL courses are 100% free and exams cost ~₹1,000 — highest ROI for Indian tech professionals.
        </div>
        </>)}
      </div>
    </AppShell>
  );
}
