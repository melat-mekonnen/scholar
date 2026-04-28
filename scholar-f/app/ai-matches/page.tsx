"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bookmark,
  ChevronRight,
  Compass,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { clearToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"
import { useI18n } from "@/components/language-provider"
import { createApplication } from "@/lib/applications"
import { getApplicationUrl, openScholarshipApplication, type ScholarshipPublic } from "@/lib/scholarship"

type RecommendationItem = {
  scholarship: ScholarshipPublic
  matchPercentage: number
  matchedInterests?: string[]
}

type RecommendationsResponse = {
  source?: "ai" | "fallback" | "weighted"
  cached?: boolean
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
  const { t } = useI18n()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      const { res, data } = await apiFetchJson<RecommendationsResponse>("/api/recommendations?topN=20", {
        method: "GET",
        auth: true,
      })
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
        setError("Could not load AI matches right now. Please try again.")
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [router])

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard, active: false },
    { href: "/scholarships", label: t("nav.scholarships", "Browse Scholarships"), icon: Compass, active: false },
    { href: "/applications", label: t("nav.applications", "My Applications"), icon: FileText, active: false },
    { href: "/community", label: t("nav.community", "Community"), icon: Users, active: false },
    { href: "/saved", label: t("nav.saved", "Saved Scholarships"), icon: Bookmark, active: false },
    { href: "/ai-matches", label: t("dashboard.aiMatches", "AI Matches"), icon: Sparkles, active: true },
    { href: "/profile", label: t("nav.profile", "Profile"), icon: User, active: false },
    { href: "/settings", label: t("nav.settings", "Settings"), icon: Settings, active: false },
    { href: "/documents", label: t("nav.documents", "Document Resources"), icon: FolderOpen, active: false },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50/80">
      <aside className="hidden w-72 border-r border-slate-200 bg-white/90 p-6 backdrop-blur md:block">
        <div className="mb-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("lang.portal", "Scholarship portal")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{t("dashboard.aiMatches", "AI Matches")}</h2>
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
              <h1 className="text-lg font-semibold text-slate-900">{t("dashboard.aiMatches", "AI Matches")}</h1>
            </div>
            <Avatar className="h-10 w-10 border border-slate-200 bg-white">
              <AvatarFallback className="bg-slate-100 text-slate-700">ES</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="rounded-2xl border border-slate-200 bg-[#107823] p-6 text-white shadow-sm">
            <h2 className="text-2xl font-semibold">{t("dashboard.aiMatches", "AI Matches")}</h2>
            <p className="mt-1 text-sm text-emerald-100">
              {t("dashboard.aiMatchesDesc", "Scholarships ranked by AI match percentage in descending order.")}
            </p>
          </section>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-6">
              {loading && (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="space-y-2">
                  {error ? <p className="text-sm text-red-600">{error}</p> : null}
                  {!error ? (
                    <p className="text-sm text-slate-500">
                      {t("dashboard.noAiMatches", "No AI matches available yet. Complete your profile and try again.")}
                    </p>
                  ) : null}
                </div>
              )}
              {!loading && items.length > 0 && (
                <ul className="space-y-2">
                  {items.map((item, index) => (
                    <li
                      key={`${item.scholarship.id}-${index}`}
                      className="space-y-3 rounded-md border border-slate-200 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.scholarship.title}</p>
                          <p className="text-xs text-slate-500">
                            {item.scholarship.country || "N/A"}
                            {item.scholarship.deadline ? ` · ${formatDate(item.scholarship.deadline)}` : ""}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-primary">{item.matchPercentage}%</span>
                      </div>
                      {Array.isArray(item.matchedInterests) && item.matchedInterests.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {item.matchedInterests.slice(0, 6).map((interest) => (
                            <span
                              key={`${item.scholarship.id}-${interest}`}
                              className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/scholarships?q=${encodeURIComponent(item.scholarship.title)}`}>
                            {t("dashboard.view", "View")}
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={!getApplicationUrl(item.scholarship)}
                          onClick={async () => {
                            const created = await createApplication(item.scholarship.id)
                            if (created.res.status === 401 || created.res.status === 403) {
                              clearToken()
                              router.replace("/signin")
                              return
                            }
                            if (!created.res.ok && created.res.status !== 409) {
                              toast({
                                title: t("dashboard.toast.trackFailedTitle", "Could not track application"),
                                description:
                                  created.errorMessage ||
                                  t(
                                    "dashboard.toast.trackFailedDesc",
                                    "Failed to save this application in your tracker."
                                  ),
                                variant: "destructive",
                              })
                              return
                            }

                            const ok = await openScholarshipApplication(item.scholarship)
                            if (!ok) {
                              toast({
                                title: t("dashboard.toast.linkUnavailableTitle", "Application link unavailable"),
                                description: t(
                                  "dashboard.toast.linkUnavailableDesc",
                                  "This scholarship does not have an official application URL yet."
                                ),
                                variant: "destructive",
                              })
                            } else {
                              toast({
                                title: t("dashboard.toast.startedTitle", "Application started"),
                                description: t("dashboard.toast.startedDesc", "Saved to your application tracker."),
                              })
                            }
                          }}
                        >
                          {getApplicationUrl(item.scholarship)
                            ? t("dashboard.applyNow", "Apply now")
                            : t("dashboard.applyUnavailable", "Apply (link unavailable)")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

