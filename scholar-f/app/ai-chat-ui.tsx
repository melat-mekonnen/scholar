"use client"

import {
  LayoutDashboard,
  Search,
  FileText,
  Users,
  Bookmark,
  Sparkles,
  MessageSquare,
  UserCircle2,
  Settings,
  FolderOpen,
  Bot,
  Send,
  User,
} from "lucide-react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { EthioScholarLogo } from "@/components/ethioscholar-logo"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"

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

const QUICK_PROMPTS = [
  "Scholarships for computer science in Europe",
  "What deadlines are coming up soon?",
  "Am I eligible for master's funding abroad?",
]

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

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim()
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

  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: false },
    { href: "/applications", label: "My Applications", icon: FileText, active: false },
    { href: "/community", label: "Community", icon: Users, active: false },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: false },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: false },
    { href: "/ai-chat", label: "AI Chatbot", icon: MessageSquare, active: true },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: false },
    { href: "/settings", label: "Settings", icon: Settings, active: false },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: false },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-background dark:text-foreground transition-colors duration-200">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-8 flex items-center gap-3">
            <EthioScholarLogo className="h-10" />
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Student Portal</p>

          <nav className="flex flex-col gap-0.5">
            {sidebarLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.active
                      ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                      : "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
                  }
                >
                  <span
                    className={
                      item.active
                        ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"
                        : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.active ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                  ) : (
                    <span className="w-1.5 shrink-0" aria-hidden />
                  )}
                </Link>
              )
            })}
          </nav>
          <StudentPortalSidebarLogout tone="primary" className="mt-10 border-emerald-100/80" />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6 dark:border-border dark:bg-card dark:text-foreground dark:shadow-none transition-colors duration-200">
          <div>
            <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">{t("AI Chatbot")}</h1>
            <p className="text-xs text-slate-600">
              Answers use your profile and verified scholarships, plus the AI reference dataset.
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

          <div className="rounded-2xl border border-emerald-100/80 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 px-5 py-4 shadow-sm shadow-emerald-900/5 sm:px-6">
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

          <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
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
                  disabled={sending}
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
                    disabled={sending || !input.trim()}
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
