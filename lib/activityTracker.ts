/**
 * activityTracker.ts
 * XP-based gamification engine for jobSayer.
 * All state stored in localStorage — zero DB dependency.
 *
 * Usage:
 *   import { trackAction, getXPState } from "@/lib/activityTracker";
 *   trackAction("interview_practiced");
 *   const state = getXPState();
 */

/* ── Types ───────────────────────────────────────────────────── */
export type ActionType =
  | "resume_built"
  | "resume_updated"
  | "resume_scored"
  | "cover_letter_generated"
  | "interview_practiced"
  | "job_saved"
  | "job_applied"
  | "skill_proof_added"
  | "career_health_checked"
  | "salary_checked"
  | "bgv_submitted"
  | "career_gps_used"
  | "profile_completed"
  | "daily_login";

export interface ActivityEntry {
  type:   ActionType;
  label:  string;
  xp:     number;
  ts:     string;  // ISO
}

export interface BadgeDefinition {
  id:          string;
  label:       string;
  icon:        string;
  description: string;
  check:       (state: XPState) => boolean;
}

export interface WeeklyGoal {
  id:       string;
  label:    string;
  target:   number;
  unit:     string;
  action:   ActionType;
  progress: number;
  done:     boolean;
}

export interface ScoreSnapshot {
  score: number;
  ts:    string;  // ISO date (YYYY-MM-DD)
}

export interface XPState {
  totalXP:        number;
  weekXP:         number;   // XP earned in current ISO week
  weekStart:      string;   // ISO date of current week's Monday
  level:          number;   // 1–7
  log:            ActivityEntry[];
  badges:         string[];  // badge IDs earned
  weeklyGoals:    WeeklyGoal[];
  scoreHistory:   ScoreSnapshot[];
  lastActive:     string;   // ISO date
  streakDays:     number;
  lastStreakDate: string;
}

/* ── XP per action ───────────────────────────────────────────── */
export const ACTION_XP: Record<ActionType, number> = {
  resume_built:           60,
  resume_updated:         20,
  resume_scored:          30,
  cover_letter_generated: 25,
  interview_practiced:    45,
  job_saved:              10,
  job_applied:            25,
  skill_proof_added:      35,
  career_health_checked:  40,
  salary_checked:         10,
  bgv_submitted:          50,
  career_gps_used:        15,
  profile_completed:      50,
  daily_login:            5,
};

export const ACTION_LABELS: Record<ActionType, string> = {
  resume_built:           "Built resume",
  resume_updated:         "Updated resume",
  resume_scored:          "Scored resume",
  cover_letter_generated: "Generated cover letter",
  interview_practiced:    "Practiced interview",
  job_saved:              "Saved a job",
  job_applied:            "Applied to a job",
  skill_proof_added:      "Added skill proof",
  career_health_checked:  "Completed career checkup",
  salary_checked:         "Checked salary data",
  bgv_submitted:          "Submitted BGV",
  career_gps_used:        "Used Career GPS",
  profile_completed:      "Completed profile",
  daily_login:            "Daily check-in",
};

/* ── Level system ────────────────────────────────────────────── */
export interface LevelInfo {
  level:      number;
  title:      string;
  icon:       string;
  minXP:      number;
  maxXP:      number;
  color:      string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, title: "Job Seeker",     icon: "🌱", minXP: 0,    maxXP: 100,  color: "#94a3b8" },
  { level: 2, title: "Active Mover",   icon: "🚀", minXP: 101,  maxXP: 300,  color: "#60a5fa" },
  { level: 3, title: "Career Builder", icon: "⚡", minXP: 301,  maxXP: 600,  color: "#818cf8" },
  { level: 4, title: "Pro Candidate",  icon: "🎯", minXP: 601,  maxXP: 1000, color: "#a78bfa" },
  { level: 5, title: "Career Pro",     icon: "🏆", minXP: 1001, maxXP: 1500, color: "#f59e0b" },
  { level: 6, title: "Top Talent",     icon: "💎", minXP: 1501, maxXP: 2200, color: "#10b981" },
  { level: 7, title: "Career Master",  icon: "👑", minXP: 2201, maxXP: 99999, color: "#f97316" },
];

