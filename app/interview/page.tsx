"use client";
import { useWindowWidth } from "@/lib/useWindowWidth";
/**
 * /interview — Interview Prep
 *
 * Flow:
 *   1. Setup    — pick level (Basics/Intermediate/Professional) + topics (multi-select, custom)
 *   2. Loading  — generate questions (AI generation screen for custom topics)
 *   3. Practice — answer questions, get inline feedback
 *   4. Results  — score ring, per-topic breakdown, course recommendations
 */
import React, { useState, useEffect, useRef } from "react";
import AppShell from "@/components/AppShell";
import CourseCard from "@/components/CourseCard";
import { getCoursesForSkill } from "@/lib/courseRecommendations";
import { trackAction } from "@/lib/activityTracker";

/* ── Types ───────────────────────────────────────────────── */
type Stage = "setup" | "loading_q" | "practice" | "results";
type Level = "Basics" | "Intermediate" | "Professional";
type Difficulty = "fresher" | "mid" | "senior";

interface QuestionItem {
  text:       string;
  topicId:    string;
  topicLabel: string;
  topicColor: string;
  isAI:       boolean;
}

interface Feedback {
  score:            number;
  verdict:          string;
  strengths:        string[];
  improvements:     string[];
  betterAnswer:     string;
  keyConceptMissed: string | null;
}

interface AnswerState {
  text:      string;
  feedback:  Feedback | null;
  loading:   boolean;
  submitted: boolean;
}

/* ── Kept for backward-compat (imported by other pages) ── */
export const PROG_LANGUAGES = [
  { key: "any",        label: "Any / General",  icon: "ti-brain",              color: "#6366f1" },
  { key: "javascript", label: "JavaScript",      icon: "ti-brand-javascript",   color: "#f7df1e" },
  { key: "typescript", label: "TypeScript",      icon: "ti-brand-typescript",   color: "#3178c6" },
  { key: "python",     label: "Python",          icon: "ti-brand-python",       color: "#3776ab" },
  { key: "java",       label: "Java",            icon: "ti-coffee",             color: "#ed8b00" },
  { key: "go",         label: "Go",              icon: "ti-brand-golang",       color: "#00add8" },
  { key: "rust",       label: "Rust",            icon: "ti-brand-rust",         color: "#ce422b" },
  { key: "cpp",        label: "C++",             icon: "ti-settings",           color: "#00599c" },
  { key: "csharp",     label: "C#",              icon: "ti-brand-c",            color: "#9b4f96" },
  { key: "kotlin",     label: "Kotlin",          icon: "ti-brand-kotlin",       color: "#7f52ff" },
  { key: "swift",      label: "Swift",           icon: "ti-brand-apple",        color: "#fa7343" },
  { key: "sql",        label: "SQL / DB",        icon: "ti-database",           color: "#00758f" },
  { key: "ruby",       label: "Ruby",            icon: "ti-diamond",            color: "#cc342d" },
  { key: "php",        label: "PHP",             icon: "ti-brand-php",          color: "#777bb4" },
  { key: "scala",      label: "Scala",           icon: "ti-circle",             color: "#dc322f" },
  { key: "r",          label: "R (Data)",        icon: "ti-chart-bar",          color: "#276dc3" },
] as const;
export type ProgLanguageKey = typeof PROG_LANGUAGES[number]["key"];

/* ── Topics catalogue ────────────────────────────────────── */
const TOPIC_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#14b8a6","#f97316","#84cc16"];

