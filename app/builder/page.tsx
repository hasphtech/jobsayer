"use client";
/**
 * /builder — Resume builder (Stepper / Wizard layout)
 *
 * Tiers:
 *   free    — 1 save, 4 basic templates, PDF + share, 1 resume/photo upload/mo
 *   basic   — 3 saves, all 9 templates, PDF + DOCX + share, 3 uploads/mo
 *   premium — 5 saves, all 9 templates, PDF + DOCX + JSON + AI, 10 uploads/mo
 */
import React, { useState, useEffect, useRef } from "react";
import {
  FileText, Plus, Download, Sparkles, Lock,
  User, Briefcase, GraduationCap, Award, Link2, Check, Loader2,
  Image as ImageIcon, Upload, Globe, Languages, Medal, X, LogIn,
  Palette, ChevronRight, ChevronLeft, Activity, Target, Heart, Wand2,
  Moon, Sun, ArrowUp, ArrowDown, LayoutList, Linkedin, RotateCcw, GripVertical,
  Eye, EyeOff, Save, FolderOpen, Pencil, Mail, AlignJustify, ChevronDown, ChevronUp,
  Lightbulb, LayoutDashboard,
} from "lucide-react";
import { useResumePlan } from "@/lib/resumePlan";
import { useAuth } from "@/lib/auth";
import { exportDocx } from "@/lib/docxExport";
import {
  saveDraft, loadDraft, createShare,
  saveNamedResume, listResumes, loadResumeSave, deleteResumeSave,
  type ResumeRecord,
} from "@/lib/resumeDb";
import { canUpload, recordUpload } from "@/lib/uploadUsage";
import { parseResumeFile } from "@/lib/resumeParser";
import { matchJd, resumeToText, type JdMatchResult } from "@/lib/jdMatcher";
import ResumePreview, { BASIC_TEMPLATES, PREMIUM_TEMPLATES, TEMPLATE_ACCENT, PHOTO_TEMPLATES } from "@/components/ResumePreview";
import type { ResumeData, LanguageEntry } from "@/lib/types";

const ALL_TEMPLATES = [...BASIC_TEMPLATES, ...PREMIUM_TEMPLATES];

/* ── Template confidence metadata ─────────────────────────── */
const TEMPLATE_META: Record<string, { bestFor: string; ats: number }> = {
  Classic:       { bestFor: "Software / Any role",      ats: 97 },
  Minimal:       { bestFor: "Any industry",             ats: 96 },
  Bold:          { bestFor: "Design / Marketing",       ats: 88 },
  Compact:       { bestFor: "Dense content / Senior",   ats: 94 },
  Slate:         { bestFor: "Finance / Consulting",     ats: 95 },
  Crisp:         { bestFor: "General / Freshers",       ats: 95 },
  Modern:        { bestFor: "Tech / Startups",          ats: 85 },
  Creative:      { bestFor: "Design / UX / Media",      ats: 83 },
  "Sidebar Pro": { bestFor: "Engineering / Product",    ats: 86 },
  Executive:     { bestFor: "Leadership / C-Suite",     ats: 86 },
  Tech:          { bestFor: "Engineering / DevOps",     ats: 83 },
  Nordic:        { bestFor: "Scandinavia / EU",         ats: 78 },
  Timeline:      { bestFor: "UK / Europe",              ats: 85 },
  Horizon:       { bestFor: "Marketing / Sales",        ats: 84 },
  Orbit:         { bestFor: "Creative / Agency",        ats: 79 },
  Apex:          { bestFor: "Business / Strategy",      ats: 87 },
  Canvas:        { bestFor: "Portfolio / Design",       ats: 78 },
  Luxe:          { bestFor: "Luxury / Hospitality",     ats: 82 },
  Vega:          { bestFor: "Science / Research",       ats: 85 },
  Folio:         { bestFor: "Writers / Journalists",    ats: 83 },
  Stripe:        { bestFor: "Finance / Legal",          ats: 90 },
  Mono:          { bestFor: "Engineering / Dev",        ats: 91 },
  Prism:         { bestFor: "Creative / Branding",      ats: 80 },
  Ivy:           { bestFor: "Academia / Research",      ats: 92 },
  Onyx:          { bestFor: "Executive / Premium",      ats: 84 },
};

/* ── Inline text improvement (client-side) ─────────────────── */
function improveText(raw: string): string {
  const WEAK: [RegExp, string][] = [
    [/^(• )?[Ww]orked on\b/, "$1Built"],
    [/^(• )?[Hh]elped (with|to)\b/, "$1Contributed to"],
    [/^(• )?[Ww]as responsible for\b/, "$1Led"],
    [/^(• )?[Aa]ssisted (with|in|on)\b/, "$1Supported"],
    [/^(• )?[Ww]orked with\b/, "$1Collaborated with"],
    [/^(• )?[Ww]as involved in\b/, "$1Participated in"],
    [/^(• )?[Dd]id\b/, "$1Executed"],
    [/^(• )?[Hh]andled\b/, "$1Managed"],
    [/^(• )?[Mm]ade\b/, "$1Developed"],
    [/^(• )?[Uu]sed\b/, "$1Leveraged"],
    [/^(• )?[Cc]reated\b/, "$1Built"],
  ];
  const improved = raw.split("\n").map(line => {
    const t = line.trim();
    if (!t) return line;
    for (const [re, repl] of WEAK) {
      if (re.test(t)) return t.replace(re, repl);
    }
    // Ensure first char after bullet is capitalised
    if (t.startsWith("• ") && t[2]) {
      return "• " + t[2].toUpperCase() + t.slice(3);
    }
    return t.charAt(0).toUpperCase() + t.slice(1);
  }).join("\n");
  return improved === raw ? raw : improved;
}

/* ── Style presets ───────────────────────────────────────── */
const COLOR_PRESETS = [
  { label: "Charcoal", value: "#1f2937" },
  { label: "Navy",     value: "#1a1a2e" },
  { label: "Slate",    value: "#475569" },
  { label: "Blue",     value: "#1d4ed8" },
  { label: "Indigo",   value: "#4338ca" },
  { label: "Violet",   value: "#7c3aed" },
  { label: "Pink",     value: "#db2777" },
  { label: "Coral",    value: "#e11d48" },
  { label: "Burgundy", value: "#9f1239" },
  { label: "Orange",   value: "#c2410c" },
  { label: "Amber",    value: "#b45309" },
  { label: "Forest",   value: "#15803d" },
  { label: "Emerald",  value: "#047857" },
  { label: "Teal",     value: "#0f766e" },
  { label: "Cyan",     value: "#0891b2" },
];
const DEFAULT_COLOR = COLOR_PRESETS[0].value; // Charcoal — used when styleColor is ""

