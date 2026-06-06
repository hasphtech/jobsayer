/**
 * Static job pool — India tech market.
 * Seeded with 45+ jobs across 20+ companies.
 *
 * ADDING REAL JOBS:
 *  Option A — Admin panel:    Navigate to /admin (requires admin Supabase role).
 *             Use the "Add Job" form to post manually. Jobs are stored in Supabase
 *             jobs table and fetched by /api/jobs. The static pool below is the
 *             fallback when DB is empty or unavailable.
 *
 *  Option B — Job API:        Set ADZUNA_APP_ID + ADZUNA_APP_KEY in .env.local and
 *             hit /api/jobs/import?q=software+engineer&country=in to pull live
 *             listings from Adzuna (free tier: 1000 calls/day).
 *             Free alternatives: Jooble API, RemoteOK API, The Muse API.
 *
 *  Option C — Recruiter portal: When real recruiters sign up via /recruit and post
 *             roles through /employer-dashboard?tab=pipeline, jobs auto-appear here.
 */

export type JdTrust = "high" | "medium" | "low";
export type WorkMode = "remote" | "hybrid" | "onsite";

export interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  mode: WorkMode;
  exp: string;
  salary: string;
  skills: string[];
  postedDays: number;
  applicants: number;
  trust: JdTrust;
  verified: boolean;
  ghost: boolean;
  avgResponseDays: number;
  replyRate: number;
  jdText: string;
  applyUrl?: string;
}