export function getLevelInfo(xp: number): LevelInfo & { progressPct: number; xpToNext: number } {
  const lvl = LEVELS.findLast(l => xp >= l.minXP) ?? LEVELS[0];
  const progressPct = lvl.level === 7
    ? 100
    : Math.round(((xp - lvl.minXP) / (lvl.maxXP - lvl.minXP)) * 100);
  const xpToNext = lvl.level === 7 ? 0 : lvl.maxXP - xp;
  return { ...lvl, progressPct, xpToNext };
}

/* ── Badge definitions ───────────────────────────────────────── */
export const BADGES: BadgeDefinition[] = [
  {
    id: "first_resume",     icon: "📄", label: "First Resume",
    description: "Built your first resume",
    check: s => s.log.some(a => a.type === "resume_built"),
  },
  {
    id: "score_chaser",     icon: "🎯", label: "Score Chaser",
    description: "Scored your resume 3+ times",
    check: s => s.log.filter(a => a.type === "resume_scored").length >= 3,
  },
  {
    id: "interview_ready",  icon: "🎤", label: "Interview Ready",
    description: "Practiced 5+ interviews",
    check: s => s.log.filter(a => a.type === "interview_practiced").length >= 5,
  },
  {
    id: "skill_builder",    icon: "⚡", label: "Skill Builder",
    description: "Added 3+ skill proofs",
    check: s => s.log.filter(a => a.type === "skill_proof_added").length >= 3,
  },
  {
    id: "health_guru",      icon: "🏥", label: "Health Guru",
    description: "Completed 3 career health checks",
    check: s => s.log.filter(a => a.type === "career_health_checked").length >= 3,
  },
  {
    id: "negotiator",       icon: "💰", label: "Negotiator",
    description: "Used the salary intelligence tool",
    check: s => s.log.some(a => a.type === "salary_checked"),
  },
  {
    id: "cover_artist",     icon: "✉️", label: "Cover Artist",
    description: "Generated 3+ cover letters",
    check: s => s.log.filter(a => a.type === "cover_letter_generated").length >= 3,
  },
  {
    id: "job_hunter",       icon: "🔎", label: "Job Hunter",
    description: "Applied to 10+ jobs",
    check: s => s.log.filter(a => a.type === "job_applied").length >= 10,
  },
  {
    id: "verified",         icon: "🛡", label: "Verified",
    description: "Submitted for background verification",
    check: s => s.log.some(a => a.type === "bgv_submitted"),
  },
  {
    id: "consistent",       icon: "🔥", label: "Consistent",
    description: "7-day login streak",
    check: s => s.streakDays >= 7,
  },
  {
    id: "navigator",        icon: "🧭", label: "Navigator",
    description: "Used Career GPS 3+ times",
    check: s => s.log.filter(a => a.type === "career_gps_used").length >= 3,
  },
  {
    id: "centurion",        icon: "💯", label: "Centurion",
    description: "Earned 1000+ XP total",
    check: s => s.totalXP >= 1000,
  },
];

/* ── Week helpers ────────────────────────────────────────────── */
function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Monday = week start
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getDefaultGoals(weekStart: string): WeeklyGoal[] {
  return [
    { id: "g1", label: "Practice interviews",  target: 3,  unit: "sessions", action: "interview_practiced", progress: 0, done: false },
    { id: "g2", label: "Apply to jobs",        target: 5,  unit: "jobs",     action: "job_applied",         progress: 0, done: false },
    { id: "g3", label: "Update your resume",   target: 1,  unit: "time",     action: "resume_updated",       progress: 0, done: false },
  ];
}

/* ── Storage ─────────────────────────────────────────────────── */
const STORAGE_KEY = "jobsayer-xp";

function defaultState(): XPState {
  const weekStart = getWeekStart();
  return {
    totalXP: 0, weekXP: 0, weekStart,
    level: 1, log: [], badges: [],
    weeklyGoals: getDefaultGoals(weekStart),
    scoreHistory: [], lastActive: "", streakDays: 0, lastStreakDate: "",
  };
}