const FONT_OPTIONS = [
  // ── Sans-serif ──────────────────────────────────────────────
  { label: "Inter",       family: "Inter, Helvetica Neue, Arial, sans-serif",           display: "Aa", group: "Sans" },
  { label: "Roboto",      family: "'Roboto', Arial, sans-serif",                         display: "Aa", group: "Sans" },
  { label: "Open Sans",   family: "'Open Sans', Helvetica Neue, Arial, sans-serif",      display: "Aa", group: "Sans" },
  { label: "Lato",        family: "'Lato', Helvetica Neue, Arial, sans-serif",           display: "Aa", group: "Sans" },
  { label: "Raleway",     family: "'Raleway', Arial, sans-serif",                        display: "Aa", group: "Sans" },
  { label: "Nunito",      family: "'Nunito', Arial, sans-serif",                         display: "Aa", group: "Sans" },
  // ── Serif ───────────────────────────────────────────────────
  { label: "Georgia",     family: "Georgia, 'Times New Roman', serif",                  display: "Aa", group: "Serif" },
  { label: "Merriweather",family: "'Merriweather', Georgia, serif",                     display: "Aa", group: "Serif" },
  { label: "Playfair",    family: "'Playfair Display', Georgia, 'Times New Roman', serif",display: "Aa", group: "Serif" },
  // ── Humanist / Other ────────────────────────────────────────
  { label: "Humanist",    family: "'Trebuchet MS', Optima, 'Segoe UI', sans-serif",     display: "Aa", group: "Humanist" },
  { label: "Source Sans", family: "'Source Sans 3', 'Segoe UI', Arial, sans-serif",     display: "Aa", group: "Humanist" },
  { label: "Mono",        family: "'Courier New', Courier, monospace",                  display: "Aa", group: "Mono" },
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Raleway:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&family=Nunito:wght@400;600;700&display=swap";

/* ── Cover Letter default data ───────────────────────────── */
interface CoverLetterData {
  to: string; company: string; jobTitle: string; body: string; closing: string;
}
const BLANK_COVER: CoverLetterData = { to: "", company: "", jobTitle: "", body: "", closing: "Sincerely," };

/* ── Section writing tips ────────────────────────────────── */
const SECTION_TIPS: Record<string, { title: string; tips: string[] }> = {
  profile:       { title: "Contact tips", tips: ["Use a professional email (firstname.lastname@gmail.com)", "Add your LinkedIn URL — recruiters check it", "City/state is enough — no need for full address", "Portfolio URL or GitHub bumps your ATS score by 3 pts"] },
  summary:       { title: "Summary tips", tips: ["Aim for 40–60 words — enough to set the scene", "Lead with your title, years of experience, and top skill", "Mention 1–2 quantified wins (e.g. 'grew revenue by 30%')", "Avoid phrases like 'hardworking team player' — they add no signal"] },
  work:          { title: "Work tips", tips: ["Start each bullet with a strong verb: Built, Led, Reduced, Grew", "Add numbers wherever possible — % change, ₹ amounts, user counts", "3–5 bullets per role is ideal; trim anything older than 10 years", "Show impact, not duties — 'Redesigned checkout' beats 'Responsible for checkout'"] },
  edu:           { title: "Education tips", tips: ["Add CGPA/percentage if ≥ 7.5 or 75% — omit if lower", "Include relevant coursework only if you're a fresher", "Certifications can boost ATS — add them in the Certifications section", "Put education before work only if you graduated within the last 2 years"] },
  skills:        { title: "Skills tips", tips: ["Add 8–12 skills for a full ATS score", "Mix technical (React, SQL) with tools (Figma, Jira) and soft skills", "Match keywords from the job description you're targeting", "Avoid rating your skills (e.g. 'React — 80%') — just list them"] },
  projects:      { title: "Project tips", tips: ["Lead with impact: users, stars, revenue, or performance gain", "Include a live URL or GitHub link to let recruiters verify", "3–4 bullets is the sweet spot — don't pad", "Freshers: projects are your proof of skill — highlight them above internships"] },
  certifications:{ title: "Certifications tips", tips: ["Include year — recent certs carry more weight", "Google, AWS, Meta, PMI, and CFA certs are ATS gold", "Add the issuer full name (e.g. 'Amazon Web Services')", "Omit certs older than 5 years unless they're prestigious"] },
  languages:     { title: "Language tips", tips: ["Native/Fluent for languages you use daily", "Be honest — interviewers may test you", "Knowing regional languages (Tamil, Kannada, etc.) is a plus for India roles"] },
  awards:        { title: "Awards tips", tips: ["Quantify when possible: 'Top 10 of 5,000 teams'", "Include the issuer — it adds credibility", "Hackathon wins, scholarships, and company recognition all count"] },
  interests:     { title: "Interests tips", tips: ["Keep it brief — 3 to 5 interests is plenty", "Open source contributions are especially impressive", "Interests show personality — choose authentic ones", "Avoid anything that might be controversial"] },
  references:    { title: "References tips", tips: ["It's fine to skip and print 'Available on request'", "Choose references who know your work directly", "Always ask permission before listing someone"] },
};

/* ── Role-based bullet suggestions ──────────────────────── */
const ROLE_BULLETS: Record<string, string[]> = {
  "software engineer":       ["• Built and maintained RESTful APIs serving 100K+ daily requests", "• Reduced page load time by 45% through lazy loading and code splitting", "• Wrote unit and integration tests, raising coverage from 62% to 88%", "• Collaborated with product and design to deliver 4 major features on schedule", "• Reviewed PRs and mentored 2 junior engineers on best practices", "• Diagnosed and resolved production incidents, cutting MTTR from 4h to 40 min"],
  "senior software engineer":["• Led architecture and delivery of a platform feature serving 500K+ users", "• Mentored a team of 4 engineers with weekly 1:1s and structured code reviews", "• Drove migration from monolith to microservices, improving deploy frequency 3×", "• Introduced observability stack (Datadog + PagerDuty), reducing alert noise 70%", "• Partnered with PM to define technical roadmaps and effort estimates", "• Achieved 99.98% uptime SLA through circuit-breaker and retry patterns"],
  "full stack developer":    ["• Built end-to-end features across React frontend and Node.js/Express backend", "• Designed and optimised PostgreSQL schemas for 10M+ row datasets", "• Integrated third-party APIs (Stripe, Twilio, Sendgrid) into the product", "• Deployed services on AWS (EC2, RDS, S3, CloudFront) with CI/CD via GitHub Actions", "• Reduced build time by 35% by refactoring the webpack configuration", "• Delivered 3 product launches on time with a 2-engineer team"],
  "frontend developer":      ["• Built reusable React component library used across 5 product teams", "• Improved Lighthouse score from 58 to 94 by optimising assets and rendering", "• Implemented responsive design for 40+ screens supporting mobile-first traffic", "• Reduced bundle size by 28% through tree-shaking and dynamic imports", "• Collaborated with designers in Figma to translate mockups to pixel-perfect UIs", "• Set up E2E tests in Playwright, covering 80% of critical user flows"],
  "backend developer":       ["• Designed and built microservices handling 200K+ daily transactions", "• Reduced DB query latency by 60% through index optimisation and caching", "• Built event-driven architecture with Kafka, improving system decoupling", "• Implemented JWT-based auth with refresh token rotation and RBAC", "• Wrote OpenAPI specs and autogenerated SDK clients for 3 consumer teams", "• Containerised services with Docker and orchestrated via Kubernetes"],
  "data scientist":          ["• Built ML models that improved customer churn prediction accuracy by 22%", "• Developed A/B testing framework used across 15+ product experiments", "• Automated reporting pipelines saving 8 analyst-hours per week", "• Built recommendation engine increasing click-through rate by 18%", "• Deployed models via FastAPI on GCP, maintaining 99.5% uptime", "• Presented data insights to C-suite leading to a ₹2Cr budget decision"],
  "data analyst":            ["• Built interactive Power BI/Tableau dashboards used by 50+ stakeholders", "• Wrote complex SQL queries across 10M+ row datasets to surface business insights", "• Identified a pricing anomaly that saved the company ₹40L annually", "• Automated weekly reports in Python, reducing manual effort by 6 hours/week", "• Partnered with product teams to define and track key metrics (DAU, LTV, CAC)", "• Conducted cohort analysis that revealed a 35% drop in 30-day retention"],
  "product manager":         ["• Led 0→1 launch of a mobile feature with 500K+ installs in 3 months", "• Increased activation rate from 28% to 55% through onboarding redesign", "• Managed cross-functional team of 6 engineers, 2 designers, and QA", "• Ran 12 A/B experiments driving a cumulative 25% uplift in conversion", "• Defined quarterly OKRs and roadmaps aligned to ₹10Cr revenue target", "• Reduced customer support tickets by 40% via self-serve help centre"],
  "marketing manager":       ["• Scaled paid acquisition from ₹5L to ₹1.2Cr/month maintaining CAC below ₹120", "• Launched referral programme generating 18% of new users at zero media cost", "• Grew organic traffic by 140% through content SEO and backlink strategy", "• Built lifecycle email flows improving 30-day retention by 25%", "• Managed ₹60L/month Google & Meta budget across 4 product lines", "• Delivered 3× ROAS on performance campaigns through creative iteration"],
  "hr":                      ["• Reduced time-to-hire from 45 days to 22 days by redesigning the hiring funnel", "• Managed end-to-end recruitment for 80+ roles across tech and business functions", "• Launched employee engagement programme, improving eNPS from 28 to 56", "• Designed and delivered onboarding programme for 200+ new hires annually", "• Negotiated compensation packages within budget while closing top talent", "• Reduced attrition by 15% through stay interviews and structured career paths"],
  "business analyst":        ["• Gathered and documented requirements for a ₹5Cr digital transformation project", "• Built financial models and scenario analyses to support strategic decisions", "• Identified process inefficiencies saving ₹80L in annual operational costs", "• Created executive dashboards in Excel/Power BI for C-suite reporting", "• Facilitated workshops with 30+ stakeholders to align on product requirements", "• Delivered cost-benefit analysis that led to a new vendor selection saving 20%"],
  "devops":                  ["• Built CI/CD pipelines reducing deployment time from 2 hours to 12 minutes", "• Managed Kubernetes clusters running 200+ microservices at 99.99% uptime", "• Reduced infrastructure costs by 35% through right-sizing and spot instances", "• Implemented IaC with Terraform, enabling reproducible multi-environment deploys", "• Set up centralised logging (ELK stack) and alerting with PagerDuty", "• Led zero-downtime migration from on-prem to AWS, completing 2 weeks ahead of schedule"],
  "ui ux designer":          ["• Redesigned checkout flow reducing cart abandonment by 22%", "• Conducted 40+ user interviews and usability tests, distilling insights into product changes", "• Built and maintained a design system of 80+ reusable Figma components", "• Shipped 5 major features from concept to production in Figma and Zeplin", "• Improved app store rating from 3.2 to 4.6 stars through UX iteration", "• Collaborated with 3 engineering squads to ensure pixel-perfect implementation"],
  "sales":                   ["• Exceeded quarterly revenue target by 128%, generating ₹1.8Cr in new bookings", "• Built and managed a pipeline of 60+ enterprise accounts using Salesforce CRM", "• Shortened sales cycle from 90 days to 55 days through structured demos", "• Onboarded and trained 4 BDRs, growing team output by 40%", "• Negotiated and closed 5 enterprise contracts worth ₹50L+ each", "• Achieved 95% customer retention rate through proactive relationship management"],
  "intern":                  ["• Contributed to production codebase — PR merged within first week", "• Built a feature/tool used by the team daily", "• Collaborated with senior engineers/mentors on assigned sprint tasks", "• Wrote documentation for the module/feature delivered", "• Participated in daily stand-ups, sprint planning, and retrospectives", "• Completed assigned tasks 2 days ahead of deadline"],
  /* ── Extended roles ─────────────────────────────────────── */
  "finance manager":         ["• Managed annual budget of ₹15Cr, delivering variance within 2% of forecast", "• Led monthly closing cycle for a 500-entity consolidation, cutting close time by 3 days", "• Identified cost-saving opportunities worth ₹1.2Cr through spend analysis and vendor renegotiation", "• Built rolling 12-month cash-flow model used by CFO for fundraising decisions", "• Reduced overdue receivables by 38% by redesigning the collections process", "• Ensured zero audit findings for 3 consecutive years through robust controls"],
  "chartered accountant":    ["• Led statutory audit for listed company with ₹800Cr turnover — clean opinion issued", "• Filed GST returns for 40+ clients with 100% on-time compliance record", "• Structured tax-efficient holding for promoter family, saving ₹60L annually", "• Built financial models for two VC-backed clients that closed Series A rounds", "• Managed TDS, advance tax, and I-T return filings for 120+ individual clients", "• Identified transfer pricing exposure of ₹2.5Cr; mitigated via documentation and APA"],
  "accountant":              ["• Processed and reconciled 1,000+ transactions monthly with zero errors", "• Prepared P&L, balance sheet, and cash-flow statements for monthly management reporting", "• Reduced month-end close time from 10 days to 5 days by automating journal entries", "• Managed vendor payments and maintained 100% on-time payment record", "• Assisted statutory audit, preparing schedules for ₹200Cr-turnover entity", "• Filed GST, TDS, and advance-tax returns across 6 group entities"],
  "operations manager":      ["• Scaled operations from 2 to 8 cities while holding unit cost flat YoY", "• Reduced process cycle time by 30% through SOP redesign and staff training", "• Managed vendor relationships for ₹5Cr annual procurement, achieving 12% cost reduction", "• Built real-time ops dashboard tracking 15 KPIs across 3 regional teams", "• Led a 60-member cross-functional team to achieve 98% SLA adherence", "• Launched same-day delivery capability in 3 metros, growing NPS by 18 pts"],
  "content writer":          ["• Published 80+ long-form articles averaging 5K monthly organic views each", "• Grew brand blog from 0 to 120K monthly readers in 14 months through SEO-led content", "• Produced email newsletter with 42% open rate (industry avg 22%)", "• Reduced content production cost by 25% by building a reusable asset library", "• Interviewed 30+ SMEs and translated complex topics into accessible, shareable content", "• Collaborated with design and SEO teams to increase organic CTR by 35%"],
  "copywriter":              ["• Wrote landing page copy that increased sign-up conversion from 2.1% to 5.4%", "• Crafted product launch email sequence generating ₹40L in first-week revenue", "• Produced ad creative for ₹2Cr/month spend across Google and Meta — avg 4.2× ROAS", "• Developed brand voice guidelines adopted across 3 product teams", "• Reduced customer churn by 12% through targeted retention email copy", "• A/B-tested 80+ headlines; winning variants lifted CTR by an average 28%"],
  "graphic designer":        ["• Redesigned brand identity system adopted across 12 product touchpoints", "• Created digital and print campaigns reaching 2M+ impressions per quarter", "• Delivered 40+ client projects on time with a 96% client satisfaction rating", "• Built Figma component library cutting design handoff time by 40%", "• Designed packaging that contributed to a 22% sales uplift post-relaunch", "• Mentored 2 junior designers, introducing structured design critique reviews"],
  "visual designer":         ["• Produced 200+ social media creatives per month maintaining brand consistency", "• Designed UI screens for a mobile app with 500K+ downloads", "• Built motion graphics and explainer videos that increased ad recall by 30%", "• Collaborated with marketing team to iterate campaign visuals based on performance data", "• Reduced design revision cycles by 50% through better briefing templates", "• Won internal design award for best campaign concept (Q3 2023)"],
  "customer success":        ["• Managed portfolio of 80 enterprise accounts with ₹12Cr combined ARR", "• Achieved 110% net revenue retention through upsell and expansion plays", "• Reduced customer churn from 18% to 9% through proactive health scoring", "• Onboarded 120+ accounts in a year, maintaining 4.8/5 onboarding CSAT", "• Built QBR framework adopted by 6 CSMs, improving renewal close rate by 20%", "• Partnered with Product to close 15 feature gaps identified from customer feedback"],
  "customer support":        ["• Resolved 50+ tickets daily with 95% first-response CSAT score", "• Reduced average handle time from 8 min to 4.5 min through macro templates", "• Escalated and tracked 200+ product bugs, driving 60% faster engineering fixes", "• Trained 5 new support agents, cutting ramp time from 4 weeks to 10 days", "• Wrote 80 help-centre articles reducing repeat ticket volume by 25%", "• Flagged a billing edge case affecting 300+ accounts; fix saved ₹18L in credits"],
  "project manager":         ["• Delivered ₹8Cr ERP implementation on time and 5% under budget", "• Managed 12-person cross-functional team across 3 geographies with zero missed milestones", "• Reduced project overruns by 40% through risk register and weekly status reviews", "• Facilitated 200+ stakeholder meetings, maintaining alignment across 8 departments", "• Implemented Agile/Scrum, improving sprint velocity by 35% within 2 quarters", "• Built project dashboard in Jira used by C-suite for portfolio-level reporting"],
  "scrum master":            ["• Facilitated 400+ daily stand-ups, sprint plannings, and retrospectives for a 15-person team", "• Increased team velocity from 42 to 68 story points per sprint in 3 months", "• Removed 25+ organizational blockers per quarter, unblocking 80% within 48 hours", "• Coached 3 teams transitioning from waterfall to Scrum, achieving predictable delivery in 2 sprints", "• Introduced Definition of Done reducing post-release defects by 55%", "• Maintained sprint health dashboard used by CPO for roadmap planning"],
  "mobile developer":        ["• Built and shipped React Native app from 0 to 100K+ downloads in 6 months", "• Reduced app crash rate from 2.1% to 0.3% through structured error logging", "• Improved app store rating from 3.4 to 4.7 through UX fixes and performance tuning", "• Integrated Razorpay and UPI payment flows handling ₹50L+ daily transactions", "• Reduced app bundle size by 30% through code splitting and asset optimisation", "• Led migration from class components to React hooks, cutting boilerplate by 40%"],
  "ios developer":           ["• Shipped 4 major iOS versions to 200K+ users on the App Store", "• Reduced cold launch time from 3.2s to 1.1s through lazy loading and profiling", "• Implemented SwiftUI design system used across all product screens", "• Integrated Apple Pay and StoreKit 2 for in-app purchase flow generating $50K+ MRR", "• Maintained 99.98% crash-free sessions using Firebase Crashlytics", "• Built offline-first architecture enabling full feature use without connectivity"],
  "android developer":       ["• Published Android app achieving 500K+ installs and 4.6 Play Store rating", "• Migrated codebase from Java to Kotlin, reducing LOC by 30% and build time by 25%", "• Implemented Jetpack Compose for 80% of UI, improving development speed 2×", "• Reduced ANR rate from 1.8% to 0.2% by moving heavy tasks to background threads", "• Integrated UPI Autopay and Google Pay for seamless subscription billing", "• Set up CI/CD with Bitrise, cutting release cycle from 2 weeks to 3 days"],
  "machine learning engineer":["• Trained and deployed NLP model achieving 91% F1 on production classification task", "• Reduced model inference latency from 340ms to 65ms via ONNX quantisation", "• Built ML feature pipeline processing 10M+ events/day on Spark + Databricks", "• Shipped recommendation model increasing user engagement by 22% in A/B test", "• Maintained MLflow experiment registry enabling reproducible model rollbacks", "• Collaborated with data engineering to reduce training data drift by 40%"],
  "ai engineer":             ["• Built LLM-powered document Q&A system used by 5,000+ enterprise users", "• Fine-tuned open-source LLM on domain corpus, beating GPT-3.5 on internal benchmarks", "• Reduced RAG hallucination rate by 35% through hybrid retrieval and re-ranking", "• Deployed AI microservices on AWS ECS handling 2M+ API calls/month", "• Designed prompt engineering framework that cut token usage by 28%", "• Shipped real-time AI assistant reducing manual support tickets by 45%"],
  "qa engineer":             ["• Built automated regression suite with 1,200+ test cases, reducing QA cycle from 2 weeks to 2 days", "• Achieved 90% test coverage on critical user flows using Selenium and Playwright", "• Caught 150+ high-severity bugs before production release in a single quarter", "• Set up API test suite with Postman/Newman integrated into CI pipeline", "• Reduced flaky test rate from 25% to 4% by refactoring waits and selectors", "• Introduced BDD with Cucumber, enabling non-technical stakeholders to review test scenarios"],
  "cloud engineer":          ["• Designed multi-region AWS architecture supporting 99.99% uptime SLA", "• Reduced cloud spend by ₹1.2Cr/year through reserved instances and rightsizing", "• Built Infrastructure-as-Code library with 150+ reusable Terraform modules", "• Automated DR failover, achieving RTO of 8 minutes and RPO of 15 minutes", "• Implemented zero-trust network policies across 50+ services", "• Migrated 40-service on-prem workload to GCP Kubernetes in 4 months"],
  "cybersecurity engineer":  ["• Conducted 30+ penetration tests, identifying 120+ vulnerabilities with remediation plans", "• Reduced mean time to detect (MTTD) from 18h to 45 min via SIEM tuning", "• Led SOC2 Type II audit preparation; organisation achieved certification in 6 months", "• Blocked 98% of phishing attempts by implementing DMARC, SPF, and DKIM policies", "• Automated vulnerability scanning pipeline covering 200+ assets in CI/CD", "• Trained 500+ employees on security awareness, reducing phishing click-through by 65%"],
  "supply chain manager":    ["• Reduced procurement lead time by 35% through strategic vendor consolidation", "• Managed ₹50Cr inventory with 99.5% accuracy using SAP ERP", "• Negotiated contracts saving ₹2.4Cr annually while maintaining quality SLAs", "• Implemented demand forecasting model reducing stockouts by 40%", "• Oversaw end-to-end logistics for 2,000+ monthly shipments across 12 states", "• Led supplier audit programme achieving 95% compliance across 80 vendors"],
  "legal counsel":           ["• Drafted and negotiated 200+ commercial contracts with zero material disputes", "• Led regulatory filings for RBI, SEBI, and MCA compliance across 5 group entities", "• Resolved 15 high-value disputes (₹5Cr+) through arbitration and mediation", "• Reviewed and advised on SaaS, data processing, and IP licensing agreements", "• Managed external counsel spend of ₹1.2Cr, achieving 20% cost reduction", "• Built contract management repository, cutting review turnaround from 10 days to 3 days"],
  "compliance officer":      ["• Ensured zero regulatory penalties across 3 years of SEBI and RBI oversight", "• Implemented KYC/AML framework handling 50K+ customer verifications per month", "• Led PCI-DSS compliance programme, achieving certification within 8 months", "• Conducted 60+ internal audits, tracking 95% remediation of findings on schedule", "• Trained 300+ employees on data privacy, GDPR, and PDPB compliance", "• Reduced compliance breach incidents by 70% through automated monitoring alerts"],
  "management consultant":   ["• Delivered cost optimisation project saving ₹25Cr for a manufacturing client", "• Led digital transformation roadmap for a ₹500Cr retail chain", "• Facilitated C-suite strategy workshops across 10+ client engagements", "• Built financial models supporting ₹200Cr M&A due diligence for PE firm", "• Managed 5-person workstream delivering on-time with zero scope creep", "• Published thought leadership article generating 50+ qualified inbound leads"],
  "teacher":                 ["• Taught 180+ students annually, achieving 92% pass rate in board examinations", "• Developed curriculum for new elective course adopted by 3 partner schools", "• Designed interactive learning modules reducing concept revision time by 30%", "• Mentored 20+ students for competitive exams — 12 secured top 100 rankings", "• Introduced project-based learning pilot, improving student engagement scores by 40%", "• Contributed to school's NAAC accreditation by preparing academic documentation"],
  "professor":               ["• Published 12 peer-reviewed papers in Q1 journals with 300+ citations", "• Secured ₹80L in research grants from DST and industry sponsors", "• Mentored 6 PhD scholars and 15 M.Tech students to successful thesis defence", "• Developed graduate course on [subject] adopted by 2 universities", "• Delivered keynote at 3 international conferences with 500+ attendees", "• Awarded Best Teacher Award by students for 4 consecutive years"],
  "nurse":                   ["• Provided direct care to 15–20 patients per shift in ICU/ward setting", "• Maintained 100% medication administration accuracy across 3 years", "• Reduced patient fall incidents by 45% through structured risk assessment protocol", "• Trained 10 junior nurses on critical-care procedures and documentation", "• Collaborated with physicians to update care plans for 50+ high-dependency patients", "• Received Patient Care Excellence Award for highest HCAHPS satisfaction score in unit"],
};

function getSuggestions(role: string): string[] {
  if (!role?.trim()) return [];
  const r = role.toLowerCase().trim();
  // Direct match
  if (ROLE_BULLETS[r]) return ROLE_BULLETS[r];
  // Partial key match (strip seniority prefixes)
  const stripped = r.replace(/^(senior|lead|principal|staff|head of|vp|chief|associate|junior|jr\.?|sr\.?|executive)\s+/g, "");
  for (const [key, bullets] of Object.entries(ROLE_BULLETS)) {
    if (r.includes(key) || key.includes(stripped)) return bullets;
  }
  // Keyword fallback — ordered from most specific to most general
  if ((r.includes("machine learn") || r.includes("ml engineer") || r.includes("mlops"))) return ROLE_BULLETS["machine learning engineer"];
  if (r.includes("ai engineer") || r.includes("llm") || r.includes("gen ai") || r.includes("generative")) return ROLE_BULLETS["ai engineer"];
  if (r.includes("ios") || r.includes("swift") || r.includes("objective-c")) return ROLE_BULLETS["ios developer"];
  if (r.includes("android") || r.includes("kotlin")) return ROLE_BULLETS["android developer"];
  if (r.includes("mobile") || r.includes("react native") || r.includes("flutter")) return ROLE_BULLETS["mobile developer"];
  if (r.includes("frontend") || r.includes("front-end") || r.includes("react dev") || r.includes("angular") || r.includes("vue")) return ROLE_BULLETS["frontend developer"];
  if (r.includes("backend") || r.includes("back-end") || r.includes("node") || r.includes("django") || r.includes("spring")) return ROLE_BULLETS["backend developer"];
  if (r.includes("full stack") || r.includes("fullstack")) return ROLE_BULLETS["full stack developer"];
  if (r.includes("devops") || r.includes("sre") || r.includes("platform eng") || r.includes("infra")) return ROLE_BULLETS["devops"];
  if (r.includes("cloud") || r.includes("aws") || r.includes("gcp") || r.includes("azure") || r.includes("site reliab")) return ROLE_BULLETS["cloud engineer"];
  if (r.includes("cyber") || r.includes("security") || r.includes("infosec") || r.includes("penetration") || r.includes("pentest")) return ROLE_BULLETS["cybersecurity engineer"];
  if (r.includes("qa") || r.includes("quality assurance") || r.includes("test engineer") || r.includes("sdet") || r.includes("automation test")) return ROLE_BULLETS["qa engineer"];
  if (r.includes("engineer") || r.includes("developer") || r.includes("programmer") || r.includes("software")) return ROLE_BULLETS["software engineer"];
  if (r.includes("data") && r.includes("sci")) return ROLE_BULLETS["data scientist"];
  if (r.includes("data") && (r.includes("analyst") || r.includes("analytics"))) return ROLE_BULLETS["data analyst"];
  if (r.includes("data")) return ROLE_BULLETS["data analyst"];
  if (r.includes("product") || r.includes(" pm") || r === "pm") return ROLE_BULLETS["product manager"];
  if (r.includes("scrum") || r.includes("agile coach")) return ROLE_BULLETS["scrum master"];
  if (r.includes("project manag") || r.includes("programme manag") || r.includes("delivery manag")) return ROLE_BULLETS["project manager"];
  if (r.includes("ui") || r.includes("ux") || r.includes("user experience") || r.includes("interaction design")) return ROLE_BULLETS["ui ux designer"];
  if (r.includes("graphic") || r.includes("brand design") || r.includes("visual design")) return ROLE_BULLETS["graphic designer"];
  if (r.includes("design") || r.includes("figma") || r.includes("sketch")) return ROLE_BULLETS["ui ux designer"];
  if (r.includes("content writ") || r.includes("blog") || r.includes("copywrite") || r.includes("copy write")) return ROLE_BULLETS["content writer"];
  if (r.includes("copy")) return ROLE_BULLETS["copywriter"];
  if (r.includes("market")) return ROLE_BULLETS["marketing manager"];
  if (r.includes("hr") || r.includes("human resource") || r.includes("talent") || r.includes("recruit") || r.includes("people ops")) return ROLE_BULLETS["hr"];
  if (r.includes("sales") || r.includes("business dev") || r.includes("bdr") || r.includes("sdr") || r.includes("account exec")) return ROLE_BULLETS["sales"];
  if (r.includes("customer success") || r.includes("client success") || r.includes("csm")) return ROLE_BULLETS["customer success"];
  if (r.includes("customer support") || r.includes("support agent") || r.includes("helpdesk") || r.includes("service desk")) return ROLE_BULLETS["customer support"];
  if (r.includes("chartered accountant") || r.includes("\\bca\\b") || r.includes(" ca ")) return ROLE_BULLETS["chartered accountant"];
  if (r.includes("finance") || r.includes("financial") || r.includes("treasury") || r.includes("controller")) return ROLE_BULLETS["finance manager"];
  if (r.includes("account") && !r.includes("account exec")) return ROLE_BULLETS["accountant"];
  if (r.includes("operations") || r.includes("ops manag") || r.includes("head of ops")) return ROLE_BULLETS["operations manager"];
  if (r.includes("supply chain") || r.includes("logistics") || r.includes("procurement") || r.includes("inventory") || r.includes("warehouse")) return ROLE_BULLETS["supply chain manager"];
  if (r.includes("legal") || r.includes("lawyer") || r.includes("attorney") || r.includes("solicitor") || r.includes("advocate")) return ROLE_BULLETS["legal counsel"];
  if (r.includes("compliance") || r.includes("regulatory") || r.includes("risk officer")) return ROLE_BULLETS["compliance officer"];
  if (r.includes("consult")) return ROLE_BULLETS["management consultant"];
  if (r.includes("business analyst") || r.includes(" ba") || r === "ba") return ROLE_BULLETS["business analyst"];
  if (r.includes("analyst")) return ROLE_BULLETS["business analyst"];
  if (r.includes("professor") || r.includes("lecturer") || r.includes("faculty") || r.includes("academic")) return ROLE_BULLETS["professor"];
  if (r.includes("teach") || r.includes("educator") || r.includes("instructor") || r.includes("tutor")) return ROLE_BULLETS["teacher"];
  if (r.includes("nurse") || r.includes("nursing") || r.includes("staff nurse") || r.includes("rn ")) return ROLE_BULLETS["nurse"];
  if (r.includes("intern") || r.includes("trainee") || r.includes("apprentice")) return ROLE_BULLETS["intern"];
  return [];
}

/* ── Steps ───────────────────────────────────────────────── */
const MAIN_STEPS = [
  { key: "profile",          label: "Profile",       icon: <User size={13} />,          subtitle: "Contact details" },
  { key: "summary",          label: "Summary",       icon: <FileText size={13} />,      subtitle: "Professional summary" },
  { key: "work",             label: "Work",          icon: <Briefcase size={13} />,     subtitle: "Experience" },
  { key: "edu",              label: "Education",     icon: <GraduationCap size={13} />, subtitle: "Degrees & schools" },
  { key: "skills",           label: "Skills",        icon: <Award size={13} />,         subtitle: "Keywords" },
  { key: "projects",         label: "Projects",      icon: <Globe size={13} />,         subtitle: "Optional" },
  { key: "certifications",   label: "Certifications",icon: <Medal size={13} />,         subtitle: "Optional" },
  { key: "languages",        label: "Languages",     icon: <Languages size={13} />,     subtitle: "Optional" },
  { key: "awards",           label: "Awards",        icon: <Award size={13} />,         subtitle: "Honours & achievements" },
  { key: "interests",        label: "Interests",     icon: <Heart size={13} />,         subtitle: "Hobbies & interests" },
  { key: "references",       label: "References",    icon: <User size={13} />,          subtitle: "Optional" },
];
const STEP_STYLE    = 11;
const STEP_ATS      = 12;
const STEP_JD       = 13;
const STEP_TEMPLATE = 14;
const STEP_MODE     = 15;
const STEP_REORDER  = 16;
const TOTAL_MAIN = MAIN_STEPS.length;

/* ── Mode config ─────────────────────────────────────────────── */
type BuilderMode = "fresher" | "experienced";

// Step indices: 0=Profile 1=Summary 2=Work 3=Education 4=Skills 5=Projects 6=Certs 7=Languages 8=Awards 9=Interests 10=References
const MODE_STEP_ORDER: Record<BuilderMode, number[]> = {
  experienced: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  fresher:     [0, 1, 3, 5, 4, 2, 6, 7, 8, 9, 10],
};

const MODE_LABEL_OVERRIDES: Record<BuilderMode, Partial<Record<number, string>>> = {
  experienced: {},
  fresher: { 1: "Objective", 2: "Internships", 5: "Projects" },
};

const MODE_SUBTITLE_OVERRIDES: Record<BuilderMode, Partial<Record<number, string>>> = {
  experienced: {},
  fresher: { 1: "Career objective", 2: "Internships & work", 3: "Education first", 5: "Show your work" },
};

// Steps visually highlighted as "key" per mode
const MODE_KEY_STEPS: Record<BuilderMode, number[]> = {
  experienced: [1, 2, 4],      // Summary, Work, Skills
  fresher:     [3, 5, 4],      // Education, Projects, Skills
};

/* ── Blank / Sample ──────────────────────────────────────── */
const BLANK: ResumeData = {
  name: "", title: "", email: "", phone: "", location: "", website: "",
  linkedin: "", github: "",
  photo: "", summary: "",
  work: [{ id: "w1", company: "", role: "", from: "", to: "", current: false, desc: "" }],
  edu:  [{ id: "e1", school: "", degree: "", year: "", gpa: "" }],
  skills: "",
  projects: [],
  certifications: [],
  languages: [{ id: "l1", name: "English", level: "Conversational" as const }],
  awards: [],
  interests: "",
  references: [],
};

const SAMPLE: ResumeData = {
  name: "Priya Sharma",
  title: "Senior Software Engineer",
  email: "priya.sharma@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, India",
  website: "priyasharma.dev",
  linkedin: "linkedin.com/in/priyasharma",
  github: "github.com/priya-sharma",
  photo: "",
  summary:
    "Full-stack engineer with 6 years of experience building scalable web applications. Passionate about clean architecture, developer experience, and shipping products users love.",
  work: [
    { id: "w1", company: "Razorpay", role: "Senior Software Engineer", from: "Mar 2022", to: "", current: true,
      desc: "Led development of the merchant onboarding platform, reducing sign-up friction by 40%. Architected a React + Node.js micro-frontend system serving 500K+ merchants." },
    { id: "w2", company: "Freshworks", role: "Software Engineer", from: "Jul 2019", to: "Feb 2022", current: false,
      desc: "Built core features for Freshdesk ticketing engine. Improved API response times by 60% through query optimisation and Redis caching." },
  ],
  edu: [
    { id: "e1", school: "IIT Bangalore", degree: "B.Tech Computer Science", year: "2019", gpa: "8.6 / 10" },
  ],
  skills: "React, TypeScript, Node.js, PostgreSQL, Redis, Docker, AWS, GraphQL",
  projects: [
    { id: "p1", name: "FinTrack", url: "fintrack.app", repo: "github.com/priya/fintrack", from: "Jan 2023", to: "Apr 2023",
      desc: "Personal finance tracker with Plaid integration. 400+ GitHub stars." },
  ],
  certifications: [
    { id: "c1", name: "AWS Solutions Architect – Associate", issuer: "Amazon Web Services", year: "2022" },
  ],
  languages: [
    { id: "l1", name: "English", level: "Conversational" },
  ],
  awards: [
    { id: "a1", title: "Best Engineer Award", issuer: "Razorpay", year: "2023", desc: "Recognised for leading the merchant onboarding re-architecture." },
  ],
  interests: "Open source, hiking, chess, generative AI",
  references: [
    { id: "r1", name: "Ananya Rao", title: "Engineering Manager", company: "Razorpay", email: "ananya.rao@razorpay.com", phone: "+91 98000 11111" },
  ],
};

/* ── Role sample library ─────────────────────────────────── */
interface SampleMeta { label: string; role: string; emoji: string; mode: BuilderMode; data: ResumeData }

const ROLE_SAMPLES: SampleMeta[] = [
  {
    label: "Software Engineer", role: "Backend · 4 yrs", emoji: "💻", mode: "experienced",
    data: SAMPLE,
  },
  {
    label: "Fresher / Student", role: "Computer Science · 2025", emoji: "🎓", mode: "fresher",
    data: {
      name: "Arjun Mehta", title: "Final Year B.Tech Student", email: "arjun.mehta@college.edu",
      phone: "+91 90000 12345", location: "Pune, India", website: "", linkedin: "linkedin.com/in/arjunmehta", github: "github.com/arjun-mehta",
      photo: "",
      summary: "Passionate CS student with strong fundamentals in data structures and full-stack development. Seeking a software engineering role where I can apply my project experience and grow fast.",
      work: [
        { id: "w1", company: "StartupXYZ", role: "SWE Intern", from: "May 2024", to: "Jul 2024", current: false,
          desc: "• Built a real-time notification service using Node.js and Redis, reducing alert latency by 70%.\n• Collaborated with 2 senior engineers to refactor the REST API layer." },
      ],
      edu: [{ id: "e1", school: "PICT, Pune", degree: "B.Tech Computer Engineering", year: "2025", gpa: "8.9 / 10" }],
      skills: "C++, Python, JavaScript, React, Node.js, SQL, Git, REST APIs, DSA",
      projects: [
        { id: "p1", name: "StudyBuddy — AI Quiz Generator", url: "", repo: "github.com/arjun-mehta/studybuddy", from: "Sep 2023", to: "Dec 2023",
          desc: "• Generated adaptive MCQs from any PDF using OpenAI + LangChain.\n• 200+ classmates use it daily during exam season." },
        { id: "p2", name: "Campus Ride-Share App", url: "", repo: "github.com/arjun-mehta/rideshare", from: "Jan 2024", to: "Mar 2024",
          desc: "• React Native app connecting 500+ students for daily carpooling.\n• Integrated Google Maps API for real-time route matching." },
      ],
      certifications: [{ id: "c1", name: "Google Cloud Associate", issuer: "Google", year: "2024" }],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Hindi", level: "Native" }],
      awards: [{ id: "a1", title: "Smart India Hackathon — Finalist", issuer: "Govt. of India", year: "2023", desc: "Top 10 of 5,000+ teams nationwide." }],
      interests: "Competitive programming, open source, cricket",
      references: [],
    },
  },
  {
    label: "Data Scientist", role: "ML / Analytics · 3 yrs", emoji: "📊", mode: "experienced",
    data: {
      name: "Sneha Iyer", title: "Data Scientist", email: "sneha.iyer@email.com",
      phone: "+91 87654 32100", location: "Hyderabad, India", website: "snehaiyer.io", linkedin: "linkedin.com/in/snehaiyer", github: "github.com/sneha-iyer",
      photo: "",
      summary: "Data scientist with 3 years of experience building ML models and analytics pipelines. Specialise in NLP and recommendation systems for e-commerce and fintech.",
      work: [
        { id: "w1", company: "Flipkart", role: "Data Scientist", from: "Aug 2022", to: "", current: true,
          desc: "• Built a personalised recommendation engine increasing CTR by 22%.\n• Reduced fraud detection false-positive rate from 18% to 6% using gradient boosting.\n• Automated weekly reporting pipelines, saving 8 analyst-hours per week." },
        { id: "w2", company: "Swiggy", role: "Data Analyst", from: "Jun 2021", to: "Jul 2022", current: false,
          desc: "• Developed A/B testing framework used across 15+ experiments.\n• Built demand forecasting model achieving 89% accuracy for restaurant supply planning." },
      ],
      edu: [{ id: "e1", school: "IIT Hyderabad", degree: "M.Tech Data Science", year: "2021", gpa: "9.1 / 10" }],
      skills: "Python, Pandas, scikit-learn, PyTorch, SQL, Spark, Airflow, AWS, Tableau, A/B Testing",
      projects: [
        { id: "p1", name: "Churn Prediction API", url: "", repo: "github.com/sneha-iyer/churn-api", from: "Mar 2023", to: "May 2023",
          desc: "• XGBoost model served via FastAPI; reduced churn by 15% in pilot cohort.\n• Deployed on GCP with 99.5% uptime." },
      ],
      certifications: [
        { id: "c1", name: "AWS Certified ML Specialty", issuer: "Amazon", year: "2023" },
        { id: "c2", name: "TensorFlow Developer Certificate", issuer: "Google", year: "2022" },
      ],
      languages: [{ id: "l1", name: "English", level: "Fluent" }],
      awards: [{ id: "a1", title: "Best Paper Award", issuer: "ICDM 2021", year: "2021", desc: "Research on graph-based fraud detection." }],
      interests: "Kaggle competitions, research papers, badminton",
      references: [],
    },
  },
  {
    label: "Product Manager", role: "SaaS / 5 yrs", emoji: "📦", mode: "experienced",
    data: {
      name: "Ravi Krishnamurthy", title: "Product Manager", email: "ravi.k@email.com",
      phone: "+91 77000 55555", location: "Bengaluru, India", website: "", linkedin: "linkedin.com/in/ravikpm", github: "",
      photo: "",
      summary: "Product manager with 5 years of experience launching B2B SaaS products from 0 to 1. Strong track record of cross-functional collaboration and data-driven roadmap decisions.",
      work: [
        { id: "w1", company: "Zoho", role: "Senior Product Manager", from: "Jan 2022", to: "", current: true,
          desc: "• Led the 0→1 launch of Zoho Sign mobile app — 1M downloads in 6 months.\n• Increased activation rate from 32% to 61% through onboarding redesign.\n• Managed a team of 8 engineers and 2 designers across 3 time zones." },
        { id: "w2", company: "Clevertap", role: "Product Manager", from: "Jul 2019", to: "Dec 2021", current: false,
          desc: "• Shipped push notification personalisation feature adopted by 2,000+ enterprise customers.\n• Reduced customer support tickets by 40% via self-serve analytics dashboard." },
      ],
      edu: [{ id: "e1", school: "IIM Ahmedabad", degree: "MBA", year: "2019", gpa: "" }],
      skills: "Product Strategy, Roadmapping, SQL, Figma, JIRA, OKRs, A/B Testing, User Research, Go-to-Market",
      projects: [],
      certifications: [{ id: "c1", name: "Pragmatic Marketing Certified", issuer: "Pragmatic Institute", year: "2021" }],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Kannada", level: "Native" }],
      awards: [{ id: "a1", title: "Product of the Year", issuer: "SaaSBoomi", year: "2023", desc: "Zoho Sign Mobile recognised for UX innovation." }],
      interests: "Cricket, product teardowns, public speaking",
      references: [],
    },
  },
  {
    label: "Marketing Manager", role: "Growth / 4 yrs", emoji: "📣", mode: "experienced",
    data: {
      name: "Divya Nair", title: "Growth Marketing Manager", email: "divya.nair@email.com",
      phone: "+91 98765 11111", location: "Mumbai, India", website: "divyanair.co", linkedin: "linkedin.com/in/divyanair", github: "",
      photo: "",
      summary: "Growth marketer with 4 years driving acquisition and retention for consumer tech brands. Expert in performance marketing, SEO, and lifecycle email campaigns.",
      work: [
        { id: "w1", company: "Meesho", role: "Growth Marketing Manager", from: "Apr 2022", to: "", current: true,
          desc: "• Scaled paid acquisition from ₹5L to ₹1.2Cr/mo maintaining CAC below ₹120.\n• Launched referral programme generating 18% of new users at zero media cost.\n• Built automated lifecycle email flows improving 30-day retention by 25%." },
        { id: "w2", company: "Nykaa", role: "Digital Marketing Executive", from: "Jan 2020", to: "Mar 2022", current: false,
          desc: "• Managed ₹60L/mo Google & Meta budget across 4 product lines.\n• Grew organic search traffic by 140% through content SEO strategy." },
      ],
      edu: [{ id: "e1", school: "Symbiosis, Pune", degree: "BBA Marketing", year: "2019", gpa: "" }],
      skills: "Google Ads, Meta Ads, SEO, Email Marketing, Klaviyo, SQL, Tableau, CRO, Content Strategy",
      projects: [],
      certifications: [{ id: "c1", name: "Google Ads Certified", issuer: "Google", year: "2023" }],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Malayalam", level: "Native" }],
      awards: [{ id: "a1", title: "Best Growth Campaign", issuer: "MMA India", year: "2023", desc: "Gold award for Meesho referral programme." }],
      interests: "Performance marketing, running, travel",
      references: [],
    },
  },
  {
    label: "UX Designer", role: "Product Design · 3 yrs", emoji: "🎨", mode: "experienced",
    data: {
      name: "Priya Subramaniam", title: "UX / Product Designer", email: "priya.sub@email.com",
      phone: "+91 99887 22334", location: "Bengaluru, India", website: "priyasub.design", linkedin: "linkedin.com/in/priyasub", github: "",
      photo: "",
      summary: "UX designer with 3 years turning complex product problems into clean, user-tested interfaces. Skilled in end-to-end design — from discovery workshops to high-fidelity Figma prototypes and design systems.",
      work: [
        { id: "w1", company: "Razorpay", role: "Senior UX Designer", from: "Jul 2022", to: "", current: true,
          desc: "• Redesigned the payment checkout flow — reduced drop-off rate by 31% and increased mobile conversions by 18%.\n• Built and maintained a Figma design system of 120+ components used by 15 product teams.\n• Conducted 40+ user interviews and 8 usability studies to inform roadmap decisions." },
        { id: "w2", company: "Freshworks", role: "UX Designer", from: "Jun 2021", to: "Jun 2022", current: false,
          desc: "• Led end-to-end design of CRM onboarding, cutting time-to-first-value from 14 days to 3 days.\n• Collaborated with engineers to ship pixel-perfect React components matching designs within 95%." },
      ],
      edu: [{ id: "e1", school: "NID Ahmedabad", degree: "M.Des Interaction Design", year: "2021", gpa: "" }],
      skills: "Figma, Prototyping, User Research, Usability Testing, Design Systems, Wireframing, Information Architecture, Accessibility, HTML/CSS basics",
      projects: [
        { id: "p1", name: "Fintech Onboarding Redesign — Case Study", url: "priyasub.design/fintech", repo: "", from: "Jan 2023", to: "Mar 2023",
          desc: "• Research-led redesign reducing KYC abandonment by 42%.\n• Published case study with 15k+ views on Medium." },
      ],
      certifications: [{ id: "c1", name: "Google UX Design Certificate", issuer: "Google", year: "2021" }],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Tamil", level: "Native" }],
      awards: [{ id: "a1", title: "Best Product Design — Razorpay Hackathon", issuer: "Razorpay", year: "2023", desc: "1st place among 60 participating teams." }],
      interests: "Design systems, typography, urban sketching",
      references: [],
    },
  },
  {
    label: "DevOps / Cloud", role: "AWS · SRE · 5 yrs", emoji: "☁️", mode: "experienced",
    data: {
      name: "Karthik Anand", title: "Senior DevOps / Cloud Engineer", email: "karthik.anand@email.com",
      phone: "+91 88001 77654", location: "Chennai, India", website: "", linkedin: "linkedin.com/in/karthikanand", github: "github.com/karthik-anand",
      photo: "",
      summary: "DevOps engineer with 5 years designing and operating cloud-native infrastructure at scale. Expert in Kubernetes, Terraform, and CI/CD pipelines — reduced release cycle from 2 weeks to daily at three companies.",
      work: [
        { id: "w1", company: "PhonePe", role: "Senior DevOps Engineer", from: "Feb 2022", to: "", current: true,
          desc: "• Architected multi-region EKS cluster serving 50M+ daily transactions with 99.99% uptime.\n• Built GitOps pipeline (ArgoCD + Helm) cutting deployment time from 45 min to 8 min.\n• Reduced infrastructure costs by ₹1.4Cr/year through right-sizing and spot instance strategy." },
        { id: "w2", company: "OYO", role: "Cloud Infrastructure Engineer", from: "Aug 2019", to: "Jan 2022", current: false,
          desc: "• Migrated 200+ microservices from bare-metal to AWS, reducing ops overhead by 60%.\n• Built centralised logging and alerting stack (Prometheus, Grafana, ELK) for 15-team engineering org.\n• Automated DR runbooks cutting mean recovery time from 4 hours to 22 minutes." },
      ],
      edu: [{ id: "e1", school: "Anna University", degree: "B.E. Computer Science", year: "2019", gpa: "8.3 / 10" }],
      skills: "AWS, Kubernetes, Terraform, Docker, ArgoCD, Helm, CI/CD, GitHub Actions, Prometheus, Grafana, Python, Bash, Ansible, Linux",
      projects: [
        { id: "p1", name: "Open-source Terraform Module — AWS EKS", url: "", repo: "github.com/karthik-anand/eks-blueprint", from: "Mar 2023", to: "Jun 2023",
          desc: "• Production-ready EKS module with auto-scaling, IRSA, and VPC design.\n• 800+ GitHub stars, used by 50+ companies." },
      ],
      certifications: [
        { id: "c1", name: "AWS Solutions Architect — Professional", issuer: "Amazon", year: "2023" },
        { id: "c2", name: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF", year: "2022" },
      ],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Tamil", level: "Native" }],
      awards: [],
      interests: "Open source, CTFs, long-distance cycling",
      references: [],
    },
  },
  {
    label: "Finance / CA", role: "Chartered Accountant · 4 yrs", emoji: "📈", mode: "experienced",
    data: {
      name: "Ananya Joshi", title: "Chartered Accountant (CA)", email: "ananya.joshi@email.com",
      phone: "+91 96543 22100", location: "Delhi, India", website: "", linkedin: "linkedin.com/in/ananyajoshica", github: "",
      photo: "",
      summary: "Chartered Accountant with 4 years of post-qualification experience in statutory audit, direct taxation, and financial reporting for listed companies and MNCs. Strong command of Ind AS, IFRS, and transfer pricing.",
      work: [
        { id: "w1", company: "Deloitte India", role: "Assistant Manager — Audit", from: "Oct 2022", to: "", current: true,
          desc: "• Led statutory audit engagements for 6 listed companies with combined revenue exceeding ₹8,000 Cr.\n• Identified ₹2.4 Cr tax exposure in transfer pricing review, enabling client to restructure ahead of assessment.\n• Mentored and reviewed work of 4 article trainees, maintaining zero restatements across all engagements." },
        { id: "w2", company: "PWC India", role: "Senior Associate — Tax", from: "Jul 2020", to: "Sep 2022", current: false,
          desc: "• Filed 120+ corporate income tax returns with 100% on-time rate.\n• Conducted due diligence for 3 M&A transactions with aggregate deal value of ₹450 Cr.\n• Prepared advance tax workings, reducing client interest liability by ₹18 L annually." },
      ],
      edu: [{ id: "e1", school: "ICAI", degree: "Chartered Accountant (CA Final)", year: "2020", gpa: "First Attempt" }],
      skills: "Ind AS / IFRS, Direct Tax, GST, Transfer Pricing, Statutory Audit, Financial Modeling, Tally, SAP FI, Excel, Power BI",
      projects: [],
      certifications: [
        { id: "c1", name: "Certified Information Systems Auditor (CISA)", issuer: "ISACA", year: "2023" },
        { id: "c2", name: "Diploma in IFRS", issuer: "ACCA", year: "2021" },
      ],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Hindi", level: "Native" }],
      awards: [{ id: "a1", title: "All India Rank 28 — CA Final", issuer: "ICAI", year: "2020", desc: "" }],
      interests: "Capital markets, investment research, chess",
      references: [],
    },
  },
  {
    label: "Sales Executive", role: "B2B SaaS · 3 yrs", emoji: "🤝", mode: "experienced",
    data: {
      name: "Vikram Reddy", title: "Senior Sales Executive — Enterprise SaaS", email: "vikram.reddy@email.com",
      phone: "+91 91234 56789", location: "Hyderabad, India", website: "", linkedin: "linkedin.com/in/vikramreddysales", github: "",
      photo: "",
      summary: "Enterprise sales professional with 3 years closing 6- and 7-figure SaaS deals across BFSI and manufacturing verticals. Consistent overachiever — finished 140% of quota in FY24 and grew territory ARR by ₹4.2 Cr.",
      work: [
        { id: "w1", company: "Darwinbox", role: "Senior Enterprise Sales Executive", from: "Apr 2022", to: "", current: true,
          desc: "• Closed 14 enterprise deals averaging ₹42 L ARR, including the largest new logo in APAC at ₹1.8 Cr.\n• Built a pipeline of ₹12 Cr from cold outreach, product demos, and CXO-level stakeholder management.\n• Reduced average sales cycle from 120 days to 78 days by streamlining POC and legal review process." },
        { id: "w2", company: "Freshworks", role: "Sales Development Representative", from: "Jun 2021", to: "Mar 2022", current: false,
          desc: "• Generated ₹3.2 Cr in qualified pipeline through 200+ outbound touches per week.\n• Promoted to AE in 10 months — fastest in the 2021 cohort of 28 SDRs." },
      ],
      edu: [{ id: "e1", school: "XLRI Jamshedpur", degree: "PGDM Business Management", year: "2021", gpa: "" }],
      skills: "Enterprise Sales, SaaS, MEDDIC, CRM (Salesforce), Cold Outreach, Stakeholder Management, Negotiation, HubSpot, Pipeline Management, Contract Review",
      projects: [],
      certifications: [{ id: "c1", name: "Salesforce Certified Sales Cloud Consultant", issuer: "Salesforce", year: "2023" }],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Telugu", level: "Native" }, { id: "l3", name: "Hindi", level: "Conversational" }],
      awards: [
        { id: "a1", title: "Presidents Club FY24", issuer: "Darwinbox", year: "2024", desc: "Top 5% of global sales team." },
        { id: "a2", title: "Fastest Promoted SDR", issuer: "Freshworks", year: "2022", desc: "" },
      ],
      interests: "Cricket, fantasy sports, startup ecosystem",
      references: [],
    },
  },
  {
    label: "HR Manager", role: "HRBP · Talent · 6 yrs", emoji: "🧑‍💼", mode: "experienced",
    data: {
      name: "Meera Pillai", title: "HR Business Partner / HR Manager", email: "meera.pillai@email.com",
      phone: "+91 94455 33211", location: "Mumbai, India", website: "", linkedin: "linkedin.com/in/meerapillaihr", github: "",
      photo: "",
      summary: "HR Business Partner with 6 years supporting high-growth tech and fintech companies through rapid scaling. Deep expertise in talent acquisition, performance management, and building inclusive cultures.",
      work: [
        { id: "w1", company: "Paytm", role: "Senior HR Business Partner", from: "Jan 2021", to: "", current: true,
          desc: "• Partnered with CTO office to hire 180+ engineers in 14 months, reducing time-to-offer from 28 days to 11 days.\n• Designed and rolled out a 360° performance review framework adopted by 2,400 employees.\n• Reduced voluntary attrition in engineering from 26% to 14% through structured stay interviews and career pathing." },
        { id: "w2", company: "Ola", role: "HR Executive", from: "Aug 2018", to: "Dec 2020", current: false,
          desc: "• Handled end-to-end recruitment for tech and operations roles — filled 240+ positions in 18 months.\n• Launched employee wellness programme with 70% participation rate in first quarter.\n• Administered HRMS (Darwinbox) for 1,200+ employees, improving payroll accuracy to 99.8%." },
      ],
      edu: [{ id: "e1", school: "TISS Mumbai", degree: "M.A. Human Resources Management", year: "2018", gpa: "" }],
      skills: "Talent Acquisition, HRBP, Performance Management, Employee Relations, Compensation & Benefits, Succession Planning, HRMS (Darwinbox, SAP), Labour Law, DEI",
      projects: [],
      certifications: [
        { id: "c1", name: "SHRM Certified Professional (SHRM-CP)", issuer: "SHRM", year: "2022" },
        { id: "c2", name: "Certified Compensation Professional (CCP)", issuer: "WorldatWork", year: "2021" },
      ],
      languages: [{ id: "l1", name: "English", level: "Fluent" }, { id: "l2", name: "Malayalam", level: "Native" }, { id: "l3", name: "Hindi", level: "Fluent" }],
      awards: [{ id: "a1", title: "Best HR Initiative — People First Award", issuer: "Paytm", year: "2023", desc: "360° review framework recognised company-wide." }],
      interests: "Organisational psychology, yoga, fiction",
      references: [],
    },
  },
];

/* ── Page-length estimator ─────────────────────────────────── */
function estimatePageCount(data: ResumeData): number {
  // Rough line estimate — calibrated against Classic template at A4
  let lines = 4; // header always
  if (data.summary?.trim()) lines += Math.ceil((data.summary.split(/\s+/).filter(Boolean).length) / 18) + 1;
  const filledWork = data.work.filter(w => w.company || w.role);
  filledWork.forEach(w => {
    lines += 2; // company + role row
    if (w.desc) lines += Math.ceil(w.desc.split("\n").filter(Boolean).length * 1.2);
  });
  const filledEdu = data.edu.filter(e => e.school);
  lines += filledEdu.length * 2;
  if (data.skills?.trim()) lines += Math.ceil(data.skills.split(",").filter(Boolean).length / 6) + 1;
  const filledProj = (data.projects ?? []).filter(p => p.name);
  filledProj.forEach(p => {
    lines += 2;
    if (p.desc) lines += Math.ceil(p.desc.split("\n").filter(Boolean).length * 1.1);
  });
  lines += (data.certifications ?? []).filter(c => c.name).length * 1.5;
  lines += (data.languages ?? []).filter(l => l.name).length;
  lines += (data.awards ?? []).filter(a => a.title).length * 1.5;
  if (data.interests?.trim()) lines += 1;
  return lines <= 42 ? 1 : lines <= 84 ? 2 : 3;
}

/* ── ATS scoring ─────────────────────────────────────────── */
function computeAts(data: ResumeData): { score: number; tips: string[]; scoreColor: string } {
  let score = 0;
  const tips: string[] = [];

  if (data.name?.trim())     score += 5; else tips.push("Add your full name");
  if (data.email?.trim())    score += 5; else tips.push("Add an email address");
  if (data.phone?.trim())    score += 4; else tips.push("Add a phone number");
  if (data.location?.trim()) score += 3; else tips.push("Add city / location");
  if (data.linkedin?.trim() || data.website?.trim()) score += 3; else tips.push("Add LinkedIn or portfolio URL");

  const sWords = data.summary?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  if (sWords >= 40)      score += 15;
  else if (sWords >= 20) { score += 8;  tips.push("Expand summary to 40+ words"); }
  else if (sWords > 0)   { score += 4;  tips.push("Summary too short — aim for 40+ words"); }
  else                         tips.push("Add a professional summary (40+ words)");

  const validWork = data.work.filter(w => (w.company || w.role) && w.desc);
  const anyWork   = data.work.filter(w => w.company || w.role).length;
  if (anyWork === 0) {
    tips.push("Add at least one work experience entry");
  } else {
    score += Math.min(anyWork, 2) * 8;
    score += Math.min(validWork.length, 2) * 7;
    if (validWork.length < anyWork) tips.push("Add descriptions to all work entries");
  }

  const skills = data.skills?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
  if (skills.length >= 8)      score += 15;
  else if (skills.length >= 5) { score += 10; tips.push("Add more skills (8+ recommended)"); }
  else if (skills.length >= 2) { score += 5;  tips.push("Add relevant skills — aim for 8+"); }
  else                               tips.push("Add skills — aim for 8+ keywords");

  if (data.edu.some(e => e.school)) score += 10;
  else tips.push("Add your education");

  if (data.certifications?.some(c => c.name)) score += 5;
  if (data.projects?.some(p => p.name))       score += 5;

  const capped = Math.min(score, 100);
  const scoreColor = capped >= 75 ? "#16a34a" : capped >= 50 ? "#d97706" : "#dc2626";
  return { score: capped, tips, scoreColor };
}

/* ── Step completion detection ──────────────────────────── */
function stepSubtitle(key: string, data: ResumeData): string {
  switch (key) {
    case "profile":
      return data.name?.trim() ? data.name.split(" ")[0] : "Not started";
    case "summary": {
      const wc = data.summary?.trim().split(/\s+/).filter(Boolean).length ?? 0;
      return wc > 0 ? `${wc} words` : "Not started";
    }
    case "work": {
      const n = data.work.filter(w => w.company || w.role).length;
      return n > 0 ? `${n} ${n === 1 ? "entry" : "entries"}` : "Not started";
    }
    case "edu": {
      const n = data.edu.filter(e => e.school).length;
      return n > 0 ? `${n} ${n === 1 ? "entry" : "entries"}` : "Not started";
    }
    case "skills": {
      const n = data.skills?.split(",").map(s => s.trim()).filter(Boolean).length ?? 0;
      return n > 0 ? `${n} skills` : "Not started";
    }
    case "projects": {
      const n = (data.projects ?? []).filter(p => p.name).length;
      return n > 0 ? `${n} ${n === 1 ? "project" : "projects"}` : "Optional";
    }
    case "certifications": {
      const n = (data.certifications ?? []).filter(c => c.name).length;
      return n > 0 ? `${n} ${n === 1 ? "cert" : "certs"}` : "Optional";
    }
    case "languages": {
      const n = (data.languages ?? []).filter(l => l.name).length;
      return n > 0 ? `${n} ${n === 1 ? "language" : "languages"}` : "Optional";
    }
    case "awards": {
      const n = (data.awards ?? []).filter(a => a.title).length;
      return n > 0 ? `${n} ${n === 1 ? "award" : "awards"}` : "Optional";
    }
    case "interests":
      return data.interests?.trim() ? data.interests.split(",").map(s => s.trim()).filter(Boolean).length + " interests" : "Optional";
    case "references": {
      const n = (data.references ?? []).filter(r => r.name).length;
      return n > 0 ? `${n} ${n === 1 ? "reference" : "references"}` : "Optional";
    }
    default: return "";
  }
}

function isDone(key: string, data: ResumeData): boolean {
  switch (key) {
    case "profile":        return !!(data.name?.trim() && data.email?.trim());
    case "summary":        return (data.summary?.trim().split(/\s+/).filter(Boolean).length ?? 0) >= 10;
    case "work":           return data.work.some(w => w.company || w.role);
    case "edu":            return data.edu.some(e => e.school);
    case "skills":         return (data.skills?.split(",").map(s => s.trim()).filter(Boolean).length ?? 0) >= 2;
    case "projects":       return (data.projects ?? []).some(p => p.name);
    case "certifications": return (data.certifications ?? []).some(c => c.name);
    case "languages":      return (data.languages ?? []).some(l => l.name);
    case "awards":         return (data.awards ?? []).some(a => a.title);
    case "interests":      return !!(data.interests?.trim());
    case "references":     return (data.references ?? []).some(r => r.name);
    default:               return false;
  }
}

/** Three-state completion for each section.
 *  Required sections: "empty" | "partial" | "complete"
 *  Optional sections: "empty" | "complete"  (no amber for optional)
 */
function sectionStatus(key: string, data: ResumeData): "empty" | "partial" | "complete" {
  switch (key) {
    case "profile": {
      const has = [data.name, data.email, data.phone, data.location, data.linkedin || data.website]
        .filter(v => v?.trim()).length;
      if (has >= 4) return "complete";
      if (has >= 2) return "partial";
      return "empty";
    }
    case "summary": {
      const words = data.summary?.trim().split(/\s+/).filter(Boolean).length ?? 0;
      if (words >= 40) return "complete";
      if (words > 0)   return "partial";
      return "empty";
    }
    case "work": {
      const entries = data.work.filter(w => w.company || w.role);
      if (entries.length === 0) return "empty";
      const withDesc = entries.filter(w => w.desc?.trim());
      if (withDesc.length === entries.length) return "complete";
      return "partial";
    }
    case "edu": {
      const entries = data.edu.filter(e => e.school);
      if (entries.length === 0) return "empty";
      const full = entries.filter(e => e.degree?.trim());
      if (full.length === entries.length) return "complete";
      return "partial";
    }
    case "skills": {
      const n = data.skills?.split(",").map(s => s.trim()).filter(Boolean).length ?? 0;
      if (n >= 8)  return "complete";
      if (n >= 2)  return "partial";
      return "empty";
    }
    // Optional sections — binary only
    case "projects":       return (data.projects ?? []).some(p => p.name)       ? "complete" : "empty";
    case "certifications": return (data.certifications ?? []).some(c => c.name) ? "complete" : "empty";
    case "languages":      return (data.languages ?? []).some(l => l.name)      ? "complete" : "empty";
    case "awards":         return (data.awards ?? []).some(a => a.title)        ? "complete" : "empty";
    case "interests":      return data.interests?.trim()                        ? "complete" : "empty";
    case "references":     return (data.references ?? []).some(r => r.name)     ? "complete" : "empty";
    default:               return "empty";
  }
}

const REQUIRED_SECTIONS = new Set(["profile", "summary", "work", "edu", "skills"]);

/* ── Per-section ATS helpers ─────────────────────────────── */
function atsProfile(d: ResumeData) {
  let score = 0; const missing: string[] = [];
  if (d.name?.trim())     score += 5; else missing.push("Full name (5 pts)");
  if (d.email?.trim())    score += 5; else missing.push("Email (5 pts)");
  if (d.phone?.trim())    score += 4; else missing.push("Phone (4 pts)");
  if (d.location?.trim()) score += 3; else missing.push("Location (3 pts)");
  if (d.linkedin?.trim() || d.website?.trim()) score += 3; else missing.push("LinkedIn or Website (3 pts)");
  return { score, max: 20, missing };
}
function atsSummary(d: ResumeData) {
  const words = d.summary?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  let score = 0;
  if (words >= 40) score = 15; else if (words >= 20) score = 8; else if (words > 0) score = 4;
  return { score, max: 15, words };
}
function atsWork(d: ResumeData) {
  const anyWork   = d.work.filter(w => w.company || w.role).length;
  const validWork = d.work.filter(w => (w.company || w.role) && w.desc).length;
  let score = Math.min(anyWork, 2) * 8 + Math.min(validWork, 2) * 7;
  const hints: string[] = [];
  if (anyWork === 0)              hints.push("Add at least one entry");
  else if (validWork < anyWork)   hints.push(`${anyWork - validWork} ${anyWork - validWork === 1 ? "entry is" : "entries are"} missing descriptions`);
  return { score: Math.min(score, 30), max: 30, hints };
}
function atsSkills(d: ResumeData) {
  const count = d.skills?.split(",").map(s => s.trim()).filter(Boolean).length ?? 0;
  let score = 0;
  if (count >= 8) score = 15; else if (count >= 5) score = 10; else if (count >= 2) score = 5;
  return { score, max: 15, count };
}
function atsEdu(d: ResumeData) {
  return { score: d.edu.some(e => e.school) ? 10 : 0, max: 10 };
}
function sectionColor(score: number, max: number) {
  const pct = score / max;
  return pct >= 1 ? "#16a34a" : pct >= 0.6 ? "#d97706" : "#dc2626";
}

/* ── Section ATS bar ─────────────────────────────────────── */
function SectionAtsBar({ label, score, max, hints }: {
  label: string; score: number; max: number; hints?: string[];
}) {
  const color = sectionColor(score, max);
  const pct   = Math.round((score / max) * 100);
  return (
    <div style={{ marginTop: 6, padding: "11px 14px", background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>ATS · {label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>
          {score}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--text3)" }}>/{max} pts</span>
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "var(--surface2)", overflow: "hidden", marginBottom: hints?.length ? 8 : 0 }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: color, transition: "width .4s ease" }} />
      </div>
      {hints?.map((h, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
          <span style={{ color, fontWeight: 700 }}>→</span> {h}
        </div>
      ))}
      {score === max && (
        <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>✓ Section complete</div>
      )}
    </div>
  );
}

/* ── Inline progress hint (summary / skills) ─────────────── */
function InlineAtsHint({ value, max, unit, label }: {
  value: number; max: number; unit: string; label?: string;
}) {
  const color = value >= max ? "#16a34a" : value >= max * 0.6 ? "#d97706" : "#dc2626";
  const pct   = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--surface2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: color, transition: "width .3s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap", minWidth: 80, textAlign: "right" as const }}>
        {value}/{max} {unit}
        {value >= max && " ✓"}
        {label && value < max ? ` · ${label}` : ""}
      </span>
    </div>
  );
}