const JOBS: Job[] = [
  /* ── FinTech ──────────────────────────────────────────────────── */
  {
    id: "rp-sde2",
    title: "Senior Full Stack Engineer",
    company: "Razorpay",   logo: "🦓", location: "Bangalore",   mode: "hybrid",
    exp: "3–5 yrs",        salary: "₹18–26 LPA",
    skills: ["react", "node.js", "postgresql", "typescript", "docker", "aws"],
    postedDays: 0, applicants: 12, trust: "high", verified: true, ghost: false,
    avgResponseDays: 2, replyRate: 78,
    jdText: "Senior Full Stack Engineer at Razorpay. Strong React and Node.js skills with PostgreSQL, TypeScript, Docker and AWS. System design knowledge required.",
  },
  {
    id: "rp-ds",
    title: "Data Scientist · Risk & Fraud",
    company: "Razorpay",   logo: "🦓", location: "Bangalore",   mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹20–30 LPA",
    skills: ["python", "machine learning", "sql", "spark", "pandas", "scikit-learn"],
    postedDays: 3, applicants: 38, trust: "high", verified: true, ghost: false,
    avgResponseDays: 3, replyRate: 70,
    jdText: "Data Scientist for Razorpay's fraud detection team. Python, ML models, SQL, Spark, Pandas, scikit-learn. Experience with risk/fraud a bonus.",
  },
  {
    id: "ph-sde",
    title: "Software Engineer · Full Stack",
    company: "PhonePe",    logo: "📱", location: "Bangalore",   mode: "onsite",
    exp: "2–4 yrs",        salary: "₹20–28 LPA",
    skills: ["java", "react", "postgresql", "aws", "docker", "microservices"],
    postedDays: 4, applicants: 67, trust: "high", verified: true, ghost: false,
    avgResponseDays: 3, replyRate: 72,
    jdText: "PhonePe Full Stack Software Engineer. Java, React, PostgreSQL, AWS, Docker, microservices architecture. Payments domain knowledge is a plus.",
  },
  {
    id: "ph-pm",
    title: "Product Manager · Payments",
    company: "PhonePe",    logo: "📱", location: "Bangalore",   mode: "hybrid",
    exp: "3–6 yrs",        salary: "₹25–40 LPA",
    skills: ["product management", "analytics", "sql", "agile", "user research"],
    postedDays: 5, applicants: 51, trust: "high", verified: true, ghost: false,
    avgResponseDays: 4, replyRate: 65,
    jdText: "Product Manager for PhonePe payments. 3+ years PM experience, strong analytical skills, SQL, Agile methodology and user research experience required.",
  },
  {
    id: "cred-fe",
    title: "Senior Frontend Developer",
    company: "CRED",       logo: "💳", location: "Bangalore",   mode: "hybrid",
    exp: "3–6 yrs",        salary: "₹25–35 LPA",
    skills: ["react", "typescript", "next.js", "graphql", "webpack"],
    postedDays: 5, applicants: 89, trust: "high", verified: true, ghost: false,
    avgResponseDays: 6, replyRate: 55,
    jdText: "CRED Senior Frontend Developer. React, TypeScript, Next.js, GraphQL and Webpack required. Strong eye for design and performance optimization.",
  },
  {
    id: "gw-fsd",
    title: "Full Stack Developer",
    company: "Groww",      logo: "🚀", location: "Bangalore",   mode: "remote",
    exp: "2–5 yrs",        salary: "₹15–20 LPA",
    skills: ["react", "typescript", "graphql", "redis", "aws"],
    postedDays: 3, applicants: 94, trust: "medium", verified: false, ghost: false,
    avgResponseDays: 5, replyRate: 50,
    jdText: "Groww Full Stack Developer — React, TypeScript, GraphQL, Redis and AWS. Remote-first role, FinTech background preferred.",
  },
  {
    id: "gw-sre",
    title: "Site Reliability Engineer",
    company: "Groww",      logo: "🚀", location: "Bangalore",   mode: "remote",
    exp: "3–5 yrs",        salary: "₹22–32 LPA",
    skills: ["kubernetes", "docker", "aws", "terraform", "python", "linux"],
    postedDays: 7, applicants: 29, trust: "high", verified: false, ghost: false,
    avgResponseDays: 4, replyRate: 60,
    jdText: "Groww SRE role. Kubernetes, Docker, AWS, Terraform, Python and Linux required. On-call rotation, incident management experience needed.",
  },
  {
    id: "juspay-sde",
    title: "Software Engineer · Payments",
    company: "Juspay",     logo: "💸", location: "Bangalore",   mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹18–26 LPA",
    skills: ["java", "postgresql", "rest api", "microservices", "docker", "aws"],
    postedDays: 6, applicants: 44, trust: "high", verified: true, ghost: false,
    avgResponseDays: 5, replyRate: 62,
    jdText: "Juspay payments infrastructure engineer. Java, PostgreSQL, REST APIs, microservices, Docker and AWS required.",
  },

  /* ── E-Commerce & Q-Commerce ──────────────────────────────────── */
  {
    id: "fk-sde2",
    title: "SDE-2 · Backend (Node.js)",
    company: "Flipkart",   logo: "🛒", location: "Bangalore",   mode: "onsite",
    exp: "2–4 yrs",        salary: "₹22–30 LPA",
    skills: ["node.js", "postgresql", "rest api", "redis", "kubernetes", "microservices"],
    postedDays: 1, applicants: 48, trust: "high", verified: true, ghost: false,
    avgResponseDays: 3, replyRate: 65,
    jdText: "Flipkart SDE-2 Backend. Node.js, PostgreSQL, Redis, REST API, Kubernetes and microservices. High scale systems experience required.",
  },
  {
    id: "fk-ml",
    title: "Machine Learning Engineer",
    company: "Flipkart",   logo: "🛒", location: "Bangalore",   mode: "onsite",
    exp: "2–5 yrs",        salary: "₹24–35 LPA",
    skills: ["python", "machine learning", "pytorch", "tensorflow", "sql", "spark"],
    postedDays: 9, applicants: 62, trust: "high", verified: true, ghost: false,
    avgResponseDays: 5, replyRate: 58,
    jdText: "Flipkart ML Engineer for recommendations & search ranking. Python, PyTorch/TensorFlow, SQL, Spark. Experience with large-scale ML pipelines required.",
  },
  {
    id: "sw-fe",
    title: "Frontend Engineer (React)",
    company: "Swiggy",     logo: "🍜", location: "Bangalore",   mode: "hybrid",
    exp: "1–3 yrs",        salary: "₹12–18 LPA",
    skills: ["react", "javascript", "typescript", "css", "html"],
    postedDays: 2, applicants: 135, trust: "high", verified: true, ghost: false,
    avgResponseDays: 4, replyRate: 60,
    jdText: "Swiggy Frontend Engineer. React, JavaScript, TypeScript, CSS and HTML. Consumer product team — performance and accessibility focus.",
  },
  {
    id: "sw-de",
    title: "Data Engineer",
    company: "Swiggy",     logo: "🍜", location: "Bangalore",   mode: "hybrid",
    exp: "3–5 yrs",        salary: "₹18–26 LPA",
    skills: ["python", "sql", "spark", "airflow", "bigquery", "dbt"],
    postedDays: 4, applicants: 41, trust: "high", verified: true, ghost: false,
    avgResponseDays: 4, replyRate: 66,
    jdText: "Swiggy Data Engineer. Python, SQL, Spark, Airflow, BigQuery and dbt. Build and maintain data pipelines for real-time analytics.",
  },
  {
    id: "meesho-be",
    title: "Backend Engineer (Python)",
    company: "Meesho",     logo: "🛍️", location: "Bangalore",   mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹18–24 LPA",
    skills: ["python", "django", "postgresql", "redis", "aws", "docker"],
    postedDays: 2, applicants: 55, trust: "high", verified: true, ghost: false,
    avgResponseDays: 4, replyRate: 68,
    jdText: "Meesho Backend Engineer. Python, Django, PostgreSQL, Redis, AWS and Docker. High-scale distributed systems experience preferred.",
  },
  {
    id: "zepto-fsd",
    title: "Full Stack Engineer",
    company: "Zepto",      logo: "⚡", location: "Mumbai",        mode: "remote",
    exp: "2–4 yrs",        salary: "₹16–22 LPA",
    skills: ["react", "node.js", "typescript", "mongodb", "aws"],
    postedDays: 1, applicants: 32, trust: "high", verified: true, ghost: false,
    avgResponseDays: 2, replyRate: 80,
    jdText: "Zepto Full Stack Engineer. React, Node.js, TypeScript, MongoDB and AWS. Fast-paced q-commerce environment.",
  },
  {
    id: "zomato-sde",
    title: "SDE-2 · Backend (Go)",
    company: "Zomato",     logo: "🍕", location: "Gurgaon",       mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹20–28 LPA",
    skills: ["go", "postgresql", "redis", "kafka", "microservices", "docker"],
    postedDays: 3, applicants: 71, trust: "high", verified: true, ghost: false,
    avgResponseDays: 3, replyRate: 68,
    jdText: "Zomato SDE-2 Backend. Go (Golang), PostgreSQL, Redis, Kafka, microservices and Docker. Real-time order management systems.",
  },
  {
    id: "zomato-pm",
    title: "Product Manager · Growth",
    company: "Zomato",     logo: "🍕", location: "Gurgaon",       mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹22–35 LPA",
    skills: ["product management", "analytics", "sql", "user research", "a/b testing"],
    postedDays: 6, applicants: 88, trust: "high", verified: true, ghost: false,
    avgResponseDays: 5, replyRate: 55,
    jdText: "Zomato Product Manager for growth. A/B testing, analytics, SQL, user research required. Drive growth experiments across the consumer funnel.",
  },

  /* ── Food-Tech & Delivery ─────────────────────────────────────── */
  {
    id: "dunzo-fe",
    title: "React Native Developer",
    company: "Dunzo",      logo: "🏃", location: "Bangalore",   mode: "remote",
    exp: "2–4 yrs",        salary: "₹14–20 LPA",
    skills: ["react native", "typescript", "javascript", "redux", "rest api"],
    postedDays: 8, applicants: 43, trust: "medium", verified: false, ghost: false,
    avgResponseDays: 6, replyRate: 48,
    jdText: "Dunzo React Native Developer. TypeScript, Redux, REST API integration. Mobile-first delivery app experience.",
  },

  /* ── Big Tech India ───────────────────────────────────────────── */
  {
    id: "amzn-sde2",
    title: "SDE-2 · AWS Services",
    company: "Amazon",     logo: "📦", location: "Hyderabad",    mode: "onsite",
    exp: "4–6 yrs",        salary: "₹35–55 LPA",
    skills: ["java", "aws", "distributed systems", "microservices", "sql", "system design"],
    postedDays: 2, applicants: 210, trust: "high", verified: true, ghost: false,
    avgResponseDays: 5, replyRate: 42,
    jdText: "Amazon SDE-2 for AWS Services team. Java, AWS, distributed systems, microservices, SQL and strong system design. Leadership principles alignment assessed.",
  },
  {
    id: "amzn-ds",
    title: "Data Scientist · Alexa AI",
    company: "Amazon",     logo: "📦", location: "Hyderabad",    mode: "onsite",
    exp: "3–6 yrs",        salary: "₹32–50 LPA",
    skills: ["python", "machine learning", "nlp", "pytorch", "statistics", "sql"],
    postedDays: 7, applicants: 94, trust: "high", verified: true, ghost: false,
    avgResponseDays: 7, replyRate: 38,
    jdText: "Amazon Data Scientist for Alexa AI. Python, ML, NLP, PyTorch and statistics. Prior research publications or NLP domain experience a strong plus.",
  },
  {
    id: "goog-swe",
    title: "Software Engineer L4",
    company: "Google",     logo: "🔍", location: "Hyderabad",    mode: "onsite",
    exp: "3–6 yrs",        salary: "₹40–70 LPA",
    skills: ["c++", "python", "distributed systems", "algorithms", "system design"],
    postedDays: 10, applicants: 350, trust: "high", verified: true, ghost: false,
    avgResponseDays: 14, replyRate: 30,
    jdText: "Google SWE L4. Strong algorithms, data structures, system design. C++ or Python. Coding rounds + system design + behavioral interviews.",
  },
  {
    id: "msft-sde2",
    title: "Senior Software Engineer",
    company: "Microsoft",  logo: "🪟", location: "Hyderabad",    mode: "hybrid",
    exp: "4–7 yrs",        salary: "₹35–55 LPA",
    skills: ["c#", ".net", "azure", "microservices", "sql", "system design"],
    postedDays: 5, applicants: 178, trust: "high", verified: true, ghost: false,
    avgResponseDays: 8, replyRate: 45,
    jdText: "Microsoft Senior Software Engineer. C#, .NET, Azure, microservices, SQL and system design required. Cloud-native development experience preferred.",
  },

  /* ── Unicorns & Scale-ups ─────────────────────────────────────── */
  {
    id: "byju-be",
    title: "Backend Engineer (Java)",
    company: "BYJU'S",     logo: "📚", location: "Bangalore",   mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹14–22 LPA",
    skills: ["java", "spring boot", "postgresql", "kafka", "microservices"],
    postedDays: 12, applicants: 68, trust: "medium", verified: false, ghost: false,
    avgResponseDays: 8, replyRate: 40,
    jdText: "BYJU'S Backend Engineer. Java, Spring Boot, PostgreSQL, Kafka and microservices. EdTech platform with massive scale requirements.",
  },
  {
    id: "ola-sde",
    title: "Software Engineer · Maps & Geo",
    company: "Ola",        logo: "🚗", location: "Bangalore",   mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹18–26 LPA",
    skills: ["c++", "python", "geospatial", "postgresql", "redis", "algorithms"],
    postedDays: 9, applicants: 37, trust: "high", verified: true, ghost: false,
    avgResponseDays: 5, replyRate: 62,
    jdText: "Ola Maps & Geo team. C++ or Python, geospatial algorithms, PostgreSQL (PostGIS), Redis. Experience with routing or mapping systems a strong plus.",
  },
  {
    id: "paytm-sde",
    title: "SDE-2 · Payments Backend",
    company: "Paytm",      logo: "💰", location: "Noida",        mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹16–24 LPA",
    skills: ["java", "spring boot", "mysql", "redis", "kafka", "microservices"],
    postedDays: 6, applicants: 102, trust: "medium", verified: false, ghost: false,
    avgResponseDays: 6, replyRate: 52,
    jdText: "Paytm SDE-2 Payments Backend. Java, Spring Boot, MySQL, Redis, Kafka and microservices. High-throughput transactional systems.",
  },
  {
    id: "nykaa-fe",
    title: "Frontend Engineer · Web",
    company: "Nykaa",      logo: "💄", location: "Mumbai",        mode: "hybrid",
    exp: "1–4 yrs",        salary: "₹10–16 LPA",
    skills: ["react", "javascript", "typescript", "css", "next.js"],
    postedDays: 4, applicants: 88, trust: "high", verified: false, ghost: false,
    avgResponseDays: 5, replyRate: 58,
    jdText: "Nykaa Frontend Engineer for e-commerce web platform. React, JavaScript, TypeScript, CSS and Next.js. Focus on performance and mobile responsiveness.",
  },
  {
    id: "dream11-be",
    title: "Backend Engineer · Real-time",
    company: "Dream11",    logo: "🏏", location: "Mumbai",        mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹18–28 LPA",
    skills: ["golang", "postgresql", "redis", "kafka", "microservices", "aws"],
    postedDays: 3, applicants: 56, trust: "high", verified: true, ghost: false,
    avgResponseDays: 4, replyRate: 67,
    jdText: "Dream11 Backend Engineer for real-time gaming infrastructure. Go, PostgreSQL, Redis, Kafka, microservices and AWS. Low-latency systems critical.",
  },
  {
    id: "sharechat-ml",
    title: "ML Engineer · Recommendations",
    company: "ShareChat",  logo: "📲", location: "Bangalore",   mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹20–30 LPA",
    skills: ["python", "machine learning", "pytorch", "spark", "recommendation systems"],
    postedDays: 11, applicants: 31, trust: "high", verified: false, ghost: false,
    avgResponseDays: 4, replyRate: 65,
    jdText: "ShareChat ML Engineer for content recommendations. Python, PyTorch, Spark, recommendation systems. Social media content ranking experience preferred.",
  },

  /* ── Product & Design ─────────────────────────────────────────── */
  {
    id: "notion-pm",
    title: "Senior Product Manager",
    company: "Notion",     logo: "📝", location: "Remote",        mode: "remote",
    exp: "4–7 yrs",        salary: "₹40–65 LPA",
    skills: ["product management", "user research", "analytics", "sql", "figma"],
    postedDays: 14, applicants: 145, trust: "high", verified: true, ghost: false,
    avgResponseDays: 10, replyRate: 45,
    jdText: "Notion Senior PM. 4+ years PM experience, strong user research, analytics, SQL and Figma. Remote role — async communication skills critical.",
  },
  {
    id: "urbanc-ux",
    title: "UX Designer · App",
    company: "Urban Company", logo: "🔧", location: "Gurgaon",    mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹12–18 LPA",
    skills: ["figma", "user research", "prototyping", "design systems", "usability testing"],
    postedDays: 5, applicants: 79, trust: "high", verified: false, ghost: false,
    avgResponseDays: 6, replyRate: 55,
    jdText: "Urban Company UX Designer. Figma, user research, prototyping, design systems and usability testing. Consumer-facing mobile app experience preferred.",
  },

  /* ── Infrastructure & Cloud ───────────────────────────────────── */
  {
    id: "freshworks-sde",
    title: "Software Engineer · SaaS Platform",
    company: "Freshworks", logo: "🌱", location: "Chennai",       mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹14–22 LPA",
    skills: ["ruby on rails", "react", "postgresql", "redis", "aws"],
    postedDays: 7, applicants: 54, trust: "high", verified: true, ghost: false,
    avgResponseDays: 4, replyRate: 63,
    jdText: "Freshworks SaaS Platform Engineer. Ruby on Rails, React, PostgreSQL, Redis and AWS. Multi-tenant SaaS architecture experience a plus.",
  },
  {
    id: "zoho-sde",
    title: "Software Developer",
    company: "Zoho",       logo: "🔵", location: "Chennai",       mode: "onsite",
    exp: "0–2 yrs",        salary: "₹8–14 LPA",
    skills: ["java", "javascript", "html", "css", "sql"],
    postedDays: 2, applicants: 320, trust: "high", verified: true, ghost: false,
    avgResponseDays: 7, replyRate: 40,
    jdText: "Zoho Software Developer — fresher to 2 years. Java, JavaScript, HTML, CSS and SQL. Strong fundamentals and problem-solving skills required.",
  },
  {
    id: "infosys-cloud",
    title: "Cloud Engineer (AWS)",
    company: "Infosys",    logo: "🏛️", location: "Bangalore",   mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹12–18 LPA",
    skills: ["aws", "terraform", "docker", "kubernetes", "python", "linux"],
    postedDays: 3, applicants: 215, trust: "medium", verified: true, ghost: false,
    avgResponseDays: 10, replyRate: 35,
    jdText: "Infosys Cloud Engineer. AWS, Terraform, Docker, Kubernetes, Python and Linux. AWS certification preferred.",
  },
  {
    id: "tcs-devops",
    title: "DevOps Engineer",
    company: "TCS",        logo: "🔷", location: "Mumbai",        mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹10–15 LPA",
    skills: ["jenkins", "docker", "kubernetes", "ansible", "aws", "linux"],
    postedDays: 1, applicants: 340, trust: "medium", verified: true, ghost: false,
    avgResponseDays: 12, replyRate: 32,
    jdText: "TCS DevOps Engineer. Jenkins, Docker, Kubernetes, Ansible, AWS and Linux. CI/CD pipeline management for large enterprise clients.",
  },
  {
    id: "wipro-ds",
    title: "Data Scientist",
    company: "Wipro",      logo: "🔶", location: "Bangalore",   mode: "hybrid",
    exp: "2–5 yrs",        salary: "₹12–20 LPA",
    skills: ["python", "machine learning", "sql", "pandas", "scikit-learn", "tableau"],
    postedDays: 5, applicants: 182, trust: "medium", verified: false, ghost: false,
    avgResponseDays: 8, replyRate: 38,
    jdText: "Wipro Data Scientist. Python, ML models, SQL, Pandas, scikit-learn and Tableau. Client-facing analytics consulting experience a plus.",
  },

  /* ── Start-ups & Niche ────────────────────────────────────────── */
  {
    id: "leadsquared-sde",
    title: "Software Engineer · CRM",
    company: "LeadSquared", logo: "📊", location: "Bangalore",  mode: "hybrid",
    exp: "1–3 yrs",        salary: "₹10–16 LPA",
    skills: ["c#", ".net", "react", "sql server", "azure"],
    postedDays: 8, applicants: 33, trust: "high", verified: false, ghost: false,
    avgResponseDays: 5, replyRate: 60,
    jdText: "LeadSquared SDE. C#, .NET, React, SQL Server and Azure. B2B SaaS CRM platform. Good ownership mindset required.",
  },
  {
    id: "hasura-be",
    title: "Backend Engineer · Open Source",
    company: "Hasura",     logo: "⚙️", location: "Bangalore",   mode: "remote",
    exp: "2–5 yrs",        salary: "₹20–30 LPA",
    skills: ["haskell", "go", "postgresql", "graphql", "typescript", "docker"],
    postedDays: 11, applicants: 18, trust: "high", verified: true, ghost: false,
    avgResponseDays: 3, replyRate: 85,
    jdText: "Hasura Backend Engineer for open-source GraphQL engine. Haskell or Go preferred, PostgreSQL, GraphQL, TypeScript and Docker. Strong systems thinking.",
  },
  {
    id: "browserstack-qa",
    title: "QA Automation Engineer",
    company: "BrowserStack", logo: "🧪", location: "Mumbai",    mode: "remote",
    exp: "2–4 yrs",        salary: "₹14–20 LPA",
    skills: ["selenium", "javascript", "typescript", "cypress", "rest api testing"],
    postedDays: 4, applicants: 47, trust: "high", verified: true, ghost: false,
    avgResponseDays: 4, replyRate: 71,
    jdText: "BrowserStack QA Automation. Selenium, JavaScript, TypeScript, Cypress and REST API testing. Experience with cross-browser testing platforms.",
  },
  {
    id: "delhivery-sde",
    title: "Software Engineer · Logistics",
    company: "Delhivery",  logo: "📦", location: "Gurgaon",      mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹14–20 LPA",
    skills: ["python", "django", "postgresql", "redis", "celery", "aws"],
    postedDays: 6, applicants: 41, trust: "high", verified: true, ghost: false,
    avgResponseDays: 5, replyRate: 60,
    jdText: "Delhivery Software Engineer. Python, Django, PostgreSQL, Redis, Celery and AWS. Supply chain and logistics domain knowledge helpful.",
  },
  {
    id: "mpl-android",
    title: "Android Developer",
    company: "MPL",        logo: "🎮", location: "Bangalore",   mode: "hybrid",
    exp: "2–4 yrs",        salary: "₹16–24 LPA",
    skills: ["android", "kotlin", "java", "rest api", "mvvm", "jetpack compose"],
    postedDays: 9, applicants: 36, trust: "high", verified: false, ghost: false,
    avgResponseDays: 4, replyRate: 68,
    jdText: "MPL Android Developer. Kotlin, Java, REST APIs, MVVM architecture and Jetpack Compose. Gaming app experience preferred.",
  },
  {
    id: "lenskart-ds",
    title: "Data Analyst · Growth",
    company: "Lenskart",   logo: "👓", location: "Delhi NCR",    mode: "hybrid",
    exp: "1–3 yrs",        salary: "₹8–14 LPA",
    skills: ["sql", "python", "tableau", "excel", "analytics", "a/b testing"],
    postedDays: 7, applicants: 74, trust: "high", verified: false, ghost: false,
    avgResponseDays: 6, replyRate: 55,
    jdText: "Lenskart Data Analyst for growth. SQL, Python, Tableau, Excel, analytics and A/B testing. Retail analytics or e-commerce experience preferred.",
  },
  {
    id: "unverified-ghost",
    title: "React Developer — 10 yrs exp",
    company: "TechRecruiter Pvt Ltd",
    logo: "🏢", location: "Bangalore / Remote", mode: "remote",
    exp: "10 yrs",         salary: "Not disclosed",
    skills: ["react"],
    postedDays: 18, applicants: 0, trust: "low", verified: false, ghost: true,
    avgResponseDays: 99, replyRate: 5,
    jdText: "React Developer required. 10 years experience. Immediate joiner. Apply now. Urgent hiring.",
  },
];

export default JOBS;
