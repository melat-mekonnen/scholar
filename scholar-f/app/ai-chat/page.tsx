"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bot, Send, Sparkles, User } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, getToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StudentLanguageToggle } from "@/components/student-language-toggle"

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

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn("block text-sm font-medium hover:text-primary", active && "text-primary")}
    >
      {children}
    </Link>
  )
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask in your own words about scholarships (funding, country, field, deadlines). Examples are just ideas — you don’t have to copy them.",
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

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return

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
    setSending(false)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-6 md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">{t("Scholarship Portal")}</h2>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            {t("AI Chatbot")}
          </p>
        </div>
        <nav className="space-y-3">
          <NavLink href="/dashboard">{t("Dashboard")}</NavLink>
          <NavLink href="/scholarships">{t("Browse Scholarships")}</NavLink>
          <NavLink href="/applications">{t("My Applications")}</NavLink>
          <NavLink href="/community">{t("Community")}</NavLink>
          <NavLink href="/saved">{t("Saved Scholarships")}</NavLink>
          <NavLink href="/ai-matches">{t("AI Matches")}</NavLink>
          <NavLink href="/ai-chat">{t("AI Chatbot")}</NavLink>
          <NavLink href="/profile">{t("Profile")}</NavLink>
          <NavLink href="/settings">{t("Settings")}</NavLink>
          <NavLink href="/documents">{t("Documents")}</NavLink>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">{t("AI Chatbot")}</h1>
            <p className="text-xs text-muted-foreground">
              Answers use your profile and verified scholarships, plus a public reference dataset on the AI service.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <Avatar className="h-9 w-9">
              <AvatarFallback>ES</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-3 p-4 sm:p-6">
          <Card className="flex flex-1 flex-col overflow-hidden min-h-105">
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
                          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
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
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void sendMessage()} disabled={sending || !input.trim()}>
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