/* ── Tips panel component ────────────────────────────────── */
function TipsPanel({ sectionKey, openTips, setOpenTips }: {
  sectionKey: string;
  openTips: string | null;
  setOpenTips: (k: string | null) => void;
}) {
  const tips = SECTION_TIPS[sectionKey];
  if (!tips) return null;
  const isOpen = openTips === sectionKey;
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpenTips(isOpen ? null : sectionKey)}
        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: isOpen ? "var(--accent)" : "var(--text3)", background: isOpen ? "var(--accdim)" : "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: isOpen ? "var(--accborder)" : "var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
        <Lightbulb size={10} /> {tips.title} {isOpen ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
      </button>
      {isOpen && (
        <div style={{ marginTop: 6, padding: "10px 12px", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {tips.tips.map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
              <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>✦</span>
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

function GateBadge({ label }: { label: string }) {
  return (
    <a href="/upgrade" target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700,
        color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid",
        borderColor: "var(--accborder)", borderRadius: 4, padding: "2px 7px", textDecoration: "none", flexShrink: 0 }}>
      <Lock size={9} /> {label}
    </a>
  );
}

/* Sticky sign-in banner shown at the top of the step panel for guests */
function GuestEditBanner({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      padding: "11px 16px", marginBottom: 16,
      background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)",
      borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LogIn size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", lineHeight: 1.4 }}>
          Sign in to save your resume and access all features
        </span>
      </div>
      <button onClick={onSignIn}
        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--accent)", borderRadius: 7, padding: "6px 14px", border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
        <LogIn size={11} /> Sign in free
      </button>
    </div>
  );
}

/* Upgrade banner for premium-template-gated steps */
function PremiumUpgradeBanner({ isGuest, onSignIn }: { isGuest: boolean; onSignIn: () => void }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 15,
      background: "rgba(var(--bg-rgb, 15,15,25), 0.82)",
      backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 12,
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center",
        padding: "28px 32px", background: "var(--surface)", borderRadius: 14,
        borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--accborder)",
        boxShadow: "0 8px 40px rgba(0,0,0,.4)", maxWidth: 320,
      }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--accdim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)", marginBottom: 6 }}>Premium Template</div>
          <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            {isGuest
              ? "Sign in and upgrade to Premium to edit all sections with this template."
              : "Upgrade your plan to edit all sections with this premium template."}
          </div>
        </div>
        {isGuest ? (
          <button onClick={onSignIn}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--accent)", borderRadius: 9, padding: "9px 20px", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <LogIn size={13} /> Sign in &amp; Upgrade
          </button>
        ) : (
          <a href="/upgrade" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--accent)", borderRadius: 9, padding: "9px 20px", textDecoration: "none" }}>
            <Sparkles size={13} /> Upgrade Plan
          </a>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline, rows, disabled, bullets }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; rows?: number; disabled?: boolean; bullets?: boolean;
}) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const base: React.CSSProperties = {
    background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)",
    borderRadius: 9, color: "var(--text1)", fontSize: 13,
    padding: "10px 12px", outline: "none", width: "100%", resize: "vertical" as const,
    transition: "border-color .15s, box-shadow .15s", fontFamily: "inherit",
    opacity: disabled ? .6 : 1, cursor: disabled ? "not-allowed" : undefined,
  };
  const handlers = disabled ? {} : {
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      (e.target as HTMLElement).style.borderColor = "var(--accent)";
      (e.target as HTMLElement).style.boxShadow = "0 0 0 3px var(--accdim)";
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      (e.target as HTMLElement).style.borderColor = "var(--border)";
      (e.target as HTMLElement).style.boxShadow = "none";
    },
  };

  function addBullet(e: React.MouseEvent) {
    // Prevent the button click from stealing focus so cursor position is preserved
    e.preventDefault();
    const ta = taRef.current;
    const pos = ta ? (ta.selectionStart ?? value.length) : value.length;

    // Find the start and end of the line the cursor is on
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const lineEndRaw = value.indexOf("\n", pos);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const line = value.slice(lineStart, lineEnd);

    let newValue: string;
    let newCursor: number;

    if (line.trimStart().startsWith("• ")) {
      // Line already has a bullet — append a new bullet line after it
      const insert = "\n• ";
      newValue = value.slice(0, lineEnd) + insert + value.slice(lineEnd);
      newCursor = lineEnd + insert.length;
    } else {
      // Prepend bullet to the current line
      newValue = value.slice(0, lineStart) + "• " + value.slice(lineStart);
      newCursor = lineStart + 2 + (pos - lineStart);
    }

    onChange(newValue);
    // Restore focus and cursor after React re-renders
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); ta.setSelectionRange(newCursor, newCursor); }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {(label || bullets) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {label && (
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px" }}>
              {label}
            </label>
          )}
          {bullets && !disabled && (
            <button type="button" onMouseDown={addBullet}
              style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.6 }}>
              • Add bullet
            </button>
          )}
        </div>
      )}
      {multiline
        ? <textarea ref={taRef} rows={rows ?? 3} spellCheck style={base} placeholder={placeholder} value={value} readOnly={disabled} onChange={disabled ? undefined : e => onChange(e.target.value)} {...handlers} />
        : <input style={base} placeholder={placeholder} value={value} readOnly={disabled} onChange={disabled ? undefined : e => onChange(e.target.value)} {...handlers} />
      }
    </div>
  );
}

