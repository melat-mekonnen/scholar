"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bookmark,
  Bot,
  ChevronRight,
  Compass,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Send,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/components/language-provider"
import { clearToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"

type ChatRecommendation = {
  name?: string
  country?: string
  field?: string
  level?: string
  deadline?: string | null
  funding_type?: string
  score?: number
}

type ChatDeadline = {
  name?: string
  deadline?: string | null
  daysLeft?: number | null
  urgency?: string
}

type ChatbotResponse = {
  intent: string
  recommendations: ChatRecommendation[]
  eligibility: string
  deadlines: ChatDeadline[]
}

type ChatTurn = {
  role: "user" | "assistant"
  text: string
  data?: ChatbotResponse
  query?: string
}

function formatDate(date?: string | null) {
  if (!date) return "N/A"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function getIntentLabel(intent?: string) {
  switch (intent) {
    case "find_scholarship":
      return "scholarship search"
    case "eligibility_check":
      return "eligibility check"
    case "deadline_check":
      return "deadline tracking"
    case "out_of_scope":
      return "out-of-scope request"
    default:
      return "scholarship support"
  }
}

function buildAssistantMessage(data: ChatbotResponse) {
  const recCount = data.recommendations?.length ?? 0
  const deadlineCount = data.deadlines?.length ?? 0
  const intentLabel = getIntentLabel(data.intent)
  if (recCount === 0 && deadlineCount === 0 && !data.eligibility) {
    return "I checked your request, but I could not find a strong match. Try adding country, field, or degree level."
  }
  return `I understood this as a ${intentLabel}. I found ${recCount} recommendation${recCount === 1 ? "" : "s"} and ${deadlineCount} relevant deadline${deadlineCount === 1 ? "" : "s"}.`
}

function normalizeFundingType(value?: string) {
  const v = (value || "").trim().toLowerCase().replace(/_/g, " ")
  if (!v) return ""
  return v.replace(/\b\w/g, (m) => m.toUpperCase())
}

function normalizeSpace(text: string) {
  return text.trim().replace(/\s+/g, " ")
}

function extractScholarshipHint(prompt: string) {
  const lower = prompt.toLowerCase()
  const byFor = lower.match(/\b(?:for|of)\s+([a-z0-9\s]+?)(?:\?|$)/)
  const candidate = byFor?.[1] || lower
  const clean = candidate
    .replace(/\b(deadline|scholarship|what|is|the|for|of|please|tell|me|about)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
  return normalizeSpace(clean)
}

function normalizeName(value: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(scholarship|scholarships|program|programme|award|awards)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(value: string) {
  return normalizeName(value)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
}

function isLikelySpecificScholarshipQuestion(prompt: string) {
  const lower = prompt.toLowerCase()
  return /\b(what is the deadline for|deadline for|when is .* deadline)\b/.test(lower)
}

function filterDeadlinesForPrompt(prompt: string, items: ChatDeadline[]) {
  const deduped = dedupeDeadlines(items)
  if (!deduped.length) return deduped

  const hint = extractScholarshipHint(prompt)
  const hintTokens = tokenize(hint)
  if (!hintTokens.length) return deduped

  const scored = deduped
    .map((d) => {
      const nameNorm = normalizeName(d.name || "")
      const hits = hintTokens.filter((tok) => nameNorm.includes(tok)).length
      return { item: d, hits }
    })
    .sort((a, b) => b.hits - a.hits)

  const bestHits = scored[0]?.hits || 0
  if (bestHits <= 0) return []
  return scored.filter((x) => x.hits === bestHits).map((x) => x.item)
}

function dedupeDeadlines(items: ChatDeadline[]) {
  const seen = new Set<string>()
  return items.filter((d) => {
    const key = `${(d.name || "").toLowerCase()}|${d.deadline || ""}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dedupeRecommendations(items: ChatRecommendation[]) {
  const seen = new Set<string>()
  return items.filter((r) => {
    const key = `${(r.name || "").toLowerCase()}|${(r.country || "").toLowerCase()}|${(r.field || "").toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildFocusedAssistantMessage(prompt: string, data: ChatbotResponse) {
  if (data.intent === "out_of_scope") {
    return (
      data.eligibility ||
      "Please ask scholarship-related questions only, like recommendations, eligibility, funding type, or deadlines.\n\nTry:\n- find fully funded scholarships in Germany\n- am I eligible for DAAD?\n- deadline for Chevening scholarship"
    )
  }

  const lower = prompt.toLowerCase()
  const isDeadlineQuestion =
    data.intent === "deadline_check" ||
    /\b(deadline|due date|closing|close|expire|when is .* deadline)\b/.test(lower)

  if (isDeadlineQuestion) {
    const specificQuestion = isLikelySpecificScholarshipQuestion(prompt)
    const filtered = filterDeadlinesForPrompt(prompt, data.deadlines || [])
    const target = filtered[0] || (!specificQuestion ? dedupeDeadlines(data.deadlines || [])[0] : undefined)
    if (!target) {
      return "I could not find a deadline for that scholarship yet."
    }
    const when = formatDate(target.deadline)
    const days =
      typeof target.daysLeft === "number"
        ? ` (${target.daysLeft} day${target.daysLeft === 1 ? "" : "s"} left)`
        : ""
    return `The deadline for ${target.name || "this scholarship"} is ${when}${days}.`
  }

  if (data.intent === "eligibility_check" && data.eligibility) {
    return data.eligibility
  }

  return buildAssistantMessage(data)
}

function shouldShowRecommendations(prompt: string, data: ChatbotResponse) {
  const lower = prompt.toLowerCase()
  if (data.intent === "out_of_scope") return false
  if (data.intent === "deadline_check") return false
  if (data.intent === "eligibility_check") return false
  return !/\b(deadline|due date|closing|expire)\b/.test(lower)
}

function shouldShowDeadlines(prompt: string, data: ChatbotResponse) {
  if (data.intent === "out_of_scope") return false
  if (isLikelySpecificScholarshipQuestion(prompt)) return false
  const lower = prompt.toLowerCase()
  if (data.intent === "deadline_check") return true
  return /\b(deadline|due date|closing|expire)\b/.test(lower)
}

function shouldShowEligibilityNote(turn: ChatTurn) {
  if (!turn.data?.eligibility) return false
  // Avoid repeating the exact same line in both message and note.
  return normalizeSpace(turn.data.eligibility) !== normalizeSpace(turn.text)
}

export default function AiChatPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turns, setTurns] = useState<ChatTurn[]>([])

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard, active: false },
      { href: "/scholarships", label: t("nav.scholarships", "Browse Scholarships"), icon: Compass, active: false },
      { href: "/applications", label: t("nav.applications", "My Applications"), icon: FileText, active: false },
      { href: "/community", label: t("nav.community", "Community"), icon: Users, active: false },
      { href: "/saved", label: t("nav.saved", "Saved Scholarships"), icon: Bookmark, active: false },
      { href: "/ai-matches", label: t("dashboard.aiMatches", "AI Matches"), icon: Sparkles, active: false },
      { href: "/ai-chat", label: t("nav.aiChat", "AI Chatbot"), icon: Bot, active: true },
      { href: "/profile", label: t("nav.profile", "Profile"), icon: User, active: false },
      { href: "/settings", label: t("nav.settings", "Settings"), icon: Settings, active: false },
      { href: "/documents", label: t("nav.documents", "Document Resources"), icon: FolderOpen, active: false },
    ],
    [t]
  )

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const prompt = message.trim()
    if (!prompt || loading) return

    setError(null)
    setLoading(true)
    setTurns((prev) => [...prev, { role: "user", text: prompt }])
    setMessage("")

    const { res, data, errorMessage } = await apiFetchJson<ChatbotResponse>("/api/chatbot/query", {
      method: "POST",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, topK: 5 }),
    })

    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }

    if (!res.ok || !data) {
      setError(errorMessage || "Could not get chatbot response.")
      setTurns((prev) => [...prev, { role: "assistant", text: "I could not process that request right now." }])
      setLoading(false)
      return
    }

    setTurns((prev) => [
      ...prev,
      {
        role: "assistant",
        text: buildFocusedAssistantMessage(prompt, data),
        data,
        query: prompt,
      },
    ])
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-slate-50/80">
      <aside className="hidden w-72 border-r border-slate-200 bg-white/90 p-6 backdrop-blur md:block">
        <div className="mb-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Bot className="h-3.5 w-3.5" />
            {t("lang.portal", "Scholarship portal")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{t("nav.aiChat", "AI Chatbot")}</h2>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                item.active ? "bg-[#107823] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              <ChevronRight className={`h-4 w-4 transition ${item.active ? "text-emerald-100" : "text-slate-400 group-hover:text-slate-600"}`} />
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("dashboard.workspace", "Workspace")}</p>
              <h1 className="text-lg font-semibold text-slate-900">{t("nav.aiChat", "AI Chatbot")}</h1>
            </div>
            <Avatar className="h-10 w-10 border border-slate-200 bg-white">
              <AvatarFallback className="bg-slate-100 text-slate-700">ES</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="rounded-2xl border border-slate-200 bg-[#107823] p-6 text-white shadow-sm">
            <h2 className="text-2xl font-semibold">{t("nav.aiChat", "AI Chatbot")}</h2>
            <p className="mt-1 text-sm text-emerald-100">
              Ask for scholarship recommendations, eligibility checks, and deadline tracking.
            </p>
          </section>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {turns.length === 0 ? (
                <p className="text-sm text-slate-500">Try: "Find fully funded masters scholarships in Germany for AI"</p>
              ) : null}

              <div className="space-y-3">
                {turns.map((turn, index) => (
                  <div key={`${turn.role}-${index}`} className={`rounded-lg border p-3 ${turn.role === "user" ? "bg-slate-50" : "bg-white"}`}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{turn.role === "user" ? "You" : "Assistant"}</p>
                    <p className="text-sm text-slate-800">{turn.text}</p>

                    {turn.data ? (
                      <div className="mt-3 space-y-3">
                        {shouldShowEligibilityNote(turn) ? (
                          <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">{turn.data.eligibility}</p>
                        ) : null}

                        {shouldShowRecommendations(turn.query || "", turn.data) &&
                        dedupeRecommendations(turn.data.recommendations).length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-700">Recommendations</p>
                            {dedupeRecommendations(turn.data.recommendations)
                              .slice(0, 5)
                              .map((r, rIdx) => (
                              <p key={`${r.name || "r"}-${rIdx}`} className="text-xs text-slate-700">
                                {rIdx + 1}. {r.name || "Scholarship"} - {r.country || "Country N/A"}
                                {r.field ? ` - ${r.field}` : ""}
                                {r.funding_type ? ` - ${normalizeFundingType(r.funding_type)}` : ""}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        {shouldShowDeadlines(turn.query || "", turn.data) &&
                        (isLikelySpecificScholarshipQuestion(turn.query || "")
                          ? filterDeadlinesForPrompt(turn.query || "", turn.data.deadlines).length > 0
                          : dedupeDeadlines(turn.data.deadlines).length > 0) ? (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-700">Deadlines</p>
                            {(isLikelySpecificScholarshipQuestion(turn.query || "")
                              ? filterDeadlinesForPrompt(turn.query || "", turn.data.deadlines)
                              : dedupeDeadlines(turn.data.deadlines))
                              .slice(0, 5)
                              .map((d, dIdx) => (
                              <p key={`${d.name || "d"}-${dIdx}`} className="text-xs text-slate-700">
                                {d.name || "Scholarship"} - {formatDate(d.deadline)} - {d.urgency || "unknown"}
                                {typeof d.daysLeft === "number" ? ` (${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"} left)` : ""}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <form onSubmit={onSubmit} className="space-y-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask the AI assistant about scholarships..."
                  rows={4}
                  disabled={loading}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading || !message.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    {loading ? "Thinking..." : "Send"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

