/**
 * POST /api/learn/suggestions
 *
 * AI-powered personalised course suggestions based on:
 *   - User's current skills (from resume or provided)
 *   - Target role / career goal
 *   - Skill gaps (from Career GPS if available)
 *   - Courses already started/completed (to avoid re-suggesting)
 *
 * Returns 6–8 ranked course suggestions with reasoning.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { rateLimitAi } from "@/lib/rateLimit";
import { groqJSON } from "@/lib/groq";

interface SuggestionBody {
  currentSkills:    string[];   // skills from resume
  targetRole?:      string;     // career goal
  skillGaps?:       string[];   // from Career GPS
  completedIds?:    string[];   // already completed course IDs
  yearsExp?:        number;
  preferFree?:      boolean;
}

interface CourseSuggestion {
  courseId:     string;   // must match an id in COURSES on /learn page
  title:        string;
  provider:     string;
  reason:       string;   // personalised 1-sentence explanation
  skillsCovered: string[];
  priority:     1 | 2 | 3;  // 1=critical gap, 2=high-value, 3=nice-to-have
  isFree:       boolean;
}

interface SuggestionsResult {
  suggestions: CourseSuggestion[];
  summary:     string;  // 1-2 sentence executive summary of the recommendations
}

// Abbreviated course catalogue for the LLM (id + title + skills only — full data is in the page)
const COURSE_CATALOGUE = [
  { id: "goog-it",        title: "Google IT Support",                  skills: ["networking","linux","cloud computing","cybersecurity"],                            free: false },
  { id: "goog-da",        title: "Google Data Analytics",              skills: ["sql","r","tableau","spreadsheets","data visualisation"],                          free: false },
  { id: "goog-pm",        title: "Google Project Management",          skills: ["project management","agile","scrum","risk management"],                           free: false },
  { id: "goog-ux",        title: "Google UX Design",                   skills: ["figma","user research","wireframing","prototyping","usability testing"],          free: false },
  { id: "goog-cyber",     title: "Google Cybersecurity",               skills: ["cybersecurity","linux","python","siem","networking","sql"],                       free: false },
  { id: "goog-ml",        title: "Google ML Crash Course",             skills: ["machine learning","tensorflow","python","neural networks"],                       free: true  },
  { id: "aws-ccp-train",  title: "AWS Cloud Practitioner Essentials",  skills: ["aws","cloud computing","s3","ec2","iam"],                                         free: true  },
  { id: "aws-saa",        title: "AWS Solutions Architect Associate",  skills: ["aws","ec2","s3","rds","vpc","iam","system design"],                               free: false },
  { id: "msft-az900",     title: "Azure Fundamentals AZ-900",          skills: ["azure","cloud computing","networking"],                                           free: true  },
  { id: "msft-ai900",     title: "Azure AI Fundamentals AI-900",       skills: ["azure","machine learning","cognitive services","ai","nlp"],                       free: true  },
  { id: "ibm-ds",         title: "IBM Data Science",                   skills: ["python","sql","machine learning","pandas","scikit-learn"],                        free: false },
  { id: "ibm-fullstack",  title: "IBM Full Stack Developer",           skills: ["html","css","javascript","react","node.js","docker","kubernetes","cloud"],        free: false },
  { id: "meta-fe",        title: "Meta Front-End Developer",           skills: ["html","css","javascript","react","typescript","ui","ux"],                         free: false },
  { id: "meta-be",        title: "Meta Back-End Developer",            skills: ["python","django","apis","databases","version control","cloud"],                   free: false },
  { id: "meta-ml",        title: "Meta ML Engineering",                skills: ["python","machine learning","pytorch","mlops","recommendation systems"],           free: false },
  { id: "deep-dl",        title: "Deep Learning Specialization (deeplearning.ai)", skills: ["neural networks","cnn","rnn","nlp","tensorflow","deep learning"],   free: false },
  { id: "fast-practical-dl", title: "fast.ai Practical Deep Learning", skills: ["deep learning","pytorch","computer vision","nlp"],                               free: true  },
  { id: "cs50-python",    title: "CS50 Python (Harvard)",              skills: ["python","algorithms","oop","file i/o","databases"],                               free: true  },
  { id: "cs50-web",       title: "CS50 Web (Harvard)",                 skills: ["html","css","javascript","python","django","sql","react"],                        free: true  },
  { id: "fcc-js",         title: "freeCodeCamp JavaScript Algorithms", skills: ["javascript","algorithms","data structures","oop"],                                free: true  },
  { id: "fcc-react",      title: "freeCodeCamp Front End Libraries",   skills: ["react","redux","bootstrap","sass","jquery"],                                      free: true  },
  { id: "nptel-dsa",      title: "NPTEL Data Structures & Algorithms", skills: ["c++","algorithms","data structures","graph theory","dynamic programming"],        free: true  },
  { id: "nptel-ml",       title: "NPTEL Machine Learning",             skills: ["machine learning","python","statistics","scikit-learn"],                          free: true  },
  { id: "nptel-dbms",     title: "NPTEL Database Management",          skills: ["sql","database design","normalization","transactions","rdbms"],                   free: true  },
  { id: "udemy-python-bootcamp", title: "100 Days of Code Python",     skills: ["python","automation","web scraping","apis","data science","flask"],               free: false },
  { id: "udemy-react",    title: "React - The Complete Guide",         skills: ["react","hooks","redux","next.js","typescript"],                                   free: false },
  { id: "udemy-node",     title: "Node.js - The Complete Guide",       skills: ["node.js","express","mongodb","rest apis","graphql","typescript"],                 free: false },
  { id: "kaggle-python",  title: "Kaggle Python",                      skills: ["python","pandas","numpy","data analysis"],                                        free: true  },
  { id: "kaggle-ml-intro",title: "Kaggle Intro to Machine Learning",   skills: ["machine learning","pandas","scikit-learn","model evaluation"],                   free: true  },
  { id: "docker-official",title: "Play with Docker",                   skills: ["docker","containers","microservices","devops"],                                   free: true  },
  { id: "k8s-official",   title: "Kubernetes Official Tutorial",       skills: ["kubernetes","pods","deployments","services","orchestration"],                     free: true  },
  { id: "linux-lpic1",    title: "Linux LPIC-1 (Linux Foundation)",    skills: ["linux","bash","shell scripting","system administration","networking"],            free: false },
  { id: "github-actions", title: "GitHub Actions CI/CD",              skills: ["github actions","ci/cd","devops","automation","yaml"],                             free: true  },
  { id: "terraform-udemy",title: "Terraform Complete Guide",           skills: ["terraform","iac","aws","azure","gcp","devops"],                                   free: false },
];

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimitAi(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const cookieStore = await cookies();
  const sb = createServerSupabase(cookieStore);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as SuggestionBody;
  const {
    currentSkills = [],
    targetRole = "",
    skillGaps = [],
    completedIds = [],
    yearsExp,
    preferFree = false,
  } = body;

  // Filter catalogue: exclude already-completed courses
  const available = COURSE_CATALOGUE.filter(c => !completedIds.includes(c.id));

  const systemPrompt = `You are a career development advisor. Given a professional's profile, recommend the most impactful courses for their career growth. Respond ONLY with valid JSON — no markdown.`;

  const userPrompt = `Professional profile:
- Current skills: ${currentSkills.length > 0 ? currentSkills.join(", ") : "Not specified"}
- Target role: ${targetRole || "Not specified"}
- Skill gaps identified: ${skillGaps.length > 0 ? skillGaps.join(", ") : "None detected"}
- Years of experience: ${yearsExp ?? "Not specified"}
- Prefers free courses: ${preferFree ? "Yes" : "No preference"}

Available courses to recommend from (pick 6–8 that are most relevant):
${available.map(c => `- id:"${c.id}" | "${c.title}" | skills:${c.skills.join(",")} | free:${c.free}`).join("\n")}

Return a JSON object:
{
  "suggestions": [
    {
      "courseId": "<exact id from the list above>",
      "title": "<course title>",
      "provider": "<provider name>",
      "reason": "<1 sentence: WHY this specific course for THIS professional>",
      "skillsCovered": ["<skill1>","<skill2>"],
      "priority": <1, 2, or 3>,
      "isFree": <true|false>
    }
  ],
  "summary": "<1-2 sentences on what to focus on first and why>"
}

Rules:
- priority 1 = directly closes a skill gap for the target role (critical)
- priority 2 = builds adjacent skills that increase hire-ability (high value)
- priority 3 = nice-to-have for longer term growth
- sort by priority ascending (1 first)
- Only use courseIds from the provided list above — no fabricated IDs
- reason must be specific to THIS professional's skills/role/gaps
- ${preferFree ? "Strongly prefer free courses (isFree: true) unless a paid course is clearly superior" : ""}`;

  try {
    const result = await groqJSON<SuggestionsResult>(systemPrompt, userPrompt, 1500);

    // Validate: ensure all courseIds exist in catalogue
    const validIds = new Set(COURSE_CATALOGUE.map(c => c.id));
    result.suggestions = (result.suggestions ?? [])
      .filter(s => validIds.has(s.courseId))
      .slice(0, 8);

    // Enrich with free flag from catalogue
    result.suggestions = result.suggestions.map(s => {
      const cat = COURSE_CATALOGUE.find(c => c.id === s.courseId);
      return { ...s, isFree: cat?.free ?? s.isFree ?? false };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("learn/suggestions error:", err);
    return NextResponse.json({ error: "AI service error. Try again." }, { status: 500 });
  }
}
