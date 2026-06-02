"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { studentPortalHeroCardClass } from "@/components/student-portal/student-portal-ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { clearToken, getToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"
import { useStudentI18n } from "@/lib/student-i18n"
import {
  accentEmerald,
  emeraldCard,
  emeraldFilterBadge,
  inlineHeaderRow,
  outlineControl,
  outlineEmeraldButton,
  pageShell,
  scholarshipListCard,
  summaryBar,
  textMuted,
  textPrimary,
  textSubtle,
} from "@/lib/theme"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { applyWithReturnConfirmation, unauthorizedHandler } from "@/lib/track-and-apply"
import { getApplicationUrl, type ScholarshipPublic } from "@/lib/scholarship"

type RecommendationItem = {
  scholarship: ScholarshipPublic
  matchPercentage: number
  matchedInterests?: string[]
  matchedTerms?: string[]
  weightedMatchPercentage?: number
  tfidfMatchPercentage?: number
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

  return (
    <div className={cn("flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden", pageShell)}>
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <header className={cn(inlineHeaderRow)}>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">{t("AI Matches")}</h1>
            <p className={cn("text-xs", textMuted)}>
              Ranked from your profile — add more details anytime for stronger matches.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 space-y-6 overflow-x-hidden p-4 sm:space-y-8 sm:p-6">
          <div className={cn("w-full", studentPortalHeroCardClass)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 border-l-4 border-emerald-500 pl-4 dark:border-emerald-400">
                <h2 className={cn("text-2xl font-semibold tracking-tight", textPrimary)}>Personalized matches</h2>
                <p className={cn("mt-2 text-sm leading-relaxed", textMuted)}>
                  Scholarships scored against your field, degree, country, GPA, and interests using our recommendation
                  engine.
                </p>
              </div>
              <Button asChild variant="outline" className={cn("shrink-0", outlineEmeraldButton)}>
                <Link href="/profile">{t("Profile")}</Link>
              </Button>
            </div>
          </div>

          {!loading && items.length > 0 ? (
            <div className={cn("flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4", summaryBar)}>
              <p className={cn("text-sm", textMuted)}>
                <span className={accentEmerald}>{items.length}</span> recommendation
                {items.length === 1 ? "" : "s"}
              </p>
              <Button asChild variant="outline" size="sm" className={cn("shrink-0", outlineEmeraldButton)}>
                <Link href="/scholarships">{t("Browse Scholarships")}</Link>
              </Button>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive dark:border-red-900 dark:bg-red-950/40">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))]">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className={cn(scholarshipListCard, "gap-0 py-0")}>
                  <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className={cn(emeraldCard, "gap-0 py-0")}>
              <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
              <CardContent className="space-y-4 p-6 text-center sm:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-border sm:mx-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className={cn("font-semibold", textPrimary)}>No matches yet</p>
                  <p className={cn("mt-1 text-sm", textMuted)}>
                    {error
                      ? "Check the message above, update your profile if needed, then refresh this page."
                      : "We use whatever you have saved so far. Add field, degree, country, GPA, or interests for stronger matches, then refresh."}
                  </p>
                </div>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/profile">Edit profile</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))]">
              {items.map((item, index) => (
                <Card key={`${item.scholarship.id}-${index}`} className={cn(scholarshipListCard, "gap-0 py-0")}>
                  <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                  <CardHeader className="px-4 pb-2 pt-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle
                        className={cn(
                          "line-clamp-2 text-base leading-snug transition-colors group-hover:text-emerald-800 dark:group-hover:text-emerald-300",
                          textPrimary,
                        )}
                      >
                        {item.scholarship.title}
                      </CardTitle>
                      <Badge className="shrink-0 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/50 dark:hover:bg-emerald-950/70">
                        {Math.round(item.matchPercentage)}% match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-5 pt-0 sm:px-5">
                    <p className={cn("text-sm", textSubtle)}>
                      {item.scholarship.country || "N/A"}
                      {item.scholarship.deadline ? ` · ${formatDate(item.scholarship.deadline)}` : ""}
                    </p>
                    {Array.isArray(item.matchedInterests) && item.matchedInterests.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.matchedInterests.slice(0, 4).map((label) => (
                          <Badge
                            key={`${item.scholarship.id}-match-${label}`}
                            variant="outline"
                            className={cn(emeraldFilterBadge, "text-xs font-medium")}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                      <Button size="sm" variant="outline" className={cn("h-10 w-full rounded-md sm:w-auto", outlineControl)} asChild>
                        <Link href={`/scholarships?q=${encodeURIComponent(item.scholarship.title)}`}>{t("View")}</Link>
                      </Button>
                      <Button
                        size="sm"
                        className="h-10 w-full rounded-md bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                        disabled={!getApplicationUrl(item.scholarship)}
                        onClick={() =>
                          void applyWithReturnConfirmation({
                            scholarship: item.scholarship,
                            toast,
                            onUnauthorized: () => unauthorizedHandler(router),
                          })
                        }
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