const ALL_TOPICS = [
  // Frontend
  { id:"JavaScript",      icon:"🟨", label:"JavaScript",         cat:"frontend", pop:true  },
  { id:"TypeScript",      icon:"🔷", label:"TypeScript",         cat:"frontend", pop:true  },
  { id:"React",           icon:"⚛️", label:"React",              cat:"frontend", pop:true  },
  { id:"Next.js",         icon:"▲",  label:"Next.js",            cat:"frontend"            },
  { id:"Vue.js",          icon:"💚", label:"Vue.js",             cat:"frontend"            },
  { id:"Angular",         icon:"🔴", label:"Angular",            cat:"frontend"            },
  { id:"CSS & HTML",      icon:"🎨", label:"CSS & HTML",         cat:"frontend", pop:true  },
  { id:"Redux",           icon:"🟣", label:"Redux",              cat:"frontend"            },
  { id:"GraphQL",         icon:"🩷", label:"GraphQL",            cat:"frontend"            },
  { id:"Svelte",          icon:"🔥", label:"Svelte",             cat:"frontend"            },
  { id:"Web Performance", icon:"⚡", label:"Web Performance",    cat:"frontend"            },
  { id:"Webpack & Vite",  icon:"📦", label:"Webpack / Vite",     cat:"frontend"            },
  { id:"PWA",             icon:"📱", label:"PWA",                cat:"frontend"            },
  { id:"Frontend Testing",icon:"🧪", label:"Jest / Cypress",     cat:"frontend"            },
  // Backend
  { id:"Node.js",         icon:"🟩", label:"Node.js",            cat:"backend",  pop:true  },
  { id:"Python",          icon:"🐍", label:"Python",             cat:"backend",  pop:true  },
  { id:"Java",            icon:"☕", label:"Java",               cat:"backend",  pop:true  },
  { id:"Go",              icon:"🔵", label:"Go (Golang)",        cat:"backend"             },
  { id:"REST APIs",       icon:"🔗", label:"REST APIs",          cat:"backend"             },
  { id:"Microservices",   icon:"🔧", label:"Microservices",      cat:"backend"             },
  { id:"Django",          icon:"🌿", label:"Django",             cat:"backend"             },
  { id:"Spring Boot",     icon:"🍃", label:"Spring Boot",        cat:"backend"             },
  { id:"FastAPI",         icon:"🚀", label:"FastAPI",            cat:"backend"             },
  { id:"Express.js",      icon:"🖤", label:"Express.js",         cat:"backend"             },
  { id:".NET / C#",       icon:"💜", label:".NET / C#",          cat:"backend"             },
  { id:"gRPC",            icon:"📡", label:"gRPC",               cat:"backend"             },
  { id:"Message Queues",  icon:"📨", label:"Kafka / RabbitMQ",   cat:"backend"             },
  { id:"Ruby on Rails",   icon:"💎", label:"Ruby on Rails",      cat:"backend"             },
  // CS Fundamentals
  { id:"DSA",             icon:"🧮", label:"DSA",                cat:"cs",       pop:true  },
  { id:"System Design",   icon:"🏗️", label:"System Design",      cat:"cs",       pop:true  },
  { id:"OOP",             icon:"📦", label:"OOP Concepts",       cat:"cs",       pop:true  },
  { id:"OS",              icon:"💻", label:"Operating Systems",  cat:"cs"                  },
  { id:"Networking",      icon:"🌐", label:"Networking",         cat:"cs"                  },
  { id:"Concurrency",     icon:"⚙️", label:"Concurrency",        cat:"cs"                  },
  { id:"Design Patterns", icon:"🧩", label:"Design Patterns",    cat:"cs"                  },
  { id:"Database Design", icon:"🗃️", label:"Database Design",    cat:"cs"                  },
  { id:"Algorithms",      icon:"🔢", label:"Algorithms",         cat:"cs"                  },
  { id:"Computer Architecture",icon:"🖥️",label:"Computer Arch", cat:"cs"                  },
  // Data
  { id:"SQL & DB",        icon:"🗄️", label:"SQL & DB",           cat:"data",     pop:true  },
  { id:"PostgreSQL",      icon:"🐘", label:"PostgreSQL",         cat:"data"                },
  { id:"MongoDB",         icon:"🍀", label:"MongoDB",            cat:"data"                },
  { id:"Redis",           icon:"🔴", label:"Redis",              cat:"data"                },
  { id:"Data Engineering",icon:"🏭", label:"Data Engineering",   cat:"data"                },
  { id:"Machine Learning",icon:"🤖", label:"Machine Learning",   cat:"data",     pop:true  },
  { id:"Deep Learning",   icon:"🧠", label:"Deep Learning",      cat:"data"                },
  { id:"Pandas & NumPy",  icon:"🐼", label:"Pandas / NumPy",     cat:"data"                },
  { id:"Spark",           icon:"💥", label:"Spark / Hadoop",     cat:"data"                },
  { id:"Power BI",        icon:"📊", label:"Power BI / Tableau", cat:"data"                },
  { id:"NLP",             icon:"💬", label:"NLP",                cat:"data"                },
  // DevOps / Cloud
  { id:"Docker",          icon:"🐳", label:"Docker",             cat:"devops",   pop:true  },
  { id:"Kubernetes",      icon:"☸️", label:"Kubernetes",         cat:"devops"              },
  { id:"AWS",             icon:"☁️", label:"AWS",                cat:"devops",   pop:true  },
  { id:"Azure",           icon:"🔷", label:"Azure",              cat:"devops"              },
  { id:"GCP",             icon:"🌤️", label:"GCP",                cat:"devops"              },
  { id:"CI/CD",           icon:"🔄", label:"CI / CD",            cat:"devops"              },
  { id:"Linux",           icon:"🐧", label:"Linux",              cat:"devops"              },
  { id:"Git",             icon:"🌿", label:"Git",                cat:"devops"              },
  { id:"Terraform",       icon:"🏔️", label:"Terraform",          cat:"devops"              },
  { id:"Monitoring",      icon:"📈", label:"Monitoring / Observability", cat:"devops"      },
  { id:"Serverless",      icon:"⚡", label:"Serverless",         cat:"devops"              },
  // Mobile
  { id:"React Native",    icon:"📱", label:"React Native",       cat:"mobile",   pop:true  },
  { id:"Flutter",         icon:"🐦", label:"Flutter",            cat:"mobile",   pop:true  },
  { id:"iOS / Swift",     icon:"🍎", label:"iOS / Swift",        cat:"mobile"              },
  { id:"Android / Kotlin",icon:"🤖", label:"Android / Kotlin",   cat:"mobile"              },
  // Security
  { id:"Cybersecurity",   icon:"🔒", label:"Cybersecurity",      cat:"security"            },
  { id:"Web Security",    icon:"🛡️", label:"OWASP / Web Sec",    cat:"security"            },
  { id:"Auth & OAuth",    icon:"🔑", label:"Auth & OAuth",       cat:"security"            },
  { id:"Cryptography",    icon:"🔐", label:"Cryptography",       cat:"security"            },
  // Testing
  { id:"Unit Testing",    icon:"✅", label:"Unit Testing",       cat:"testing"             },
  { id:"TDD",             icon:"🔁", label:"TDD",                cat:"testing"             },
  { id:"Test Automation", icon:"🤖", label:"Test Automation",    cat:"testing"             },
  { id:"API Testing",     icon:"🔬", label:"API Testing",        cat:"testing"             },
  // Soft skills
  { id:"Behavioral",      icon:"🤝", label:"Behavioral (HR)",    cat:"soft",     pop:true  },
  { id:"Leadership",      icon:"🌟", label:"Leadership",         cat:"soft"                },
  { id:"Problem Solving", icon:"🧩", label:"Problem Solving",    cat:"soft"                },
  { id:"Communication",   icon:"💬", label:"Communication",      cat:"soft"                },
  { id:"Agile & Scrum",   icon:"🔄", label:"Agile / Scrum",      cat:"soft"                },
  { id:"Negotiation",     icon:"🤲", label:"Negotiation",        cat:"soft"                },
] as const;

const KNOWN_TOPICS = new Set<string>(ALL_TOPICS.map(t => t.id));

const CATEGORIES = [
  { id:"all",      label:"All"            },
  { id:"frontend", label:"Frontend"       },
  { id:"backend",  label:"Backend"        },
  { id:"cs",       label:"CS Fundamentals"},
  { id:"data",     label:"Data"           },
  { id:"devops",   label:"DevOps / Cloud" },
  { id:"mobile",   label:"Mobile"         },
  { id:"security", label:"Security"       },
  { id:"testing",  label:"Testing"        },
  { id:"soft",     label:"Soft Skills"    },
];

const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key:"Basics",       label:"Basics",       desc:"Fresher · 0–2 yrs" },
  { key:"Intermediate", label:"Intermediate", desc:"Mid · 2–5 yrs"      },
  { key:"Professional", label:"Professional", desc:"Senior · 5+ yrs"    },
];

function levelToDifficulty(level: Level): Difficulty {
  if (level === "Basics")       return "fresher";
  if (level === "Intermediate") return "mid";
  return "senior";
}

/* ── Utils ───────────────────────────────────────────────── */
function scoreColor(n: number) {
  return n >= 75 ? "var(--success)" : n >= 50 ? "var(--warn)" : "var(--danger)";
}
function normalize(q: string) { return q.trim().toLowerCase().replace(/\s+/g, " "); }
function qScoreColor(n: number) {
  return n >= 8 ? "var(--success)" : n >= 6 ? "var(--warn)" : "var(--danger)";
}

