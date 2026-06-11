/**
 * @jobsayer/ai — Groq LLM client
 *
 * Two-tier model routing:
 *   Quality lane : llama-3.3-70b-versatile  — full rewrites, ~1-2 s
 *   Fast lane    : llama-3.1-8b-instant     — quick chips, sub-500 ms
 *
 * Resilience:
 *   - Exponential backoff retry (3 attempts, 400 ms base)
 *   - Auto-fallback: 70B → 8B on 429 (rate-limited) or 503 (overloaded)
 *   - Hard timeout: 15 s per attempt (prevents Vercel function timeouts)
 *   - Jitter on retry delays to avoid thundering herd
 *
 * Server-side only. Never import in client components.
 * Requires GROQ_API_KEY environment variable.
 */
import Groq from "groq-sdk";

/* ── Models ──────────────────────────────────────────────────────── */

const MODEL_QUALITY = "llama-3.3-70b-versatile";
const MODEL_FAST    = "llama-3.1-8b-instant";

/* ── Client singleton ────────────────────────────────────────────── */

let _groq: Groq | null = null;

function client(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

/* ── Retry + fallback logic ──────────────────────────────────────── */

const MAX_RETRIES = 3;
const BASE_DELAY  = 400;    // ms
const TIMEOUT_MS  = 15_000; // 15 s hard limit per attempt

/** Status codes that warrant a retry */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** Status codes that warrant immediate fallback to smaller model */
const FALLBACK_NOW = new Set([429, 503]);

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function jitter(base: number): number {
  // ±25% jitter to avoid thundering herd
  return base * (0.75 + Math.random() * 0.5);
}

interface CallOptions {
  model:       string;
  messages:    Groq.Chat.ChatCompletionMessageParam[];
  maxTokens:   number;
  temperature: number;
}

async function callWithRetry(
  opts:          CallOptions,
  fallbackModel: string | null = null,
): Promise<string> {
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await client().chat.completions.create(
        {
          model:       opts.model,
          messages:    opts.messages,
          max_tokens:  opts.maxTokens,
          temperature: opts.temperature,
        },
        { signal: controller.signal },
      );

      clearTimeout(timer);
      return res.choices[0]?.message?.content ?? "";

    } catch (err: unknown) {
      lastErr = err as Error;

      const status = (err as { status?: number }).status ?? 0;

      // Immediately fall back to smaller model on rate-limit / overload
      if (FALLBACK_NOW.has(status) && fallbackModel && opts.model !== fallbackModel) {
        console.warn(`[groq] ${status} on ${opts.model} — falling back to ${fallbackModel}`);
        return callWithRetry({ ...opts, model: fallbackModel }, null);
      }

      // No more retries for non-retryable errors
      if (!RETRYABLE.has(status) && status !== 0) throw err;

      // Exponential back-off before next attempt
      if (attempt < MAX_RETRIES - 1) {
        const delay = jitter(BASE_DELAY * Math.pow(2, attempt));
        console.warn(`[groq] attempt ${attempt + 1} failed (${status}) — retrying in ${Math.round(delay)}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastErr ?? new Error("Groq: max retries exceeded");
}

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * Full rewrite — 70B, higher quality, ~1-2 s.
 * Falls back to 8B on 429/503.
 */
export async function groqRewrite(
  systemPrompt: string,
  userContent:  string,
): Promise<string> {
  return callWithRetry(
    {
      model:       MODEL_QUALITY,
      messages:    [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userContent  },
      ],
      maxTokens:   600,
      temperature: 0.5,
    },
    MODEL_FAST, // fallback
  );
}

/**
 * Quick suggestion — 8B, sub-500 ms.
 * Retries on transient errors; no further fallback.
 */
export async function groqQuick(prompt: string): Promise<string> {
  return callWithRetry(
    {
      model:       MODEL_FAST,
      messages:    [{ role: "user", content: prompt }],
      maxTokens:   300,
      temperature: 0.4,
    },
    null, // already the fast/small model — no fallback
  );
}

/**
 * JSON-mode call — parses response as JSON, throws on parse failure.
 * Uses quality model with fallback.
 */
export async function groqJSON<T>(
  systemPrompt: string,
  userContent:  string,
  maxTokens     = 800,
): Promise<T> {
  const raw = await callWithRetry(
    {
      model:       MODEL_QUALITY,
      messages:    [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userContent  },
      ],
      maxTokens,
      temperature: 0.3, // lower temp for structured output
    },
    MODEL_FAST,
  );

  // Strip markdown code fences if Groq wraps JSON in ```json ... ```
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Groq JSON parse failed. Raw: ${raw.slice(0, 200)}`);
  }
}

/** Expose model names for logging / analytics */
export const GROQ_MODELS = { QUALITY: MODEL_QUALITY, FAST: MODEL_FAST } as const;
