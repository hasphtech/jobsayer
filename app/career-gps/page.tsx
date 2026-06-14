"use client";
/**
 * /career-gps — Career GPS (Global)
 * Target role selector <i className="ti ti-arrow-right"/> skill gap analysis vs resume <i className="ti ti-arrow-right"/> personalised learning roadmap.
 * Globally framed: USD salary ranges, worldwide top companies.
 */
import React, { useState, useEffect } from "react";
import { useWindowWidth } from "@/lib/useWindowWidth";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import CourseCard from "@/components/CourseCard";
import { getCoursesForSkill } from "@/lib/courseRecommendations";
import type { ResumeData } from "@/lib/types";
import { trackAction } from "@/lib/activityTracker";
import { useAuth } from "@/lib/useAuth";
import { listResumes, loadResumeSave } from "@/lib/resumeDb";

/* ── Role blueprints ─────────────────────────────────────────── */
interface RoleBlueprint {
  title:        string;
  category:     string;
  icon:         string;
  salaryRange:  string;          // global USD range
  demand:       "very high" | "high" | "medium";
  topCompanies: string[];
  skills: {
    name:      string;
    level:     "core" | "advanced" | "bonus";
    resources: { label: string; url: string; type: "free" | "paid" | "cert" }[];
  }[];
}

