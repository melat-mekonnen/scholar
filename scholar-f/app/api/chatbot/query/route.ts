import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:4000"
const CHAT_TIMEOUT_MS = 300_000

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const body = await req.text()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

  try {
    const res = await fetch(`${BACKEND_URL}/api/chatbot/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
      signal: controller.signal,
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    })
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("aborted"))
    return NextResponse.json(
      {
        message: timedOut
          ? "Chat request timed out. Scholar-ML/Ollama may still be loading — try again in a moment."
          : "Could not reach the backend chat service.",
      },
      { status: timedOut ? 504 : 502 },
    )
  } finally {
    clearTimeout(timer)
  }
}