/* ── Score Ring ──────────────────────────────────────────── */
function ScoreRing({
  score, max = 100, size = 140, color, children,
}: {
  score: number; max?: number; size?: number; color: string; children?: React.ReactNode;
}) {
  const r    = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / max, 1);
  return (
    <div style={{ position:"relative", width:size, height:size, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      <svg width={size} height={size} style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${pct * circ} ${(1 - pct) * circ}`}
          strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1s ease" }}
        />
      </svg>
      <div style={{ position:"relative", textAlign:"center", zIndex:1 }}>{children}</div>
    </div>
  );
}

/* ── Generic loading screen ──────────────────────────────── */
function LoadingScreen({ messages }: { messages: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div style={{ padding:"100px 24px 60px", textAlign:"center" }}>
      <div style={{ position:"relative", width:64, height:64, margin:"0 auto 28px" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", border:"3px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin 1s linear infinite" }} />
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className="ti ti-brain" style={{ fontSize:22, color:"var(--accent)" }} />
        </div>
      </div>
      <p style={{ fontSize:16, fontWeight:700, color:"var(--text1)", marginBottom:8, minHeight:26 }}>
        {messages[idx]}
      </p>
      <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:14 }}>
        {messages.map((_, i) => (
          <div key={i} style={{
            height:6, borderRadius:3,
            width: i === idx ? 20 : 6,
            background: i === idx ? "var(--accent)" : "var(--border)",
            transition:"all .4s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── AI Generation Loader ────────────────────────────────── */
function AIGenerationLoader({ topic, level }: { topic: string; level: Level }) {
  const msgs: [string, string][] = [
    ["Analysing topic…",       `Understanding what ${topic} is and how it's typically tested.`],
    ["Identifying key areas…", `Mapping the core concepts, APIs, and common pitfalls in ${topic}.`],
    ["Writing questions…",     `Crafting ${level}-level questions an interviewer would actually ask.`],
    ["Reviewing quality…",     `Checking questions for clarity, depth, and real-world relevance.`],
    ["Almost done…",           `Adding hints and model answers for each question.`],
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ padding:"80px 24px 60px", textAlign:"center", maxWidth:440, margin:"0 auto" }}>
      <div style={{
        width:72, height:72, borderRadius:20, margin:"0 auto 24px",
        background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:32, boxShadow:"0 8px 32px rgba(99,102,241,.35)",
        animation:"float 2s ease-in-out infinite",
      }}>✨</div>
      <div style={{ fontSize:11, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:10 }}>
        AI generating questions for
      </div>
      <div style={{ fontSize:20, fontWeight:800, color:"var(--text1)", marginBottom:24 }}>{topic}</div>
      <div style={{
        padding:"18px 20px", borderRadius:14,
        background:"var(--surface)", border:"1px solid var(--border)",
        marginBottom:20,
      }}>
        <div style={{ fontSize:15, fontWeight:700, color:"var(--text1)", marginBottom:6, minHeight:24 }}>
          {msgs[idx][0]}
        </div>
        <div style={{ fontSize:13, color:"var(--text3)", lineHeight:1.6, minHeight:40 }}>
          {msgs[idx][1]}
        </div>
      </div>
      <div style={{ display:"flex", gap:7, justifyContent:"center" }}>
        {msgs.map((_, i) => (
          <div key={i} style={{
            height:6, borderRadius:3,
            width: i === idx ? 24 : 6,
            background: i === idx ? "#6366f1" : "var(--border)",
            transition:"all .4s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function InterviewPage() {
  const w      = useWindowWidth();
  const mobile = w < 640;

  /* ── Stage ── */
  const [stage, setStage] = useState<Stage>("setup");

  /* ── Setup state ── */
  const [selectedTopics,  setSelectedTopics]  = useState<string[]>([]);
  const [topicMeta,       setTopicMeta]       = useState<Record<string, { label:string; icon:string; color:string; level:Level }>>({});
  const [searchQuery,     setSearchQuery]     = useState("");
  const [aiGenTopic,      setAiGenTopic]      = useState("");

  /* ── Practice state ── */
  const [questions,  setQuestions]  = useState<QuestionItem[]>([]);
  const [answers,    setAnswers]    = useState<AnswerState[]>([]);
  const [currentQ,   setCurrentQ]   = useState(0);
  const [listening,  setListening]  = useState(false);
  const [showGuide,  setShowGuide]  = useState(false);

  /* ── Results state ── */
  const [expandedQ,  setExpandedQ]  = useState<number | null>(null);
  const [resultsTab, setResultsTab] = useState<"overview" | "improve">("overview");

  const recognitionRef  = useRef<any>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  // Per-topic seen questions — persisted in localStorage so same Q never repeats across sessions
  const seenRef = useRef<Record<string, Set<string>>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobsayer-interview-seen");
      if (raw) {
        const parsed: Record<string, string[]> = JSON.parse(raw);
        seenRef.current = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, new Set(v)])
        );
      }
    } catch { /* ignore */ }
  }, []);

  /* ── Derived ── */
  const allAnswered = answers.length > 0 && answers.every(a => a.submitted);
  const avgScore    = allAnswered
    ? Math.round(answers.reduce((s, a) => s + (a.feedback?.score ?? 0), 0) / answers.length * 10) / 10
    : 0;

  // Search-first: show popular by default, filter by query when typing
  const filteredTopics = searchQuery.trim()
    ? (ALL_TOPICS as readonly { id:string; icon:string; label:string; cat:string; pop?:boolean }[])
        .filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : (ALL_TOPICS as readonly { id:string; icon:string; label:string; cat:string; pop?:boolean }[])
        .filter(t => t.pop);

  const customTopicAvailable =
    searchQuery.trim() !== "" &&
    !KNOWN_TOPICS.has(searchQuery.trim()) &&
    !selectedTopics.includes(searchQuery.trim()) &&
    filteredTopics.length === 0;

  /* ── Per-topic result stats ── */
  const topicStats = selectedTopics.map(topicId => {
    const meta = topicMeta[topicId];
    const paired = questions.map((q, i) => ({ q, a: answers[i] })).filter(({ q }) => q.topicId === topicId);
    const submitted = paired.filter(({ a }) => a.submitted);
    const avg = submitted.length
      ? submitted.reduce((s, { a }) => s + (a.feedback?.score ?? 0), 0) / submitted.length
      : 0;
    const improvements = submitted.flatMap(({ a }) => a.feedback?.improvements ?? []);
    return {
      topicId,
      label:        meta?.label ?? topicId,
      icon:         meta?.icon  ?? "✨",
      color:        meta?.color ?? TOPIC_COLORS[0],
      count:        paired.length,
      avg:          Math.round(avg * 10) / 10,
      improvements,
    };
  });

  /* ── Topic selection ── */
  function handleTopicClick(id: string, label: string, icon: string) {
    if (selectedTopics.includes(id)) {
      setSelectedTopics(p => p.filter(t => t !== id));
      setTopicMeta(p => { const n = { ...p }; delete n[id]; return n; });
    } else if (selectedTopics.length < 5) {
      const color = TOPIC_COLORS[selectedTopics.length % TOPIC_COLORS.length];
      setSelectedTopics(p => [...p, id]);
      setTopicMeta(p => ({ ...p, [id]: { label, icon, color, level: "Intermediate" } }));
    }
  }

  function removeTopic(id: string) {
    setSelectedTopics(p => p.filter(t => t !== id));
    setTopicMeta(p => { const n = { ...p }; delete n[id]; return n; });
  }

  function setTopicLevel(id: string, lv: Level) {
    setTopicMeta(p => ({ ...p, [id]: { ...p[id], level: lv } }));
  }

  function addCustomTopic(label: string) {
    const trimmed = label.trim();
    if (!trimmed || selectedTopics.includes(trimmed) || selectedTopics.length >= 5) return;
    const color = TOPIC_COLORS[selectedTopics.length % TOPIC_COLORS.length];
    setSelectedTopics(p => [...p, trimmed]);
    setTopicMeta(p => ({ ...p, [trimmed]: { label: trimmed, icon: "✨", color, level: "Intermediate" } }));
    setSearchQuery("");
  }

  /* ── Start practice ── */
  async function startPractice() {
    if (selectedTopics.length === 0) return;
    const customTopics = selectedTopics.filter(id => !KNOWN_TOPICS.has(id));
    if (customTopics.length > 0) {
      setAiGenTopic(topicMeta[customTopics[0]].label);
    }
    setStage("loading_q");
    try {
      const perTopicResults = await Promise.all(
        selectedTopics.map(async topicId => {
          const meta = topicMeta[topicId];
          const res  = await fetch("/api/interview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action:      "generate_questions",
              targetRole:  meta.label,
              company:     "",
              focusSkill:  meta.label,
              difficulty:  levelToDifficulty(meta.level),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return {
            topicId,
            topicLabel: meta.label,
            topicColor: meta.color,
            isAI:       !KNOWN_TOPICS.has(topicId),
            qs:         data.questions as string[],
          };
        })
      );

      // Filter out previously seen questions per topic
      const deduped = perTopicResults.map(t => {
        const seen = seenRef.current[t.topicId] ?? new Set<string>();
        const fresh = t.qs.filter(q => !seen.has(normalize(q)));
        // If all were seen, reset and use all (better than empty set)
        return { ...t, qs: fresh.length > 0 ? fresh : t.qs };
      });

      // Round-robin interleave
      const merged: QuestionItem[] = [];
      const maxLen = Math.max(...deduped.map(t => t.qs.length));
      for (let i = 0; i < maxLen; i++) {
        deduped.forEach(t => {
          if (t.qs[i]) {
            merged.push({ text: t.qs[i], topicId: t.topicId, topicLabel: t.topicLabel, topicColor: t.topicColor, isAI: t.isAI });
          }
        });
      }

      setQuestions(merged);
      setAnswers(merged.map(() => ({ text:"", feedback:null, loading:false, submitted:false })));
      setCurrentQ(0);
      setShowGuide(false);
      setAiGenTopic("");
      setStage("practice");
    } catch (err: unknown) {
      alert(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setAiGenTopic("");
      setStage("setup");
    }
  }

  /* ── Evaluate ── */
  async function handleEvaluate(idx: number) {
    const a = answers[idx];
    if (!a || a.text.trim().length < 15 || a.submitted || a.loading) return;
    recognitionRef.current?.stop(); setListening(false);
    setAnswers(p => p.map((x, i) => i === idx ? { ...x, loading:true } : x));
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:     "evaluate_answer",
          question:   questions[idx].text,
          answer:     answers[idx].text,
          focusSkill: questions[idx].topicLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnswers(p => p.map((x, i) => i === idx ? { ...x, feedback:data.feedback, loading:false, submitted:true } : x));
    } catch (err: unknown) {
      alert(`Evaluation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setAnswers(p => p.map((x, i) => i === idx ? { ...x, loading:false } : x));
    }
  }

  /* ── Voice ── */
  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input needs Chrome."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-IN";
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      setAnswers(p => p.map((x, i) => i === currentQ ? { ...x, text:t } : x));
    };
    r.onend = () => setListening(false);
    r.start(); recognitionRef.current = r; setListening(true);
  }

  /* ── Finish ── */
  function finishPractice() {
    trackAction("interview_practiced");
    // Persist seen questions so they won't repeat next session
    questions.forEach(q => {
      if (!seenRef.current[q.topicId]) seenRef.current[q.topicId] = new Set();
      seenRef.current[q.topicId].add(normalize(q.text));
    });
    try {
      const serializable = Object.fromEntries(
        Object.entries(seenRef.current).map(([k, v]) => [k, [...v]])
      );
      localStorage.setItem("jobsayer-interview-seen", JSON.stringify(serializable));
    } catch { /* ignore */ }
    setExpandedQ(null);
    setResultsTab("overview");
    setStage("results");
  }

  function resetHistory() {
    seenRef.current = {};
    try { localStorage.removeItem("jobsayer-interview-seen"); } catch { /* ignore */ }
  }

  /* ── Shared styles ── */
  const card: React.CSSProperties = {
    background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:20,
  };
  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 13px", borderRadius:9,
    background:"var(--surface2)", border:"1px solid var(--border)",
    color:"var(--text1)", fontSize:13, fontFamily:"inherit",
  };

  /* ══════════════════════════════════════════════════════════
     STAGE: setup
  ══════════════════════════════════════════════════════════ */
  if (stage === "setup") {
    const sessionQCount = selectedTopics.reduce((acc) => acc + 5, 0); // 5 per topic estimate

    return (
      <AppShell>
        <div style={{ padding: mobile ? "16px 12px 80px" : "24px 24px 80px", maxWidth:700, margin:"0 auto" }}>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{
              width:56, height:56, borderRadius:16, background:"var(--accdim)",
              border:"1px solid var(--accborder)", display:"flex", alignItems:"center",
              justifyContent:"center", margin:"0 auto 12px", fontSize:26,
            }}>
              <i className="ti ti-messages" style={{ color:"var(--accent)" }} />
            </div>
            <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight:800, letterSpacing:"-.02em", marginBottom:6 }}>
              Interview Prep
            </h1>
            <p style={{ fontSize:13, color:"var(--text3)", lineHeight:1.7, maxWidth:380, margin:"0 auto" }}>
              Search or browse topics below — get real interview questions with instant AI feedback.
            </p>
            <button onClick={resetHistory} style={{
              marginTop:10, fontSize:11, color:"var(--text3)", background:"none", border:"none",
              cursor:"pointer", textDecoration:"underline", opacity:0.7,
            }}>
              Reset question history
            </button>
          </div>

          {/* ── Search bar ── */}
          <div style={{ position:"relative", marginBottom:16 }}>
            <i className="ti ti-search" style={{
              position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
              fontSize:18, color:"var(--text3)", pointerEvents:"none",
            }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && customTopicAvailable) addCustomTopic(searchQuery); }}
              placeholder="e.g. React, System Design, Python…"
              style={{ ...inp, paddingLeft:44, paddingTop:13, paddingBottom:13, fontSize:15 }}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{
                position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer", color:"var(--text3)", fontSize:18, lineHeight:1,
              }}>×</button>
            )}
          </div>

          {/* ── Topic pills ── */}
          <div style={{ marginBottom: selectedTopics.length > 0 ? 16 : 0 }}>
            {/* Section label */}
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:10 }}>
              {searchQuery.trim() ? "Results" : "Popular topics"}
              {selectedTopics.length > 0 && (
                <button onClick={() => { setSelectedTopics([]); setTopicMeta({}); }} style={{
                  marginLeft:12, fontSize:11, fontWeight:400, color:"var(--text3)", background:"none",
                  border:"none", cursor:"pointer", textDecoration:"underline", textTransform:"none", letterSpacing:0,
                }}>
                  Clear all
                </button>
              )}
            </div>

            {filteredTopics.length > 0 ? (
              <div style={{ display:"flex", flexWrap:"wrap", gap:9 }}>
                {filteredTopics.map(t => {
                  const selected = selectedTopics.includes(t.id);
                  const meta     = topicMeta[t.id];
                  const color    = meta?.color;
                  const maxed    = !selected && selectedTopics.length >= 5;
                  return (
                    <button key={t.id}
                      onClick={() => handleTopicClick(t.id, t.label, t.icon)}
                      disabled={maxed}
                      style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"9px 16px", borderRadius:99,
                        border:`1.5px solid ${selected ? color! : "var(--border)"}`,
                        background: selected ? `${color}18` : "var(--surface2)",
                        color: selected ? color : "var(--text1)",
                        fontSize:13, fontWeight: selected ? 700 : 400,
                        cursor: maxed ? "not-allowed" : "pointer",
                        opacity: maxed ? 0.38 : 1,
                        transition:"all .12s",
                      }}>
                      <span style={{ fontSize:16, lineHeight:1 }}>{t.icon}</span>
                      <span>{t.label}</span>
                      {selected && <i className="ti ti-check" style={{ fontSize:13, color }} />}
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.trim() ? (
              /* No results → custom topic CTA */
              <div style={{
                padding:"20px 16px", textAlign:"center", borderRadius:12,
                border:"1.5px dashed var(--border)", background:"var(--surface2)",
              }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text1)", marginBottom:4 }}>
                  "{searchQuery}" not in our library
                </div>
                <div style={{ fontSize:12, color:"var(--text3)", marginBottom:14, lineHeight:1.5 }}>
                  We'll use AI to generate questions for this topic.
                </div>
                <button onClick={() => addCustomTopic(searchQuery)} disabled={selectedTopics.length >= 5} style={{
                  padding:"8px 22px", borderRadius:8, border:"none",
                  cursor: selectedTopics.length >= 5 ? "not-allowed" : "pointer",
                  background: selectedTopics.length >= 5 ? "var(--surface2)" : "var(--accent)",
                  color: selectedTopics.length >= 5 ? "var(--text3)" : "#fff",
                  fontSize:13, fontWeight:700,
                }}>
                  {selectedTopics.length >= 5 ? "Max 5 topics" : `✨ Add "${searchQuery}"`}
                </button>
              </div>
            ) : null}

            {/* Custom topic row when search partially matches */}
            {searchQuery.trim() && filteredTopics.length > 0 && !KNOWN_TOPICS.has(searchQuery.trim()) && selectedTopics.length < 5 && (
              <button onClick={() => addCustomTopic(searchQuery)} style={{
                marginTop:10, padding:"8px 16px", borderRadius:99,
                border:"1.5px dashed var(--accent)", background:"var(--accdim)",
                color:"var(--accent)", fontSize:12, fontWeight:700, cursor:"pointer",
                display:"inline-flex", alignItems:"center", gap:6,
              }}>
                ✨ Add "{searchQuery}" as custom topic
              </button>
            )}

            {selectedTopics.length >= 5 && (
              <div style={{ marginTop:10, fontSize:12, color:"var(--text3)" }}>
                Max 5 topics — remove one to add another.
              </div>
            )}
          </div>

          {/* ── Selected topics (chips with level buttons) ── */}
          {selectedTopics.length > 0 && (
            <div style={{ ...card, marginBottom:16, padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>
                Your session — {selectedTopics.length} topic{selectedTopics.length > 1 ? "s" : ""}
                <span style={{ marginLeft:8, fontWeight:400, textTransform:"none", letterSpacing:0 }}>· ~{sessionQCount} questions</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {selectedTopics.map(id => {
                  const m = topicMeta[id];
                  const isCustom = !KNOWN_TOPICS.has(id);
                  return (
                    <div key={id} style={{
                      display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:12,
                      background:"var(--surface2)", borderLeft:`3px solid ${m?.color}`,
                    }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{m?.icon}</span>
                      <span style={{ fontSize:13, fontWeight:700, color: m?.color, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {m?.label}
                        {isCustom && <span style={{ marginLeft:6, fontSize:10, opacity:0.7 }}>✨AI</span>}
                      </span>
                      <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                        {LEVELS.map(lv => {
                          const active = m?.level === lv.key;
                          return (
                            <button key={lv.key} onClick={() => setTopicLevel(id, lv.key)} style={{
                              padding:"3px 9px", borderRadius:6, border:"none", cursor:"pointer",
                              fontSize:11, fontWeight: active ? 700 : 400,
                              background: active ? m?.color : "var(--surface)",
                              color: active ? "#fff" : "var(--text3)",
                              transition:"all .1s",
                            }}>
                              {lv.label === "Basics" ? "Easy" : lv.label === "Intermediate" ? "Mid" : "Pro"}
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={() => removeTopic(id)} style={{
                        width:22, height:22, borderRadius:"50%", border:"none", cursor:"pointer",
                        background:`${m?.color}22`, color: m?.color, fontSize:14, fontWeight:700, flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center", padding:0,
                      }}>×</button>
                    </div>
                  );
                })}
              </div>
              {selectedTopics.some(id => !KNOWN_TOPICS.has(id)) && (
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:7, background:"rgba(99,102,241,.07)", border:"1px solid var(--accborder)", width:"fit-content" }}>
                  <span>✨</span>
                  <span style={{ fontSize:11, color:"var(--accent)", fontWeight:600 }}>AI generation included</span>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <button onClick={startPractice} disabled={selectedTopics.length === 0} style={{
            width:"100%", padding:"15px 24px", borderRadius:12, border:"none",
            background: selectedTopics.length > 0 ? "var(--accent)" : "var(--surface2)",
            color:      selectedTopics.length > 0 ? "#fff"         : "var(--text3)",
            fontSize:15, fontWeight:700, cursor: selectedTopics.length > 0 ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          }}>
            <i className="ti ti-player-play" />
            {selectedTopics.length === 0 ? "Select at least one topic" : "Start Practice →"}
          </button>

        </div>
        <style>{`
          input:focus,textarea:focus,select:focus{outline:2px solid var(--accent);outline-offset:1px}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        `}</style>
      </AppShell>
    );
  }

  /* ══════════════════════════════════════════════════════════
     STAGE: loading_q
  ══════════════════════════════════════════════════════════ */
  if (stage === "loading_q") {
    return (
      <AppShell>
        {aiGenTopic ? (
          <AIGenerationLoader topic={aiGenTopic} level={
            (() => {
              const id = selectedTopics.find(t => !KNOWN_TOPICS.has(t)) ?? selectedTopics[0];
              return (id ? topicMeta[id]?.level : undefined) ?? "Intermediate";
            })()
          } />
        ) : (
          <LoadingScreen messages={[
            "Generating your questions…",
            "Calibrating difficulty level…",
            "Building your practice session…",
            "Almost ready…",
          ]} />
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
      </AppShell>
    );
  }

  /* ══════════════════════════════════════════════════════════
     STAGE: practice
  ══════════════════════════════════════════════════════════ */
  if (stage === "practice") {
    const cur        = answers[currentQ];
    const q          = questions[currentQ];
    const canSubmit  = cur && cur.text.trim().length >= 15 && !cur.submitted && !cur.loading;
    const fb         = cur?.feedback;
    const wordCount  = (cur?.text ?? "").trim().split(/\s+/).filter(Boolean).length;
    const answeredCount = answers.filter(a => a.submitted).length;
    const topicColor = q?.topicColor ?? "var(--accent)";

    return (
      <AppShell actions={
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setStage("setup")} style={{
            display:"flex", alignItems:"center", gap:5, padding:"5px 12px",
            background:"none", border:"1px solid var(--border)", borderRadius:7,
            color:"var(--text3)", fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>
            <i className="ti ti-arrow-left" /> Setup
          </button>
          <span style={{ fontSize:12, color:"var(--text3)" }}>
            {answeredCount}/{questions.length} answered
          </span>
        </div>
      }>
        <div style={{ padding: mobile ? "16px 12px 80px" : "24px 24px 80px", maxWidth:680, margin:"0 auto" }}>

          {/* Progress bar */}
          <div style={{ marginBottom:16 }}>
            <div style={{ height:4, background:"var(--border)", borderRadius:2, overflow:"hidden", marginBottom:8 }}>
              <div style={{
                height:"100%", borderRadius:2,
                width:`${(answeredCount / questions.length) * 100}%`,
                background:`linear-gradient(90deg, ${selectedTopics.slice(0,2).map(id => topicMeta[id]?.color ?? "var(--accent)").join(", ")})`,
                transition:"width .4s ease",
              }} />
            </div>
            {/* Dot nav */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {questions.map((qi, i) => {
                const done   = answers[i]?.submitted;
                const active = i === currentQ;
                const sc     = answers[i]?.feedback?.score ?? 0;
                const dotCol = active ? qi.topicColor : done ? qScoreColor(sc) : "var(--border)";
                return (
                  <button key={i} onClick={() => { setCurrentQ(i); setShowGuide(false); }} style={{
                    width:26, height:26, borderRadius:"50%", border:`2px solid ${dotCol}`,
                    background: active ? dotCol : done ? `${qScoreColor(sc)}18` : "var(--surface2)",
                    color: active ? "#fff" : done ? qScoreColor(sc) : "var(--text3)",
                    fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {done ? answers[i].feedback?.score : i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question card */}
          <div style={{ ...card, marginBottom:12, borderLeft:`3px solid ${topicColor}`, padding:"18px 20px" }}>
            {/* Topic tag */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{
                fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99,
                background:`${topicColor}18`, border:`1px solid ${topicColor}40`,
                color: topicColor,
              }}>
                {q?.topicLabel}
              </span>
              {q?.isAI && (
                <span style={{
                  fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99,
                  background:"rgba(99,102,241,.1)", border:"1px solid var(--accborder)",
                  color:"var(--accent)",
                }}>
                  ✨ AI Generated
                </span>
              )}
              <span style={{ marginLeft:"auto", fontSize:11, color:"var(--text3)" }}>Q{currentQ + 1} / {questions.length}</span>
            </div>
            <p style={{ fontSize: mobile ? 15 : 17, fontWeight:600, lineHeight:1.65, margin:0, color:"var(--text1)" }}>
              {q?.text}
            </p>
          </div>

          {/* STAR guide toggle */}
          <button onClick={() => setShowGuide(v => !v)} style={{
            display:"flex", alignItems:"center", gap:7, padding:"6px 13px", marginBottom:12,
            background: showGuide ? "var(--accdim)" : "none",
            border:`1px solid ${showGuide ? "var(--accborder)" : "var(--border)"}`,
            borderRadius:8, fontSize:12, fontWeight:600,
            color: showGuide ? "var(--accent)" : "var(--text3)", cursor:"pointer",
          }}>
            <i className="ti ti-bulb" /> {showGuide ? "Hide" : "Show"} STAR Guide
          </button>

          {showGuide && (
            <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap:8, marginBottom:14 }}>
              {[
                { l:"S", w:"Situation", c:"var(--accent)",  t:"Set the scene — what was the context?" },
                { l:"T", w:"Task",      c:"#a78bfa",        t:"What was your responsibility?" },
                { l:"A", w:"Action",    c:"var(--warn)",    t:"What did YOU do? Use 'I', not 'we'." },
                { l:"R", w:"Result",    c:"var(--success)", t:"Quantify the outcome." },
              ].map(s => (
                <div key={s.l} style={{ padding:"12px 10px", borderRadius:10, background:"var(--surface)", border:"1px solid var(--border)", textAlign:"center" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:`${s.c}18`, border:`2px solid ${s.c}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 7px", fontSize:13, fontWeight:800, color:s.c }}>{s.l}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:s.c }}>{s.w}</div>
                  <div style={{ fontSize:10, color:"var(--text3)", marginTop:3, lineHeight:1.4 }}>{s.t}</div>
                </div>
              ))}
            </div>
          )}

          {/* Answer or feedback */}
          {!cur?.submitted ? (
            <div style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"var(--text2)" }}>Your Answer</label>
                <button onClick={toggleVoice} style={{
                  display:"flex", alignItems:"center", gap:5, padding:"5px 11px",
                  borderRadius:7, border:`1px solid ${listening ? "var(--danger)" : "var(--border)"}`,
                  background: listening ? "rgba(239,68,68,.1)" : "var(--surface2)",
                  color: listening ? "var(--danger)" : "var(--text3)",
                  fontSize:11, fontWeight:600, cursor:"pointer",
                }}>
                  <i className={`ti ${listening ? "ti-microphone-off" : "ti-microphone"}`} />
                  {listening ? "Stop" : "Speak"}
                </button>
              </div>
              {listening && (
                <div style={{ padding:"7px 12px", borderRadius:8, background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.2)", marginBottom:10, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--danger)" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--danger)", display:"inline-block", animation:"pulse 1s infinite" }} />
                  Recording…
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={cur?.text ?? ""}
                onChange={e => setAnswers(p => p.map((x, i) => i === currentQ ? { ...x, text:e.target.value } : x))}
                placeholder="Use the STAR method: describe the Situation, Task, your Actions, and the Result…"
                rows={8}
                style={{
                  width:"100%", padding:"12px 14px",
                  background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10,
                  color:"var(--text1)", fontSize:14, resize:"vertical", lineHeight:1.65,
                  boxSizing:"border-box" as const, fontFamily:"inherit", outline:"none",
                }}
              />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12 }}>
                <span style={{ fontSize:12, color: wordCount >= 40 ? "var(--success)" : "var(--text3)" }}>
                  {wordCount} words {wordCount < 40 ? "· aim for 40+" : "✓"}
                </span>
                <button onClick={() => handleEvaluate(currentQ)} disabled={!canSubmit} style={{
                  padding:"10px 22px", borderRadius:9, border:"none",
                  background: canSubmit ? topicColor : "var(--surface2)",
                  color: canSubmit ? "#fff" : "var(--text3)",
                  fontSize:14, fontWeight:700, cursor: canSubmit ? "pointer" : "not-allowed",
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  {cur?.loading ? "Evaluating…" : <><i className="ti ti-zap" /> Get Feedback</>}
                </button>
              </div>
            </div>
          ) : fb && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ ...card, display:"flex", alignItems:"center", gap:16, background:`${qScoreColor(fb.score)}08`, borderColor:`${qScoreColor(fb.score)}28` }}>
                <div style={{
                  width:52, height:52, borderRadius:"50%", flexShrink:0,
                  background:`${qScoreColor(fb.score)}18`, border:`2.5px solid ${qScoreColor(fb.score)}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, fontWeight:900, color:qScoreColor(fb.score),
                }}>
                  {fb.score}
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:qScoreColor(fb.score) }}>{fb.verdict}</div>
                  {fb.keyConceptMissed && (
                    <div style={{ fontSize:12, color:"var(--text3)", marginTop:3 }}>
                      Key concept missed: <strong>{fb.keyConceptMissed}</strong>
                    </div>
                  )}
                </div>
              </div>
              {fb.strengths.length > 0 && (
                <div style={{ ...card, borderLeft:"3px solid var(--success)", padding:"14px 16px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--success)", marginBottom:8 }}>✓ What worked</div>
                  {fb.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize:13, color:"var(--text2)", marginBottom:5, display:"flex", gap:8, lineHeight:1.5 }}>
                      <span style={{ color:"var(--success)", flexShrink:0 }}>✓</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {fb.improvements.length > 0 && (
                <div style={{ ...card, borderLeft:"3px solid var(--warn)", padding:"14px 16px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--warn)", marginBottom:8 }}>⚡ Improve</div>
                  {fb.improvements.map((s, i) => (
                    <div key={i} style={{ fontSize:13, color:"var(--text2)", marginBottom:5, display:"flex", gap:8, lineHeight:1.5 }}>
                      <span style={{ color:"var(--warn)", flexShrink:0 }}>→</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {fb.betterAnswer && (
                <div style={{ ...card, borderLeft:"3px solid var(--accent)", padding:"14px 16px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:8 }}>
                    <i className="ti ti-bulb" /> Stronger answer
                  </div>
                  <p style={{ fontSize:13, color:"var(--text2)", margin:0, lineHeight:1.7, fontStyle:"italic", borderLeft:"2px solid var(--accborder)", paddingLeft:12 }}>
                    "{fb.betterAnswer}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20, gap:10 }}>
            <button
              onClick={() => { setCurrentQ(Math.max(0, currentQ - 1)); setShowGuide(false); }}
              disabled={currentQ === 0}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"10px 18px", borderRadius:9,
                background: currentQ === 0 ? "transparent" : "var(--surface)",
                border: currentQ === 0 ? "none" : "1px solid var(--border)",
                color: currentQ === 0 ? "var(--text3)" : "var(--text1)",
                fontSize:13, fontWeight:600, cursor: currentQ === 0 ? "not-allowed" : "pointer",
              }}>
              <i className="ti ti-chevron-left" /> Prev
            </button>

            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => { setCurrentQ(currentQ + 1); setShowGuide(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:6, padding:"10px 22px", borderRadius:9,
                  background: topicColor, color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer",
                }}>
                Next <i className="ti ti-chevron-right" />
              </button>
            ) : allAnswered ? (
              <button onClick={finishPractice} style={{
                padding:"10px 22px", borderRadius:9, background:"var(--success)", color:"#fff",
                border:"none", fontSize:13, fontWeight:700, cursor:"pointer",
                display:"flex", alignItems:"center", gap:6,
              }}>
                See Results <i className="ti ti-trophy" />
              </button>
            ) : (
              <span style={{ fontSize:12, color:"var(--text3)" }}>Answer to continue</span>
            )}
          </div>

        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </AppShell>
    );
  }

  /* ══════════════════════════════════════════════════════════
     STAGE: results
  ══════════════════════════════════════════════════════════ */
  if (stage === "results") {
    const sc      = avgScore;
    const c       = qScoreColor(sc);
    const verdict = sc >= 8 ? "Excellent!" : sc >= 6 ? "Good work" : sc >= 4 ? "Keep Practising" : "Keep Going";

    const allImprovements = topicStats.flatMap(t =>
      t.improvements.map(imp => ({ topic: t.label, color: t.color, imp }))
    );

    return (
      <AppShell actions={
        <button onClick={() => setStage("setup")} style={{
          display:"flex", alignItems:"center", gap:5, padding:"5px 12px",
          background:"none", border:"1px solid var(--border)", borderRadius:7,
          color:"var(--text3)", fontSize:12, cursor:"pointer", fontFamily:"inherit",
        }}>
          <i className="ti ti-arrow-left" /> New Session
        </button>
      }>
        <div style={{ padding: mobile ? "16px 12px 80px" : "24px 24px 80px", maxWidth:680, margin:"0 auto" }}>

          {/* Score hero */}
          <div style={{ ...card, textAlign:"center", marginBottom:22, background:`${c}06`, borderColor:`${c}22`, padding:"32px 24px" }}>
            <div style={{ fontSize:22, marginBottom:14 }}>
              <i className="ti ti-trophy" style={{ color:c }} />
            </div>
            <ScoreRing score={sc} max={10} size={mobile ? 130 : 150} color={c}>
              <div style={{ fontSize: mobile ? 32 : 38, fontWeight:900, color:c, lineHeight:1, letterSpacing:"-.04em" }}>{sc}</div>
              <div style={{ fontSize:10, color:"var(--text3)", marginTop:2 }}>/ 10</div>
            </ScoreRing>
            <div style={{ fontSize:11, color:"var(--text3)", margin:"10px 0 6px" }}>avg score</div>
            <div style={{ fontSize:18, fontWeight:800, color:c }}>{verdict}</div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", justifyContent:"center", marginTop:12 }}>
              {selectedTopics.map(id => {
                const m = topicMeta[id];
                return (
                  <span key={id} style={{ padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:600, background:`${m?.color}18`, border:`1px solid ${m?.color}40`, color:m?.color }}>
                    {m?.icon} {m?.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Per-topic seg cards */}
          {topicStats.length > 1 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--text2)", marginBottom:10 }}>Topic breakdown</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {topicStats.map(t => {
                  const tc = qScoreColor(t.avg);
                  const label = t.avg >= 8 ? "Strong" : t.avg >= 6 ? "Decent" : "Needs work";
                  return (
                    <div key={t.topicId} style={{ ...card, padding:"14px 16px", borderLeft:`3px solid ${t.color}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:20 }}>{t.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"var(--text1)" }}>{t.label}</div>
                          <div style={{ fontSize:11, color:"var(--text3)" }}>{t.count} questions</div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:18, fontWeight:900, color:tc }}>{t.avg}</div>
                          <div style={{ fontSize:10, color:tc, fontWeight:600 }}>{label}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs: Overview / What to Improve */}
          <div style={{ display:"flex", gap:0, marginBottom:16, borderRadius:10, overflow:"hidden", border:"1px solid var(--border)" }}>
            {(["overview","improve"] as const).map((tab, i) => (
              <button key={tab} onClick={() => setResultsTab(tab)} style={{
                flex:1, padding:"10px 0", borderRadius:0, border:"none",
                background: resultsTab === tab ? "var(--accent)" : "var(--surface2)",
                color: resultsTab === tab ? "#fff" : "var(--text3)",
                fontSize:13, fontWeight:700, cursor:"pointer",
                borderRight: i === 0 ? "1px solid var(--border)" : "none",
              }}>
                {tab === "overview" ? "Question Breakdown" : "What to Improve"}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {resultsTab === "overview" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
              {questions.map((qi, i) => {
                const a   = answers[i];
                const f   = a?.feedback;
                const qc  = f ? qScoreColor(f.score) : "var(--text3)";
                const exp = expandedQ === i;
                return (
                  <div key={i} style={{ ...card, borderLeft:`3px solid ${qi.topicColor}`, padding:0, overflow:"hidden" }}>
                    <button
                      onClick={() => setExpandedQ(exp ? null : i)}
                      style={{
                        width:"100%", padding:"13px 16px",
                        background:"none", border:"none", cursor:"pointer",
                        display:"flex", alignItems:"center", gap:12, textAlign:"left" as const,
                      }}>
                      <div style={{
                        width:32, height:32, borderRadius:"50%", flexShrink:0,
                        background:`${qc}18`, border:`2px solid ${qc}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight:800, color:qc,
                      }}>
                        {f?.score ?? "—"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--text1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          Q{i+1}: {qi.text}
                        </div>
                        <div style={{ fontSize:10, color:qi.topicColor, fontWeight:600, marginTop:2 }}>{qi.topicLabel}</div>
                      </div>
                      <i className={`ti ti-chevron-${exp ? "up" : "down"}`} style={{ fontSize:14, color:"var(--text3)", flexShrink:0 }} />
                    </button>
                    {exp && f && (
                      <div style={{ padding:"0 16px 14px", borderTop:"1px solid var(--border)" }}>
                        {f.strengths.length > 0 && (
                          <div style={{ marginTop:12 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"var(--success)", marginBottom:6 }}>✓ What worked</div>
                            {f.strengths.map((s, j) => <div key={j} style={{ fontSize:12, color:"var(--text2)", marginBottom:3 }}>· {s}</div>)}
                          </div>
                        )}
                        {f.improvements.length > 0 && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"var(--warn)", marginBottom:6 }}>⚡ Improve</div>
                            {f.improvements.map((s, j) => <div key={j} style={{ fontSize:12, color:"var(--text2)", marginBottom:3 }}>· {s}</div>)}
                          </div>
                        )}
                        {f.betterAnswer && (
                          <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, background:"var(--surface2)", borderLeft:"2px solid var(--accborder)", fontSize:12, color:"var(--text2)", lineHeight:1.6, fontStyle:"italic" }}>
                            "{f.betterAnswer}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Improve tab */}
          {resultsTab === "improve" && (
            <div style={{ marginBottom:22 }}>
              {allImprovements.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 16px", color:"var(--text3)", fontSize:13 }}>
                  🎉 No major improvements flagged — great job!
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {topicStats.filter(t => t.improvements.length > 0).map(t => (
                    <div key={t.topicId} style={{ ...card, padding:"14px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                        <span style={{ fontSize:18 }}>{t.icon}</span>
                        <span style={{ fontSize:13, fontWeight:700, color: t.color }}>{t.label}</span>
                      </div>
                      {t.improvements.map((imp, j) => (
                        <div key={j} style={{ display:"flex", gap:8, marginBottom:6, fontSize:13, color:"var(--text2)", lineHeight:1.5 }}>
                          <span style={{ color:"var(--warn)", flexShrink:0 }}>→</span>{imp}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Course recommendations for weak topics */}
              {topicStats.filter(t => t.avg < 7).map(t => {
                const courses = getCoursesForSkill(t.label, 2);
                if (!courses.length) return null;
                return (
                  <div key={t.topicId} style={{ ...card, marginTop:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>
                      <i className="ti ti-books" style={{ marginRight:5 }} />Deepen your {t.label} skills
                    </div>
                    <p style={{ fontSize:12, color:"var(--text3)", marginBottom:12, lineHeight:1.5 }}>
                      Practice builds muscle — structured learning accelerates it.
                    </p>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {courses.map(c => <CourseCard key={c.affiliateUrl} course={c} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={() => {
              setSelectedTopics([]);
              setTopicMeta({});
              setSearchQuery("");
              setStage("setup");
            }} style={{
              padding:15, borderRadius:12, border:"none",
              background:"var(--accent)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <i className="ti ti-refresh" /> New Session
            </button>
            <button onClick={startPractice} style={{
              padding:"11px 0", borderRadius:9, border:"1px solid var(--border)",
              background:"var(--surface2)", color:"var(--text2)", fontSize:13, fontWeight:600,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              <i className="ti ti-rotate-clockwise" /> Retry same topics
            </button>
          </div>

        </div>
      </AppShell>
    );
  }

  return null;
}
