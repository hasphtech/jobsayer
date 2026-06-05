/**
 * Affiliate course recommendations — Udemy & Coursera
 *
 * Used across Career GPS, Interview Prep, and Score pages.
 * Courses are shown contextually based on skill gaps — NOT in a separate marketplace.
 *
 * Affiliate link setup:
 *   Udemy:    Replace UDEMY_AFF_ID with your Impact affiliate ID.
 *             Link format: https://click.linksynergy.com/deeplink?id=UDEMY_AFF_ID&mid=39197&murl=https://www.udemy.com/course/{slug}/
 *   Coursera: Replace COURSERA_AFF_ID with your Impact affiliate ID.
 *             Link format: https://imp.i384100.net/c/COURSERA_AFF_ID/1347618/14726?u=https://www.coursera.org/learn/{slug}
 *
 * Until affiliate IDs are set up, direct URLs are used (no revenue lost, just not tracked).
 */

export type CoursePlatform = "udemy" | "coursera" | "free";

export interface CourseRec {
  title:       string;
  platform:    CoursePlatform;
  instructor:  string;
  rating:      number;    // 4.5
  students?:   string;    // "180K+"
  duration:    string;    // "22 hrs" | "6 weeks"
  price:       string;    // "Free" | "₹449" | "₹649"
  tag?:        string;    // "Bestseller" | "Top rated" | "Free audit"
  affiliateUrl: string;
}

/* ─── Helpers ──────────────────────────────────────────────── */

const UDEMY = (slug: string) =>
  `https://www.udemy.com/course/${slug}/?ref=jobsayer`;

const COURSERA = (slug: string) =>
  `https://www.coursera.org/learn/${slug}?ref=jobsayer`;

const COURSERA_SPEC = (slug: string) =>
  `https://www.coursera.org/specializations/${slug}?ref=jobsayer`;

/* ─── Course database ──────────────────────────────────────── */

