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
} from "lucide-react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { clearToken, getToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"
import { useStudentI18n } from "@/lib/student-i18n"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { startTrackedApplication } from "@/lib/applications"
import { getApplicationUrl, openScholarshipApplication, type ScholarshipPublic } from "@/lib/scholarship"

type RecommendationItem = {
  scholarship: ScholarshipPublic
  matchPercentage: number
  matchedInterests?: string[]
}

type RecommendationsResponse = {
  source?: string
  studentText?: string
  results?: RecommendationItem[]
}

function formatDate(date?: string) {
  if (!date) return ""
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function AiMatchesPage() {
  const router = useRouter()
  const { t } = useStudentI18n()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace("/signin")
    }
  }, [router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      const { res, data, errorMessage } = await apiFetchJson<RecommendationsResponse>(
        "/api/recommendations?topN=12",
        {
          method: "GET",
          auth: true,
        },
      )
      if (cancelled) return
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (res.ok && Array.isArray(data?.results)) {
        setItems(data.results)
      } else {
        setItems([])
        setError(
          errorMessage ||
            "Could not load AI matches. Start the Scholar AI service (see scholar-ai/README) and ensure AI_SERVICE_URL matches its port (default backend: http://127.0.0.1:8010).",
        )
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [router])

  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: false },
    { href: "/applications", label: "My Applications", icon: FileText, active: false },
    { href: "/community", label: "Community", icon: Users, active: false },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: false },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: true },
    { href: "/ai-chat", label: "AI Chatbot", icon: MessageSquare, active: false },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: false },
    { href: "/settings", label: "Settings", icon: Settings, active: false },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: false },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
            <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
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
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-emerald-950">{t("AI Matches")}</h1>
            <p className="text-xs text-slate-600">
              Ranked using the AI service. Complete your profile for better matches.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="rounded-2xl border border-emerald-100/80 bg-white px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Personalized matches</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Scholarships ranked by how closely they fit your profile — field, degree, country, and interests.
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/profile">{t("Profile")}</Link>
              </Button>
            </div>
          </div>

          {!loading && items.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-50">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-emerald-700">{items.length}</span> recommendation
                {items.length === 1 ? "" : "s"}
              </p>
              <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/scholarships">{t("Browse Scholarships")}</Link>
              </Button>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                  <CardContent className="space-y-3 p-6">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
              <CardContent className="space-y-4 p-6 text-center sm:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100 sm:mx-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">No matches yet</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Fill out your profile (field, degree, country, interests) and try again.
                  </p>
                </div>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/profile">Complete profile</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item, index) => (
                <Card
                  key={`${item.scholarship.id}-${index}`}
                  className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="line-clamp-2 text-base leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
                        {item.scholarship.title}
                      </CardTitle>
                      <Badge className="shrink-0 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100">
                        {item.matchPercentage}% match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <p className="text-sm text-slate-500">
                      {item.scholarship.country || "N/A"}
                      {item.scholarship.deadline ? ` · ${formatDate(item.scholarship.deadline)}` : ""}
                    </p>
                    {Array.isArray(item.matchedInterests) && item.matchedInterests.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.matchedInterests.slice(0, 6).map((interest) => (
                          <Badge
                            key={`${item.scholarship.id}-${interest}`}
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50/50 text-xs font-medium text-emerald-800"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                        asChild
                      >
                        <Link href={`/scholarships?q=${encodeURIComponent(item.scholarship.title)}`}>{t("View")}</Link>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={!getApplicationUrl(item.scholarship)}
                        onClick={async () => {
                          const created = await startTrackedApplication(item.scholarship.id)
                          if (created.res.status === 401 || created.res.status === 403) {
                            clearToken()
                            router.replace("/signin")
                            return
                          }
                          if (!created.res.ok && created.res.status !== 409) {
                            toast({
                              title: "Could not track application",
                              description: created.errorMessage || "Failed to save to your tracker.",
                              variant: "destructive",
                            })
                            return
                          }
                          const ok = await openScholarshipApplication(item.scholarship)
                          if (!ok) {
                            toast({
                              title: "Application link unavailable",
                              description: "This listing has no official application URL yet.",
                              variant: "destructive",
                            })
                          } else {
                            toast({
                              title: "Application started",
                              description:
                                "Saved as pending — confirm when you finish on the official site.",
                            })
                          }
                        }}
                      >
                        {getApplicationUrl(item.scholarship) ? t("Apply") : "Apply (no link)"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
