/**
 * GET|POST /api/python/[...path]
 *
 * Transparent proxy to the Python FastAPI microservice.
 * Only active when PYTHON_SERVICE_URL env var is set.
 * Adds the shared X-Service-Key header for auth.
 *
 * Usage from client:
 *   await fetch("/api/python/score-ats", { method: "POST", body: JSON.stringify({...}) })
 *
 * Without PYTHON_SERVICE_URL:
 *   Returns 503 with { error: "Python service not configured" }
 */
import { NextRequest, NextResponse } from "next/server";

const SERVICE_URL    = process.env.PYTHON_SERVICE_URL;
const SERVICE_SECRET = process.env.PYTHON_SERVICE_SECRET ?? "";

export async function GET(req: NextRequest) {
  return proxy(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxy(req, "POST");
}

async function proxy(req: NextRequest, method: string): Promise<NextResponse> {
  if (!SERVICE_URL) {
    return NextResponse.json(
      { error: "Python service not configured", hint: "Set PYTHON_SERVICE_URL in .env" },
      { status: 503 }
    );
  }

  // Extract sub-path from /api/python/[...path]
  const subPath = req.nextUrl.pathname.replace(/^\/api\/python/, "");

  const targetUrl = `${SERVICE_URL.replace(/\/$/, "")}${subPath}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_SECRET,
    "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "",
  };

  let body: string | undefined;
  if (method === "POST") {
    try { body = await req.text(); } catch { /* no body */ }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(30_000), // 30 s timeout
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[python-proxy] error:", err);
    return NextResponse.json(
      { error: "Python service unavailable", detail: String(err) },
      { status: 502 }
    );
  }
}