const COURSES: Record<string, CourseRec[]> = {

  /* ── DSA ──────────────────────────────────────────────────── */
  "dsa": [
    { title: "Master the Coding Interview: Data Structures + Algorithms", platform: "udemy", instructor: "Andrei Neagoie", rating: 4.6, students: "120K+", duration: "19.5 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("master-the-coding-interview-data-structures-algorithms") },
    { title: "Algorithms, Part I", platform: "coursera", instructor: "Princeton University", rating: 4.9, students: "800K+", duration: "6 weeks", price: "Free audit", tag: "Top rated", affiliateUrl: COURSERA("algorithms-part1") },
    { title: "JavaScript Algorithms and Data Structures Masterclass", platform: "udemy", instructor: "Colt Steele", rating: 4.7, students: "200K+", duration: "21.5 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("js-algorithms-and-data-structures-masterclass") },
  ],

  /* ── System Design ────────────────────────────────────────── */
  "system design": [
    { title: "System Design Interview – An Insider's Guide", platform: "udemy", instructor: "Frank Kane", rating: 4.6, students: "90K+", duration: "9 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("system-design-interview-prep") },
    { title: "Grokking the System Design Interview", platform: "udemy", instructor: "Design Gurus", rating: 4.4, students: "60K+", duration: "12 hrs", price: "₹649", affiliateUrl: UDEMY("grokking-the-system-design-interview") },
    { title: "Software Architecture & Design of Modern Large Scale Systems", platform: "udemy", instructor: "Michael Pogrebinsky", rating: 4.6, students: "55K+", duration: "13 hrs", price: "₹449", affiliateUrl: UDEMY("software-architecture-design-of-modern-large-scale-systems") },
  ],

  /* ── React ────────────────────────────────────────────────── */
  "react": [
    { title: "React — The Complete Guide (incl. React Router & Redux)", platform: "udemy", instructor: "Maximilian Schwarzmüller", rating: 4.6, students: "800K+", duration: "68 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("react-the-complete-guide-incl-redux") },
    { title: "The Ultimate React Course", platform: "udemy", instructor: "Jonas Schmedtmann", rating: 4.8, students: "200K+", duration: "67 hrs", price: "₹649", tag: "Top rated", affiliateUrl: UDEMY("the-ultimate-react-course") },
  ],

  /* ── Node.js ──────────────────────────────────────────────── */
  "node": [
    { title: "NodeJS — The Complete Guide (MVC, REST APIs, GraphQL, Deno)", platform: "udemy", instructor: "Maximilian Schwarzmüller", rating: 4.6, students: "200K+", duration: "40 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("nodejs-the-complete-guide") },
    { title: "The Complete Node.js Developer Course", platform: "udemy", instructor: "Andrew Mead", rating: 4.7, students: "180K+", duration: "35 hrs", price: "₹449", affiliateUrl: UDEMY("the-complete-nodejs-developer-course-2") },
  ],

  /* ── TypeScript ───────────────────────────────────────────── */
  "typescript": [
    { title: "Understanding TypeScript", platform: "udemy", instructor: "Maximilian Schwarzmüller", rating: 4.7, students: "200K+", duration: "15 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("understanding-typescript") },
    { title: "TypeScript: The Complete Developer's Guide", platform: "udemy", instructor: "Stephen Grider", rating: 4.6, students: "110K+", duration: "27 hrs", price: "₹449", affiliateUrl: UDEMY("typescript-the-complete-developers-guide") },
  ],

  /* ── Python ───────────────────────────────────────────────── */
  "python": [
    { title: "100 Days of Code: The Complete Python Pro Bootcamp", platform: "udemy", instructor: "Dr. Angela Yu", rating: 4.7, students: "1.2M+", duration: "60 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("100-days-of-code") },
    { title: "Python for Everybody Specialization", platform: "coursera", instructor: "University of Michigan", rating: 4.8, students: "2.5M+", duration: "8 months", price: "Free audit", tag: "Most enrolled", affiliateUrl: COURSERA_SPEC("python") },
  ],

  /* ── SQL / Databases ──────────────────────────────────────── */
  "sql": [
    { title: "The Complete SQL Bootcamp: Go from Zero to Hero", platform: "udemy", instructor: "Jose Portilla", rating: 4.7, students: "600K+", duration: "9 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("the-complete-sql-bootcamp") },
    { title: "SQL for Data Science", platform: "coursera", instructor: "UC Davis", rating: 4.6, students: "400K+", duration: "4 weeks", price: "Free audit", affiliateUrl: COURSERA("sql-for-data-science") },
  ],

  /* ── Docker / Kubernetes ──────────────────────────────────── */
  "docker": [
    { title: "Docker and Kubernetes: The Complete Guide", platform: "udemy", instructor: "Stephen Grider", rating: 4.6, students: "250K+", duration: "22 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("docker-and-kubernetes-the-complete-guide") },
    { title: "Docker Mastery: with Kubernetes + Swarm from a Docker Captain", platform: "udemy", instructor: "Bret Fisher", rating: 4.7, students: "300K+", duration: "19 hrs", price: "₹649", affiliateUrl: UDEMY("docker-mastery") },
  ],
  "kubernetes": [
    { title: "Kubernetes Certified Application Developer (CKAD)", platform: "udemy", instructor: "Mumshad Mannambeth", rating: 4.7, students: "200K+", duration: "8 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("certified-kubernetes-application-developer") },
    { title: "Docker and Kubernetes: The Complete Guide", platform: "udemy", instructor: "Stephen Grider", rating: 4.6, students: "250K+", duration: "22 hrs", price: "₹649", affiliateUrl: UDEMY("docker-and-kubernetes-the-complete-guide") },
  ],

  /* ── AWS / Cloud ──────────────────────────────────────────── */
  "aws": [
    { title: "AWS Certified Solutions Architect Associate", platform: "udemy", instructor: "Stephane Maarek", rating: 4.7, students: "900K+", duration: "27 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("aws-certified-solutions-architect-associate-saa-c03") },
    { title: "AWS Cloud Practitioner Essentials", platform: "coursera", instructor: "Amazon Web Services", rating: 4.7, students: "500K+", duration: "6 hrs", price: "Free audit", affiliateUrl: COURSERA("aws-cloud-practitioner-essentials") },
  ],
  "cloud": [
    { title: "AWS Certified Solutions Architect Associate", platform: "udemy", instructor: "Stephane Maarek", rating: 4.7, students: "900K+", duration: "27 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("aws-certified-solutions-architect-associate-saa-c03") },
    { title: "Google Cloud Fundamentals: Core Infrastructure", platform: "coursera", instructor: "Google Cloud", rating: 4.6, students: "200K+", duration: "1 week", price: "Free audit", affiliateUrl: COURSERA("gcp-fundamentals") },
  ],

  /* ── Machine Learning / AI ────────────────────────────────── */
  "machine learning": [
    { title: "Machine Learning Specialization", platform: "coursera", instructor: "Andrew Ng, Stanford", rating: 4.9, students: "4M+", duration: "3 months", price: "Free audit", tag: "Iconic course", affiliateUrl: COURSERA_SPEC("machine-learning-introduction") },
    { title: "Machine Learning A-Z: AI, Python & R", platform: "udemy", instructor: "Kirill Eremenko & Hadelin de Ponteves", rating: 4.5, students: "900K+", duration: "44 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("machinelearning") },
  ],
  "ml": [
    { title: "Machine Learning Specialization", platform: "coursera", instructor: "Andrew Ng, Stanford", rating: 4.9, students: "4M+", duration: "3 months", price: "Free audit", tag: "Iconic course", affiliateUrl: COURSERA_SPEC("machine-learning-introduction") },
    { title: "Python for Machine Learning & Data Science Masterclass", platform: "udemy", instructor: "Jose Portilla", rating: 4.6, students: "300K+", duration: "40 hrs", price: "₹649", affiliateUrl: UDEMY("python-for-machine-learning-and-data-science-masterclass") },
  ],

  /* ── Go ───────────────────────────────────────────────────── */
  "go": [
    { title: "Go: The Complete Developer's Guide", platform: "udemy", instructor: "Stephen Grider", rating: 4.6, students: "120K+", duration: "9 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("go-the-complete-developers-guide") },
    { title: "Programming with Google Go Specialization", platform: "coursera", instructor: "UC Irvine", rating: 4.6, students: "90K+", duration: "3 months", price: "Free audit", affiliateUrl: COURSERA_SPEC("google-golang") },
  ],

  /* ── Java ─────────────────────────────────────────────────── */
  "java": [
    { title: "Java Masterclass — Learn Java Programming", platform: "udemy", instructor: "Tim Buchalka", rating: 4.6, students: "800K+", duration: "80 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("java-the-complete-java-developer-course") },
    { title: "Object Oriented Programming in Java", platform: "coursera", instructor: "Duke University", rating: 4.7, students: "500K+", duration: "5 months", price: "Free audit", affiliateUrl: COURSERA_SPEC("object-oriented-programming") },
  ],

  /* ── Product Management ───────────────────────────────────── */
  "product": [
    { title: "Become a Product Manager | Learn the Skills & Get the Job", platform: "udemy", instructor: "Cole Mercer & Evan Kimbrell", rating: 4.5, students: "80K+", duration: "15 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("become-a-product-manager-learn-the-skills-get-a-job") },
    { title: "Product Management Specialization", platform: "coursera", instructor: "Duke University", rating: 4.7, students: "70K+", duration: "4 months", price: "Free audit", affiliateUrl: COURSERA_SPEC("product-management-duke") },
  ],

  /* ── Data Engineering ─────────────────────────────────────── */
  "spark": [
    { title: "Apache Spark with Scala — Hands On with Big Data!", platform: "udemy", instructor: "Frank Kane", rating: 4.6, students: "120K+", duration: "14 hrs", price: "₹449", affiliateUrl: UDEMY("apache-spark-with-scala-hands-on-with-big-data") },
    { title: "Data Engineering with dbt", platform: "udemy", instructor: "Marc Lamberti", rating: 4.6, students: "30K+", duration: "12 hrs", price: "₹449", affiliateUrl: UDEMY("complete-dbt-data-build-tool-bootcamp-zero-to-hero-learn-dbt") },
  ],
  "data engineering": [
    { title: "Apache Spark with Scala — Hands On with Big Data!", platform: "udemy", instructor: "Frank Kane", rating: 4.6, students: "120K+", duration: "14 hrs", price: "₹449", affiliateUrl: UDEMY("apache-spark-with-scala-hands-on-with-big-data") },
    { title: "IBM Data Engineering Professional Certificate", platform: "coursera", instructor: "IBM", rating: 4.6, students: "100K+", duration: "5 months", price: "Free audit", tag: "Certificate", affiliateUrl: COURSERA_SPEC("ibm-data-engineer") },
  ],

  /* ── DevOps / CI-CD ───────────────────────────────────────── */
  "devops": [
    { title: "DevOps Beginners to Advanced with Projects", platform: "udemy", instructor: "Imran Teli", rating: 4.7, students: "150K+", duration: "33 hrs", price: "₹449", tag: "Bestseller", affiliateUrl: UDEMY("decodingdevops") },
    { title: "DevOps on AWS Specialization", platform: "coursera", instructor: "Amazon Web Services", rating: 4.6, students: "60K+", duration: "3 months", price: "Free audit", affiliateUrl: COURSERA_SPEC("aws-devops") },
  ],

  /* ── Microservices ────────────────────────────────────────── */
  "microservices": [
    { title: "Microservices with Node JS and React", platform: "udemy", instructor: "Stephen Grider", rating: 4.6, students: "100K+", duration: "55 hrs", price: "₹649", affiliateUrl: UDEMY("microservices-with-node-js-and-react") },
  ],

  /* ── Redis ────────────────────────────────────────────────── */
  "redis": [
    { title: "Redis: The Complete Developer's Guide", platform: "udemy", instructor: "Stephen Grider", rating: 4.7, students: "50K+", duration: "17 hrs", price: "₹449", affiliateUrl: UDEMY("redis-the-complete-developers-guide-p") },
  ],

  /* ── Full Stack ───────────────────────────────────────────── */
  "full stack": [
    { title: "The Complete Web Developer Bootcamp", platform: "udemy", instructor: "Dr. Angela Yu", rating: 4.7, students: "700K+", duration: "62 hrs", price: "₹649", tag: "Bestseller", affiliateUrl: UDEMY("the-complete-web-development-bootcamp") },
    { title: "Full-Stack Web Development with React Specialization", platform: "coursera", instructor: "Hong Kong University", rating: 4.7, students: "200K+", duration: "4 months", price: "Free audit", affiliateUrl: COURSERA_SPEC("full-stack-react") },
  ],

  /* ── CS Fundamentals / OS / DBMS ──────────────────────────── */
  "core cs": [
    { title: "Operating Systems: Three Easy Pieces (OSTEP)", platform: "free", instructor: "University of Wisconsin", rating: 4.9, students: "500K+", duration: "Self-paced", price: "Free", tag: "Free book", affiliateUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/" },
    { title: "CS50: Introduction to Computer Science", platform: "free", instructor: "Harvard University", rating: 4.9, students: "4M+", duration: "12 weeks", price: "Free", tag: "Iconic", affiliateUrl: "https://cs50.harvard.edu/x/" },
  ],
};

/* ─── Skill→key matcher ────────────────────────────────────── */

const SKILL_ALIASES: [RegExp, string][] = [
  [/data.struct|dsa|algorithm|leetcode|neetcode|coding.interview/i, "dsa"],
  [/system.design|hld|lld|architecture|scalab/i,                   "system design"],
  [/react|next\.?js|frontend|front.end/i,                          "react"],
  [/node\.?js|express|backend|back.end|api.design|rest.api/i,      "node"],
  [/typescript/i,                                                    "typescript"],
  [/python/i,                                                        "python"],
  [/sql|postgres|mysql|database|dbms/i,                             "sql"],
  [/docker/i,                                                        "docker"],
  [/kubernetes|k8s|cka/i,                                           "kubernetes"],
  [/aws|amazon.web|s3|ec2|lambda/i,                                 "aws"],
  [/gcp|google.cloud|azure|cloud.platform/i,                       "cloud"],
  [/machine.learning|ml.engineer|scikit|pytorch|tensorflow/i,      "machine learning"],
  [/\bml\b/i,                                                        "ml"],
  [/\bgo\b|golang/i,                                                "go"],
  [/\bjava\b/i,                                                      "java"],
  [/product.manag|product.strategy|product.thinking/i,             "product"],
  [/spark|airflow|dbt|data.engineer/i,                              "data engineering"],
  [/devops|ci.?cd|github.action|jenkins|terraform|iac/i,           "devops"],
  [/microservice/i,                                                  "microservices"],
  [/redis|cach/i,                                                    "redis"],
  [/full.?stack/i,                                                   "full stack"],
  [/os|operating.system|dbms|networking|core.cs|cs.fundament/i,    "core cs"],
];

/**
 * Returns up to `maxResults` course recommendations for a given skill name.
 * Matching is fuzzy — works with "System Design (HLD + LLD)", "Node.js or Go or Java", etc.
 */
export function getCoursesForSkill(skillName: string, maxResults = 2): CourseRec[] {
  const lower = skillName.toLowerCase();
  for (const [pattern, key] of SKILL_ALIASES) {
    if (pattern.test(lower)) {
      return (COURSES[key] ?? []).slice(0, maxResults);
    }
  }
  return [];
}

/**
 * Returns courses for the top N missing skills, deduplicating by title.
 */
export function getCoursesForSkills(skillNames: string[], maxPerSkill = 1, maxTotal = 4): CourseRec[] {
  const seen = new Set<string>();
  const out: CourseRec[] = [];
  for (const skill of skillNames) {
    for (const c of getCoursesForSkill(skill, maxPerSkill)) {
      if (!seen.has(c.title)) {
        seen.add(c.title);
        out.push(c);
        if (out.length >= maxTotal) return out;
      }
    }
  }
  return out;
}
