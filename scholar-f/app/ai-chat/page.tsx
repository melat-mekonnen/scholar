"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bot, Send, Sparkles, User } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, getToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { StudentPortalShell } from "@/components/student-portal/student-portal-shell"

type ChatApiResponse = {
  intent: string
  recommendations: Array<{
    name?: string
    country?: string
    field?: string
    level?: string
    deadline?: string | null
    funding_type?: string
    score?: number
  }>
  eligibility: string
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

function formatAssistantReply(data: ChatApiResponse): string {
  const parts: string[] = []
  parts.push(`Intent: ${data.intent}`)

  if (data.eligibility?.trim()) {
    parts.push("\n" + data.eligibility.trim())
  }

  if (data.recommendations?.length) {
    parts.push("\nRecommendations:")
    for (const r of data.recommendations) {
      const line = [
        r.name,
        r.country && `(${r.country})`,
        r.field && ` · ${r.field}`,
        r.level && ` · ${r.level}`,
        r.deadline && ` · deadline ${r.deadline}`,
        r.funding_type && ` · ${r.funding_type}`,
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

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending || quotaExhausted) return

    setInput("")
    setMessages((m) => [...m, { role: "user", content: text }])
    setSending(true)

    const { res, data, errorMessage } = await apiFetchJson<ChatApiResponse>("/api/chatbot/query", {
      method: "POST",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, topK: 8 }),
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
        description: errorMessage || "Is the Scholar AI service running? Check AI_SERVICE_URL on the backend.",
        variant: "destructive",
      })
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            errorMessage?.trim() ||
            "Sorry, the assistant could not respond. Is the Scholar AI service running on the URL set in AI_SERVICE_URL?",
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
    <StudentPortalShell
      title={t("AI Chatbot")}
      subtitle={quotaSubtitle ?? "Answers use your profile and verified scholarships."}
      hero={{
        title: t("AI Chatbot"),
        description: "Ask about scholarships, deadlines, and eligibility in natural language.",
      }}
      headerEnd={<StudentLanguageToggle />}
      mainClassName="flex flex-1 flex-col gap-3 p-6"
    >
        
          {quotaExhausted ? (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  You have used all free AI chat messages for today. Upgrade to Pro for unlimited chat.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings/subscription">View plans</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <Card className="flex flex-1 rounded-2xl border-blue-100/80 bg-white shadow-sm flex-col overflow-hidden min-h-105">
            <CardContent className="flex flex-1 flex-col gap-3 p-0">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4">
                <div className="space-y-4 pb-2">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {msg.role === "assistant" ? (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Bot className="h-4 w-4" />
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[min(100%,42rem)] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                          msg.role === "user" ? "bg-blue-600 text-white" : "bg-muted",
                        )}
                      >
                        {msg.content}
                      </div>
                      {msg.role === "user" ? (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4" />
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {sending ? (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <Bot className="h-4 w-4" />
                      Thinking…
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="border-t p-3 space-y-2">
                <Textarea
                  placeholder="Ask about scholarships, deadlines, or eligibility…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  disabled={sending || quotaExhausted}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
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
        
    </StudentPortalShell>
  )
}