/* ── Entry card wrapper ──────────────────────────────────── */
function EntryCard({ num, onRemove, canRemove, children }: {
  num: number; onRemove: () => void; canRemove: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>Entry {num}</span>
        {canRemove && (
          <button onClick={onRemove} style={{ background: "none", border: "none", color: "#fca5a5", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", borderRadius: 6, padding: "2px 4px" }}>×</button>
        )}
      </div>
      {children}
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "11px 0", borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text2)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
      <Plus size={13} /> {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   BUILDER PAGE
══════════════════════════════════════════════════════════ */
export default function BuilderPage() {
  const plan                          = useResumePlan();
  const { user, signInWithGoogle }    = useAuth();
  const [step,          setStep]      = useState(0);
  const [data,          setData]      = useState<ResumeData>(SAMPLE);
  const [template,      setTemplate]  = useState("Classic");
  const [styleFont,     setStyleFont] = useState(FONT_OPTIONS[0].family);
  const [styleColor,    setStyleColor]= useState("");
  const [shareStatus,   setShareStatus]  = useState<"idle" | "loading" | "copied">("idle");
  const [mode,          setMode]         = useState<BuilderMode>("experienced");
  const [autoSaved,     setAutoSaved]    = useState(false);
  const [jdText,        setJdText]       = useState("");
  const [jdResult,      setJdResult]     = useState<JdMatchResult | null>(null);
  const [tplFilter,     setTplFilter]    = useState<"all" | "free" | "premium" | "foryou">("all");
  const [tplSort,       setTplSort]      = useState<"default" | "ats">("default");
  const [tplHover,      setTplHover]     = useState<string | null>(null);
  const [fontPickerOpen,setFontPickerOpen] = useState(false);
  const [importStatus,  setImportStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [importMsg,     setImportMsg]    = useState("");
  const [importedFields, setImportedFields] = useState<Partial<ResumeData> | null>(null);
  const [previewScale,  setPreviewScale] = useState(1);
  const [isMobile,      setIsMobile]     = useState(false);
  const [showPreview,   setShowPreview]  = useState(false); // mobile preview overlay
  const [dark,          setDark]         = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null); // premium preview modal
  const [customOrder,   setCustomOrder]  = useState<number[] | null>(null);    // user-defined section order
  const [photoShape,    setPhotoShape]   = useState<"round" | "square">("round");
  const [customizeTab,  setCustomizeTab] = useState<"fonts" | "order">("fonts"); // subtabs within Customize step
  const [liImportUrl,   setLiImportUrl]  = useState("");    // LinkedIn URL input
  const [liImportOpen,  setLiImportOpen] = useState(false); // LinkedIn import panel open
  const [showSamples,   setShowSamples]  = useState(false); // sample library modal
  const certLogoInputRef = useRef<HTMLInputElement>(null);
  const [certLogoIdx,   setCertLogoIdx]  = useState<number>(-1); // which cert is getting logo upload

  /* Resume identity + visibility */
  const [resumeName,     setResumeName]     = useState("Untitled Resume");
  const [nameEditing,    setNameEditing]    = useState(false);
  const [showResumeMenu,  setShowResumeMenu]  = useState(false);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  /* Cloud saves */
  const [currentSaveId,  setCurrentSaveId]  = useState<string | null>(null);
  const [savesOpen,      setSavesOpen]      = useState(false);
  const [savesList,      setSavesList]      = useState<ResumeRecord[]>([]);
  const [savingCloud,    setSavingCloud]    = useState(false);
  const [loadingSaves,   setLoadingSaves]   = useState(false);
  const [mobileSavesOpen, setMobileSavesOpen] = useState(false);

  /* Two-panel desktop UI state — persisted across refresh */
  const [leftTab,        setLeftTab]        = useState<"edit" | "cover" | "templates" | "order" | "jd">(() => {
    if (typeof window === "undefined") return "edit";
    const saved = localStorage.getItem("rb-left-tab");
    return (["edit","cover","templates","order","jd"].includes(saved ?? "")
      ? saved as "edit" | "cover" | "templates" | "order" | "jd"
      : "edit");
  });
  const [activeSection,  setActiveSection]  = useState<string | null>(() => {
    if (typeof window === "undefined") return "profile";
    return localStorage.getItem("rb-active-section") ?? "profile";
  });
  /* Cover letter */
  const [coverLetter,    setCoverLetter]    = useState<CoverLetterData>(BLANK_COVER);
  const [coverAiLoading, setCoverAiLoading] = useState(false);
  const [tailorLoading,  setTailorLoading]  = useState(false);
  const [tailorResult,   setTailorResult]   = useState<{ summary: string; missingSkills: string[] } | null>(null);
  /* Density / spacing */
  const [density,        setDensity]        = useState<"compact" | "normal" | "spacious">("normal");
  /* Bullet suggestions panel */
  const [openSuggestions, setOpenSuggestions] = useState<number>(-1);
  /* Section tips open state */
  const [openTips,       setOpenTips]       = useState<string | null>(null);
  /* AI enhancement state */
  const [aiLoading,      setAiLoading]      = useState<string | null>(null); // "summary_concise" etc.
  /* Photo crop state */
  const [cropSrc,        setCropSrc]        = useState<string | null>(null);
  const [cropZoom,       setCropZoom]       = useState(1);
  const [cropX,          setCropX]          = useState(0);
  const [cropY,          setCropY]          = useState(0);
  const [cropDragging,   setCropDragging]   = useState(false);
  const cropDragStart    = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const cropCanvasRef    = useRef<HTMLCanvasElement>(null);
  const cropImgRef       = useRef<HTMLImageElement | null>(null);

  const photoInputRef  = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const previewRef     = useRef<HTMLDivElement>(null);

  /* Section reorder drag state */
  const dragFromRef    = useRef<number>(-1);
  const [dragOverIdx,  setDragOverIdx]  = useState<number>(-1);

  /* Detect mobile + compute preview scale */
  /* Persist tab + accordion state so refresh restores exactly where user was */
  useEffect(() => { localStorage.setItem("rb-left-tab", leftTab); }, [leftTab]);
  useEffect(() => { localStorage.setItem("rb-active-section", activeSection ?? ""); }, [activeSection]);

  useEffect(() => {
    function update() {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (mobile) {
        // content area is full width minus 24px padding
        setPreviewScale(Math.max(0.3, (window.innerWidth - 24) / 794));
      }
      // desktop: leave scale at user's chosen value (default 100%)
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* theme — persist to localStorage */
  useEffect(() => {
    const saved = localStorage.getItem("resume-theme");
    if (saved === "light") { setDark(false); document.body.classList.add("light"); }
    else { document.body.classList.remove("light"); }
  }, []);

  useEffect(() => {
    if (dark) {
      document.body.classList.remove("light");
      localStorage.setItem("resume-theme", "dark");
    } else {
      document.body.classList.add("light");
      localStorage.setItem("resume-theme", "light");
    }
  }, [dark]);

  /* load draft on mount */
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setData(draft.data);
      setTemplate(draft.template);
      if (draft.styleFont)   setStyleFont(draft.styleFont);
      if (draft.styleColor)  setStyleColor(draft.styleColor);
      if (draft.mode)        setMode(draft.mode as BuilderMode);
      if (draft.photoShape)  setPhotoShape(draft.photoShape as "round" | "square");
      if (draft.sectionOrder?.length) setCustomOrder(draft.sectionOrder);
      if (draft.resumeName)  setResumeName(draft.resumeName);
      if (draft.hiddenSections?.length) setHiddenSections(new Set(draft.hiddenSections));
      if (draft.currentSaveId) setCurrentSaveId(draft.currentSaveId);
      // restore last step; skip STEP_MODE (first-visit-only screen)
      if (typeof draft.step === "number" && draft.step !== STEP_MODE) {
        setStep(draft.step);
      }
    } else {
      setStep(STEP_MODE); // first visit — show experience/fresher chooser
    }
  }, []);

  /* auto-save draft — debounced 1.2s */
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft(data, template, {
        styleFont,
        styleColor,
        sectionOrder: customOrder ?? [],
        mode,
        photoShape,
        step,
        resumeName,
        hiddenSections: [...hiddenSections],
        currentSaveId:  currentSaveId ?? "",
      });
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 1800);
    }, 1200);
    return () => clearTimeout(t);
  }, [data, template, styleFont, styleColor, customOrder, mode, photoShape, step, resumeName, hiddenSections, currentSaveId]);

  function set<K extends keyof ResumeData>(k: K, v: ResumeData[K]) {
    setData(d => ({ ...d, [k]: v }));
  }

  const availableTemplates = plan.allTemplates ? ALL_TEMPLATES : BASIC_TEMPLATES;
  const isReadOnly         = !user;   // guest: can upload+preview, cannot edit or download
  /** True when the active template is premium AND the user doesn't have access */
  const isPremiumLocked    = PREMIUM_TEMPLATES.includes(template) && !availableTemplates.includes(template);
  /** Steps freely editable on a premium template even without a paid plan (0=Profile, 1=Summary) */
  const PREMIUM_FREE_STEPS = new Set([0, 1]);
  const ats = computeAts(data);
  const pageCount = estimatePageCount(data);

  /* ── Progress ───────────────────────────────────────────── */
  const completedCount = MAIN_STEPS.filter(s => isDone(s.key, data)).length;
  const progressPct    = Math.round((completedCount / TOTAL_MAIN) * 100);

  /* ── Photo upload ──────────────────────────────────────── */
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    /* Size guard — 2 MB */
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo must be under 2 MB. Please compress and try again.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string ?? "";
      /* Reset crop state and open modal */
      setCropZoom(1); setCropX(0); setCropY(0);
      setCropSrc(src);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function applyCrop() {
    const canvas = cropCanvasRef.current;
    const img    = cropImgRef.current;
    if (!canvas || !img) return;
    const OUT = 300;
    canvas.width  = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, OUT, OUT);

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    /*
     * Replicate exactly what the CSS preview renders:
     *   objectFit: cover  — fills OUT×OUT, maintaining aspect ratio
     *   objectPosition: (50-cropX)% (50-cropY)%  — pan
     *   transform: scale(cropZoom) transformOrigin:center  — zoom
     *
     * Step 1: objectFit:cover scale
     */
    const covScale = Math.max(OUT / nw, OUT / nh);
    const overX    = Math.max(0, nw * covScale - OUT);
    const overY    = Math.max(0, nh * covScale - OUT);

    // Step 2: objectPosition percentage → source origin in natural pixels
    const px  = Math.max(0, Math.min(100, 50 - cropX)) / 100;
    const py  = Math.max(0, Math.min(100, 50 - cropY)) / 100;
    const sx0 = (px * overX) / covScale;
    const sy0 = (py * overY) / covScale;

    // Step 3: visible natural-pixel region at zoom=1 (OUT/covScale square)
    const baseSize = OUT / covScale;
    const cx = sx0 + baseSize / 2;   // center of that region
    const cy = sy0 + baseSize / 2;

    // Step 4: scale(cropZoom) zooms into that center, shrinking visible area
    const srcW = baseSize / cropZoom;
    const srcH = baseSize / cropZoom;
    const sx   = Math.max(0, Math.min(nw - srcW, cx - srcW / 2));
    const sy   = Math.max(0, Math.min(nh - srcH, cy - srcH / 2));

    ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, OUT, OUT);

    /*
     * Compression strategy — no resolution downgrade, quality only:
     * 1. Try WebP (25-35% smaller than JPEG at equal quality, all modern browsers)
     * 2. Fall back to JPEG if WebP is unsupported
     * 3. Iteratively reduce quality until output is under TARGET_KB
     *    — stops at MIN_QUALITY so we never produce a visibly degraded photo
     */
    const TARGET_BYTES = 80 * 1024;  // 80 KB
    const MIN_QUALITY  = 0.55;

    const cvs = canvas; // narrowed non-nullable reference for the closure below
    function compress(format: string, quality: number): string {
      let q = quality;
      let dataUrl = cvs.toDataURL(format, q);
      // base64 overhead ~4/3 — rough byte estimate
      while (dataUrl.length * 0.75 > TARGET_BYTES && q > MIN_QUALITY) {
        q = Math.max(MIN_QUALITY, q - 0.07);
        dataUrl = cvs.toDataURL(format, q);
      }
      return dataUrl;
    }

    // Probe WebP support: a valid WebP data URL starts with "data:image/webp"
    const webpProbe = canvas.toDataURL("image/webp", 0.1);
    const supportsWebP = webpProbe.startsWith("data:image/webp");

    const result = supportsWebP
      ? compress("image/webp", 0.88)
      : compress("image/jpeg", 0.88);

    set("photo", result);
    setCropSrc(null);
  }

  /* ── Resume file import ────────────────────────────────── */
  async function handleResumeImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const limit = plan.loading ? 1 : plan.resumeUploadsPerMonth;
    if (!canUpload("resume", limit)) {
      alert(`Resume upload limit reached (${limit}/month). Upgrade for more.`);
      e.target.value = "";
      return;
    }
    setImportStatus("parsing");
    setImportMsg("");
    try {
      const result = await parseResumeFile(file);
      if (!result.rawText) {
        setImportStatus("error");
        setImportMsg(result.hint ?? "Couldn't extract text — try a .txt file or paste your content manually.");
        return;
      }
      const f = result.fields;
      const parsed: Partial<ResumeData> = {
        ...(f.name           && { name:           f.name }),
        ...(f.title          && { title:          f.title }),
        ...(f.email          && { email:          f.email }),
        ...(f.phone          && { phone:          f.phone }),
        ...(f.location       && { location:       f.location }),
        ...(f.linkedin       && { linkedin:       f.linkedin }),
        ...(f.github         && { github:         f.github }),
        ...(f.website        && { website:        f.website }),
        ...(f.summary        && { summary:        f.summary }),
        ...(f.skills         && { skills:         f.skills }),
        ...(f.work?.length   && { work:           f.work }),
        ...(f.edu?.length    && { edu:            f.edu }),
        ...(f.projects?.length       && { projects:       f.projects }),
        ...(f.certifications?.length && { certifications: f.certifications }),
        ...(f.awards?.length         && { awards:         f.awards }),
        ...(f.languages?.length      && { languages:      f.languages }),
        ...(f.interests      && { interests:      f.interests }),
      };
      setData(d => ({ ...d, ...parsed }));
      setImportedFields(parsed);
      recordUpload("resume");
      setImportStatus("done");
      // Build a summary of what was extracted for the success message
      const parts: string[] = [];
      if (f.work?.length)           parts.push(`${f.work.length} job${f.work.length > 1 ? "s" : ""}`);
      if (f.edu?.length)            parts.push(`${f.edu.length} edu`);
      if (f.projects?.length)       parts.push(`${f.projects.length} project${f.projects.length > 1 ? "s" : ""}`);
      if (f.certifications?.length) parts.push(`${f.certifications.length} cert${f.certifications.length > 1 ? "s" : ""}`);
      const detail = parts.length ? ` · ${parts.join(", ")}` : "";
      setImportMsg(result.confidence === "low"
        ? `Imported${detail} (low confidence — review fields)`
        : `Imported${detail} — review and adjust`);
    } catch {
      setImportStatus("error");
      setImportMsg("Import failed. Try a .txt or .docx file.");
    }
    e.target.value = "";
  }

  /* ── Cert logo upload ──────────────────────────────────── */
  function handleCertLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || certLogoIdx < 0) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const logo = ev.target?.result as string ?? "";
      set("certifications", data.certifications.map((c, j) => j === certLogoIdx ? { ...c, logo } : c));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setCertLogoIdx(-1);
  }

  /* ── Export ────────────────────────────────────────────── */
  function handlePdfExport() {
    if (isReadOnly) { signInWithGoogle(); return; }
    const node = previewRef.current;
    if (!node) { window.print(); return; }
    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) { window.print(); return; }
    const title = data.name ? `${data.name} — Resume` : "Resume";
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${GOOGLE_FONTS_URL}">
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    @media print { @page { size: A4; margin: 0; } }
  </style>
