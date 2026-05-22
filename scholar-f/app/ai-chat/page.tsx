"use client"

import { Bot, MessageSquare, Send, User } from "lucide-react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import { clearToken, getToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { StudentLanguageToggle } from "@/components/student-language-toggle"

type EligibilityMatch = {
  profile_field: string
  profile_value?: string | null
  scholarship_field: string
  scholarship_value?: string | null
  status: string
  detail: string
}

type ScholarshipEligibility = {
  scholarship_id?: string
  title?: string
  overall: string
  matches: EligibilityMatch[]
}

type ChatApiResponse = {
  source?: "scholar-ml" | "scholar-ai"
  answer?: string
  mode?: string
  profile_loaded?: boolean
  citations?: Array<{
    scholarship_id?: string
    title?: string
    url?: string
    chunk_id?: string
  }>
  eligibility?: string | ScholarshipEligibility[]
  intent?: string
  recommendations: Array<{
    name?: string
    country?: string
    field?: string
    level?: string
    deadline?: string | null
    funding_type?: string
    score?: number
    url?: string
  }>
  deadlines: Array<{
    name?: string
    deadline?: string | null
    daysLeft?: number | null
    urgency?: string
  }>
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type ChatQuota = {
  plan: string
  unlimited: boolean
  used: number | null
  limit: number | null
  remaining: number | null
  resetsAt: string
  expiresAt?: string | null
}

type ChatErrorBody = {
  message?: string
  code?: string
  used?: number
  limit?: number
  remaining?: number
  resetsAt?: string
}

const QUICK_PROMPTS = [
  "Scholarships for computer science in Europe",
  "What deadlines are coming up soon?",
  "Am I eligible for master's funding abroad?",
]

function matchStatusLabel(status: string): string {
  if (status === "match") return "Match"
  if (status === "partial") return "Partial"
  if (status === "mismatch") return "Mismatch"
  return "Unknown"
}

function formatAssistantReply(data: ChatApiResponse): string {
  if (data.source === "scholar-ml" || data.answer) {
    const parts: string[] = []

    if (data.answer?.trim()) {
      parts.push(data.answer.trim())
    }

    if (Array.isArray(data.eligibility) && data.eligibility.length > 0) {
      parts.push("\n--- Your profile vs scholarships ---")
      if (data.profile_loaded === false) {
        parts.push(
          "Complete your student profile in Settings for personalized eligibility matching.",
        )
      }
      for (const item of data.eligibility) {
        parts.push(
          `\n${item.title || "Scholarship"} — ${(item.overall || "unknown").replace(/_/g, " ")}`,
        )
        for (const match of item.matches || []) {
          parts.push(`• ${matchStatusLabel(match.status)}: ${match.detail}`)
        }
      }
    }

    if (data.citations?.length) {
      parts.push("\nSources:")
      for (const citation of data.citations) {
        parts.push(`• ${citation.title || "Scholarship"}${citation.url ? ` — ${citation.url}` : ""}`)
      }
    }

    return parts.join("\n").trim()
  }

  const parts: string[] = []
  if (data.intent) {
    parts.push(`Intent: ${data.intent}`)
  }

  if (typeof data.eligibility === "string" && data.eligibility.trim()) {
    parts.push("\n" + data.eligibility.trim())
  }

  if (data.recommendations?.length) {
    parts.push("\nRecommendations:")
    for (const r of data.recommendations) {
      const line = [
        r.name,
        r.country && `(${r.country})`,
        r.field && `· ${r.field}`,
        r.level && `· ${r.level}`,
        r.deadline && `· deadline ${r.deadline}`,
        r.funding_type && `· ${r.funding_type}`,
      ]
        .filter(Boolean)
        .join(" ")
      parts.push(`• ${line}`)
    }
  }

  if (data.deadlines?.length) {
    parts.push("\nDeadlines:")
    for (const d of data.deadlines) {
      const left =
        d.daysLeft != null ? ` (${d.daysLeft} days left${d.urgency ? `, ${d.urgency}` : ""})` : ""
      parts.push(`• ${d.name ?? "Scholarship"}${d.deadline ? ` — ${d.deadline}` : ""}${left}`)
    }
  }

  return parts.join("\n").trim()
}

export default function AiChatPage() {
  const router = useRouter()
  const { t } = useStudentI18n()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [quota, setQuota] = useState<ChatQuota | null>(null)
  const [quotaLoading, setQuotaLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask in your own words about scholarships (funding, country, field, deadlines). Examples are just ideas — you don't have to copy them.",
    },
  ])

  useEffect(() => {
    if (!getToken()) {
      router.replace("/signin")
    }
  }, [router])

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  async function loadQuota() {
    setQuotaLoading(true)
    const { res, data } = await apiFetchJson<ChatQuota>("/api/chatbot/quota", {
      method: "GET",
      auth: true,
    })
    if (res.ok && data) {
      setQuota(data)
    }
    setQuotaLoading(false)
  }

  useEffect(() => {
    if (getToken()) {
      void loadQuota()
    }
  }, [])

  const quotaExhausted =
    quota != null && !quota.unlimited && (quota.remaining ?? 0) <= 0

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text || sending || quotaExhausted) return

    setInput("")
    setMessages((m) => [...m, { role: "user", content: text }])
    setSending(true)

    const { res, data, errorMessage } = await apiFetchJson<ChatApiResponse>("/api/chatbot/query", {
      method: "POST",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, topK: 8 }),
      signal: AbortSignal.timeout(300_000),
    })

    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      setSending(false)
      return
    }

    if (res.status === 402) {
      const body = data as unknown as ChatErrorBody | null
      void loadQuota()
      toast({
        title: "Daily limit reached",
        description:
          errorMessage ||
          "You have used your 3 free AI chat messages for today. Upgrade to Pro for unlimited chat.",
        variant: "destructive",
      })
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Daily free limit reached (${body?.used ?? 3}/${body?.limit ?? 3} messages). Upgrade to Pro in Settings for unlimited AI chat. Resets at ${body?.resetsAt ? new Date(body.resetsAt).toLocaleString() : "midnight UTC"}.`,
        },
      ])
      setSending(false)
      return
    }

    if (!res.ok || !data) {
      toast({
        title: "Chat failed",
        description:
          errorMessage ||
          "Is the chat service running? Check SCHOLAR_ML_CHAT_URL or AI_SERVICE_URL on the backend.",
        variant: "destructive",
      })
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            errorMessage?.trim() ||
            "Sorry, the assistant could not respond. Ensure scholar-ml (8020) or scholar-ai (8010) is running and the backend env URL matches.",
        },
      ])
      setSending(false)
      return
    }

    setMessages((m) => [...m, { role: "assistant", content: formatAssistantReply(data) }])
    void loadQuota()
    setSending(false)
  }

  const quotaSubtitle =
    !quotaLoading && quota
      ? quota.unlimited
        ? "Pro — unlimited chat"
        : `Free plan: ${quota.remaining ?? 0} of ${quota.limit ?? 3} messages left today`
      : undefined

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <StudentPortalInlineAside />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-emerald-950">{t("AI Chatbot")}</h1>
            <p className="text-xs text-slate-600">
              {quotaSubtitle ?? "Answers use your profile and verified scholarships, plus the AI reference dataset."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6">
          <div className="pointer-events-none absolute -left-20 top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="rounded-2xl border border-emerald-100/80 bg-white px-5 py-4 shadow-sm shadow-emerald-900/5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Scholarship assistant</h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Ask about funding, countries, fields, eligibility, or deadlines in plain language.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/ai-matches">{t("AI Matches")}</Link>
              </Button>
            </div>
          </div>

          {quotaExhausted ? (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  You have used all free AI chat messages for today. Upgrade to Pro for unlimited chat.
                </p>
                <Button variant="outline" size="sm" asChild className="border-amber-300">
                  <Link href="/settings/subscription">View plans</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
            <CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0">
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:px-5">
                <div className="space-y-4 pb-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {msg.role === "assistant" ? (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                          <Bot className="h-4 w-4" />
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[min(100%,42rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                          msg.role === "user"
                            ? "bg-emerald-600 text-white shadow-emerald-900/10"
                            : "border border-emerald-100/80 bg-emerald-50/60 text-slate-800",
                        )}
                      >
                        {msg.content}
                      </div>
                      {msg.role === "user" ? (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
                          <User className="h-4 w-4" />
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {sending ? (
                    <div className="flex items-center gap-2.5 text-sm text-slate-500">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                        <Bot className="h-4 w-4 animate-pulse" />
                      </div>
                      <span className="rounded-2xl border border-emerald-100/80 bg-emerald-50/60 px-3.5 py-2 text-slate-600">
                        Thinking…
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 border-t border-emerald-100/80 bg-slate-50/50 p-3 sm:p-4">
                {!sending && messages.length <= 1 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}
                <Textarea
                  placeholder="Ask about scholarships, deadlines, or eligibility…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  disabled={sending || quotaExhausted}
                  className="resize-none border-emerald-200/80 bg-white focus-visible:border-emerald-300 focus-visible:ring-emerald-200/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="hidden text-xs text-slate-500 sm:block">Enter to send · Shift+Enter for new line</p>
                  <Button
                    type="button"
                    className="ml-auto bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => void sendMessage()}
                    disabled={sending || quotaExhausted || !input.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
