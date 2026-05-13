"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { clearToken, getToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"
import { useStudentI18n } from "@/lib/student-i18n"
import { cn } from "@/lib/utils"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
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
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-6 md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">{t("Scholarship Portal")}</h2>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            {t("AI Matches")}
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
            <h1 className="text-lg font-semibold">{t("AI Matches")}</h1>
            <p className="text-xs text-muted-foreground">
              Ranked using the AI service (TF‑IDF similarity). Complete your profile for better matches.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <Avatar className="h-9 w-9">
              <AvatarFallback>ES</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          <Card>
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
                    <li key={`${item.scholarship.id}-${index}`} className="space-y-3 rounded-md border px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{item.scholarship.title}</p>
                          <p className="text-xs text-muted-foreground">
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
                              className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
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
        </main>
      </div>
    </div>
  )
}