</head>
<body>${node.innerHTML}</body>
</html>`);
    win.document.close();
    win.addEventListener("load", () => { setTimeout(() => { win.print(); win.close(); }, 150); });
  }

  function handleDocxExport() {
    if (!plan.hasDocxExport) { window.open("/upgrade", "_blank"); return; }
    exportDocx(data);
  }

  function handleJsonExport() {
    if (!plan.hasJsonExport) { window.open("/upgrade", "_blank"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "resume.json"; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Share ─────────────────────────────────────────────── */
  async function handleShare() {
    if (shareStatus === "loading") return;
    setShareStatus("loading");
    try {
      const { url } = await createShare(data, template, user?.id);
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 3000);
    } catch {
      setShareStatus("idle");
      alert("Failed to create share link. Please try again.");
    }
  }

  function handleAiSummary() {
    if (!plan.hasAiFeatures) { window.open("/upgrade", "_blank"); return; }
    alert("AI summary — coming soon");
  }

  const uploadLimit = plan.loading ? "…" : plan.resumeUploadsPerMonth;
  const photoLimit  = plan.loading ? "…" : plan.photoUploadsPerMonth;

  /* ── Section reorder helpers ────────────────────────────────── */
  function moveSection(pos: number, dir: -1 | 1) {
    const current  = customOrder ?? [...MODE_STEP_ORDER[mode]];
    const newOrder = [...current];
    const swap     = pos + dir;
    [newOrder[pos], newOrder[swap]] = [newOrder[swap], newOrder[pos]];
    setCustomOrder(newOrder);
  }
  function onDragStart(pos: number) {
    dragFromRef.current = pos;
  }
  function onDragOver(e: React.DragEvent, pos: number) {
    e.preventDefault();
    setDragOverIdx(pos);
  }
  function onDrop(e: React.DragEvent, pos: number) {
    e.preventDefault();
    const from = dragFromRef.current;
    if (from === -1 || from === pos) { setDragOverIdx(-1); dragFromRef.current = -1; return; }
    const current = customOrder ?? [...MODE_STEP_ORDER[mode]];
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(pos, 0, moved);
    setCustomOrder(next);
    dragFromRef.current = -1;
    setDragOverIdx(-1);
  }
  function onDragEnd() {
    dragFromRef.current = -1;
    setDragOverIdx(-1);
  }

  /* ── Section visibility ─────────────────────────────────────── */
  function toggleSectionVisibility(key: string) {
    setHiddenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /* ── Groq AI enhancement ─────────────────────────────────────── */
  async function handleAiEnhance(
    action: string,
    content: string,
    onResult: (text: string) => void,
  ) {
    if (aiLoading) return;
    if (plan.tier !== "pro") {
      alert("AI features require the Pro plan. Upgrade at jobsayer.com/upgrade");
      return;
    }
    setAiLoading(action);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content, tier: plan.tier }),
      });
      const json = await res.json() as { result?: string; error?: string };
      if (json.result) onResult(json.result);
      else alert(json.error ?? "AI enhancement failed. Try again.");
    } catch {
      alert("AI service unavailable. Check your connection.");
    } finally {
      setAiLoading(null);
    }
  }

  /* ── Cover letter AI generate ──────────────────────────────── */
  async function handleCoverLetterGenerate() {
    if (coverAiLoading) return;
    if (plan.tier !== "pro") {
      alert("AI features require the Pro plan. Upgrade at jobsayer.com/upgrade");
      return;
    }
    setCoverAiLoading(true);
    try {
      const context = [
        `Candidate: ${data.name || "the applicant"}`,
        `Applying for: ${coverLetter.jobTitle || "the position"} at ${coverLetter.company || "the company"}`,
        `Summary: ${data.summary || ""}`,
        `Top skills: ${data.skills || ""}`,
        `Most recent role: ${data.work[0]?.role || ""} at ${data.work[0]?.company || ""}`,
      ].join("\n");
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cover_letter", content: context }),
      });
      const json = await res.json() as { result?: string; error?: string };
      if (json.result) setCoverLetter(cl => ({ ...cl, body: json.result! }));
      else alert(json.error ?? "Cover letter generation failed. Try again.");
    } catch {
      alert("AI service unavailable. Check your connection.");
    } finally {
      setCoverAiLoading(false);
    }
  }

  /* ── Tailor resume to JD ─────────────────────────────────────── */
  async function handleTailorToJd() {
    if (tailorLoading || !jdText.trim()) return;
    if (plan.tier !== "pro") {
      alert("AI Tailor requires the Pro plan. Upgrade at jobsayer.com/upgrade");
      return;
    }
    setTailorLoading(true);
    setTailorResult(null);
    try {
      const context = [
        `Current Summary: ${data.summary || "(none)"}`,
        `Current Skills: ${data.skills || "(none)"}`,
        `Most recent role: ${data.work[0]?.role || ""} at ${data.work[0]?.company || ""}`,
        `Job Description:\n${jdText}`,
      ].join("\n\n");
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "jd_tailor", content: context }),
      });
      const json = await res.json() as { result?: string; error?: string };
      if (json.result) {
        try {
          const parsed = JSON.parse(json.result) as { summary: string; missingSkills: string[] };
          setTailorResult(parsed);
        } catch {
          alert("AI returned unexpected format. Try again.");
        }
      } else {
        alert(json.error ?? "Tailoring failed. Try again.");
      }
    } catch {
      alert("AI service unavailable. Check your connection.");
    } finally {
      setTailorLoading(false);
    }
  }

  /* ── Cloud saves ─────────────────────────────────────────────── */
  async function handleCreateNew() {
    setData(SAMPLE);
    setTemplate("Classic");
    setResumeName("Untitled Resume");
    setCurrentSaveId(null);
    setShowResumeMenu(false);
    setStep(0);
  }

  async function handleCloudSave() {
    if (!user || savingCloud) return;
    setSavingCloud(true);
    try {
      const meta = { styleFont, styleColor, sectionOrder: customOrder ?? [], mode, photoShape, step,
        resumeName, hiddenSections: [...hiddenSections] };
      const id = await saveNamedResume(resumeName, data, template, meta, user.id, currentSaveId ?? undefined);
      setCurrentSaveId(id);
      setSavesList(prev => {
        const updated = { id, name: resumeName, template, updatedAt: new Date().toISOString() };
        const idx = prev.findIndex(r => r.id === id);
        return idx >= 0 ? prev.map((r, i) => i === idx ? updated : r) : [updated, ...prev];
      });
    } catch { /* ignore */ }
    setSavingCloud(false);
  }

  async function handleLoadSavesList() {
    if (!user || loadingSaves) return;
    setLoadingSaves(true);
    const list = await listResumes(user.id);
    setSavesList(list);
    setLoadingSaves(false);
  }

  async function handleLoadResume(id: string) {
    if (!user) return;
    const result = await loadResumeSave(id, user.id);
    if (!result) return;
    setData(result.data);
    setTemplate(result.template);
    setResumeName(result.name);
    setCurrentSaveId(id);
    if (result.meta.styleFont)   setStyleFont(result.meta.styleFont);
    if (result.meta.styleColor)  setStyleColor(result.meta.styleColor);
    if (result.meta.mode)        setMode(result.meta.mode as BuilderMode);
    if (result.meta.photoShape)  setPhotoShape(result.meta.photoShape as "round" | "square");
    if (result.meta.sectionOrder?.length) setCustomOrder(result.meta.sectionOrder);
    if (result.meta.hiddenSections?.length) setHiddenSections(new Set(result.meta.hiddenSections));
    setSavesOpen(false);
  }

  async function handleDeleteResume(id: string) {
    if (!user) return;
    await deleteResumeSave(id, user.id);
    setSavesList(prev => prev.filter(r => r.id !== id));
    if (currentSaveId === id) setCurrentSaveId(null);
  }

  /* ── Navigation helpers (shared by mobile + desktop layouts) ─ */
  const isQuickStep     = step >= STEP_STYLE;
  const orderedIndices  = customOrder ?? MODE_STEP_ORDER[mode];
  const currentOrderPos = orderedIndices.indexOf(step);   // -1 when on a quick step
  const isLastMain      = currentOrderPos === orderedIndices.length - 1;

  /** orderedIndices with hidden extra-sections (5-10) filtered out for ResumePreview */
  const filteredIndices = orderedIndices.filter(idx => {
    if (idx < 5) return true; // core sections always render
    const key = MAIN_STEPS[idx]?.key;
    return key ? !hiddenSections.has(key) : true;
  });

  function goNext() {
    if (isQuickStep) return;
    if (isLastMain) { setStep(STEP_STYLE); return; }
    setStep(orderedIndices[currentOrderPos + 1]);
  }
  function goBack() {
    if (isQuickStep) { setStep(orderedIndices[orderedIndices.length - 1]); return; }
    if (currentOrderPos > 0) setStep(orderedIndices[currentOrderPos - 1]);
  }
  function modeLabel(idx: number)    { return MODE_LABEL_OVERRIDES[mode][idx]    ?? MAIN_STEPS[idx].label; }
  function modeSubtitle(idx: number) { return MODE_SUBTITLE_OVERRIDES[mode][idx] ?? MAIN_STEPS[idx].subtitle; }

  /* ── Mobile layout ────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg)", overflow: "hidden" }}>

        {/* Hidden file inputs */}
        <input ref={photoInputRef}    type="file" accept="image/*"                  style={{ display: "none" }} onChange={handlePhotoChange}    />
        <input ref={resumeInputRef}   type="file" accept=".pdf,.doc,.docx,.txt,.md" style={{ display: "none" }} onChange={handleResumeImport}   />
        <input ref={certLogoInputRef} type="file" accept="image/*"                  style={{ display: "none" }} onChange={handleCertLogoChange} />

        {/* ── Mobile top bar ─────────────────────────────────── */}
        <header style={{ height: 50, background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0, zIndex: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--text1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "var(--bg)", flexShrink: 0 }}>R</div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text1)" }}>Resume</span>

          {/* ATS mini bar — clickable → ATS step */}
          <button onClick={() => setStep(STEP_ATS)} title="View ATS breakdown"
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 44, height: 4, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${ats.score}%`, background: ats.scoreColor, borderRadius: 99, transition: "width .4s" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: ats.scoreColor }}>{ats.score}</span>
          </button>

          {/* Page count badge */}
          <span title={pageCount > 1 ? "Recruiters prefer 1-page resumes" : "Fits on 1 page"}
            style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, borderWidth: 1, borderStyle: "solid", borderColor: pageCount > 1 ? "#fbbf24" : "var(--border)", background: pageCount > 1 ? "#fffbeb" : "var(--surface2)", color: pageCount > 1 ? "#b45309" : "var(--text3)" }}>
            {pageCount}p
          </span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text3)", opacity: autoSaved ? 1 : 0, transition: "opacity .3s", pointerEvents: "none" }}>✓ Saved</span>
            {user
              ? <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", background: "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 5, padding: "2px 7px" }}>{plan.loading ? "…" : plan.planName}</span>
              : <button onClick={() => signInWithGoogle()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                  <LogIn size={11} /> Sign in
                </button>
            }
            {user && (
              <button
                onClick={() => { setMobileSavesOpen(true); handleLoadSavesList(); }}
                title="My Resumes"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text2)", cursor: "pointer" }}>
                <FolderOpen size={13} />
              </button>
            )}
            <button onClick={() => setDark(d => !d)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text2)", cursor: "pointer" }}>
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button onClick={handlePdfExport}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <Download size={12} /> PDF
            </button>
          </div>
        </header>

        {/* ── Step strip ────────────────────────────────────────── */}
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {/* Horizontal scrollable step pills */}
          <div style={{ overflowX: "auto", display: "flex", alignItems: "center", gap: 4, padding: "7px 14px 10px", scrollbarWidth: "none" as const }}>
            {/* Quick tool chips */}
            {([
              { label: "ATS",      s: STEP_ATS,      badge: String(ats.score), badgeColor: ats.scoreColor },
              { label: "Match",    s: STEP_JD,        badge: jdResult ? `${jdResult.score}%` : undefined,  badgeColor: jdResult ? (jdResult.score >= 75 ? "#16a34a" : jdResult.score >= 50 ? "#d97706" : "#dc2626") : undefined },
              { label: "Template", s: STEP_TEMPLATE,  badge: undefined, badgeColor: undefined },
              { label: "Customize", s: STEP_STYLE,    badge: undefined, badgeColor: undefined },
            ] as { label: string; s: number; badge?: string; badgeColor?: string }[]).map(({ label, s, badge, badgeColor }) => (
              <button key={s} onClick={() => setStep(s)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", borderWidth: 1.5, borderStyle: "solid", transition: "all .15s",
                  borderColor: step === s ? "var(--text1)" : "var(--border)",
                  background:  step === s ? "var(--text1)" : "var(--surface2)",
                  color:       step === s ? "var(--bg)"   : "var(--text2)" }}>
                {label}
                {badge && <span style={{ fontSize: 10, fontWeight: 800, color: step === s ? "var(--bg)" : (badgeColor ?? "var(--text3)") }}>{badge}</span>}
              </button>
            ))}
            {/* Page length indicator */}
            <span title={pageCount > 1 ? `~${pageCount} pages — recruiters prefer 1 page` : "Fits on 1 page"}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", borderWidth: 1.5, borderStyle: "solid", borderColor: pageCount > 1 ? "#fbbf24" : "var(--border)", background: pageCount > 1 ? "#fffbeb" : "var(--surface2)", color: pageCount > 1 ? "#b45309" : "var(--text3)" }}>
              {pageCount > 1 ? "⚠" : "✓"} {pageCount}p
            </span>

            <div style={{ width: 1, height: 14, background: "var(--border)", flexShrink: 0, margin: "0 2px" }} />

            {/* Main step pills */}
            {orderedIndices.map((idx, displayPos) => {
              const s      = MAIN_STEPS[idx];
              const done   = isDone(s.key, data);
              const active = step === idx;
              return (
                <button key={s.key} onClick={() => setStep(idx)}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", borderWidth: 1.5, borderStyle: "solid", transition: "all .15s",
                    borderColor: active ? "var(--text1)" : (done ? "var(--border)" : "var(--border)"),
                    background:  active ? "var(--text1)" : "var(--surface2)",
                    color:       active ? "var(--bg)"   : "var(--text2)" }}>
                  {done && <span style={{ fontSize: 10, fontWeight: 800, color: active ? "var(--bg)" : "#16a34a" }}>✓</span>}
                  {modeLabel(idx)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Step content ─────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px" }}>
          {!user && !isQuickStep && <GuestEditBanner onSignIn={signInWithGoogle} />}
          {renderStepContent()}
        </div>

        {/* ── Bottom bar ───────────────────────────────────────── */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, flex: 1 }}>
            {isQuickStep ? "" : `${currentOrderPos + 1} / ${TOTAL_MAIN}`}
          </span>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            {(isQuickStep || currentOrderPos > 0) && (
              <button onClick={goBack}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 8, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button onClick={() => setShowPreview(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              👁 Preview
            </button>
            {!isQuickStep && (
              isLastMain
                ? <button onClick={goNext}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Finish <ChevronRight size={13} />
                  </button>
                : <button onClick={goNext}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Next <ChevronRight size={13} />
                  </button>
            )}
            {isQuickStep && step === STEP_STYLE && (
              <button onClick={handlePdfExport}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Download size={12} /> Export
              </button>
            )}
          </div>
        </div>

        {/* ── My Resumes bottom sheet ──────────────────────────── */}
        {mobileSavesOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {/* Backdrop */}
            <div onClick={() => setMobileSavesOpen(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)" }} />
            {/* Sheet */}
            <div style={{ position: "relative", background: "var(--surface)", borderRadius: "18px 18px 0 0", maxHeight: "75dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>My Resumes</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{savesList.length}/{plan.maxSaves} saved · {plan.planName}</div>
                </div>
                <button onClick={() => setMobileSavesOpen(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text2)" }}>
                  <X size={15} />
                </button>
              </div>
              {/* Save current button */}
              {savesList.length < plan.maxSaves && (
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                  <button
                    onClick={() => { handleCloudSave(); setMobileSavesOpen(false); }}
                    disabled={savingCloud}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 10, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: savingCloud ? "default" : "pointer", fontFamily: "inherit", opacity: savingCloud ? 0.7 : 1 }}>
                    {savingCloud ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Save size={13} />}
                    {currentSaveId ? "Save changes" : "Save this resume"}
                  </button>
                </div>
              )}
              {/* List */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {loadingSaves ? (
                  <div style={{ padding: "24px 18px", textAlign: "center", fontSize: 13, color: "var(--text3)" }}>Loading…</div>
                ) : savesList.length === 0 ? (
                  <div style={{ padding: "28px 18px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>No saved resumes yet</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>Hit "Save this resume" above to store it to the cloud.</div>
                  </div>
                ) : savesList.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: "1px solid var(--border)", background: r.id === currentSaveId ? "var(--accdim)" : "transparent" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                        {r.template} · {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {r.id === currentSaveId && <span style={{ marginLeft: 6, color: "var(--accent)", fontWeight: 700 }}>● active</span>}
                      </div>
                    </div>
                    <button onClick={() => { handleLoadResume(r.id); setMobileSavesOpen(false); }}
                      style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                      Load
                    </button>
                    <button onClick={() => handleDeleteResume(r.id)} title="Delete"
                      style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#fca5a5", padding: "4px", display: "flex", alignItems: "center" }}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              {/* Safe area spacer */}
              <div style={{ height: "env(safe-area-inset-bottom, 16px)", flexShrink: 0 }} />
            </div>
          </div>
        )}

        {/* ── Preview overlay ──────────────────────────────────── */}
        {showPreview && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--surface2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>Preview · {template}</span>
              <button onClick={() => setShowPreview(false)}
                style={{ fontSize: 20, lineHeight: 1, color: "var(--text2)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, background: "var(--surface2)" }}>
              <div style={{ transformOrigin: "top left", transform: `scale(${previewScale})`, marginBottom: `calc((${previewScale} - 1) * 1123px)` }}>
                <div ref={previewRef}>
                  <ResumePreview
                    data={data}
                    template={template}
                    font={styleFont !== FONT_OPTIONS[0].family ? styleFont : undefined}
                    color={styleColor || undefined}
                    photoShape={photoShape}
                    sectionOrder={filteredIndices}
                    density={density}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", background: "var(--surface)", display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={handlePdfExport}
                style={{ flex: 1, padding: 10, borderRadius: 9, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Download size={14} /> Export PDF
              </button>
              <button onClick={() => setShowPreview(false)}
                style={{ padding: "10px 20px", borderRadius: 9, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text2)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Edit
              </button>
            </div>
          </div>
        )}


        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @media print {
            .no-print { display: none !important; }
            body > div { height: auto !important; overflow: visible !important; }
          }
        `}</style>
      </div>
    );
  }

  /* ── Stepper step content ────────────────────────────────── */
  function renderStepContent() {
    /* ── STYLE step (Customize) — with Fonts / Section Order subtabs ── */
    if (step === STEP_STYLE) {
      const reorderCurrent  = customOrder ?? [...MODE_STEP_ORDER[mode]];
      const reorderIsDefault = !customOrder;

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: "100%" }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={styles.stepLabel}>Customise appearance</div>
            <div style={styles.stepTitle}>Customize</div>
          </div>

          {/* Subtabs */}
          <div style={{
            display: "flex", gap: 0, marginBottom: 24,
            borderBottom: "1.5px solid var(--border)",
          }}>
            {([
              { id: "fonts", label: "Fonts" },
              { id: "order", label: "Section Order", badge: customOrder ? "custom" : undefined },
            ] as { id: "fonts" | "order"; label: string; badge?: string }[]).map(tab => {
              const active = customizeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setCustomizeTab(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", fontFamily: "inherit", cursor: "pointer",
                    fontSize: 13, fontWeight: active ? 700 : 600,
                    color: active ? "var(--text1)" : "var(--text3)",
                    background: "none", border: "none",
                    borderBottom: active ? "2.5px solid var(--text1)" : "2.5px solid transparent",
                    marginBottom: "-1.5px",
                    transition: "color .15s, border-color .15s",
                  }}>
                  {tab.label}
                  {tab.badge && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderRadius: 3, padding: "1px 5px" }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab: Fonts */}
          {customizeTab === "fonts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(["Sans", "Serif", "Humanist", "Mono"] as const).map(group => {
                const groupFonts = FONT_OPTIONS.filter(f => f.group === group);
                if (!groupFonts.length) return null;
                return (
                  <div key={group}>
                    <div style={{ ...styles.sectionLabel, marginBottom: 8 }}>{group}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {groupFonts.map(f => {
                        const active = styleFont === f.family;
                        return (
                          <button key={f.label} onClick={() => setStyleFont(f.family)}
                            style={{
                              padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                              borderWidth: 1.5, borderStyle: "solid",
                              borderColor: active ? "var(--accent)" : "var(--border)",
                              background: active ? "var(--accdim)" : "var(--bg)",
                              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3,
                            }}>
                            <span style={{ fontSize: 20, fontFamily: f.family, color: active ? "var(--accent)" : "var(--text1)", fontWeight: 600, lineHeight: 1 }}>Aa</span>
                            <span style={{ fontSize: 11, color: active ? "var(--accent)" : "var(--text3)", fontWeight: 700 }}>{f.label}</span>
                            <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: f.family, lineHeight: 1.4 }}>The quick brown fox</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab: Section Order */}
          {customizeTab === "order" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={styles.stepSub}>Drag to reorder — sections appear in this sequence on your resume.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {reorderCurrent.map((idx, pos) => {
                  const s       = MAIN_STEPS[idx];
                  const done    = isDone(s.key, data);
                  const canHide = idx >= 5;
                  const hidden  = hiddenSections.has(s.key);
                  const isDragOver = dragOverIdx === pos;
                  return (
                    <div key={s.key}
                      draggable
                      onDragStart={() => onDragStart(pos)}
                      onDragOver={e => onDragOver(e, pos)}
                      onDrop={e => onDrop(e, pos)}
                      onDragEnd={onDragEnd}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                        background: isDragOver ? "var(--accdim)" : (hidden ? "var(--surface2)" : "var(--bg)"),
                        borderWidth: 1, borderStyle: "solid",
                        borderColor: isDragOver ? "var(--accent)" : "var(--border)",
                        borderRadius: 10, opacity: hidden ? 0.55 : 1,
                        transition: "background .12s, border-color .12s, opacity .15s",
                        cursor: "grab",
                      }}>
                      <GripVertical size={14} style={{ color: "var(--text3)", flexShrink: 0, cursor: "grab" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", width: 18, flexShrink: 0 }}>{pos + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>{hidden ? "Hidden from resume" : s.subtitle}</div>
                      </div>
                      {done && !hidden && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓</span>}
                      {canHide && (
                        <button onClick={e => { e.stopPropagation(); toggleSectionVisibility(s.key); }}
                          title={hidden ? "Show section" : "Hide section"}
                          style={{ display: "flex", alignItems: "center", padding: "4px 6px", borderRadius: 6, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: hidden ? "var(--accdim)" : "var(--surface2)", color: hidden ? "var(--accent)" : "var(--text3)", cursor: "pointer" }}>
                          {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {!reorderIsDefault && (
                <button onClick={() => setCustomOrder(null)}
                  style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", background: "none", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}>
                  ↺ Reset to {mode} default
                </button>
              )}
              <div style={{ padding: "12px 14px", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 10, fontSize: 11, color: "var(--accent)" }}>
                💡 Section order updates the resume preview instantly.
              </div>
            </div>
          )}

        </div>
      );
    }

    /* ── ATS overview step ──────────────────── */
    if (step === STEP_ATS) {
      const sections = [
        { label: "Contact Info",      ...atsProfile(data), hints: atsProfile(data).missing, stepIdx: 0 },
        { label: "Summary",           ...atsSummary(data), hints: atsSummary(data).words === 0 ? ["Write a summary"] : atsSummary(data).words < 40 ? [`${40 - atsSummary(data).words} more words needed`] : [], stepIdx: 1 },
        { label: "Work Experience",   ...atsWork(data),    stepIdx: 2 },
        { label: "Skills",            ...atsSkills(data),  hints: atsSkills(data).count < 8 ? [`Add ${Math.max(0, 8 - atsSkills(data).count)} more skills`] : [], stepIdx: 4 },
        { label: "Education",         ...atsEdu(data),     hints: atsEdu(data).score === 0 ? ["Add school / degree"] : [], stepIdx: 3 },
        { label: "Certifications (+5)", score: (data.certifications ?? []).some(c => c.name) ? 5 : 0, max: 5, hints: [], stepIdx: 6 },
        { label: "Projects (+5)",       score: (data.projects ?? []).some(p => p.name) ? 5 : 0,        max: 5, hints: [], stepIdx: 5 },
      ];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "100%" }}>
          <div>
            <div style={styles.stepLabel}>ATS Score</div>
            <div style={styles.stepTitle}>Resume strength</div>
            <div style={styles.stepSub}>Section-by-section breakdown. Fix issues directly in each step.</div>
          </div>

          {/* Overall gauge */}
          <div style={{ background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 14, padding: "20px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 48, fontWeight: 900, color: ats.scoreColor, lineHeight: 1 }}>{ats.score}</span>
              <span style={{ fontSize: 16, color: "var(--text3)", fontWeight: 600 }}>/100</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "var(--surface2)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${ats.score}%`, background: `linear-gradient(90deg, ${ats.score < 50 ? "#ef4444, #f97316" : ats.score < 75 ? "#f97316, #eab308" : "#22c55e, #16a34a"})`, borderRadius: 99, transition: "width .5s ease" }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {ats.score >= 75 ? "🟢 Strong — good ATS compatibility" :
               ats.score >= 50 ? "🟡 Moderate — a few improvements will help" :
                                 "🔴 Needs work — visit sections below"}
            </div>
          </div>

          {/* Page length card */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: pageCount > 1 ? "#fffbeb" : "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: pageCount > 1 ? "#fbbf24" : "var(--border)", borderRadius: 12, padding: "14px 16px" }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{pageCount > 2 ? "📄📄📄" : pageCount > 1 ? "📄📄" : "📄"}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: pageCount > 1 ? "#b45309" : "var(--text1)" }}>
                {pageCount === 1 ? "Fits on 1 page ✓" : `~${pageCount} pages`}
              </div>
              <div style={{ fontSize: 11, color: pageCount > 1 ? "#b45309" : "var(--text3)", marginTop: 2 }}>
                {pageCount === 1
                  ? "Ideal length — recruiters can scan it in under 30 seconds."
                  : pageCount === 2
                  ? "2 pages is acceptable for 7+ years experience. Consider trimming older roles."
                  : "3+ pages is too long. Shorten descriptions and cut pre-2015 roles."}
              </div>
            </div>
          </div>

          {/* Per-section rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={styles.sectionLabel}>Section Breakdown</div>
            {sections.map(s => {
              const color = sectionColor(s.score, s.max);
              const pct   = Math.round((s.score / s.max) * 100);
              return (
                <button key={s.label} onClick={() => { const key = MAIN_STEPS[s.stepIdx]?.key ?? null; setStep(s.stepIdx); setActiveSection(key); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color }}>{s.score}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--text3)" }}>/{s.max}</span></span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: "var(--surface2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: color, transition: "width .4s ease" }} />
                    </div>
                    {s.hints && s.hints.length > 0 && (
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>→ {s.hints[0]}</div>
                    )}
                  </div>
                  <ChevronRight size={13} style={{ color: "var(--text3)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const key = MAIN_STEPS[step]?.key;

    /* ── Premium gate — intercept non-free steps ─────────────── */
    if (isPremiumLocked && !PREMIUM_FREE_STEPS.has(step) && key) {
      const stepInfo = MAIN_STEPS[step];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
          <div>
            <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN}</div>
            <div style={styles.stepTitle}>{stepInfo.label}</div>
            <div style={styles.stepSub}>{stepInfo.subtitle}</div>
          </div>
          <div style={{ position: "relative", minHeight: 240 }}>
            <div style={{ opacity: 0.18, pointerEvents: "none", userSelect: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Ghost placeholder rows */}
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 42, borderRadius: 9, background: "var(--border)" }} />
              ))}
            </div>
            <PremiumUpgradeBanner isGuest={!user} onSignIn={signInWithGoogle} />
          </div>
        </div>
      );
    }

    /* ── Profile ─────────────────────────────── */
    if (key === "profile") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN}</div>
          <div style={styles.stepTitle}>Personal Info</div>
          <div style={styles.stepSub}>Your basic contact details — appears at the top of your resume.</div>
        </div>
        <TipsPanel sectionKey="profile" openTips={openTips} setOpenTips={setOpenTips} />

        {/* ── LinkedIn import panel ───────────────────────────── */}
        <div style={{ padding: 12, background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "#0077b540", borderRadius: 10 }}>
          <button onClick={() => setLiImportOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Linkedin size={14} color="#fff" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", flex: 1, textAlign: "left" as const }}>Import from LinkedIn</span>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>{liImportOpen ? "▲" : "▼"}</span>
          </button>

          {liImportOpen && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Step 1: enter URL */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px", display: "block", marginBottom: 5 }}>
                  Your LinkedIn URL
                </label>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    value={liImportUrl}
                    onChange={e => setLiImportUrl(e.target.value)}
                    placeholder="linkedin.com/in/yourname"
                    style={{ flex: 1, padding: "9px 11px", borderRadius: 8, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text1)", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={() => {
                      if (liImportUrl.trim()) {
                        const url = liImportUrl.trim().replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "");
                        set("linkedin", `linkedin.com/in/${url}`);
                        setLiImportUrl("");
                      }
                    }}
                    style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#0077b5", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                    Save URL
                  </button>
                </div>
              </div>

              {/* Step 2: export PDF instructions */}
              <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>📋 Auto-fill from LinkedIn profile</div>
                <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    "Open your LinkedIn profile",
                    "Click More → Save to PDF",
                    "Upload the PDF using the import button above",
                  ].map((step, i) => (
                    <li key={i} style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{step}</li>
                  ))}
                </ol>
                <button onClick={() => { setLiImportOpen(false); resumeInputRef.current?.click(); }}
                  style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#0077b5", background: "rgba(0,119,181,.08)", borderWidth: 1, borderStyle: "solid", borderColor: "#0077b530", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                  <Upload size={11} /> Upload LinkedIn PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Photo — only for templates with dedicated photo slot */}
        {PHOTO_TEMPLATES.has(template) && (
          <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: data.photo ? "var(--accborder)" : "var(--border)", borderRadius: 12, transition: "border-color .2s" }}>

            {/* Avatar — click to upload (no photo) or crop (has photo) */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                onClick={() => data.photo
                  ? (setCropZoom(1), setCropX(0), setCropY(0), setCropSrc(data.photo))
                  : photoInputRef.current?.click()
                }
                title={data.photo ? "Click to crop / adjust" : "Click to upload photo"}
                style={{ width: 64, height: 64, borderRadius: photoShape === "round" ? "50%" : "10px", overflow: "hidden", background: "var(--surface2)", borderWidth: 2, borderStyle: data.photo ? "solid" : "dashed", borderColor: data.photo ? "var(--accborder)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-radius .2s", position: "relative" as const }}>
                {data.photo
                  ? <img src={data.photo} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <ImageIcon size={22} style={{ color: "var(--text3)" }} />
                }
                {/* Edit overlay on hover */}
                {data.photo && (
                  <div style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>✂ Edit</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side — minimal controls */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>

              {/* Upload / Remove text links */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => photoInputRef.current?.click()}
                  style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                  {data.photo ? "Change" : "Upload photo"}
                </button>
                {data.photo && <>
                  <span style={{ fontSize: 10, color: "var(--border)" }}>·</span>
                  <button onClick={() => set("photo", "")}
                    style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                    Remove
                  </button>
                </>}
              </div>

              {/* Tip */}
              <span style={{ fontSize: 10, color: "var(--text3)" }}>
                {data.photo ? "Click photo to crop & adjust" : "JPG / PNG · max 2 MB"}
              </span>
            </div>
          </div>

          {/* ── Crop modal ─────────────────────────────────────── */}
          {cropSrc && (
            <div style={{ position: "fixed" as const, inset: 0, zIndex: 2000, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
              onClick={e => { if (e.target === e.currentTarget) setCropSrc(null); }}>
              <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, display: "flex", flexDirection: "column" as const, gap: 16, boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>Crop &amp; Adjust Photo</div>
                  <button onClick={() => setCropSrc(null)}
                    style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f3f4f6" }}>
                    <X size={13} />
                  </button>
                </div>

                {/* Preview — isolated container stops box-shadow from bleeding over buttons */}
                <div style={{ isolation: "isolate" as const, position: "relative" as const, width: 240, height: 240, margin: "0 auto", background: "rgba(0,0,0,.55)", borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{ position: "relative" as const, width: 200, height: 200, cursor: cropDragging ? "grabbing" : "grab", userSelect: "none" as const, touchAction: "none" as const }}
                    onPointerDown={e => {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setCropDragging(true);
                      cropDragStart.current = { mx: e.clientX, my: e.clientY, ox: cropX, oy: cropY };
                    }}
                    onPointerMove={e => {
                      if (!cropDragging || !cropDragStart.current) return;
                      const dx = (e.clientX - cropDragStart.current.mx) / 2.2;
                      const dy = (e.clientY - cropDragStart.current.my) / 2.2;
                      setCropX(Math.max(-50, Math.min(50, cropDragStart.current.ox + dx)));
                      setCropY(Math.max(-50, Math.min(50, cropDragStart.current.oy + dy)));
                    }}
                    onPointerUp={() => setCropDragging(false)}>
                    {/* Clip preview — shape follows photoShape toggle */}
                    <div style={{ width: 200, height: 200, borderRadius: photoShape === "round" ? "50%" : "16px", overflow: "hidden", border: "3px solid var(--accent)", position: "relative" as const, boxSizing: "border-box" as const }}>
                      <img
                        ref={cropImgRef}
                        src={cropSrc ?? ""}
                        alt="crop"
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: `${50 - cropX}% ${50 - cropY}%`,
                          transform: `scale(${cropZoom})`,
                          transformOrigin: "center",
                          pointerEvents: "none" as const,
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ position: "absolute" as const, bottom: 8, right: 8, fontSize: 10, color: "rgba(255,255,255,.6)", pointerEvents: "none" as const }}>drag to reposition</div>
                </div>

                {/* Zoom slider */}
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)" }}>🔍 Zoom</span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{Math.round(cropZoom * 100)}%</span>
                  </div>
                  <input type="range" min={100} max={300} step={1}
                    value={Math.round(cropZoom * 100)}
                    onChange={e => setCropZoom(Number(e.target.value) / 100)}
                    style={{ width: "100%", accentColor: "var(--accent)" }} />
                </div>

                {/* Shape toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)" }}>Frame shape</span>
                  <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 6, padding: 2, gap: 2, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" }}>
                    {(["round", "square"] as const).map(s => (
                      <button key={s} onClick={() => setPhotoShape(s)}
                        style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                          background: photoShape === s ? "var(--text1)" : "transparent",
                          color:      photoShape === s ? "var(--bg)"    : "var(--text3)" }}>
                        {s === "round" ? "○ Round" : "□ Square"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, position: "relative" as const, zIndex: 1 }}>
                  <button onClick={() => setCropSrc(null)}
                    style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#374151", color: "#f3f4f6", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                  <button onClick={applyCrop}
                    style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    ✓ Apply
                  </button>
                </div>

                {/* Hidden canvas for export */}
                <canvas ref={cropCanvasRef} style={{ display: "none" }} />
              </div>
            </div>
          )}
          </>
        )}

        <Field label="Full Name"  value={data.name}     onChange={v => set("name", v)}     placeholder="Priya Sharma"        />
        <Field label="Job Title"  value={data.title}    onChange={v => set("title", v)}    placeholder="Software Engineer"   />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Email"  value={data.email}  onChange={v => set("email", v)}  placeholder="priya@example.com"   />
          <Field label="Phone"  value={data.phone}  onChange={v => set("phone", v)}  placeholder="+91 98765 43210"     />
        </div>
        <Field label="Location" value={data.location} onChange={v => set("location", v)} placeholder="Bengaluru, India"        />
        <Field label="LinkedIn" value={data.linkedin ?? ""} onChange={v => set("linkedin", v)} placeholder="linkedin.com/in/yourname" />
        <Field label="GitHub"   value={data.github ?? ""}   onChange={v => set("github", v)}   placeholder="github.com/yourname"     />
        <Field label="Website / Portfolio" value={data.website} onChange={v => set("website", v)} placeholder="yoursite.dev"          />
        <SectionAtsBar label="Contact Info" {...atsProfile(data)} hints={atsProfile(data).missing} />
      </div>
    );

    /* ── Summary ─────────────────────────────── */
    if (key === "summary") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={styles.stepLabel}>{modeLabel(1)}</div>
            <div style={styles.stepTitle}>{mode === "fresher" ? "Career Objective" : "Professional Summary"}</div>
            <div style={styles.stepSub}>{mode === "fresher" ? "2–3 sentences on your goals, strengths, and the kind of role you're seeking." : "A 2–3 sentence pitch that captures your experience and what you bring."}</div>
          </div>
          {plan.hasAiFeatures
            ? <button onClick={handleAiSummary} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", flexShrink: 0, marginTop: 20, fontFamily: "inherit" }}>
                <Sparkles size={11} /> AI Write
              </button>
            : <div style={{ marginTop: 20, flexShrink: 0 }}><GateBadge label="AI — Pro" /></div>
          }
        </div>
        <TipsPanel sectionKey="summary" openTips={openTips} setOpenTips={setOpenTips} />
        <Field label="" value={data.summary} bullets onChange={v => set("summary", v)} placeholder="Full-stack engineer with 6 years of experience…" multiline rows={5} />
        <InlineAtsHint value={atsSummary(data).words} max={40} unit="words" label="aim for 40+" />
        <SectionAtsBar label="Summary" score={atsSummary(data).score} max={15}
          hints={atsSummary(data).words === 0 ? ["Write a professional summary"] :
                 atsSummary(data).words < 20  ? ["Too short — aim for 40+ words"] :
                 atsSummary(data).words < 40  ? ["Expand to 40+ words for full points"] : []} />
      </div>
    );

    /* ── Work ────────────────────────────────── */
    if (key === "work") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>{modeLabel(2)}</div>
          <div style={styles.stepTitle}>{mode === "fresher" ? "Internships & Work" : "Work Experience"}</div>
          <div style={styles.stepSub}>{mode === "fresher" ? "Include internships, part-time jobs, freelance, and volunteer work — all count!" : "List your roles, most recent first. Add achievements, not just duties."}</div>
        </div>
        <TipsPanel sectionKey="work" openTips={openTips} setOpenTips={setOpenTips} />
        {mode === "fresher" && (
          <div style={{ padding: "10px 14px", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 10, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
            💡 No full-time experience yet? Add internships, college projects with industry tie-ups, or freelance gigs.
          </div>
        )}
        {/* Empty-state example card */}
        {data.work.length === 1 && !data.work[0].company && !data.work[0].role && (
          <div style={{ padding: "12px 14px", background: "var(--surface2)", borderWidth: 1, borderStyle: "dashed", borderColor: "var(--accborder)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>💡 Example</div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>Software Engineer</span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}> — ABC Pvt Ltd · Jan 2022 – Present</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
              "Improved API response time by 35% through Redis caching and query optimisation. Built microservices handling 100K+ daily requests."
            </div>
            <button
              onClick={() => set("work", [{ id: "w1", company: "ABC Pvt Ltd", role: "Software Engineer", from: "Jan 2022", to: "", current: true, desc: "• Improved API response time by 35% through Redis caching and query optimisation.\n• Built microservices handling 100K+ daily requests.\n• Led a team of 3 engineers to deliver the project 2 weeks ahead of schedule." }])}
              style={{ alignSelf: "flex-start" as const, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>
              Use this example
            </button>
          </div>
        )}

        {data.work.map((w, i) => (
          <EntryCard key={w.id} num={i + 1} onRemove={() => set("work", data.work.filter((_, j) => j !== i))} canRemove={data.work.length > 1}>
            <Field label="Company" value={w.company} onChange={v => set("work", data.work.map((x, j) => j === i ? { ...x, company: v } : x))} placeholder="Razorpay"                    />
            <Field label="Role"    value={w.role}    onChange={v => set("work", data.work.map((x, j) => j === i ? { ...x, role: v } : x))}    placeholder="Senior Engineer"              />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="From" value={w.from} onChange={v => set("work", data.work.map((x, j) => j === i ? { ...x, from: v } : x))} placeholder="Jan 2021"  />
              {!w.current && (
                <Field label="To" value={w.to} onChange={v => set("work", data.work.map((x, j) => j === i ? { ...x, to: v } : x))} placeholder="Dec 2023" />
              )}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={!!w.current}
                onChange={e => set("work", data.work.map((x, j) => j === i ? { ...x, current: e.target.checked, to: e.target.checked ? "" : x.to } : x))}
                style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>Currently working here</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Field label="Description" value={w.desc} bullets onChange={v => set("work", data.work.map((x, j) => j === i ? { ...x, desc: v } : x))} placeholder={"• Improved API response time by 35% via Redis caching\n• Led migration to microservices, reducing downtime by 60%"} multiline rows={3} />
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                {/* AI generate bullets — Gold only, shown when role or company is filled */}
                {(w.role || w.company) && plan.tier === "pro" && (
                  <button
                    onClick={() => handleAiEnhance(
                      "bullet_generate",
                      `${w.role || "Professional"}${w.company ? ` at ${w.company}` : ""}`,
                      v => set("work", data.work.map((x, j) => j === i ? { ...x, desc: v } : x)),
                    )}
                    disabled={!!aiLoading}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: aiLoading === "bullet_generate" ? "#fff" : "var(--accent)", background: aiLoading === "bullet_generate" ? "var(--accent)" : "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 5, padding: "3px 9px", cursor: aiLoading ? "wait" : "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                    {aiLoading === "bullet_generate"
                      ? <Loader2 size={10} style={{ animation: "spin .7s linear infinite" }} />
                      : <Sparkles size={10} />}
                    {w.desc.trim() ? "Regenerate bullets" : "✦ Generate bullets"}
                  </button>
                )}
                {w.desc.trim() && (() => {
                  const improved = improveText(w.desc);
                  return improved !== w.desc ? (
                    <button
                      onClick={() => set("work", data.work.map((x, j) => j === i ? { ...x, desc: improved } : x))}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit" }}>
                      <Wand2 size={10} /> Strengthen verbs
                    </button>
                  ) : null;
                })()}
                {/* Content suggestion toggle */}
                {getSuggestions(w.role).length > 0 && (
                  <button
                    onClick={() => setOpenSuggestions(openSuggestions === i ? -1 : i)}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: openSuggestions === i ? "#fff" : "#d97706", background: openSuggestions === i ? "#d97706" : "#fffbeb", borderWidth: 1, borderStyle: "solid", borderColor: "#fde68a", borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit" }}>
                    <Lightbulb size={10} /> Bullet suggestions {openSuggestions === i ? "▲" : "▼"}
                  </button>
                )}
              </div>
              {/* Bullet suggestion panel */}
              {openSuggestions === i && getSuggestions(w.role).length > 0 && (
                <div style={{ background: "#fffbeb", borderWidth: 1, borderStyle: "solid", borderColor: "#fde68a", borderRadius: 9, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 2 }}>
                    💡 Suggestions for "{w.role}" — click to add
                  </div>
                  {getSuggestions(w.role).map((bullet, bi) => (
                    <button key={bi}
                      onClick={() => {
                        const newDesc = w.desc.trim() ? w.desc.trimEnd() + "\n" + bullet : bullet;
                        set("work", data.work.map((x, j) => j === i ? { ...x, desc: newDesc } : x));
                      }}
                      style={{ textAlign: "left" as const, fontSize: 11, color: "#78350f", background: "#fff", borderWidth: 1, borderStyle: "solid", borderColor: "#fde68a", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.5, transition: "background .1s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fef3c7"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                      {bullet}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </EntryCard>
        ))}
        <AddBtn onClick={() => set("work", [...data.work, { id: uid(), company: "", role: "", from: "", to: "", current: false, desc: "" }])} label="Add Experience" />
        <SectionAtsBar label="Work Experience" score={atsWork(data).score} max={atsWork(data).max} hints={atsWork(data).hints} />
      </div>
    );

    /* ── Education ───────────────────────────── */
    if (key === "edu") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Education {mode === "fresher" ? "· Your strongest section" : ""}</div>
          <div style={styles.stepTitle}>Education</div>
          <div style={styles.stepSub}>{mode === "fresher" ? "As a fresher, education is your headline — include CGPA, honours, and relevant coursework." : "Your degrees, diplomas, and certifications from institutions."}</div>
        </div>
        <TipsPanel sectionKey="edu" openTips={openTips} setOpenTips={setOpenTips} />
        {data.edu.map((e, i) => (
          <EntryCard key={e.id} num={i + 1} onRemove={() => set("edu", data.edu.filter((_, j) => j !== i))} canRemove={data.edu.length > 1}>
            <Field label="School" value={e.school} onChange={v => set("edu", data.edu.map((x, j) => j === i ? { ...x, school: v } : x))} placeholder="IIT Delhi"               />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <Field label="Degree" value={e.degree} onChange={v => set("edu", data.edu.map((x, j) => j === i ? { ...x, degree: v } : x))} placeholder="B.Tech Computer Science" />
              <Field label="Year"   value={e.year}   onChange={v => set("edu", data.edu.map((x, j) => j === i ? { ...x, year: v } : x))}   placeholder="2020"                    />
            </div>
            <Field label="GPA / Percentage / Grade (optional)" value={e.gpa ?? ""} onChange={v => set("edu", data.edu.map((x, j) => j === i ? { ...x, gpa: v } : x))} placeholder="8.5 / 10 or 85%" />
          </EntryCard>
        ))}
        <AddBtn onClick={() => set("edu", [...data.edu, { id: uid(), school: "", degree: "", year: "", gpa: "" }])} label="Add Education" />
        <SectionAtsBar label="Education" score={atsEdu(data).score} max={atsEdu(data).max}
          hints={atsEdu(data).score === 0 ? ["Add at least one school / degree"] : []} />
      </div>
    );

    /* ── Skills ──────────────────────────────── */
    if (key === "skills") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN}</div>
          <div style={styles.stepTitle}>Skills</div>
          <div style={styles.stepSub}>Comma-separated keywords. Include tools, languages, and frameworks.</div>
        </div>
        <TipsPanel sectionKey="skills" openTips={openTips} setOpenTips={setOpenTips} />
        <Field label="" value={data.skills} onChange={v => set("skills", v)} placeholder="React, TypeScript, Node.js, PostgreSQL, Docker…" multiline rows={3} />
        {data.skills?.trim() && (() => {
          const skillList = data.skills.split(",").map(s => s.trim()).filter(Boolean);
          const seen = new Set<string>();
          const dupes = new Set<string>();
          skillList.forEach(s => { const k = s.toLowerCase(); seen.has(k) ? dupes.add(k) : seen.add(k); });
          return (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {skillList.map((s, i) => {
                  const isDupe = dupes.has(s.toLowerCase());
                  return (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", background: isDupe ? "#fef2f2" : "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: isDupe ? "#fecaca" : "var(--border)", borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 600, color: isDupe ? "#dc2626" : "var(--text2)", gap: 4 }}>
                      {isDupe && <span title="Duplicate">⚠</span>}{s}
                    </span>
                  );
                })}
              </div>
              {dupes.size > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#fef2f2", borderWidth: 1, borderStyle: "solid", borderColor: "#fecaca", borderRadius: 8, fontSize: 11 }}>
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>⚠ {dupes.size} duplicate skill{dupes.size > 1 ? "s" : ""} detected</span>
                  <button
                    onClick={() => {
                      const unique: string[] = [];
                      const seenKeys = new Set<string>();
                      data.skills.split(",").map(s => s.trim()).filter(Boolean).forEach(s => {
                        const k = s.toLowerCase();
                        if (!seenKeys.has(k)) { unique.push(s); seenKeys.add(k); }
                      });
                      set("skills", unique.join(", "));
                    }}
                    style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fff", borderWidth: 1, borderStyle: "solid", borderColor: "#fecaca", borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                    Remove duplicates
                  </button>
                </div>
              )}
            </>
          );
        })()}
        <InlineAtsHint value={atsSkills(data).count} max={8} unit="skills" label="aim for 8+" />
        <SectionAtsBar label="Skills" score={atsSkills(data).score} max={15}
          hints={atsSkills(data).count === 0 ? ["Add comma-separated skills"] :
                 atsSkills(data).count < 5   ? [`Add ${5 - atsSkills(data).count} more for partial credit`] :
                 atsSkills(data).count < 8   ? [`Add ${8 - atsSkills(data).count} more for full 15 pts`] : []} />
      </div>
    );

    /* ── Projects ────────────────────────────── */
    if (key === "projects") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN}{mode === "fresher" ? " · Key section" : " · Optional"}</div>
          <div style={styles.stepTitle}>Projects</div>
          <div style={styles.stepSub}>Side projects, open-source contributions, or notable builds.</div>
        </div>
        {/* Empty-state example card */}
        {(data.projects ?? []).length === 0 && (
          <div style={{ padding: "12px 14px", background: "var(--surface2)", borderWidth: 1, borderStyle: "dashed", borderColor: "var(--accborder)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>💡 Example project</div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>AI Expense Tracker</span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}> · FastAPI + PostgreSQL + Docker · Jan 2024 – Mar 2024</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
              "Automated expense tracking with ML categorisation, reducing manual effort by 80%. Deployed on AWS with Docker."
            </div>
            <button
              onClick={() => set("projects", [{ id: uid(), name: "AI Expense Tracker", url: "", repo: "github.com/you/expense-tracker", from: "Jan 2024", to: "Mar 2024", desc: "• Automated expense tracking with ML categorisation, reducing manual effort by 80%.\n• Built with FastAPI, PostgreSQL, and Docker — deployed on AWS EC2.\n• Integrated with UPI payment APIs to auto-import transactions." }])}
              style={{ alignSelf: "flex-start" as const, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>
              Use this example
            </button>
          </div>
        )}

        {(data.projects ?? []).map((p, i) => (
          <EntryCard key={p.id} num={i + 1} onRemove={() => set("projects", (data.projects ?? []).filter((_, j) => j !== i))} canRemove={true}>
            <Field label="Project Name"       value={p.name} onChange={v => set("projects", (data.projects ?? []).map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="AI Expense Tracker"          />
            <Field label="Live URL (optional)" value={p.url}  onChange={v => set("projects", (data.projects ?? []).map((x, j) => j === i ? { ...x, url: v } : x))}  placeholder="myproject.app"               />
            <Field label="GitHub / GitLab repo (optional)" value={p.repo ?? ""} onChange={v => set("projects", (data.projects ?? []).map((x, j) => j === i ? { ...x, repo: v } : x))} placeholder="github.com/you/project" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="From" value={p.from} onChange={v => set("projects", (data.projects ?? []).map((x, j) => j === i ? { ...x, from: v } : x))} placeholder="Jan 2023" />
              <Field label="To"   value={p.to}   onChange={v => set("projects", (data.projects ?? []).map((x, j) => j === i ? { ...x, to: v } : x))}   placeholder="Mar 2023" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Field label="Description" value={p.desc} bullets onChange={v => set("projects", (data.projects ?? []).map((x, j) => j === i ? { ...x, desc: v } : x))} placeholder={"• FastAPI + PostgreSQL + Docker\n• Reduced manual tracking effort by 80%"} multiline rows={3} />
              {p.desc.trim() && (() => {
                const improved = improveText(p.desc);
                return improved !== p.desc ? (
                  <button
                    onClick={() => set("projects", (data.projects ?? []).map((x, j) => j === i ? { ...x, desc: improved } : x))}
                    style={{ alignSelf: "flex-start" as const, display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit" }}>
                    <Wand2 size={10} /> Strengthen verbs
                  </button>
                ) : null;
              })()}
            </div>
          </EntryCard>
        ))}
        <AddBtn onClick={() => set("projects", [...(data.projects ?? []), { id: uid(), name: "", url: "", repo: "", from: "", to: "", desc: "" }])} label="Add Project" />
      </div>
    );

    /* ── Certifications ──────────────────────── */
    if (key === "certifications") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN} · Optional</div>
          <div style={styles.stepTitle}>Certifications</div>
          <div style={styles.stepSub}>Professional certifications, licences, and credentials.</div>
        </div>
        {(data.certifications ?? []).map((c, i) => (
          <EntryCard key={c.id} num={i + 1} onRemove={() => set("certifications", (data.certifications ?? []).filter((_, j) => j !== i))} canRemove={true}>
            <Field label="Certification Name" value={c.name}   onChange={v => set("certifications", (data.certifications ?? []).map((x, j) => j === i ? { ...x, name: v } : x))}   placeholder="AWS Solutions Architect" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <Field label="Issuer" value={c.issuer} onChange={v => set("certifications", (data.certifications ?? []).map((x, j) => j === i ? { ...x, issuer: v } : x))} placeholder="Amazon Web Services" />
              <Field label="Year"   value={c.year}   onChange={v => set("certifications", (data.certifications ?? []).map((x, j) => j === i ? { ...x, year: v } : x))}   placeholder="2023"                />
            </div>
            {/* Issuer logo — optional */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {c.logo
                  ? <div style={{ position: "relative" }}>
                      <img src={c.logo} alt="Logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "#fff", padding: 2 }} />
                      <button onClick={() => set("certifications", (data.certifications ?? []).map((x, j) => j === i ? { ...x, logo: undefined } : x))}
                        style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "#dc2626", border: "1.5px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                        <X size={8} color="#fff" />
                      </button>
                    </div>
                  : null
                }
                <button
                  onClick={() => { setCertLogoIdx(i); certLogoInputRef.current?.click(); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--text3)", background: "var(--surface2)", borderWidth: 1, borderStyle: "dashed", borderColor: "var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                  <ImageIcon size={11} /> {c.logo ? "Change logo" : "Add issuer logo (optional)"}
                </button>
            </div>
          </EntryCard>
        ))}
        <AddBtn onClick={() => set("certifications", [...(data.certifications ?? []), { id: uid(), name: "", issuer: "", year: "" }])} label="Add Certification" />
      </div>
    );

    /* ── Languages ───────────────────────────── */
    if (key === "languages") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN} · Optional</div>
          <div style={styles.stepTitle}>Languages</div>
          <div style={styles.stepSub}>Languages you speak and your proficiency level.</div>
        </div>
        {(data.languages ?? []).map((l, i) => (
          <div key={l.id} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Field label="Language" value={l.name} onChange={v => set("languages", (data.languages ?? []).map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="English, Hindi…" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px" }}>Level</label>
              <select
                value={l.level}
                onChange={e => set("languages", (data.languages ?? []).map((x, j) => j === i ? { ...x, level: e.target.value as LanguageEntry["level"] } : x))}
                style={{ padding: "10px 8px", borderRadius: 9, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text1)", fontSize: 12, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                <option>Basic</option>
                <option>Conversational</option>
                <option>Fluent</option>
                <option>Native</option>
              </select>
            </div>
            <button onClick={() => set("languages", (data.languages ?? []).filter((_, j) => j !== i))} style={{ color: "#dc2626", background: "none", border: "none", padding: "0 0 12px 0", cursor: "pointer" }}><X size={14} /></button>
          </div>
        ))}
        <AddBtn onClick={() => set("languages", [...(data.languages ?? []), { id: uid(), name: "", level: "Fluent" }])} label="Add Language" />
      </div>
    );

    /* ── Awards ──────────────────────────────── */
    if (key === "awards") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN} · Optional</div>
          <div style={styles.stepTitle}>Awards & Honours</div>
          <div style={styles.stepSub}>Academic prizes, hackathon wins, company recognition, scholarships — anything you earned.</div>
        </div>
        {(data.awards ?? []).map((a, i) => (
          <EntryCard key={a.id} num={i + 1} onRemove={() => set("awards", (data.awards ?? []).filter((_, j) => j !== i))} canRemove={true}>
            <Field label="Award / Title" value={a.title} onChange={v => set("awards", (data.awards ?? []).map((x, j) => j === i ? { ...x, title: v } : x))} placeholder="Best Engineer Award" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <Field label="Issuer / Organisation" value={a.issuer} onChange={v => set("awards", (data.awards ?? []).map((x, j) => j === i ? { ...x, issuer: v } : x))} placeholder="Razorpay" />
              <Field label="Year" value={a.year} onChange={v => set("awards", (data.awards ?? []).map((x, j) => j === i ? { ...x, year: v } : x))} placeholder="2023" />
            </div>
            <Field label="Description (optional)" value={a.desc} bullets onChange={v => set("awards", (data.awards ?? []).map((x, j) => j === i ? { ...x, desc: v } : x))} placeholder="What it was for…" multiline rows={2} />
          </EntryCard>
        ))}
        <AddBtn onClick={() => set("awards", [...(data.awards ?? []), { id: uid(), title: "", issuer: "", year: "", desc: "" }])} label="Add Award" />
      </div>
    );

    /* ── Interests ───────────────────────────── */
    if (key === "interests") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN} · Optional</div>
          <div style={styles.stepTitle}>Hobbies & Interests</div>
          <div style={styles.stepSub}>A brief personal touch. Comma-separated — e.g. Open source, chess, photography.</div>
        </div>
        <Field label="" value={data.interests ?? ""} onChange={v => set("interests", v)} placeholder="Open source, hiking, chess, generative AI…" multiline rows={2} />
        {data.interests?.trim() && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {data.interests.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", background: "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>{s}</span>
            ))}
          </div>
        )}
      </div>
    );

    /* ── References ─────────────────────────── */
    if (key === "references") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
        <div>
          <div style={styles.stepLabel}>Step {currentOrderPos + 1} of {TOTAL_MAIN} · Optional</div>
          <div style={styles.stepTitle}>References</div>
          <div style={styles.stepSub}>Professional references who can vouch for your work. Leave blank to print "Available on request".</div>
        </div>

        {(data.references ?? []).length === 0 && (
          <div style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "var(--border)", fontSize: 12, color: "var(--text3)", textAlign: "center" as const }}>
            No references added — resume will print <em>"References available on request"</em>
          </div>
        )}

        {(data.references ?? []).map((r, i) => (
          <EntryCard key={r.id} num={i + 1} onRemove={() => set("references", (data.references ?? []).filter((_, j) => j !== i))} canRemove={true}>
            <Field label="Full Name"          value={r.name}    onChange={v => set("references", (data.references ?? []).map((x, j) => j === i ? { ...x, name: v } : x))}    placeholder="Ananya Rao"          />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Job Title / Relationship" value={r.title}   onChange={v => set("references", (data.references ?? []).map((x, j) => j === i ? { ...x, title: v } : x))}   placeholder="Engineering Manager" />
              <Field label="Company"         value={r.company} onChange={v => set("references", (data.references ?? []).map((x, j) => j === i ? { ...x, company: v } : x))} placeholder="Razorpay"            />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Email"  value={r.email} onChange={v => set("references", (data.references ?? []).map((x, j) => j === i ? { ...x, email: v } : x))} placeholder="ananya@razorpay.com" />
              <Field label="Phone"  value={r.phone} onChange={v => set("references", (data.references ?? []).map((x, j) => j === i ? { ...x, phone: v } : x))} placeholder="+91 98000 00000"    />
            </div>
          </EntryCard>
        ))}
        <AddBtn onClick={() => set("references", [...(data.references ?? []), { id: uid(), name: "", title: "", company: "", email: "", phone: "" }])} label="Add Reference" />
      </div>
    );

    /* ── Template step ──────────────────────── */
    if (step === STEP_TEMPLATE) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
          <div>
            <div style={styles.stepLabel}>Template</div>
            <div style={styles.stepTitle}>Choose a layout</div>
            <div style={styles.stepSub}>Pick a template — preview updates live.</div>
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "free", "premium"] as const).map(f => (
              <button key={f} onClick={() => setTplFilter(f)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: tplFilter === f ? "var(--text1)" : "var(--surface2)",
                  color:      tplFilter === f ? "var(--bg)"    : "var(--text3)",
                  transition: "background .15s, color .15s",
                }}>
                {f === "all" ? "All" : f === "free" ? "Free" : "✦ Premium"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {ALL_TEMPLATES.filter(t =>
              tplFilter === "all"     ? true :
              tplFilter === "free"    ? BASIC_TEMPLATES.includes(t) :
                                        PREMIUM_TEMPLATES.includes(t)
            ).map(t => {
              const locked  = !availableTemplates.includes(t);
              const active  = template === t;
              const tAccent = TEMPLATE_ACCENT[t] ?? "#1a1a2e";
              const W       = 158;
              const SCALE   = W / 794;
              const DISP_H  = Math.round(1123 * SCALE);
              return (
                <button key={t}
                  onClick={() => { setTemplate(t); setPreviewTemplate(null); }}
                  style={{
                    position: "relative", padding: 0, borderRadius: 8, cursor: "pointer",
                    borderWidth: 2, borderStyle: "solid",
                    borderColor: active ? tAccent : "var(--border)",
                    background: "#fff",
                    display: "flex", flexDirection: "column", alignItems: "stretch",
                    fontFamily: "inherit", overflow: "hidden", flexShrink: 0,
                    transition: "border-color .15s, box-shadow .15s",
                    boxShadow: active ? `0 0 0 3px ${tAccent}33` : "none",
                    width: W,
                  }}>

                  {/* Real A4 preview — always visible (even locked) */}
                  <div style={{ width: W, height: DISP_H, overflow: "hidden", pointerEvents: "none", flexShrink: 0, position: "relative" }}>
                    <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 794, height: 1123, overflow: "hidden" }}>
                      <ResumePreview data={data} template={t} thumbnail />
                    </div>
                    {/* Premium badge overlay */}
                    {locked && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.28)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "6px 6px 0 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, background: "linear-gradient(135deg,#b8860b,#f5c842,#b8860b)", borderRadius: 5, padding: "3px 7px", fontSize: 9, fontWeight: 800, color: "#1a0e00", boxShadow: "0 1px 6px rgba(245,200,66,.55)", letterSpacing: ".3px" }}>
                          <Sparkles size={9} style={{ color: "#1a0e00" }} /> PREMIUM
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div style={{
                    padding: "5px 8px 6px",
                    borderTop: `1px solid ${active ? tAccent + "44" : "var(--border)"}`,
                    background: active ? `${tAccent}0d` : "var(--surface)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, fontWeight: active ? 700 : 600, color: active ? tAccent : locked ? "var(--text3)" : "var(--text2)" }}>{t}</span>
                      {locked && <Sparkles size={9} style={{ color: "#f5c842" }} />}
                      {active && <Check size={10} style={{ color: tAccent }} />}
                    </div>
                    {TEMPLATE_META[t] && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: "var(--text3)", lineHeight: 1.3, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {TEMPLATE_META[t].bestFor}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: TEMPLATE_META[t].ats >= 90 ? "#16a34a" : TEMPLATE_META[t].ats >= 80 ? "#d97706" : "#9ca3af" }}>
                          ATS {TEMPLATE_META[t].ats}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    /* ── Job Description Matching step ─────── */
    if (step === STEP_JD) {
      const scoreColor = !jdResult ? "var(--text3)"
        : jdResult.score >= 75 ? "#16a34a"
        : jdResult.score >= 50 ? "#d97706"
        : "#dc2626";

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "100%" }}>
          <div>
            <div style={styles.stepLabel}>Job Match</div>
            <div style={styles.stepTitle}>Tailor to the role</div>
            <div style={styles.stepSub}>Paste the job description — we'll show which keywords are missing and what to add.</div>
          </div>

          {/* JD input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px" }}>Job Description</label>
            <textarea
              spellCheck
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder={"Paste the full job description here…\n\nE.g. \"We are looking for a Senior Python Engineer with experience in FastAPI, Kubernetes, and LangChain…\""}
              rows={9}
              style={{ padding: "12px 14px", borderRadius: 10, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text1)", fontSize: 12, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={() => setJdResult(matchJd(resumeToText(data), jdText))}
              disabled={!jdText.trim()}
              style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 9, border: "none", background: jdText.trim() ? "var(--text1)" : "var(--surface2)", color: jdText.trim() ? "var(--bg)" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: jdText.trim() ? "pointer" : "default", fontFamily: "inherit", transition: "background .2s" }}>
              <Target size={13} /> Analyze Match
            </button>
          </div>

          {/* Results */}
          {jdResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Score card */}
              <div style={{ background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 44, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{jdResult.score}</span>
                    <span style={{ fontSize: 14, color: "var(--text3)", fontWeight: 600 }}>% match</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "right" as const }}>
                    <div style={{ fontWeight: 700, color: "#16a34a" }}>{jdResult.found.length} found</div>
                    <div style={{ fontWeight: 700, color: "#dc2626" }}>{jdResult.missing.length} missing</div>
                  </div>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "var(--surface2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${jdResult.score}%`, borderRadius: 99, background: `linear-gradient(90deg, ${jdResult.score < 50 ? "#ef4444, #f97316" : jdResult.score < 75 ? "#f97316, #eab308" : "#22c55e, #16a34a"})`, transition: "width .5s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
                  {jdResult.score >= 75 ? "🟢 Strong match — you're well aligned with this role"
                   : jdResult.score >= 50 ? "🟡 Decent match — adding missing keywords will improve shortlisting odds"
                   : "🔴 Low match — focus on adding the missing skills below"}
                </div>
              </div>

              {/* Category groups */}
              {jdResult.groups.map(g => (
                <div key={g.category} style={{ background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>{g.category}</div>

                  {g.found.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: g.missing.length ? 10 : 0 }}>
                      {g.found.map(kw => (
                        <span key={kw} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: "#dcfce7", color: "#15803d" }}>✓ {kw}</span>
                      ))}
                    </div>
                  )}

                  {g.missing.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {g.missing.map(kw => (
                        <button key={kw} title="Add to Skills"
                          onClick={() => {
                            const current = data.skills ? data.skills.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [];
                            if (!current.map(s => s.toLowerCase()).includes(kw)) {
                              set("skills", [...current, kw].join(", "));
                            }
                            setJdResult(r => r ? { ...r, found: [...r.found, kw], missing: r.missing.filter(m => m !== kw), score: Math.round(((r.found.length + 1) / (r.found.length + r.missing.length)) * 100) } : r);
                          }}
                          style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                          + {kw}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Go to skills shortcut */}
              {jdResult.missing.length > 0 && (
                <button onClick={() => setStep(4)}
                  style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                  Edit Skills section →
                </button>
              )}
            </div>
          )}

          {/* ── AI Tailor to JD ─────────────────────────────── */}
          {jdText.trim() && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {plan.tier !== "pro" ? (
                <button
                  onClick={() => window.open("/upgrade", "_blank")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #d97706, #b45309)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <Lock size={13} /> Unlock AI Tailor (Gold)
                </button>
              ) : (
                <button
                  onClick={handleTailorToJd}
                  disabled={tailorLoading}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: tailorLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: tailorLoading ? 0.7 : 1, transition: "opacity .2s" }}>
                  {tailorLoading
                    ? <><Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> Tailoring…</>
                    : <><Sparkles size={14} /> ✦ AI Tailor my resume</>}
                </button>
              )}

              {tailorResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Rewritten summary */}
                  <div style={{ background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>AI-rewritten summary</div>
                      <button
                        onClick={() => { set("summary", tailorResult.summary); setTailorResult(null); }}
                        style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                        Apply →
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text1)", lineHeight: 1.6 }}>{tailorResult.summary}</div>
                  </div>

                  {/* Missing skills */}
                  {tailorResult.missingSkills.length > 0 && (
                    <div style={{ background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Skills to consider adding</div>
                        <button
                          onClick={() => {
                            const current = data.skills ? data.skills.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [];
                            const toAdd = tailorResult.missingSkills.filter(s => !current.map(c => c.toLowerCase()).includes(s.toLowerCase()));
                            set("skills", [...current, ...toAdd].join(", "));
                            setTailorResult(r => r ? { ...r, missingSkills: [] } : r);
                          }}
                          style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, border: "none", background: "var(--surface2)", color: "var(--text1)", cursor: "pointer", fontFamily: "inherit" }}>
                          Add all
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                        {tailorResult.missingSkills.map(skill => (
                          <button key={skill}
                            onClick={() => {
                              const current = data.skills ? data.skills.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [];
                              if (!current.map(c => c.toLowerCase()).includes(skill.toLowerCase())) {
                                set("skills", [...current, skill].join(", "));
                              }
                              setTailorResult(r => r ? { ...r, missingSkills: r.missingSkills.filter(s => s !== skill) } : r);
                            }}
                            style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: "var(--accdim)", color: "var(--accent)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", cursor: "pointer", fontFamily: "inherit" }}>
                            + {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    /* ── Mode selection step ────────────────────── */
    if (step === STEP_MODE) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: "100%" }}>
          <div>
            <div style={styles.stepLabel}>Get started</div>
            <div style={styles.stepTitle}>I am a…</div>
            <div style={styles.stepSub}>This tailors section order and labels to your background.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {(["experienced", "fresher"] as BuilderMode[]).map(m => {
              const active = mode === m;
              return (
                <div key={m} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <button onClick={() => setMode(m)}
                    style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "18px 20px",
                      borderRadius: m === "experienced" && active ? "14px 14px 0 0" : 14,
                      borderWidth: 2, borderStyle: "solid", cursor: "pointer",
                      borderColor: active ? "var(--text1)" : "var(--border)",
                      borderBottomColor: m === "experienced" && active ? "transparent" : active ? "var(--text1)" : "var(--border)",
                      background:  active ? "var(--surface2)" : "var(--bg)",
                      fontFamily: "inherit", textAlign: "left" as const, transition: "all .15s",
                    }}>
                    <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{m === "fresher" ? "🎓" : "💼"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>
                        {m === "fresher" ? "Student / Fresher" : "Experienced Professional"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 3, lineHeight: 1.5 }}>
                        {m === "fresher"
                          ? "Final-year student, recent graduate, or someone with no full-time experience yet"
                          : "I have work experience and want to highlight it prominently"
                        }
                      </div>
                    </div>
                    {active && <Check size={18} style={{ color: "var(--text1)", flexShrink: 0 }} />}
                  </button>
                  {/* Import strip — shown under "Experienced Professional" when selected */}
                  {m === "experienced" && active && (
                    <div style={{ padding: 12, background: "var(--surface2)", borderWidth: 2, borderStyle: "solid", borderColor: "var(--text1)", borderTop: "none", borderRadius: "0 0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => resumeInputRef.current?.click()}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 7, background: "var(--accdim)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit" }}>
                          <Upload size={13} />
                          {importStatus === "parsing" ? "Parsing…" : importedFields ? "Re-import resume" : "Import existing resume (PDF · DOCX · TXT)"}
                        </button>
                        {importedFields && (
                          <button
                            onClick={() => {
                              setData(d => {
                                const cleared = { ...d };
                                (Object.keys(importedFields) as (keyof ResumeData)[]).forEach(k => {
                                  (cleared as Record<string, unknown>)[k] = "";
                                });
                                return cleared;
                              });
                              setImportedFields(null);
                              setImportMsg("");
                              setImportStatus("idle");
                            }}
                            title="Remove imported data"
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 7, background: "#fef2f2", borderWidth: 1, borderStyle: "solid", borderColor: "#fecaca", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                            <X size={12} /> Remove
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", textAlign: "center" }}>
                        {importedFields
                          ? `${Object.keys(importedFields).length} field${Object.keys(importedFields).length === 1 ? "" : "s"} imported · ${uploadLimit} import${uploadLimit === 1 ? "" : "s"}/mo`
                          : `${uploadLimit} import${uploadLimit === 1 ? "" : "s"}/mo on your plan`}
                      </div>
                      {importMsg && (
                        <div style={{ fontSize: 11, padding: "5px 8px", borderRadius: 5,
                          background: importStatus === "error" ? "#fef2f2" : "#f0fdf4",
                          color: importStatus === "error" ? "#dc2626" : "#16a34a",
                          display: "flex", alignItems: "center", gap: 6 }}>
                          {importStatus === "error" ? <X size={11} /> : <Check size={11} />}
                          {importMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setStep(0)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 24px", borderRadius: 10, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
            Continue — Build My Resume <ChevronRight size={15} />
          </button>

          {/* Sample library */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <button
            onClick={() => setShowSamples(s => !s)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 24px", borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: showSamples ? "var(--accent)" : "var(--border)", background: showSamples ? "var(--accdim)" : "var(--bg)", color: showSamples ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
            <FileText size={14} /> Start from a sample resume {showSamples ? "▲" : "▼"}
          </button>
          {showSamples && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ROLE_SAMPLES.map(s => (
                <button key={s.label}
                  onClick={() => { setData(s.data); setMode(s.mode); setShowSamples(false); setStep(0); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const, transition: "border-color .12s, background .12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--accdim)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}>
                  <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{s.role}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    /* ── Section reorder step ───────────────────── */
    if (step === STEP_REORDER) {
      const current = customOrder ?? [...MODE_STEP_ORDER[mode]];
      const isDefault = !customOrder;

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "100%" }}>
          <div>
            <div style={styles.stepLabel}>Customise layout</div>
            <div style={styles.stepTitle}>Section Order</div>
            <div style={styles.stepSub}>Drag to reorder — sections appear in this sequence on your resume.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {current.map((idx, pos) => {
              const s    = MAIN_STEPS[idx];
              const done = isDone(s.key, data);
              const isDragOver = dragOverIdx === pos;
              return (
                <div
                  key={s.key}
                  draggable
                  onDragStart={() => onDragStart(pos)}
                  onDragOver={e => onDragOver(e, pos)}
                  onDrop={e => onDrop(e, pos)}
                  onDragEnd={onDragEnd}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: isDragOver ? "var(--accdim)" : "var(--bg)",
                    borderWidth: 1, borderStyle: "solid",
                    borderColor: isDragOver ? "var(--accent)" : "var(--border)",
                    borderRadius: 10, transition: "background .12s, border-color .12s",
                    cursor: "grab",
                  }}
                >
                  <GripVertical size={15} style={{ color: "var(--text3)", flexShrink: 0, cursor: "grab" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", width: 18, flexShrink: 0 }}>{pos + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>{s.subtitle}</div>
                  </div>
                  {done && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓</span>}
                </div>
              );
            })}
          </div>
          {!isDefault && (
            <button onClick={() => setCustomOrder(null)}
              style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", background: "none", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}>
              ↺ Reset to {mode} default
            </button>
          )}
          <div style={{ padding: "12px 14px", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 10, fontSize: 11, color: "var(--accent)" }}>
            💡 Drag rows to reorder — the resume preview updates instantly.
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

      {/* Hidden file inputs */}
      <input ref={photoInputRef}    type="file" accept="image/*"                  style={{ display: "none" }} onChange={handlePhotoChange}    />
      <input ref={resumeInputRef}   type="file" accept=".pdf,.doc,.docx,.txt,.md" style={{ display: "none" }} onChange={handleResumeImport}   />
      <input ref={certLogoInputRef} type="file" accept="image/*"                  style={{ display: "none" }} onChange={handleCertLogoChange} />

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="no-print" style={{ height: 54, background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 20px", gap: 14, flexShrink: 0, zIndex: 10 }}>

        {/* Logo */}
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--text1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "var(--bg)", flexShrink: 0 }}>R</div>

        {/* Editable resume name */}
        {nameEditing ? (
          <input
            autoFocus
            value={resumeName}
            onChange={e => setResumeName(e.target.value)}
            onBlur={() => setNameEditing(false)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setNameEditing(false); }}
            style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", background: "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 6, padding: "3px 8px", outline: "none", fontFamily: "inherit", width: 180 }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 2, position: "relative" }}>
            <button onClick={() => setNameEditing(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 6, fontFamily: "inherit" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumeName}</span>
              <Pencil size={10} style={{ color: "var(--text3)", flexShrink: 0 }} />
            </button>
            <button onClick={() => { setShowResumeMenu(!showResumeMenu); if (!showResumeMenu) handleLoadSavesList(); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, background: "none", border: "none", cursor: "pointer", borderRadius: 4, color: "var(--text3)", padding: 0 }}>
              <ChevronDown size={12} />
            </button>

            {showResumeMenu && (
              <div style={{
                position: "absolute", top: 28, left: 0, zIndex: 100,
                background: "var(--surface)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)",
                borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                width: 200, maxHeight: 300, overflowY: "auto",
                padding: "6px", display: "flex", flexDirection: "column", gap: 4,
                fontFamily: "inherit"
              }}>
                <button onClick={handleCreateNew}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text1)", fontSize: 12, fontWeight: 700, textAlign: "left" as const }}>
                  <Plus size={12} /> Create New
                </button>
                <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                {user ? (
                  loadingSaves ? (
                    <div style={{ padding: "10px", fontSize: 11, color: "var(--text3)", textAlign: "center" }}>Loading…</div>
                  ) : savesList.length === 0 ? (
                    <div style={{ padding: "10px", fontSize: 11, color: "var(--text3)", textAlign: "center" }}>No saved resumes</div>
                  ) : (
                    savesList.map(r => (
                      <button key={r.id} onClick={() => { handleLoadResume(r.id); setShowResumeMenu(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, background: r.id === currentSaveId ? "var(--accdim)" : "none", border: "none", cursor: "pointer", color: r.id === currentSaveId ? "var(--accent)" : "var(--text2)", fontSize: 12, fontWeight: r.id === currentSaveId ? 700 : 600, textAlign: "left" as const }}>
                        <FileText size={12} style={{ opacity: 0.6 }} /> {r.name}
                      </button>
                    ))
                  )
                ) : (
                  <div style={{ padding: "10px", fontSize: 11, color: "var(--text3)", textAlign: "center" }}>Sign in to see your saves</div>
                )}
              </div>
            )}
          </div>
        )}


        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

        {/* Progress + ATS */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)" }}>Progress</span>
          <div style={{ width: 120, height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--text1)", borderRadius: 99, transition: "width .4s" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text1)" }}>{completedCount}/{TOTAL_MAIN}</span>
          <div style={{ width: 1, height: 14, background: "var(--border)" }} />
          <button onClick={() => { setLeftTab("edit"); setStep(STEP_ATS); }} title="View ATS breakdown"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)" }}>ATS</span>
            <div style={{ position: "relative", width: 80, height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${ats.score}%`, borderRadius: 99,
                background: `linear-gradient(90deg, ${ats.score < 50 ? "#ef4444, #f97316" : ats.score < 75 ? "#f97316, #eab308" : "#22c55e, #16a34a"})`,
                transition: "width .5s ease",
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: ats.scoreColor, minWidth: 20 }}>{ats.score}</span>
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {/* Autosave indicator */}
          <span style={{
            fontSize: 10, fontWeight: 600, color: "var(--text3)",
            display: "flex", alignItems: "center", gap: 3,
            opacity: autoSaved ? 1 : 0, transition: "opacity .3s ease",
            pointerEvents: "none", minWidth: 72,
          }}>
            <Check size={10} style={{ color: "var(--accent)" }} /> Autosaved
          </span>

          {/* User / sign in */}
          {user
            ? <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", background: "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 5, padding: "3px 8px" }}>{plan.loading ? "…" : plan.planName}</span>
            : <button onClick={() => signInWithGoogle()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                <LogIn size={11} /> Sign in
              </button>
          }

          {/* auto-saved indicator */}
          {user && autoSaved && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)" }}>✓ Saved</span>
          )}

          {/* Share */}
          <button onClick={handleShare} disabled={shareStatus === "loading"}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: shareStatus === "copied" ? "var(--accent)" : "var(--text2)", background: shareStatus === "copied" ? "var(--accdim)" : "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: shareStatus === "copied" ? "var(--accborder)" : "var(--border)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit" }}>
            {shareStatus === "loading" ? <Loader2 size={11} style={{ animation: "spin .7s linear infinite" }} /> :
             shareStatus === "copied"  ? <><Check size={11} /> Copied!</> :
             <><Link2 size={11} /> Share</>}
          </button>

          {/* Export PDF */}
          <button onClick={handlePdfExport}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "var(--text1)", border: "none", color: "var(--bg)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <Download size={13} /> Export PDF
          </button>

          {/* DOCX/JSON small buttons */}
          <button onClick={handleDocxExport}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, background: "var(--surface2)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", color: plan.hasDocxExport ? "var(--text2)" : "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {!plan.hasDocxExport && <Lock size={10} />} DOCX
          </button>

          {/* Dark/light toggle */}
          <button onClick={() => setDark(d => !d)} title={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text2)", cursor: "pointer", flexShrink: 0 }}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* ── Two-panel main layout (desktop) ─────────────────── */}
      <div className="no-print" style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ══ LEFT PANEL (460px) ══════════════════════════════ */}
        <div style={{ width: 460, flexShrink: 0, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tab strip */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0, padding: "0 4px" }}>
            {([
              { id: "edit"      as const, icon: <Pencil size={12} />,      label: "Edit"     },
              { id: "cover"     as const, icon: <Mail size={12} />,         label: "Cover Letter"},
              { id: "templates" as const, icon: <Palette size={12} />,      label: "Templates"},
              { id: "order"     as const, icon: <LayoutList size={12} />,   label: "Order"    },
              { id: "jd"        as const, icon: <Target size={12} />,       label: "JD Match" },
            ]).map(t => (
              <button key={t.id} onClick={() => setLeftTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 8px 9px", fontSize: 11, fontWeight: 600, color: leftTab === t.id ? "var(--accent)" : "var(--text3)", background: "none", border: "none", borderBottom: `2px solid ${leftTab === t.id ? "var(--accent)" : "transparent"}`, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const, marginBottom: -1, transition: "color .15s", flexShrink: 0 }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── EDIT TAB ──────────────────────────────────────── */}
          {leftTab === "edit" && (
            <div style={{ flex: 1, overflowY: "auto", paddingTop: 10 }}>

              {/* ── ATS full-panel view (replaces accordion when ATS score clicked) ── */}
              {step === STEP_ATS ? (
                <div style={{ flex: 1, padding: "0 12px 20px" }}>
                  <button
                    onClick={() => { setStep(activeSection ? (MAIN_STEPS.findIndex(s => s.key === activeSection) >= 0 ? MAIN_STEPS.findIndex(s => s.key === activeSection) : 0) : 0); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", padding: "4px 0 10px", fontFamily: "inherit" }}>
                    ← Back to editing
                  </button>
                  {renderStepContent()}
                </div>
              ) : (<>

              {/* ── My Resumes panel (signed-in users only) ───────── */}
              {user && (
                <div style={{ margin: "0 10px 10px", borderWidth: 1.5, borderStyle: "solid", borderColor: savesOpen ? "var(--accent)" : "var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: savesOpen ? "0 0 0 3px var(--accdim)" : "none", transition: "border-color .15s, box-shadow .15s" }}>
                  {/* Header row */}
                  <div onClick={() => { setSavesOpen(o => !o); if (!savesOpen) handleLoadSavesList(); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", background: savesOpen ? "var(--accdim)" : "var(--surface)", userSelect: "none" as const, transition: "background .1s" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FolderOpen size={13} style={{ color: "var(--accent)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{resumeName}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>{savesList.length}/{plan.maxSaves} saved · {plan.planName}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleCloudSave(); }} disabled={savingCloud}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 6, padding: "3px 8px", cursor: savingCloud ? "default" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                      {savingCloud ? <Loader2 size={10} style={{ animation: "spin .7s linear infinite" }} /> : <Save size={10} />}
                      {currentSaveId ? "Update" : "Save"}
                    </button>
                    <span style={{ fontSize: 11, color: "var(--text3)", display: "inline-block", transform: savesOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▾</span>
                  </div>
                  {/* Expanded list */}
                  {savesOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                      {loadingSaves ? (
                        <div style={{ padding: "12px 14px", fontSize: 11, color: "var(--text3)" }}>Loading…</div>
                      ) : savesList.length === 0 ? (
                        <div style={{ padding: "12px 14px", fontSize: 11, color: "var(--text3)" }}>No saved resumes yet — hit Save to store this one.</div>
                      ) : savesList.map(r => (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: r.id === currentSaveId ? "var(--accdim)" : "transparent" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.name}</div>
                            <div style={{ fontSize: 9, color: "var(--text3)" }}>{r.template} · {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                          </div>
                          <button onClick={() => { handleLoadResume(r.id); setSavesOpen(false); }}
                            style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                            Load
                          </button>
                          <button onClick={() => handleDeleteResume(r.id)} title="Delete"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", padding: "2px 3px", display: "flex", alignItems: "center", flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {savesList.length < plan.maxSaves && (
                        <div style={{ padding: "8px 12px" }}>
                          <button onClick={() => { setCurrentSaveId(null); handleCloudSave(); setSavesOpen(false); }}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 7, padding: "6px 0", cursor: "pointer", fontFamily: "inherit" }}>
                            <Plus size={11} /> Save as new resume
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Profile strength bar */}
              <div style={{ padding: "0 12px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>Profile strength</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ats.scoreColor }}>{ats.score}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "var(--surface2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${ats.score}%`, borderRadius: 99, background: ats.scoreColor, transition: "width .4s" }} />
                </div>
                {ats.tips.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: "var(--text3)" }}>→ {ats.tips[0]}</div>
                )}
              </div>

              {/* Accordion sections */}
              {orderedIndices.map(idx => {
                const s     = MAIN_STEPS[idx];
                const done  = isDone(s.key, data);
                const open  = activeSection === s.key;
                const sub   = stepSubtitle(s.key, data) || modeSubtitle(idx);
                const ICONS: Record<string, string> = { profile: "📇", summary: "📝", work: "💼", edu: "🎓", skills: "⚡", projects: "🚀", certifications: "🏆", languages: "🌐", awards: "🥇", interests: "🎯", references: "👤" };
                const status   = sectionStatus(s.key, data);
                const required = REQUIRED_SECTIONS.has(s.key);
                const dotColor = status === "complete" ? "#22c55e"
                               : status === "partial"  ? "#f59e0b"
                               : required              ? "#e2e8f0"   // gray dot for empty required
                               : null;                                // no dot for empty optional
                return (
                  <div key={s.key} style={{ margin: "0 10px 5px", border: `1.5px solid ${open ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden", boxShadow: open ? "0 0 0 3px var(--accdim)" : "none", transition: "border-color .15s, box-shadow .15s" }}>
                    <div
                      onClick={() => { if (open) { setActiveSection(null); } else { setActiveSection(s.key); setStep(idx); } }}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", cursor: "pointer", background: open ? "var(--accdim)" : "var(--surface)", userSelect: "none" as const, transition: "background .1s" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: done ? "var(--text1)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 11 : 14, fontWeight: 700, flexShrink: 0, color: done ? "var(--bg)" : undefined }}>
                        {done ? "✓" : (ICONS[s.key] ?? "📄")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>{modeLabel(idx)}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{sub}</div>
                      </div>
                      {/* Completion dot */}
                      {dotColor && (
                        <div title={status === "complete" ? "Complete" : status === "partial" ? "Incomplete" : "Not started"}
                          style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0, transition: "background .3s" }} />
                      )}
                      {/* Guest sign-in chip — shown inline in header when section is open */}
                      {open && !user && (
                        <button onClick={e => { e.stopPropagation(); signInWithGoogle(); }}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" as const }}>
                          <LogIn size={10} /> Sign in
                        </button>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text3)", display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▾</span>
                    </div>
                    {open && (
                      <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)", padding: "12px 12px 14px", maxHeight: 560, overflowY: "auto" }}>
                        {renderStepContent()}
                        {/* AI enhancement chips — shown for summary and work sections */}
                        {(s.key === "summary" || s.key === "work") && plan.tier === "pro" && (
                          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 9 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                              <Sparkles size={10} /> AI Enhance
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                              {s.key === "summary" && ([
                                { action: "summary_concise", label: "More concise" },
                                { action: "summary_metrics", label: "Add metrics" },
                                { action: "summary_jd",      label: "Stronger tone" },
                              ] as { action: string; label: string }[]).map(chip => (
                                <button key={chip.action}
                                  onClick={() => handleAiEnhance(chip.action, data.summary ?? "", v => set("summary", v))}
                                  disabled={!!aiLoading}
                                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: aiLoading ? "wait" : "pointer", background: aiLoading === chip.action ? "var(--accent)" : "var(--accdim)", color: aiLoading === chip.action ? "#fff" : "var(--accent)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", fontFamily: "inherit", transition: "all .15s" }}>
                                  {aiLoading === chip.action ? <Loader2 size={10} style={{ animation: "spin .7s linear infinite" }} /> : null}
                                  {chip.label}
                                </button>
                              ))}
                              {s.key === "work" && ([
                                { action: "bullet_impact", label: "Add impact numbers" },
                                { action: "bullet_verbs",  label: "Stronger verbs" },
                              ] as { action: string; label: string }[]).map(chip => {
                                const activeWork = data.work.find(w => w.company || w.role);
                                return (
                                  <button key={chip.action}
                                    onClick={() => activeWork && handleAiEnhance(chip.action, activeWork.desc ?? "", v => {
                                      const idx2 = data.work.indexOf(activeWork);
                                      const updated = data.work.map((w, i) => i === idx2 ? { ...w, desc: v } : w);
                                      set("work", updated);
                                    })}
                                    disabled={!!aiLoading}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: aiLoading ? "wait" : "pointer", background: aiLoading === chip.action ? "var(--accent)" : "var(--accdim)", color: aiLoading === chip.action ? "#fff" : "var(--accent)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", fontFamily: "inherit", transition: "all .15s" }}>
                                    {aiLoading === chip.action ? <Loader2 size={10} style={{ animation: "spin .7s linear infinite" }} /> : null}
                                    {chip.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Custom Sections accordion ─────────────────── */}
              <div style={{ margin: "0 10px 5px", borderWidth: 1.5, borderStyle: "solid", borderColor: activeSection === "__custom" ? "var(--accent)" : "var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: activeSection === "__custom" ? "0 0 0 3px var(--accdim)" : "none", transition: "border-color .15s, box-shadow .15s" }}>
                <div onClick={() => setActiveSection(activeSection === "__custom" ? null : "__custom")}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", cursor: "pointer", background: activeSection === "__custom" ? "var(--accdim)" : "var(--surface)", userSelect: "none" as const }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    ＋
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>Custom Sections</div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>
                      {(data.customSections ?? []).length > 0 ? `${data.customSections!.length} section${data.customSections!.length > 1 ? "s" : ""}` : "Volunteer, Publications, Patents…"}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text3)", display: "inline-block", transform: activeSection === "__custom" ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▾</span>
                </div>
                {activeSection === "__custom" && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)", padding: "12px 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>
                      Add any extra section — Volunteer Work, Publications, Patents, Speaking, etc.
                    </div>
                    {(data.customSections ?? []).map((cs, i) => (
                      <div key={cs.id} style={{ background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <input
                            value={cs.title}
                            onChange={e => set("customSections", (data.customSections ?? []).map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                            placeholder="Section title (e.g. Volunteer Work)"
                            style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "var(--text1)", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }}
                          />
                          <button onClick={() => set("customSections", (data.customSections ?? []).filter((_, j) => j !== i))}
                            style={{ background: "none", border: "none", color: "#fca5a5", fontSize: 18, cursor: "pointer", padding: "2px 4px" }}>×</button>
                        </div>
                        <textarea
                          spellCheck
                          value={cs.content}
                          onChange={e => set("customSections", (data.customSections ?? []).map((x, j) => j === i ? { ...x, content: e.target.value } : x))}
                          placeholder={"• Led weekly food drives serving 200+ families\n• Organised annual charity run raising ₹2L"}
                          rows={4}
                          style={{ padding: "8px 10px", borderRadius: 7, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical" as const, lineHeight: 1.55 }}
                          onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                          onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => set("customSections", [...(data.customSections ?? []), { id: uid(), title: "", content: "" }])}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 8, borderWidth: 1.5, borderStyle: "dashed", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      <Plus size={12} /> Add section
                    </button>
                    {/* Quick starters */}
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                      <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, alignSelf: "center" }}>Quick add:</span>
                      {["Volunteer Work", "Publications", "Patents", "Speaking", "Open Source"].map(label => (
                        <button key={label}
                          onClick={() => set("customSections", [...(data.customSections ?? []), { id: uid(), title: label, content: "" }])}
                          style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface)", color: "var(--text2)", transition: "all .12s" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset / Clear footer */}
              <div style={{ padding: "10px 10px 16px", display: "flex", gap: 6 }}>
                <button onClick={() => { if (confirm("Reset to sample data?")) { setData(SAMPLE); setActiveSection("profile"); setStep(0); } }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--text3)", background: "none", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontFamily: "inherit" }}>
                  <RotateCcw size={10} /> Reset
                </button>
                <button onClick={() => { if (confirm("Clear all content?")) { setData(BLANK); setActiveSection("profile"); setStep(0); } }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#dc2626", background: "none", borderWidth: 1, borderStyle: "solid", borderColor: "#fecaca", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontFamily: "inherit" }}>
                  Clear all
                </button>
              </div>
            </>)}
            </div>
          )}

          {/* ── COVER LETTER TAB ──────────────────────────────── */}
          {leftTab === "cover" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
              {/* Header */}
              <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text1)", marginBottom: 2 }}>Cover Letter</div>
                <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>
                  Personalise for each job application. Use AI to generate a strong draft from your resume.
                </div>
              </div>
              <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Metadata fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Hiring Manager</label>
                    <input value={coverLetter.to} onChange={e => setCoverLetter(cl => ({ ...cl, to: e.target.value }))}
                      placeholder="Jane Smith (optional)"
                      style={{ padding: "8px 10px", borderRadius: 7, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", outline: "none" }}
                      onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                      onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Company</label>
                    <input value={coverLetter.company} onChange={e => setCoverLetter(cl => ({ ...cl, company: e.target.value }))}
                      placeholder="Razorpay"
                      style={{ padding: "8px 10px", borderRadius: 7, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", outline: "none" }}
                      onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                      onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Job Title Applying For</label>
                  <input value={coverLetter.jobTitle} onChange={e => setCoverLetter(cl => ({ ...cl, jobTitle: e.target.value }))}
                    placeholder="Senior Software Engineer"
                    style={{ padding: "8px 10px", borderRadius: 7, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", outline: "none" }}
                    onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </div>

                {/* AI generate button */}
                <button onClick={handleCoverLetterGenerate} disabled={coverAiLoading}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: coverAiLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: coverAiLoading ? 0.7 : 1, transition: "opacity .2s" }}>
                  {coverAiLoading
                    ? <><Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> Generating…</>
                    : <><Sparkles size={14} /> Generate from my resume (AI)</>
                  }
                </button>
                {!plan.hasAiFeatures && (
                  <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center" as const, marginTop: -6 }}>
                    AI generation requires the Pro plan. <a href="/upgrade" style={{ color: "var(--accent)", fontWeight: 700 }}>Upgrade ↗</a>
                  </div>
                )}

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600 }}>or write manually</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                {/* Body textarea */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Letter Body</label>
                  <textarea
                    spellCheck
                    value={coverLetter.body}
                    onChange={e => setCoverLetter(cl => ({ ...cl, body: e.target.value }))}
                    rows={12}
                    placeholder={"Dear Hiring Manager,\n\nI am excited to apply for the [Role] position at [Company]…\n\nWith [X] years of experience in [field], I have…\n\nI would love the opportunity to discuss how my background can contribute to your team.\n\nBest regards,\n" + (data.name || "Your Name")}
                    style={{ padding: "10px 12px", borderRadius: 8, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--text1)", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical" as const, lineHeight: 1.6 }}
                    onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </div>

                {/* Closing line */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Closing</label>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                    {["Sincerely,", "Best regards,", "Warm regards,", "Yours truly,"].map(c => (
                      <button key={c} onClick={() => setCoverLetter(cl => ({ ...cl, closing: c }))}
                        style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", borderWidth: 1, borderStyle: "solid", borderColor: coverLetter.closing === c ? "var(--accent)" : "var(--border)", background: coverLetter.closing === c ? "var(--accdim)" : "var(--surface)", color: coverLetter.closing === c ? "var(--accent)" : "var(--text2)", transition: "all .12s" }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {coverLetter.body.trim() && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        const text = [
                          coverLetter.to ? `Dear ${coverLetter.to},` : "Dear Hiring Manager,",
                          "",
                          coverLetter.body,
                          "",
                          coverLetter.closing,
                          data.name || "",
                        ].join("\n");
                        navigator.clipboard?.writeText(text);
                      }}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface)", color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      <Link2 size={12} /> Copy text
                    </button>
                    <button
                      onClick={() => setCoverLetter(BLANK_COVER)}
                      style={{ padding: "9px 14px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--surface)", color: "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Clear
                    </button>
                  </div>
                )}

                {/* Tips */}
                <div style={{ padding: "10px 12px", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginBottom: 5 }}>✦ Cover letter tips</div>
                  {[
                    "Keep it under 350 words — recruiters skim quickly",
                    "Open with why this company specifically, not just the role",
                    "Include one concrete achievement with a number",
                    "Match the tone: formal for finance/law, conversational for startups",
                    "End with a clear call to action: request an interview",
                  ].map((t, i) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--text2)", marginTop: 4, lineHeight: 1.5 }}>✦ {t}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TEMPLATES TAB ─────────────────────────────────── */}
          {leftTab === "templates" && (() => {
            /* ── Smart recommendations based on job title / role ── */
            const roleHint = (data.work?.[0]?.role ?? data.summary ?? "").toLowerCase();
            const recMap: Record<string, string[]> = {
              engineering:  ["tech", "mono", "pacific", "zurich", "classic", "modern"],
              design:       ["creative", "canvas", "prism", "milano", "bold", "orbit"],
              finance:      ["slate", "stripe", "harvard", "geneva", "executive", "apex"],
              marketing:    ["horizon", "pacific", "modern", "crisp", "bold", "prism"],
              executive:    ["executive", "onyx", "harvard", "geneva", "apex", "classic"],
              research:     ["harvard", "vega", "ivy", "geneva", "classic", "mono"],
              writing:      ["folio", "paris", "milano", "minimal", "crisp", "timeline"],
              hr:           ["sage", "sydney", "crisp", "nordic", "modern", "minimal"],
              operations:   ["berlin", "metro", "compact", "classic", "stripe", "slate"],
              legal:        ["harvard", "ivy", "geneva", "classic", "vega", "minimal"],
              healthcare:   ["sage", "classic", "minimal", "ivy", "zurich", "crisp"],
              default:      ["classic", "minimal", "zurich", "sydney", "crisp", "compact"],
            };
            const bucket =
              /engineer|developer|devops|backend|frontend|fullstack|software|sre|qa|cloud|cyber|mobile|ios|android|ml\s|machine learn|ai engineer/i.test(roleHint) ? "engineering" :
              /design|ux|ui|creative|art\s*director|graphic|visual design/i.test(roleHint)        ? "design"      :
              /finance|accountant|chartered|ca\b|bank|invest|cfo|treasury|controller/i.test(roleHint) ? "finance" :
              /market|growth|brand|sales|seo|content writ|copywrite|bdr|sdr/i.test(roleHint)      ? "marketing"   :
              /ceo|cto|coo|director|vp\s|head of|executive|president|c-suite/i.test(roleHint)     ? "executive"   :
              /research|scientist|phd|professor|academic|lecturer|faculty/i.test(roleHint)        ? "research"    :
              /writ|journalist|editor|author|content|copywrite/i.test(roleHint)                   ? "writing"     :
              /hr\b|human resource|talent|recruit|people ops/i.test(roleHint)                     ? "hr"          :
              /operat|supply chain|logistics|procurement|scrum|project manag|programme/i.test(roleHint) ? "operations" :
              /legal|lawyer|attorney|compliance|counsel|regulatory/i.test(roleHint)               ? "legal"       :
              /nurse|doctor|physician|medical|health|clinical/i.test(roleHint)                    ? "healthcare"  :
                                                                                                    "default";
            const recommendedSet = new Set(recMap[bucket]);

            /* ── Template shapes for visual thumbnails ── */
            const SHAPES: Record<string, { layout: string; bars: number[]; hasPhoto?: boolean }> = {
              Classic:      { layout: "plain",    bars: [70, 48, 100, 82, 64] },
              Minimal:      { layout: "plain",    bars: [55, 35, 90,  75, 60] },
              Bold:         { layout: "bighead",  bars: [60, 40, 95,  80, 65] },
              Compact:      { layout: "dense",    bars: [65, 44, 100, 88, 72, 56] },
              Slate:        { layout: "leftbar",  bars: [70, 50, 90,  78, 62] },
              Crisp:        { layout: "plain",    bars: [68, 46, 95,  80, 64] },
              Modern:       { layout: "topband",  bars: [62, 42, 88,  74, 60] },
              Creative:     { layout: "asymm",    bars: [58, 38, 85,  70, 55] },
              "Sidebar Pro":{ layout: "sidebar",  bars: [80, 60, 100, 85, 70] },
              Executive:    { layout: "centered", bars: [50, 30, 90,  76, 58] },
              Tech:         { layout: "mono",     bars: [72, 50, 100, 84, 66] },
              Nordic:       { layout: "topband",  bars: [60, 40, 85,  70, 55] },
              Timeline:     { layout: "timeline", bars: [65, 44, 88,  74, 60] },
              Horizon:      { layout: "bighead",  bars: [60, 42, 90,  76, 62] },
              Orbit:        { layout: "asymm",    bars: [56, 36, 82,  68, 54] },
              Apex:         { layout: "centered", bars: [52, 32, 88,  72, 56] },
              Canvas:       { layout: "asymm",    bars: [54, 34, 80,  66, 52] },
              Luxe:         { layout: "bighead",  bars: [62, 44, 88,  74, 60] },
              Vega:         { layout: "plain",    bars: [66, 46, 92,  78, 62] },
              Folio:        { layout: "sidebar",  bars: [70, 50, 88,  74, 58] },
              Stripe:       { layout: "leftbar",  bars: [68, 48, 95,  80, 64] },
              Mono:         { layout: "mono",     bars: [70, 50, 98,  82, 66] },
              Prism:        { layout: "topband",  bars: [58, 38, 84,  70, 56] },
              Ivy:          { layout: "plain",    bars: [64, 44, 90,  76, 60] },
              Onyx:         { layout: "centered", bars: [54, 34, 86,  70, 54] },
              Zurich:       { layout: "leftbar",  bars: [72, 52, 96,  80, 64] },
              Berlin:       { layout: "bighead",  bars: [64, 44, 92,  76, 60] },
              Paris:        { layout: "centered", bars: [58, 38, 88,  72, 56] },
              Harvard:      { layout: "centered", bars: [60, 40, 90,  74, 58] },
              Geneva:       { layout: "plain",    bars: [68, 48, 94,  78, 62] },
              Pacific:      { layout: "topband",  bars: [62, 42, 88,  74, 58] },
              Milano:       { layout: "plain",    bars: [66, 46, 92,  76, 60] },
              Sydney:       { layout: "bighead",  bars: [64, 44, 90,  76, 62] },
              Metro:        { layout: "bighead",  bars: [66, 46, 96,  80, 64] },
              Sage:         { layout: "plain",    bars: [64, 44, 90,  74, 58] },
            };

            const accent = styleColor || "var(--accent)";

            function MiniPreview({ t, active }: { t: string; active: boolean }) {
              const shape = SHAPES[t] ?? SHAPES.Classic;
              const bg    = active ? "var(--accdim)" : "var(--surface2)";
              const line  = active ? accent : "var(--border)";
              const head  = active ? accent : "var(--text1)";

              if (shape.layout === "sidebar") return (
                <div style={{ display: "flex", height: "100%", gap: 0 }}>
                  <div style={{ width: "32%", background: active ? `${accent}33` : "var(--surface)", borderRight: `2px solid ${accent}`, display: "flex", flexDirection: "column", gap: 3, padding: "6px 4px" }}>
                    <div style={{ height: 7, borderRadius: 99, background: accent, opacity: .8 }} />
                    <div style={{ height: 3, borderRadius: 99, background: line, width: "80%" }} />
                    <div style={{ height: 3, borderRadius: 99, background: line, width: "60%" }} />
                    <div style={{ height: 3, borderRadius: 99, background: line, width: "70%" }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: "6px 6px" }}>
                    <div style={{ height: 7, borderRadius: 2, background: head, width: "65%", opacity: .85 }} />
                    <div style={{ height: 3, borderRadius: 2, background: line, width: "90%" }} />
                    <div style={{ height: 3, borderRadius: 2, background: line, width: "75%" }} />
                    <div style={{ height: 3, borderRadius: 2, background: line, width: "80%" }} />
                  </div>
                </div>
              );
              if (shape.layout === "bighead") return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <div style={{ height: "36%", background: `linear-gradient(135deg, ${accent}cc, ${accent}66)`, display: "flex", alignItems: "center", padding: "0 8px", gap: 5 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 6, borderRadius: 2, background: "rgba(255,255,255,.85)", width: "60%" }} />
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,.5)", width: "40%", marginTop: 3 }} />
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: "5px 8px" }}>
                    {shape.bars.slice(0, 4).map((w, i) => (
                      <div key={i} style={{ height: 3, borderRadius: 2, background: line, width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              );
              if (shape.layout === "leftbar") return (
                <div style={{ display: "flex", height: "100%", padding: "6px 8px", gap: 6 }}>
                  <div style={{ width: 3, borderRadius: 99, background: accent, flexShrink: 0, alignSelf: "stretch" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ height: 7, borderRadius: 2, background: head, width: "60%", opacity: .85 }} />
                    <div style={{ height: 3, borderRadius: 2, background: accent, width: "40%", opacity: .7 }} />
                    {shape.bars.slice(2).map((w, i) => (
                      <div key={i} style={{ height: 3, borderRadius: 2, background: line, width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              );
              if (shape.layout === "topband") return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <div style={{ height: 5, background: accent }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: "5px 8px" }}>
                    <div style={{ height: 7, borderRadius: 2, background: head, width: "60%", opacity: .85 }} />
                    <div style={{ height: 3, borderRadius: 2, background: accent, width: "38%", opacity: .7 }} />
                    {shape.bars.slice(2).map((w, i) => (
                      <div key={i} style={{ height: 3, borderRadius: 2, background: line, width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              );
              if (shape.layout === "centered") return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", padding: "6px 8px", gap: 3 }}>
                  <div style={{ height: 7, borderRadius: 2, background: head, width: "55%", opacity: .85 }} />
                  <div style={{ height: 2, borderRadius: 2, background: accent, width: "30%", opacity: .7 }} />
                  <div style={{ width: "90%", height: 1, background: "var(--border)", margin: "3px 0" }} />
                  {shape.bars.slice(2).map((w, i) => (
                    <div key={i} style={{ height: 3, borderRadius: 2, background: line, width: `${w}%` }} />
                  ))}
                </div>
              );
              if (shape.layout === "mono") return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "5px 7px", gap: 2 }}>
                  <div style={{ height: 6, borderRadius: 1, background: head, width: "70%", opacity: .9, fontFamily: "monospace" }} />
                  <div style={{ height: 1, background: accent, marginBottom: 2 }} />
                  {shape.bars.map((w, i) => (
                    <div key={i} style={{ height: 3, borderRadius: 1, background: i % 2 === 0 ? line : `${accent}55`, width: `${w}%` }} />
                  ))}
                </div>
              );
              if (shape.layout === "timeline") return (
                <div style={{ display: "flex", height: "100%", padding: "6px 8px", gap: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0, paddingTop: 2 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent }} />
                    <div style={{ width: 1, flex: 1, background: `${accent}55` }} />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent, opacity: .6 }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ height: 7, borderRadius: 2, background: head, width: "60%", opacity: .85 }} />
                    <div style={{ height: 3, borderRadius: 2, background: accent, width: "38%", opacity: .7 }} />
                    {shape.bars.slice(2).map((w, i) => (
                      <div key={i} style={{ height: 3, borderRadius: 2, background: line, width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              );
              if (shape.layout === "asymm") return (
                <div style={{ display: "flex", height: "100%", padding: "6px 8px", gap: 5 }}>
                  <div style={{ width: "42%", display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ height: 7, borderRadius: 2, background: head, opacity: .85 }} />
                    <div style={{ height: 3, borderRadius: 2, background: accent, width: "80%", opacity: .7 }} />
                    <div style={{ height: 3, borderRadius: 2, background: line, width: "100%" }} />
                    <div style={{ height: 3, borderRadius: 2, background: line, width: "85%" }} />
                  </div>
                  <div style={{ flex: 1, background: active ? `${accent}22` : "var(--surface)", borderRadius: 4, display: "flex", flexDirection: "column", gap: 3, padding: "4px 5px" }}>
                    {shape.bars.slice(2).map((w, i) => (
                      <div key={i} style={{ height: 3, borderRadius: 2, background: line, width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              );
              if (shape.layout === "dense") return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "5px 8px", gap: 2 }}>
                  <div style={{ height: 6, borderRadius: 2, background: head, width: "60%", opacity: .85 }} />
                  <div style={{ height: 2, borderRadius: 2, background: accent, width: "35%", opacity: .7, marginBottom: 2 }} />
                  {shape.bars.map((w, i) => (
                    <div key={i} style={{ height: 2.5, borderRadius: 2, background: line, width: `${w}%` }} />
                  ))}
                </div>
              );
              /* plain / default */
              return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "6px 8px", gap: 3 }}>
                  <div style={{ height: 7, borderRadius: 2, background: head, width: "60%", opacity: .85 }} />
                  <div style={{ height: 3, borderRadius: 2, background: accent, width: "38%", opacity: .7 }} />
                  {shape.bars.slice(2).map((w, i) => (
                    <div key={i} style={{ height: 3, borderRadius: 2, background: line, width: `${w}%` }} />
                  ))}
                </div>
              );
            }

            const allFiltered = ALL_TEMPLATES.filter(t => {
              if (tplFilter === "free")    return BASIC_TEMPLATES.includes(t);
              if (tplFilter === "premium") return PREMIUM_TEMPLATES.includes(t);
              if (tplFilter === "foryou")  return recommendedSet.has(t.toLowerCase());
              return true;
            });
            const sorted = tplSort === "ats"
              ? [...allFiltered].sort((a, b) => (TEMPLATE_META[b]?.ats ?? 80) - (TEMPLATE_META[a]?.ats ?? 80))
              : allFiltered;

            return (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 0" }}>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>
                    <b style={{ color: "var(--text1)" }}>{sorted.length}</b> templates
                  </span>
                  <button
                    onClick={() => setTplSort(s => s === "ats" ? "default" : "ats")}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: tplSort === "ats" ? "var(--accent)" : "var(--text3)", background: tplSort === "ats" ? "var(--accdim)" : "none", borderWidth: 1, borderStyle: "solid", borderColor: tplSort === "ats" ? "var(--accborder)" : "transparent", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                    {tplSort === "ats" ? "↓ ATS score" : "Sort by ATS"}
                  </button>
                </div>

                {/* Filter chips */}
                <div style={{ display: "flex", gap: 4, padding: "8px 12px 10px", flexWrap: "wrap" as const }}>
                  {([
                    { id: "all",     label: "All" },
                    { id: "foryou",  label: "⭐ For You" },
                    { id: "free",    label: "Free" },
                    { id: "premium", label: "Premium" },
                  ] as { id: typeof tplFilter; label: string }[]).map(f => (
                    <button key={f.id} onClick={() => setTplFilter(f.id)}
                      style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", borderWidth: 1, borderStyle: "solid", borderColor: tplFilter === f.id ? "var(--accent)" : "var(--border)", background: tplFilter === f.id ? "var(--accdim)" : "var(--surface)", color: tplFilter === f.id ? "var(--accent)" : "var(--text2)", transition: "all .15s", whiteSpace: "nowrap" as const }}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Currently active banner */}
                <div style={{ margin: "0 12px 10px", padding: "8px 12px", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" as const, letterSpacing: ".4px" }}>Active template</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text1)", marginTop: 1 }}>{template}</div>
                  </div>
                  <div style={{ textAlign: "right" as const }}>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>ATS score</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: (TEMPLATE_META[template]?.ats ?? 80) >= 90 ? "#16a34a" : (TEMPLATE_META[template]?.ats ?? 80) >= 82 ? "#d97706" : "#dc2626" }}>
                      {TEMPLATE_META[template]?.ats ?? "—"}%
                    </div>
                  </div>
                </div>

                {/* Template grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 12px 16px" }}>
                  {sorted.map(t => {
                    const meta      = TEMPLATE_META[t] ?? { bestFor: "", ats: 80 };
                    const hasAccess = availableTemplates.includes(t);
                    const active    = template === t;
                    const hover     = tplHover === t;
                    const isRec     = recommendedSet.has(t.toLowerCase());
                    const atsColor  = meta.ats >= 90 ? "#16a34a" : meta.ats >= 82 ? "#d97706" : "#dc2626";
                    return (
                      <div key={t}
                        onClick={() => setTemplate(t)}
                        onMouseEnter={() => setTplHover(t)}
                        onMouseLeave={() => setTplHover(null)}
                        style={{ border: `2px solid ${active ? "var(--accent)" : hover ? "var(--text2)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", position: "relative" as const, transition: "border-color .15s, transform .15s, box-shadow .15s", transform: hover && !active ? "translateY(-1px)" : "none", boxShadow: active ? `0 0 0 3px ${styleColor || "var(--accent)"}33` : hover ? "0 4px 12px rgba(0,0,0,.15)" : "none" }}>

                        {/* Mini preview thumbnail */}
                        <div style={{ height: 88, background: active ? "var(--accdim)" : "var(--surface2)", position: "relative" as const, overflow: "hidden" }}>
                          <MiniPreview t={t} active={active} />
                          {/* Recommended badge */}
                          {isRec && (
                            <div style={{ position: "absolute" as const, top: 5, left: 5, background: "#fbbf24", color: "#78350f", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, letterSpacing: ".3px" }}>
                              ⭐ FOR YOU
                            </div>
                          )}
                          {/* Premium badge (no blur — all users can preview) */}
                          {!hasAccess && (
                            <div style={{ position: "absolute" as const, bottom: 5, right: 5, display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,.55)", borderRadius: 5, padding: "2px 6px" }}>
                              <Lock size={9} color="#fbbf24" />
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#fbbf24", letterSpacing: ".3px" }}>PRO</span>
                            </div>
                          )}
                          {/* Active checkmark */}
                          {active && (
                            <div style={{ position: "absolute" as const, top: 5, right: 5, width: 18, height: 18, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}>
                              <Check size={10} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "6px 8px 7px", background: active ? "var(--accdim)" : "var(--surface)", borderTop: `1px solid ${active ? "var(--accborder)" : "var(--border)"}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: active ? "var(--accent)" : "var(--text1)" }}>{t}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, background: `${atsColor}22`, color: atsColor, borderRadius: 4, padding: "1px 5px" }}>{meta.ats}%</span>
                          </div>
                          <div style={{ fontSize: 10, color: active ? "var(--accent)" : "var(--text3)", opacity: active ? .8 : 1 }}>
                            {meta.bestFor}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── ORDER TAB ─────────────────────────────────────── */}
          {leftTab === "order" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
              <div style={{ padding: "0 12px 8px", fontSize: 11, color: "var(--text2)" }}>Drag to reorder · Toggle to show/hide optional sections.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "0 10px" }}>
                {(customOrder ?? [...MODE_STEP_ORDER[mode]]).map((idx, pos) => {
                  const s       = MAIN_STEPS[idx];
                  const done    = isDone(s.key, data);
                  const canHide = idx >= 5;
                  const hidden  = hiddenSections.has(s.key);
                  const ICONS: Record<string, string> = { profile: "📇", summary: "📝", work: "💼", edu: "🎓", skills: "⚡", projects: "🚀", certifications: "🏆", languages: "🌐", awards: "🥇", interests: "🎯", references: "👤" };
                  const isDragOver = dragOverIdx === pos;
                  return (
                    <div key={s.key}
                      draggable
                      onDragStart={() => onDragStart(pos)}
                      onDragOver={e => onDragOver(e, pos)}
                      onDrop={e => onDrop(e, pos)}
                      onDragEnd={onDragEnd}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                        background: isDragOver ? "var(--accdim)" : (hidden ? "var(--surface2)" : "var(--surface)"),
                        borderWidth: 1, borderStyle: "solid",
                        borderColor: isDragOver ? "var(--accent)" : "var(--border)",
                        borderRadius: 9, opacity: hidden ? 0.5 : 1,
                        transition: "background .12s, border-color .12s, opacity .15s",
                        cursor: "grab" }}>
                      <GripVertical size={13} style={{ color: "var(--text3)", flexShrink: 0, cursor: "grab" }} />
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{ICONS[s.key] ?? "📄"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text1)" }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>{hidden ? "Hidden from resume" : s.subtitle}</div>
                      </div>
                      {done && !hidden && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✓</span>}
                      {canHide && (
                        <button onClick={e => { e.stopPropagation(); toggleSectionVisibility(s.key); }} title={hidden ? "Show" : "Hide"}
                          style={{ display: "flex", alignItems: "center", padding: "3px 5px", borderRadius: 5, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: hidden ? "var(--accdim)" : "var(--surface2)", color: hidden ? "var(--accent)" : "var(--text3)", cursor: "pointer" }}>
                          {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {customOrder && (
                <div style={{ padding: "10px 10px 0" }}>
                  <button onClick={() => setCustomOrder(null)}
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", background: "none", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                    ↺ Reset to {mode} default
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── JD MATCH TAB ──────────────────────────────────── */}
          {leftTab === "jd" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 6 }}>Paste job description</div>
              <textarea
                spellCheck={false}
                value={jdText}
                onChange={e => { setJdText(e.target.value); if (!e.target.value.trim()) setJdResult(null); }}
                placeholder="Paste a job description — we'll show which keywords match and which are missing..."
                rows={5}
                style={{ width: "100%", padding: "9px 11px", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", color: "var(--text1)", background: "var(--bg)", outline: "none", resize: "vertical" as const }}
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
              />
              <button
                onClick={() => { if (jdText.trim()) setJdResult(matchJd(resumeToText(data), jdText)); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 8, padding: "9px", borderRadius: 8, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Target size={13} /> Analyse match
              </button>
              {jdResult && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Score gauge */}
                  <div style={{ textAlign: "center" as const, padding: "16px 12px", background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 10 }}>
                    <div style={{ fontSize: 40, fontWeight: 900, color: jdResult.score >= 75 ? "#16a34a" : jdResult.score >= 50 ? "#d97706" : "#dc2626", lineHeight: 1 }}>{jdResult.score}%</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>JD match score</div>
                    <div style={{ height: 5, borderRadius: 99, background: "var(--surface2)", overflow: "hidden", margin: "10px 0 0" }}>
                      <div style={{ height: "100%", width: `${jdResult.score}%`, borderRadius: 99, background: jdResult.score >= 75 ? "#16a34a" : jdResult.score >= 50 ? "#d97706" : "#dc2626", transition: "width .4s" }} />
                    </div>
                  </div>
                  {/* Keyword groups */}
                  {jdResult.groups.map(g => (
                    <div key={g.category}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".5px", color: "var(--text3)", marginBottom: 5 }}>{g.category}</div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                        {g.found.map(kw   => <span key={kw} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "#dcfce7", color: "#16a34a" }}>✓ {kw}</span>)}
                        {g.missing.map(kw => <span key={kw} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "#fee2e2", color: "#dc2626" }}>✕ {kw}</span>)}
                      </div>
                    </div>
                  ))}
                  {jdResult.missing.length > 0 && (
                    <div style={{ padding: "10px 12px", background: "var(--accdim)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 8, fontSize: 11, color: "var(--accent)", lineHeight: 1.6 }}>
                      💡 Add missing keywords to your Skills or Summary to improve your score.
                    </div>
                  )}
                </div>
              )}

              {/* ── AI Tailor ───────────────────────────────── */}
              {jdText.trim() && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {plan.tier !== "pro" ? (
                    <button
                      onClick={() => window.open("/upgrade", "_blank")}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #d97706, #b45309)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <Lock size={12} /> Unlock AI Tailor (Gold)
                    </button>
                  ) : (
                    <button
                      onClick={handleTailorToJd}
                      disabled={tailorLoading}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: tailorLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: tailorLoading ? 0.7 : 1, transition: "opacity .2s" }}>
                      {tailorLoading
                        ? <><Loader2 size={12} style={{ animation: "spin .7s linear infinite" }} /> Tailoring…</>
                        : <><Sparkles size={12} /> ✦ AI Tailor my resume</>}
                    </button>
                  )}

                  {tailorResult && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Rewritten summary */}
                      <div style={{ background: "var(--bg)", borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--accborder)", borderRadius: 10, padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>AI summary</div>
                          <button
                            onClick={() => { set("summary", tailorResult.summary); setTailorResult(null); }}
                            style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                            Apply →
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text1)", lineHeight: 1.6 }}>{tailorResult.summary}</div>
                      </div>

                      {/* Missing skills */}
                      {tailorResult.missingSkills.length > 0 && (
                        <div style={{ background: "var(--bg)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 10, padding: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Skills to add</div>
                            <button
                              onClick={() => {
                                const current = data.skills ? data.skills.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [];
                                const toAdd = tailorResult.missingSkills.filter(s => !current.map(c => c.toLowerCase()).includes(s.toLowerCase()));
                                set("skills", [...current, ...toAdd].join(", "));
                                setTailorResult(r => r ? { ...r, missingSkills: [] } : r);
                              }}
                              style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "none", background: "var(--surface2)", color: "var(--text1)", cursor: "pointer", fontFamily: "inherit" }}>
                              Add all
                            </button>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                            {tailorResult.missingSkills.map(skill => (
                              <button key={skill}
                                onClick={() => {
                                  const current = data.skills ? data.skills.split(/,\s*/).map(s => s.trim()).filter(Boolean) : [];
                                  if (!current.map(c => c.toLowerCase()).includes(skill.toLowerCase())) {
                                    set("skills", [...current, skill].join(", "));
                                  }
                                  setTailorResult(r => r ? { ...r, missingSkills: r.missingSkills.filter(s => s !== skill) } : r);
                                }}
                                style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "var(--accdim)", color: "var(--accent)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--accborder)", cursor: "pointer", fontFamily: "inherit" }}>
                                + {skill}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>{/* end left panel */}

        {/* ══ RIGHT PANEL: preview ════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Preview toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap" as const, rowGap: 6 }}>
            {/* Colour swatches */}
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px", flexShrink: 0 }}>Color</span>
            {COLOR_PRESETS.map(c => {
              const active = (styleColor || DEFAULT_COLOR) === c.value;
              return (
                <button key={c.value} onClick={() => setStyleColor(c.value === DEFAULT_COLOR ? "" : c.value)} title={c.label}
                  style={{ width: 17, height: 17, borderRadius: "50%", background: c.value, cursor: "pointer", flexShrink: 0, borderWidth: active ? 2 : 1.5, borderStyle: "solid", borderColor: active ? "#fff" : "transparent", boxShadow: active ? `0 0 0 2px ${c.value}` : "none", transition: "box-shadow .15s, border-color .15s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {active && <Check size={9} color="#fff" strokeWidth={3} />}
                </button>
              );
            })}
            {/* Custom hex picker */}
            <label title="Custom colour" style={{ position: "relative" as const, flexShrink: 0, cursor: "pointer" }}>
              <input type="color" value={styleColor || DEFAULT_COLOR} onChange={e => setStyleColor(e.target.value)}
                style={{ opacity: 0, position: "absolute" as const, inset: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }} />
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: "50%", cursor: "pointer", background: styleColor && !COLOR_PRESETS.some(c => c.value === styleColor) ? styleColor : "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", borderWidth: 1.5, borderStyle: "solid", borderColor: styleColor && !COLOR_PRESETS.some(c => c.value === styleColor) ? "#fff" : "var(--border)", fontSize: 9 }}>
                {(!styleColor || COLOR_PRESETS.some(c => c.value === styleColor)) && <Palette size={8} style={{ color: "var(--text2)" }} />}
              </span>
            </label>

            <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0, marginLeft: 2 }} />

            {/* Font picker */}
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px", flexShrink: 0 }}>Font</span>
            <div style={{ position: "relative" as const, flexShrink: 0 }}>
              {/* Trigger button */}
              <button
                onClick={() => setFontPickerOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderWidth: 1, borderStyle: "solid", borderColor: fontPickerOpen ? "var(--accent)" : "var(--border)", borderRadius: 6, background: fontPickerOpen ? "var(--accdim)" : "var(--surface)", cursor: "pointer", fontFamily: "inherit", minWidth: 0 }}>
                <span style={{ fontFamily: styleFont, fontSize: 13, fontWeight: 700, color: "var(--accent)", lineHeight: 1, flexShrink: 0 }}>Aa</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text1)", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {FONT_OPTIONS.find(f => f.family === styleFont)?.label ?? "Inter"}
                </span>
                <span style={{ fontSize: 9, color: "var(--text3)", flexShrink: 0 }}>▾</span>
              </button>
              {/* Dropdown */}
              {fontPickerOpen && (
                <div
                  onMouseLeave={() => setFontPickerOpen(false)}
                  style={{ position: "absolute" as const, top: "calc(100% + 4px)", left: 0, zIndex: 999, background: "var(--surface)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.18)", padding: "6px", minWidth: 160, display: "flex", flexDirection: "column" as const, gap: 1 }}>
                  {FONT_OPTIONS.map(f => {
                    const active = f.family === styleFont;
                    return (
                      <button key={f.label}
                        onClick={() => { setStyleFont(f.family); setFontPickerOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px", borderRadius: 7, border: "none", background: active ? "var(--accdim)" : "none", cursor: "pointer", width: "100%", textAlign: "left" as const, fontFamily: "inherit" }}>
                        <span style={{ fontFamily: f.family, fontSize: 15, fontWeight: 700, color: active ? "var(--accent)" : "var(--text1)", minWidth: 24, lineHeight: 1 }}>Aa</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "var(--accent)" : "var(--text1)", fontFamily: f.family }}>{f.label}</div>
                          <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".4px" }}>{f.group}</div>
                        </div>
                        {active && <Check size={11} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Density control */}
            <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0, marginLeft: 2 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: ".5px", flexShrink: 0 }}>Spacing</span>
            <div style={{ display: "flex", gap: 0, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
              {(["compact", "normal", "spacious"] as const).map(d => (
                <button key={d} onClick={() => setDensity(d)} title={d.charAt(0).toUpperCase() + d.slice(1)}
                  style={{ padding: "3px 7px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none", background: density === d ? "var(--text1)" : "var(--surface2)", color: density === d ? "var(--bg)" : "var(--text3)", transition: "background .12s, color .12s" }}>
                  {d === "compact" ? "C" : d === "normal" ? "N" : "S"}
                </button>
              ))}
            </div>

            {/* Zoom — pushed to right */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3 }}>
              <button onClick={() => setPreviewScale(s => Math.max(0.35, +(s - 0.08).toFixed(2)))}
                style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 5, background: "var(--surface2)", cursor: "pointer", fontSize: 14, color: "var(--text2)", fontFamily: "inherit" }}>−</button>
              <span style={{ fontSize: 11, color: "var(--text2)", minWidth: 38, textAlign: "center" as const }}>{Math.round(previewScale * 100)}%</span>
              <button onClick={() => setPreviewScale(s => Math.min(1.3, +(s + 0.08).toFixed(2)))}
                style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 5, background: "var(--surface2)", cursor: "pointer", fontSize: 14, color: "var(--text2)", fontFamily: "inherit" }}>+</button>
            </div>
          </div>

          {/* Preview area */}
          <div style={{ flex: 1, overflow: "auto", background: "#9ca3af", padding: "20px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Premium preview banner */}
            {isPremiumLocked && (
              <div style={{ width: "100%", maxWidth: 600, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 14px", background: "linear-gradient(135deg, #1a1a2e, #2d1b69)", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Lock size={13} color="#fbbf24" />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>You&apos;re previewing <span style={{ color: "#fbbf24" }}>{template}</span></div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>Upgrade to export with this template</div>
                  </div>
                </div>
                <a href="/upgrade" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, background: "#fbbf24", color: "#78350f", fontSize: 11, fontWeight: 800, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" as const }}>
                  Upgrade ↗
                </a>
              </div>
            )}

            {/* Page badge + autosave pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span title={pageCount > 1 ? "Recruiters prefer 1-page resumes" : "Fits on 1 page"}
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, borderWidth: 1, borderStyle: "solid", borderColor: pageCount > 1 ? "#fbbf24" : "rgba(255,255,255,.3)", background: pageCount > 1 ? "#fffbeb" : "rgba(0,0,0,.2)", color: pageCount > 1 ? "#b45309" : "rgba(255,255,255,.8)" }}>
                {pageCount === 1 ? "✓ 1 page" : `~${pageCount} pages`}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.7)", opacity: autoSaved ? 1 : 0, transition: "opacity .3s", pointerEvents: "none" as const }}>
                ✓ Autosaved
              </span>
            </div>

            {/* Paper */}
            <div style={{ transformOrigin: "top center", transform: `scale(${previewScale})`, marginBottom: `calc((${previewScale} - 1) * 1123px)` }}>
              <div ref={previewRef}>
                <ResumePreview
                  data={data}
                  template={template}
                  font={styleFont !== FONT_OPTIONS[0].family ? styleFont : undefined}
                  color={styleColor || undefined}
                  photoShape={photoShape}
                  sectionOrder={filteredIndices}
                  density={density}
                />
              </div>
            </div>

            {/* Guest download gate */}
            {!user && (
              <div style={{ position: "sticky", bottom: 0, width: "100%", background: "linear-gradient(to top, #9ca3af 55%, transparent)", padding: "28px 0 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, pointerEvents: "none" as const }}>
                <div style={{ pointerEvents: "auto" as const, padding: "16px 24px", background: "var(--surface)", borderRadius: 14, borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,.3)", textAlign: "center" as const, maxWidth: 320 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text1)", marginBottom: 4 }}>Sign in to download</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>Your resume is ready. Create a free account to export as PDF or DOCX.</div>
                  <button onClick={() => signInWithGoogle()}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: "none", background: "var(--text1)", color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" }}>
                    <LogIn size={14} /> Sign in free — keep your resume
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>{/* end right panel */}

      </div>

      {/* Print styles */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          body > div { height: auto !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Inline style helpers ────────────────────────────────── */
const styles = {
  stepLabel: {
    fontSize: 10, fontWeight: 700, color: "var(--text3)",
    textTransform: "uppercase" as const, letterSpacing: ".7px", marginBottom: 4,
  },
  stepTitle: {
    fontSize: 22, fontWeight: 900, color: "var(--text1)", letterSpacing: "-.5px", lineHeight: 1.2,
  },
  stepSub: {
    fontSize: 13, color: "var(--text3)", marginTop: 5, lineHeight: 1.6, maxWidth: 380,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 700, color: "var(--text3)",
    textTransform: "uppercase" as const, letterSpacing: ".5px",
  },
};