export function getXPState(): XPState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const state: XPState = JSON.parse(raw);
    // Roll over weekly goals if week changed
    const currentWeekStart = getWeekStart();
    if (state.weekStart !== currentWeekStart) {
      state.weekStart  = currentWeekStart;
      state.weekXP     = 0;
      state.weeklyGoals = getDefaultGoals(currentWeekStart);
    }
    return state;
  } catch {
    return defaultState();
  }
}

function saveState(state: XPState): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

/* ── Core API ────────────────────────────────────────────────── */
export function trackAction(type: ActionType, dedupeMinutes = 0): XPState {
  const state = getXPState();
  const xp    = ACTION_XP[type];
  const label = ACTION_LABELS[type];
  const now   = new Date();
  const ts    = now.toISOString();
  const today = ts.split("T")[0];

  // Dedupe: don't award same action within dedupeMinutes
  if (dedupeMinutes > 0) {
    const recent = state.log.find(e =>
      e.type === type &&
      (now.getTime() - new Date(e.ts).getTime()) < dedupeMinutes * 60 * 1000
    );
    if (recent) return state;
  }

  // Log entry
  state.log.unshift({ type, label, xp, ts });
  if (state.log.length > 200) state.log = state.log.slice(0, 200);

  // XP
  state.totalXP += xp;
  state.weekXP  += xp;

  // Level
  state.level = (LEVELS.findLast(l => state.totalXP >= l.minXP) ?? LEVELS[0]).level;

  // Weekly goals
  state.weeklyGoals = state.weeklyGoals.map(g => {
    if (g.action !== type || g.done) return g;
    const progress = g.progress + 1;
    return { ...g, progress, done: progress >= g.target };
  });

  // Streak
  if (state.lastStreakDate !== today) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];
    state.streakDays   = state.lastStreakDate === yStr ? state.streakDays + 1 : 1;
    state.lastStreakDate = today;
  }
  state.lastActive = today;

  // Badges — check all unearned
  for (const badge of BADGES) {
    if (!state.badges.includes(badge.id) && badge.check(state)) {
      state.badges.push(badge.id);
    }
  }

  saveState(state);
  return state;
}

/** Record an ATS score snapshot (call from score page) */
export function recordScore(score: number): void {
  const state = getXPState();
  const today = new Date().toISOString().split("T")[0];
  // Replace today's entry or append
  const idx = state.scoreHistory.findIndex(s => s.ts === today);
  if (idx >= 0) state.scoreHistory[idx].score = score;
  else state.scoreHistory.push({ score, ts: today });
  // Keep last 30 days
  state.scoreHistory = state.scoreHistory.slice(-30);
  saveState(state);
}

/** Returns stats derived from other localStorage keys (applications, resume, etc.) */
export function getDerivedStats(): {
  applicationsTotal:  number;
  applicationsActive: number;
  offersCount:        number;
  interviewsTotal:    number;
  skillProofsCount:   number;
  resumeScore:        number | null;
} {
  let applicationsTotal = 0, applicationsActive = 0, offersCount = 0;
  let skillProofsCount = 0, resumeScore: number | null = null;

  try {
    const apps = JSON.parse(localStorage.getItem("jobsayer-applications") ?? "[]");
    applicationsTotal  = apps.length;
    applicationsActive = apps.filter((a: { stage: string }) =>
      ["applied","screening","interview"].includes(a.stage)).length;
    offersCount        = apps.filter((a: { stage: string }) => a.stage === "offer").length;
  } catch { /* ignore */ }

  try {
    const proofs = JSON.parse(localStorage.getItem("jobsayer-skill-proofs") ?? "[]");
    skillProofsCount = proofs.length;
  } catch { /* ignore */ }

  try {
    const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const snaps: ScoreSnapshot[] = hist.scoreHistory ?? [];
    if (snaps.length) resumeScore = snaps[snaps.length - 1].score;
  } catch { /* ignore */ }

  const state = getXPState();
  const interviewsTotal = state.log.filter(a => a.type === "interview_practiced").length;

  return { applicationsTotal, applicationsActive, offersCount, interviewsTotal, skillProofsCount, resumeScore };
}
