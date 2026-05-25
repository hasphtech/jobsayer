/**
 * @jobsayer/ai — Groq LLM client
 *
 * Two-tier model routing:
 *   Quality lane : llama-3.3-70b-versatile  — full rewrites, ~1-2 s
 *   Fast lane    : llama-3.1-8b-instant     — quick chips, sub-500 ms
 *
 * Server-side only. Never import in client components.
 * Requires GROQ_API_KEY environment variable.
 */
import Groq from "groq-sdk";

let _groq: Groq | null = null;

function client(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

/** Full rewrite — 70B, higher quality, ~1-2 s */
export async function groqRewrite(
  systemPrompt: string,
  userContent:  string,
): Promise<string> {
  const res = await client().chat.completions.create({
    model:       "llama-3.3-70b-versatile",
    messages:    [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userContent  },
    ],
    max_tokens:  600,
    temperature: 0.5,
  });
  return res.choices[0].message.content ?? "";
}

/** Quick suggestion — 8B, sub-500 ms */
export async function groqQuick(prompt: string): Promise<string> {
  const res = await client().chat.completions.create({
    model:       "llama-3.1-8b-instant",
    messages:    [{ role: "user", content: prompt }],
    max_tokens:  300,
    temperature: 0.4,
  });
  return res.choices[0].message.content ?? "";
}
