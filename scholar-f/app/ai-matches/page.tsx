"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { clearToken, getToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"
import { useStudentI18n } from "@/lib/student-i18n"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { StudentPortalShell } from "@/components/student-portal/student-portal-shell"
import { createApplication } from "@/lib/applications"
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

  return (
    <StudentPortalShell
      title={t("AI Matches")}
      subtitle="Ranked using the AI service. Complete your profile for better matches."
      hero={{
        title: t("AI Matches"),
        description: "Scholarships ranked by fit with your profile, field, and interests.",
      }}
      headerEnd={<StudentLanguageToggle />}
      mainClassName="space-y-6 p-6"
    >
        
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
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
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  {!error ? (
                    <p className="text-sm text-muted-foreground">
                      No matches yet. Fill out your profile (field, degree, country, interests) and try again.
                    </p>
                  ) : null}
                </div>
              )}
              {!loading && items.length > 0 && (
                <ul className="space-y-3">
                  {items.map((item, index) => (
                    <li key={`${item.scholarship.id}-${index}`} className="space-y-3 rounded-xl border border-blue-100/80 bg-slate-50/50 px-4 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{item.scholarship.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.scholarship.country || "N/A"}
                            {item.scholarship.deadline ? ` Â· ${formatDate(item.scholarship.deadline)}` : ""}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-blue-700">{item.matchPercentage}%</span>
                      </div>
                      {Array.isArray(item.matchedInterests) && item.matchedInterests.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {item.matchedInterests.slice(0, 6).map((interest) => (
                            <span
                              key={`${item.scholarship.id}-${interest}`}
                              className="rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5 text-xs font-medium"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/scholarships?q=${encodeURIComponent(item.scholarship.title)}`}>{t("View")}</Link>
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
                              toast({ title: "Application started", description: "Saved to your application tracker." })
                            }
                          }}
                        >
                          {getApplicationUrl(item.scholarship) ? t("Apply") : "Apply (no link)"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        
    </StudentPortalShell>
  )
}