const ROLE_BLUEPRINTS: RoleBlueprint[] = [
  /* ── Engineering ───────────────────────────────────────────── */
  {
    title: "Full Stack Engineer",
    category: "Engineering",
    icon: "ti-bolt",
    salaryRange: "$120K–$220K",
    demand: "very high",
    topCompanies: ["Stripe", "Shopify", "Vercel", "Linear", "Notion"],
    skills: [
      { name: "React", level: "core", resources: [
        { label: "React Docs", url: "https://react.dev", type: "free" },
        { label: "Scrimba React Course", url: "https://scrimba.com/learn/learnreact", type: "free" },
      ]},
      { name: "Node.js", level: "core", resources: [
        { label: "Node.js Official Docs", url: "https://nodejs.org/en/learn", type: "free" },
        { label: "NodeJS — The Complete Guide (Udemy)", url: "https://www.udemy.com/course/nodejs-the-complete-guide/", type: "paid" },
      ]},
      { name: "TypeScript", level: "core", resources: [
        { label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/", type: "free" },
        { label: "Execute Program TypeScript", url: "https://www.executeprogram.com/courses/typescript", type: "paid" },
      ]},
      { name: "PostgreSQL", level: "core", resources: [
        { label: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/", type: "free" },
      ]},
      { name: "Docker", level: "advanced", resources: [
        { label: "Play with Docker", url: "https://labs.play-with-docker.com/", type: "free" },
        { label: "Docker Mastery (Udemy)", url: "https://www.udemy.com/course/docker-mastery/", type: "paid" },
      ]},
      { name: "System Design", level: "advanced", resources: [
        { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer", type: "free" },
        { label: "Grokking System Design", url: "https://www.designgurus.io/course/grokking-the-system-design-interview", type: "paid" },
      ]},
      { name: "AWS / GCP / Azure", level: "bonus", resources: [
        { label: "AWS Free Tier", url: "https://aws.amazon.com/free/", type: "free" },
        { label: "AWS Certified Developer", url: "https://aws.amazon.com/certification/certified-developer-associate/", type: "cert" },
      ]},
    ],
  },
  {
    title: "Backend Engineer",
    category: "Engineering",
    icon: "ti-tool",
    salaryRange: "$130K–$240K",
    demand: "very high",
    topCompanies: ["Cloudflare", "PlanetScale", "Neon", "Fly.io", "Turso"],
    skills: [
      { name: "Go or Rust or Java", level: "core", resources: [
        { label: "Go Tour", url: "https://go.dev/tour/", type: "free" },
        { label: "Rust Book", url: "https://doc.rust-lang.org/book/", type: "free" },
        { label: "Java Brains", url: "https://javabrains.io/", type: "free" },
      ]},
      { name: "PostgreSQL / MySQL", level: "core", resources: [
        { label: "Use the Index, Luke!", url: "https://use-the-index-luke.com/", type: "free" },
      ]},
      { name: "REST API Design", level: "core", resources: [
        { label: "REST API Best Practices", url: "https://www.freecodecamp.org/news/rest-api-best-practices-rest-endpoint-design-examples/", type: "free" },
      ]},
      { name: "Redis", level: "core", resources: [
        { label: "Redis University", url: "https://university.redis.io/", type: "free" },
      ]},
      { name: "Microservices", level: "advanced", resources: [
        { label: "Microservices.io patterns", url: "https://microservices.io/patterns/", type: "free" },
      ]},
      { name: "Kubernetes", level: "advanced", resources: [
        { label: "K8s Docs", url: "https://kubernetes.io/docs/tutorials/", type: "free" },
        { label: "CKA Certification", url: "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/", type: "cert" },
      ]},
      { name: "System Design", level: "advanced", resources: [
        { label: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", type: "free" },
        { label: "ByteByteGo", url: "https://bytebytego.com/", type: "paid" },
      ]},
    ],
  },
  {
    title: "Frontend Engineer",
    category: "Engineering",
    icon: "ti-palette",
    salaryRange: "$100K–$195K",
    demand: "high",
    topCompanies: ["Vercel", "Figma", "Webflow", "Framer", "Linear"],
    skills: [
      { name: "React", level: "core", resources: [
        { label: "React Docs", url: "https://react.dev", type: "free" },
      ]},
      { name: "TypeScript", level: "core", resources: [
        { label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/", type: "free" },
      ]},
      { name: "CSS / Tailwind", level: "core", resources: [
        { label: "CSS Tricks", url: "https://css-tricks.com/", type: "free" },
        { label: "Tailwind CSS Docs", url: "https://tailwindcss.com/docs", type: "free" },
      ]},
      { name: "Next.js", level: "advanced", resources: [
        { label: "Next.js Docs", url: "https://nextjs.org/docs", type: "free" },
        { label: "Next.js Learn", url: "https://nextjs.org/learn", type: "free" },
      ]},
      { name: "Performance Optimisation", level: "advanced", resources: [
        { label: "web.dev / Learn Performance", url: "https://web.dev/learn/performance/", type: "free" },
      ]},
      { name: "Testing (Vitest / Playwright)", level: "bonus", resources: [
        { label: "Vitest Docs", url: "https://vitest.dev/", type: "free" },
        { label: "Playwright Docs", url: "https://playwright.dev/", type: "free" },
      ]},
    ],
  },
  {
    title: "DevOps / Platform Engineer",
    category: "Engineering",
    icon: "ti-tools",
    salaryRange: "$140K–$250K",
    demand: "very high",
    topCompanies: ["HashiCorp", "Datadog", "PagerDuty", "Grafana Labs", "Cloudflare"],
    skills: [
      { name: "Linux", level: "core", resources: [
        { label: "Linux Journey", url: "https://linuxjourney.com/", type: "free" },
      ]},
      { name: "Docker", level: "core", resources: [
        { label: "Docker Docs", url: "https://docs.docker.com/get-started/", type: "free" },
      ]},
      { name: "Kubernetes", level: "core", resources: [
        { label: "K8s Docs", url: "https://kubernetes.io/docs/tutorials/", type: "free" },
        { label: "CKA Certification", url: "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/", type: "cert" },
      ]},
      { name: "Terraform / IaC", level: "core", resources: [
        { label: "Terraform Tutorials", url: "https://developer.hashicorp.com/terraform/tutorials", type: "free" },
      ]},
      { name: "AWS / GCP / Azure", level: "advanced", resources: [
        { label: "AWS Free Tier", url: "https://aws.amazon.com/free/", type: "free" },
        { label: "AWS Solutions Architect", url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/", type: "cert" },
      ]},
      { name: "CI/CD (GitHub Actions)", level: "advanced", resources: [
        { label: "GitHub Actions Docs", url: "https://docs.github.com/en/actions", type: "free" },
      ]},
      { name: "Observability (Datadog / Prometheus)", level: "advanced", resources: [
        { label: "Prometheus Docs", url: "https://prometheus.io/docs/introduction/overview/", type: "free" },
        { label: "Datadog Learning Center", url: "https://learn.datadoghq.com/", type: "free" },
      ]},
    ],
  },
  {
    title: "Site Reliability Engineer (SRE)",
    category: "Engineering",
    icon: "ti-radio",
    salaryRange: "$150K–$270K",
    demand: "very high",
    topCompanies: ["Google", "Meta", "Stripe", "Cloudflare", "Datadog"],
    skills: [
      { name: "Kubernetes", level: "core", resources: [
        { label: "K8s Docs", url: "https://kubernetes.io/docs/tutorials/", type: "free" },
      ]},
      { name: "Incident Management", level: "core", resources: [
        { label: "SRE Book (Google)", url: "https://sre.google/sre-book/table-of-contents/", type: "free" },
      ]},
      { name: "Observability (Prometheus / Grafana)", level: "core", resources: [
        { label: "Prometheus Docs", url: "https://prometheus.io/docs/introduction/overview/", type: "free" },
        { label: "Grafana Labs Docs", url: "https://grafana.com/docs/grafana/latest/", type: "free" },
      ]},
      { name: "Python or Go scripting", level: "core", resources: [
        { label: "Automate the Boring Stuff", url: "https://automatetheboringstuff.com/", type: "free" },
        { label: "Go Tour", url: "https://go.dev/tour/", type: "free" },
      ]},
      { name: "Chaos Engineering", level: "advanced", resources: [
        { label: "Chaos Engineering book", url: "https://principlesofchaos.org/", type: "free" },
      ]},
      { name: "System Design", level: "advanced", resources: [
        { label: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", type: "free" },
      ]},
    ],
  },

  /* ── Data & AI ─────────────────────────────────────────────── */
  {
    title: "ML / AI Engineer",
    category: "Data & AI",
    icon: "ti-robot",
    salaryRange: "$160K–$350K+",
    demand: "very high",
    topCompanies: ["OpenAI", "Anthropic", "Google DeepMind", "Mistral", "Cohere"],
    skills: [
      { name: "Python", level: "core", resources: [
        { label: "Python Docs", url: "https://docs.python.org/3/tutorial/", type: "free" },
        { label: "fast.ai Deep Learning", url: "https://course.fast.ai/", type: "free" },
      ]},
      { name: "PyTorch / JAX", level: "core", resources: [
        { label: "PyTorch Tutorials", url: "https://pytorch.org/tutorials/", type: "free" },
        { label: "JAX Docs", url: "https://jax.readthedocs.io/en/latest/", type: "free" },
      ]},
      { name: "LLM / Transformers", level: "core", resources: [
        { label: "HuggingFace Course", url: "https://huggingface.co/learn/nlp-course", type: "free" },
        { label: "Andrej Karpathy's Neural Nets", url: "https://www.youtube.com/@AndrejKarpathy", type: "free" },
      ]},
      { name: "RAG / Agentic AI", level: "core", resources: [
        { label: "LangChain Docs", url: "https://docs.langchain.com/", type: "free" },
        { label: "LlamaIndex Docs", url: "https://docs.llamaindex.ai/", type: "free" },
      ]},
      { name: "MLOps (MLflow / W&B)", level: "advanced", resources: [
        { label: "MLflow Docs", url: "https://mlflow.org/docs/latest/index.html", type: "free" },
        { label: "Weights & Biases Courses", url: "https://www.wandb.courses/", type: "free" },
      ]},
      { name: "Statistics & Linear Algebra", level: "advanced", resources: [
        { label: "3Blue1Brown — Essence of LA", url: "https://www.3blue1brown.com/topics/linear-algebra", type: "free" },
        { label: "StatQuest (YouTube)", url: "https://www.youtube.com/@statquest", type: "free" },
      ]},
      { name: "CUDA / GPU programming", level: "bonus", resources: [
        { label: "CUDA Programming Guide", url: "https://docs.nvidia.com/cuda/cuda-c-programming-guide/", type: "free" },
      ]},
    ],
  },
  {
    title: "Data Engineer",
    category: "Data & AI",
    icon: "ti-chart-bar",
    salaryRange: "$120K–$210K",
    demand: "high",
    topCompanies: ["dbt Labs", "Databricks", "Snowflake", "Airbyte", "Fivetran"],
    skills: [
      { name: "Python", level: "core", resources: [
        { label: "Python Docs", url: "https://docs.python.org/3/tutorial/", type: "free" },
        { label: "Automate the Boring Stuff", url: "https://automatetheboringstuff.com/", type: "free" },
      ]},
      { name: "SQL (advanced)", level: "core", resources: [
        { label: "Mode SQL Tutorial", url: "https://mode.com/sql-tutorial/", type: "free" },
        { label: "LeetCode SQL 50", url: "https://leetcode.com/studyplan/top-sql-50/", type: "free" },
      ]},
      { name: "Apache Spark", level: "core", resources: [
        { label: "Spark Docs", url: "https://spark.apache.org/docs/latest/", type: "free" },
      ]},
      { name: "dbt", level: "advanced", resources: [
        { label: "dbt Learn", url: "https://courses.getdbt.com/", type: "free" },
        { label: "dbt Docs", url: "https://docs.getdbt.com/", type: "free" },
      ]},
      { name: "Airflow / Dagster", level: "advanced", resources: [
        { label: "Airflow Docs", url: "https://airflow.apache.org/docs/", type: "free" },
        { label: "Dagster Docs", url: "https://docs.dagster.io/", type: "free" },
      ]},
      { name: "BigQuery / Snowflake", level: "advanced", resources: [
        { label: "BigQuery Quickstart", url: "https://cloud.google.com/bigquery/docs/quickstarts", type: "free" },
        { label: "Snowflake Free Trial", url: "https://trial.snowflake.com/", type: "free" },
      ]},
    ],
  },
  {
    title: "Data Scientist",
    category: "Data & AI",
    icon: "ti-microscope",
    salaryRange: "$110K–$200K",
    demand: "high",
    topCompanies: ["Airbnb", "Spotify", "Netflix", "Duolingo", "Stripe"],
    skills: [
      { name: "Python (pandas, numpy)", level: "core", resources: [
        { label: "Pandas Docs", url: "https://pandas.pydata.org/docs/getting_started/", type: "free" },
        { label: "Kaggle Python Course", url: "https://www.kaggle.com/learn/python", type: "free" },
      ]},
      { name: "Statistics & Probability", level: "core", resources: [
        { label: "StatQuest (YouTube)", url: "https://www.youtube.com/@statquest", type: "free" },
      ]},
      { name: "Machine Learning (sklearn)", level: "core", resources: [
        { label: "Scikit-learn Docs", url: "https://scikit-learn.org/stable/user_guide.html", type: "free" },
        { label: "fast.ai ML Course", url: "https://course.fast.ai/", type: "free" },
      ]},
      { name: "SQL (analytics)", level: "core", resources: [
        { label: "Mode SQL Tutorial", url: "https://mode.com/sql-tutorial/", type: "free" },
      ]},
      { name: "A/B Testing", level: "advanced", resources: [
        { label: "Evan Miller — A/B Testing", url: "https://www.evanmiller.org/ab-testing/", type: "free" },
      ]},
      { name: "Data Visualisation (Plotly / Tableau)", level: "advanced", resources: [
        { label: "Plotly Docs", url: "https://plotly.com/python/", type: "free" },
        { label: "Tableau Public Training", url: "https://www.tableau.com/learn/training", type: "free" },
      ]},
    ],
  },

  /* ── Product & Design ──────────────────────────────────────── */
  {
    title: "Product Manager",
    category: "Product",
    icon: "ti-rocket",
    salaryRange: "$130K–$280K",
    demand: "high",
    topCompanies: ["Stripe", "Linear", "Figma", "Notion", "Intercom"],
    skills: [
      { name: "Product Strategy & Prioritisation", level: "core", resources: [
        { label: "Lenny's Newsletter", url: "https://www.lennysnewsletter.com/", type: "free" },
        { label: "PM Exercises", url: "https://www.pmexercises.com/", type: "free" },
      ]},
      { name: "SQL (analytics)", level: "core", resources: [
        { label: "Mode SQL Tutorial", url: "https://mode.com/sql-tutorial/", type: "free" },
      ]},
      { name: "User Research", level: "core", resources: [
        { label: "IDEO Design Kit", url: "https://www.designkit.org/", type: "free" },
        { label: "Maze User Research", url: "https://maze.co/guides/user-research/", type: "free" },
      ]},
      { name: "A/B Testing", level: "advanced", resources: [
        { label: "Evan Miller — A/B Testing", url: "https://www.evanmiller.org/ab-testing/", type: "free" },
        { label: "Optimizely Stats Engine", url: "https://www.optimizely.com/insights/blog/stats-engine/", type: "free" },
      ]},
      { name: "Figma (wireframing)", level: "bonus", resources: [
        { label: "Figma Basics", url: "https://help.figma.com/hc/en-us/articles/360038510313", type: "free" },
      ]},
    ],
  },
  {
    title: "Product Designer (UX)",
    category: "Product",
    icon: "ti-masks-theater",
    salaryRange: "$100K–$185K",
    demand: "high",
    topCompanies: ["Figma", "Airbnb", "Duolingo", "Canva", "Linear"],
    skills: [
      { name: "Figma", level: "core", resources: [
        { label: "Figma Academy", url: "https://help.figma.com/hc/en-us/articles/360038510313", type: "free" },
        { label: "Figma YouTube Channel", url: "https://www.youtube.com/@Figma", type: "free" },
      ]},
      { name: "User Research", level: "core", resources: [
        { label: "NN/g UX Research", url: "https://www.nngroup.com/articles/which-ux-research-methods/", type: "free" },
      ]},
      { name: "Interaction Design", level: "core", resources: [
        { label: "IxDF Design Courses", url: "https://www.interaction-design.org/courses", type: "paid" },
        { label: "NN/g Articles", url: "https://www.nngroup.com/articles/", type: "free" },
      ]},
      { name: "Design Systems", level: "advanced", resources: [
        { label: "Supernova Docs", url: "https://supernova.io/", type: "free" },
        { label: "Storybook Docs", url: "https://storybook.js.org/", type: "free" },
      ]},
      { name: "Prototyping & Usability Testing", level: "advanced", resources: [
        { label: "Maze Prototype Testing", url: "https://maze.co/", type: "free" },
      ]},
    ],
  },

  /* ── Security ──────────────────────────────────────────────── */
  {
    title: "Security Engineer",
    category: "Security",
    icon: "ti-lock",
    salaryRange: "$140K–$260K",
    demand: "very high",
    topCompanies: ["CrowdStrike", "Palo Alto Networks", "Wiz", "Snyk", "Cloudflare"],
    skills: [
      { name: "Network Security", level: "core", resources: [
        { label: "TryHackMe", url: "https://tryhackme.com/", type: "free" },
        { label: "Hack The Box", url: "https://www.hackthebox.com/", type: "free" },
      ]},
      { name: "Cloud Security (AWS / GCP)", level: "core", resources: [
        { label: "AWS Security Specialty", url: "https://aws.amazon.com/certification/certified-security-specialty/", type: "cert" },
        { label: "CloudGoat (practice)", url: "https://github.com/RhinoSecurityLabs/cloudgoat", type: "free" },
      ]},
      { name: "Penetration Testing", level: "advanced", resources: [
        { label: "OWASP Testing Guide", url: "https://owasp.org/www-project-web-security-testing-guide/", type: "free" },
        { label: "OSCP Certification", url: "https://www.offsec.com/courses/pen-200/", type: "cert" },
      ]},
      { name: "Scripting (Python / Bash)", level: "core", resources: [
        { label: "Automate the Boring Stuff", url: "https://automatetheboringstuff.com/", type: "free" },
      ]},
      { name: "SIEM / Threat Detection", level: "advanced", resources: [
        { label: "Splunk Training", url: "https://www.splunk.com/en_us/training.html", type: "free" },
      ]},
    ],
  },

  /* ── Transition ────────────────────────────────────────────── */
  {
    title: "IT Services → Product / Tech",
    category: "Transition",
    icon: "ti-arrows-shuffle",
    salaryRange: "$120K–$280K (2–4× current TC)",
    demand: "very high",
    topCompanies: ["Stripe", "Shopify", "Airbnb", "Figma", "Linear", "Notion", "Atlassian"],
    skills: [
      { name: "Data Structures & Algorithms", level: "core", resources: [
        { label: "NeetCode 150 (free)", url: "https://neetcode.io/practice", type: "free" },
        { label: "LeetCode Top 150", url: "https://leetcode.com/studyplan/top-interview-150/", type: "free" },
        { label: "Striver's DSA Sheet", url: "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/", type: "free" },
      ]},
      { name: "System Design (HLD + LLD)", level: "core", resources: [
        { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer", type: "free" },
        { label: "ByteByteGo", url: "https://bytebytego.com/", type: "paid" },
        { label: "Grokking System Design", url: "https://www.designgurus.io/course/grokking-the-system-design-interview", type: "paid" },
      ]},
      { name: "CS Fundamentals (OS, DBMS, Networks)", level: "core", resources: [
        { label: "InterviewBit CS Fundamentals", url: "https://www.interviewbit.com/courses/programming/", type: "free" },
        { label: "CMU DB Course (free)", url: "https://15445.courses.cs.cmu.edu/", type: "free" },
      ]},
      { name: "Modern Tech Stack (React / Node / Go)", level: "advanced", resources: [
        { label: "The Odin Project (full-stack, free)", url: "https://www.theodinproject.com/", type: "free" },
        { label: "Go Tour", url: "https://go.dev/tour/", type: "free" },
      ]},
      { name: "Resume — product company format", level: "advanced", resources: [
        { label: "jobSayer Resume Builder", url: "/builder", type: "free" },
        { label: "Google XYZ Resume Formula", url: "https://www.inc.com/bill-murphy-jr/google-recruiters-say-these-5-resume-tips-including-x-y-z-formula-will-improve-your-odds-of-getting-hired-at-google.html", type: "free" },
      ]},
      { name: "Mock Interviews (company-specific)", level: "advanced", resources: [
        { label: "jobSayer Interview Prep", url: "/interview", type: "free" },
        { label: "Pramp — free peer interviews", url: "https://www.pramp.com/", type: "free" },
        { label: "interviewing.io", url: "https://interviewing.io/", type: "paid" },
      ]},
      { name: "Salary negotiation", level: "bonus", resources: [
        { label: "jobSayer Salary Coach", url: "/salary", type: "free" },
        { label: "levels.fyi (comp data)", url: "https://levels.fyi/", type: "free" },
      ]},
    ],
  },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function extractUserSkills(data: ResumeData): Set<string> {
  const text = [
    data.skills ?? "",
    ...(data.work     ?? []).map(w => w.desc ?? ""),
    ...(data.projects ?? []).map(p => p.desc ?? ""),
  ].join(" ").toLowerCase();
  return new Set(text.split(/[\s,;.()\n]+/).filter(s => s.length > 1));
}

function skillMatch(skillName: string, userSkills: Set<string>): boolean {
  const parts = skillName.toLowerCase().split(/[\s\/()]+/);
  return parts.some(p => p.length > 2 && userSkills.has(p));
}

type ResourceType = "free" | "paid" | "cert";

function ResourceBadge({ type }: { type: ResourceType }) {
  const config: Record<ResourceType, { label: string; color: string; bg: string }> = {
    free: { label: "Free", color: "var(--success)", bg: "rgba(34,197,94,.1)"  },
    paid: { label: "Paid", color: "var(--warn)",    bg: "rgba(234,179,8,.1)"  },
    cert: { label: "Cert", color: "var(--accent)",  bg: "rgba(99,102,241,.1)" },
  };
  const c = config[type];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function CareerGpsPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleBlueprint | null>(null);
  const [userSkills,   setUserSkills]   = useState<Set<string>>(new Set());
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [resumeSource, setResumeSource] = useState<"cloud" | "local" | null>(null);
  const [filter,       setFilter]       = useState<"all" | "gaps" | "done">("all");

  useEffect(() => {
    async function loadSkills() {
      // 1. Try Supabase first when signed in
      if (user) {
        try {
          const saves = await listResumes(user.id);
          if (saves.length > 0) {
            const latest = await loadResumeSave(saves[0].id, user.id);
            if (latest?.data) {
              setUserSkills(extractUserSkills(latest.data));
              setResumeLoaded(true);
              setResumeSource("cloud");
              return;
            }
          }
        } catch { /* fall through to localStorage */ }
      }

      // 2. Fall back to localStorage draft
      try {
        const raw = localStorage.getItem("jobsayer-resume-draft");
        if (raw) {
          const parsed = JSON.parse(raw) as { data?: ResumeData } | ResumeData;
          const data: ResumeData = (parsed as { data?: ResumeData }).data ?? (parsed as ResumeData);
          setUserSkills(extractUserSkills(data));
          setResumeLoaded(true);
          setResumeSource("local");
        }
      } catch { /* ignore */ }
    }

    void loadSkills();
  }, [user]);

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px",
  };

  /* ── Role selector ── */
  if (!selectedRole) {
    const categories = [
      "Transition",
      ...new Set(
        ROLE_BLUEPRINTS
          .filter(r => r.category !== "Transition")
          .map(r => r.category)
      ),
    ];

    return (
      <AppShell>
        <div style={{ padding: "24px 24px 48px" }}>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
              <i className="ti ti-world"/> Global · Any city, any market
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}><i className="ti ti-compass"/> Career GPS</h1>
            <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6, maxWidth: 520 }}>
              Pick your target role — we'll analyse your skill gaps and give you a personalised learning roadmap.
            </p>
            {resumeLoaded && resumeSource === "cloud" && (
              <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 8, width: "fit-content" }}>
                <CheckCircle2 size={13} />
                Skills auto-loaded from your saved resume
              </div>
            )}
            {resumeLoaded && resumeSource === "local" && (
              <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 8, width: "fit-content" }}>
                <CheckCircle2 size={13} />
                Skills loaded from local draft · <Link href="/sign-in" style={{ color: "var(--accent)" }}>Sign in</Link> to sync across devices
              </div>
            )}
            {!resumeLoaded && (
              <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(234,179,8,.08)", border: "1px solid rgba(234,179,8,.2)", fontSize: 12, color: "var(--warn)", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={13} />
                <span>
                  Build your resume first for a personalised gap analysis.{" "}
                  <Link href="/builder" style={{ color: "var(--warn)", fontWeight: 600 }}>Go to Builder <i className="ti ti-arrow-right"/></Link>
                </span>
              </div>
            )}
          </div>

          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: 32 }}>
              <h2 style={{
                fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em",
                color: cat === "Transition" ? "var(--accent)" : "var(--text3)",
                marginBottom: 14, display: "flex", alignItems: "center", gap: 8,
              }}>
                {cat}
                {cat === "Transition" && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", textTransform: "none", letterSpacing: 0 }}>
                    highest salary jump
                  </span>
                )}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {ROLE_BLUEPRINTS.filter(r => r.category === cat).map(role => {
                  const total   = role.skills.length;
                  const matched = role.skills.filter(s => skillMatch(s.name, userSkills)).length;
                  const pct     = resumeLoaded ? Math.round((matched / total) * 100) : null;
                  const demandColor =
                    role.demand === "very high" ? "var(--success)" :
                    role.demand === "high"      ? "var(--warn)"    : "var(--text3)";

                  return (
                    <button
                      key={role.title}
                      onClick={() => { setSelectedRole(role); trackAction("career_gps_used", 60); }}
                      style={{
                        ...card,
                        cursor: "pointer", textAlign: "left",
                        background: role.category === "Transition"
                          ? "linear-gradient(135deg,rgba(99,102,241,.07),rgba(99,102,241,.02))"
                          : "var(--surface)",
                        borderColor: role.category === "Transition" ? "var(--accborder)" : "var(--border)",
                        transition: "border-color .15s, transform .1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = role.category === "Transition" ? "var(--accborder)" : "var(--border)")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <i className={`ti ${role.icon}`} style={{ fontSize: 26, color: "var(--accent)" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "transparent", color: demandColor, border: `1px solid ${demandColor}` }}>
                          {role.demand} demand
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: "var(--text1)" }}>{role.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>{role.salaryRange} / yr</div>

                      {pct !== null && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
                            <span>Skill match</span>
                            <span style={{ fontWeight: 600, color: pct >= 60 ? "var(--success)" : pct >= 30 ? "var(--warn)" : "var(--danger)" }}>
                              {pct}%
                            </span>
                          </div>
                          <div style={{ height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 3, width: `${pct}%`,
                              background: pct >= 60 ? "var(--success)" : pct >= 30 ? "var(--warn)" : "var(--danger)",
                              transition: "width .5s ease",
                            }} />
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                        View roadmap <ChevronRight size={12} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </AppShell>
    );
  }

  /* ── Roadmap view ── */
  const totalSkills   = selectedRole.skills.length;
  const matchedSkills = selectedRole.skills.filter(s => skillMatch(s.name, userSkills));
  const gapSkills     = selectedRole.skills.filter(s => !skillMatch(s.name, userSkills));
  const matchPct      = resumeLoaded ? Math.round((matchedSkills.length / totalSkills) * 100) : 0;

  const displaySkills =
    filter === "gaps" ? gapSkills     :
    filter === "done" ? matchedSkills : selectedRole.skills;

  return (
    <AppShell>
      {/* Sticky top bar */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setSelectedRole(null)}
            style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
          >
            <ArrowLeft size={14} /> All Roles
          </button>
          <span style={{ color: "var(--border)", fontSize: 18 }}>›</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedRole.icon} {selectedRole.title}</span>
        </div>
        <Link href="/jobs" style={{ padding: "7px 16px", background: "var(--accent)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          Find Jobs <i className="ti ti-arrow-right"/>
        </Link>
      </div>

      <div style={{ padding: "24px 24px 48px" }}>

        {/* Overview card */}
        <div style={{ ...card, marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 48 }}>{selectedRole.icon}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{selectedRole.title}</h1>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--text3)", flexWrap: "wrap" }}>
              <span><i className="ti ti-coin"/> {selectedRole.salaryRange} / yr</span>
              <span><i className="ti ti-trending-up"/> {selectedRole.demand} demand</span>
              <span><i className="ti ti-building"/> {selectedRole.topCompanies.slice(0, 3).join(", ")}</span>
            </div>
          </div>
          {resumeLoaded && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: matchPct >= 60 ? "rgba(34,197,94,.12)" : matchPct >= 30 ? "rgba(234,179,8,.12)" : "rgba(239,68,68,.12)",
                border: `3px solid ${matchPct >= 60 ? "var(--success)" : matchPct >= 30 ? "var(--warn)" : "var(--danger)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 800,
                color: matchPct >= 60 ? "var(--success)" : matchPct >= 30 ? "var(--warn)" : "var(--danger)",
              }}>
                {matchPct}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>skill match</div>
            </div>
          )}
        </div>

        {/* Stats */}
        {resumeLoaded && (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Skills you have",  value: matchedSkills.length, color: "var(--success)" },
              { label: "Skill gaps",        value: gapSkills.length,     color: "var(--danger)"  },
              { label: "Total required",    value: totalSkills,           color: "var(--text1)"   },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...card, textAlign: "center", padding: "16px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["all", "gaps", "done"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 18px", borderRadius: 20, border: "1px solid",
              fontSize: 13, cursor: "pointer",
              background: filter === f ? "var(--accent)"   : "var(--surface)",
              borderColor: filter === f ? "var(--accent)"  : "var(--border)",
              color:       filter === f ? "#fff"           : "var(--text2)",
              fontWeight:  filter === f ? 600              : 400,
              fontFamily: "inherit",
            }}>
              {f === "all" ? `All (${totalSkills})` : f === "gaps" ? `Gaps (${gapSkills.length})` : `Have (${matchedSkills.length})`}
            </button>
          ))}
        </div>

        {/* Skill roadmap */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displaySkills.map(skill => {
            const have       = skillMatch(skill.name, userSkills);
            const levelColor =
              skill.level === "core"     ? "var(--danger)" :
              skill.level === "advanced" ? "var(--warn)"   : "var(--accent)";

            return (
              <div key={skill.name} style={{
                ...card,
                borderLeft: `3px solid ${have ? "var(--success)" : levelColor}`,
                opacity: have ? 0.85 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {have
                      ? <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                      : <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${levelColor}`, flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 14, fontWeight: 600, color: have ? "var(--text3)" : "var(--text1)" }}>
                      {skill.name}
                      {have && <span style={{ fontSize: 11, color: "var(--success)", marginLeft: 6 }}>✓ You have this</span>}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                    background: "transparent", color: levelColor, border: `1px solid ${levelColor}`,
                    textTransform: "uppercase",
                  }}>{skill.level}</span>
                </div>

                {!have && (
                  <div style={{ marginLeft: 26 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                      Learning resources
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      {skill.resources.map(r => (
                        <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", borderRadius: 8, textDecoration: "none",
                            background: "var(--surface2)", border: "1px solid var(--border)", transition: "border-color .15s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                          <span style={{ fontSize: 13, color: "var(--text1)", fontWeight: 500 }}>{r.label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <ResourceBadge type={r.type} />
                            <ExternalLink size={12} color="var(--text3)" />
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Course recommendations */}
                    {(() => {
                      const courses = getCoursesForSkill(skill.name, 2);
                      if (!courses.length) return null;
                      return (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
                            Recommended courses
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {courses.map(c => <CourseCard key={c.affiliateUrl} course={c} compact />)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {selectedRole.category !== "Transition" && (
            <Link href="/jobs" style={{
              display: "flex", alignItems: "center", gap: 8, padding: "13px 28px",
              background: "var(--accent)", borderRadius: 12, color: "#fff",
              fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}>
              Find {selectedRole.title} Jobs <ChevronRight size={14} />
            </Link>
          )}
          <Link href="/interview" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "13px 28px",
            background: selectedRole.category === "Transition" ? "var(--accent)" : "var(--surface)",
            border: selectedRole.category === "Transition" ? "none" : "1px solid var(--border)",
            borderRadius: 12,
            color: selectedRole.category === "Transition" ? "#fff" : "var(--text1)",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            <i className="ti ti-microphone"/> Practice interviews <ChevronRight size={14} />
          </Link>
          <Link href="/salary" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "13px 28px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, color: "var(--text1)",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}>
            <i className="ti ti-coin"/> Check global salaries
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
