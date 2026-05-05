"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiFetchJson } from "@/lib/api"
import {
  getApplicationUrl,
  normalizeScholarship,
  openScholarshipApplication,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { createApplication, updateApplicationStatus } from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardStats = {
  activeApplications: number
  savedScholarships: number
  recommendedMatches: number
  upcomingDeadlines: number
}

type DashboardSummary = {
  stats: DashboardStats
  recommendedScholarships: Array<{
    id: string
    title: string
    country: string
    deadline?: string
    applicationUrl?: string
  }>
  recentActivity: string[]
}

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function toScholarshipCard(row: DashboardSummary["recommendedScholarships"][number]): ScholarshipPublic {
  return normalizeScholarship({
    id: row.id,
    title: row.title,
    country: row.country,
    deadline: row.deadline,
    applicationUrl: row.applicationUrl,
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useStudentI18n()

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [summaryRes, meRes] = await Promise.all([
        apiFetchJson<DashboardSummary>("/dashboard/summary", {
          method: "GET",
          auth: true,
        }),
        apiFetchJson<MeResponse>("/api/auth/me", { method: "GET", auth: true }),
      ])
      const { res, data } = summaryRes
      if (!cancelled && meRes.res.ok && meRes.data) {
        setMe(meRes.data)
      }
      if (cancelled) return
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (res.ok && data) {
        setSummary(data)
      } else {
        setSummary(null)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const stats = summary?.stats
  const statCards = stats
    ? [
        { title: t("Active Applications"), value: String(stats.activeApplications) },
        { title: t("Saved Scholarships"), value: String(stats.savedScholarships) },
        { title: t("Recommended Matches"), value: String(stats.recommendedMatches) },
        { title: t("Upcoming Deadlines"), value: String(stats.upcomingDeadlines) },
      ]
    : []

  const recommended = (summary?.recommendedScholarships ?? []).map(toScholarshipCard)
  const activities = summary?.recentActivity ?? []

  function userInitials() {
    if (!me) return "U"
    if (me.fullName?.trim()) {
      const parts = me.fullName.split(" ").filter(Boolean)
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase()
    }
    return (me.email?.[0] || "U").toUpperCase()
  }

  async function handleApplyWithReturnCheck(s: ScholarshipPublic) {
    const ok = await openScholarshipApplication(s)
    if (!ok) {
      toast({
        title: "Application link unavailable",
        description: "This scholarship does not have an official application URL yet.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Application opened",
      description: "After you finish and come back, we will ask if you applied.",
    })

    window.setTimeout(() => {
      const onFocus = async () => {
        const applied = window.confirm("Did you submit your application on the official site?")
        if (!applied) {
          toast({
            title: "No problem",
            description: "Kept in listing only. It was not added to My Applications.",
          })
          return
        }

        const created = await createApplication(s.id)
        if (created.res.status === 401 || created.res.status === 403) {
          clearToken()
          router.replace("/signin")
          return
        }
        if (!created.res.ok && created.res.status !== 409) {
          toast({
            title: "Could not track application",
            description: created.errorMessage || "Failed to save this application in your tracker.",
            variant: "destructive",
          })
          return
        }

        if (created.data?.id) {
          await updateApplicationStatus(created.data.id, "submitted")
        }

        toast({
          title: "Added to My Applications",
          description: "Saved as submitted in your application tracker.",
        })
      }
      window.addEventListener("focus", onFocus, { once: true })
    }, 800)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-8">{t("Scholarship Portal")}</h2>

        <nav className="space-y-3">
          <Link href="/dashboard" className="block text-sm font-medium hover:text-primary">
            {t("Dashboard")}
          </Link>
          <Link href="/scholarships" className="block text-sm font-medium hover:text-primary">
            {t("Browse Scholarships")}
          </Link>
          <Link href="/applications" className="block text-sm font-medium hover:text-primary">
            {t("My Applications")}
          </Link>
          <Link href="/community" className="block text-sm font-medium hover:text-primary">
            {t("Community")}
          </Link>
          <Link href="/saved" className="block text-sm font-medium hover:text-primary">
            {t("Saved Scholarships")}
          </Link>
          <Link href="/profile" className="block text-sm font-medium hover:text-primary">
            {t("Profile")}
          </Link>
          <Link href="/settings" className="block text-sm font-medium hover:text-primary">
            {t("Settings")}
          </Link>
          <Link href="/documents" className="block text-sm font-medium hover:text-primary">
            {t("Documents")}
          </Link>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b p-4 bg-card">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{t("Dashboard")}</h1>
            {me?.role ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                {me.role}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{userInitials()}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearToken()
                router.push("/signin")
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <main className="p-6 space-y-8">
          <div>
            <h2 className="text-2xl font-bold">{t("Welcome back")}</h2>
            <p className="text-muted-foreground">
              Discover scholarships that match your profile.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              : statCards.map((stat) => (
                  <Card key={stat.title}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Recommended Scholarships</h3>

            {loading && (
              <div className="grid md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex gap-2 pt-3">
                        <Skeleton className="h-9 w-16" />
                        <Skeleton className="h-9 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && recommended.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  No recommended scholarships are available yet. You can{" "}
                  <Link href="/scholarships" className="text-primary underline underline-offset-2">
                    browse all scholarships
                  </Link>
                  to find current opportunities.
                </CardContent>
              </Card>
            )}

            {!loading && recommended.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                {recommended.map((s) => (
                  <Card key={s.id}>
                    <CardHeader>
                      <CardTitle>{s.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">Country: {s.country}</p>
                      {s.deadline && (
                        <p className="text-sm text-muted-foreground">Deadline: {s.deadline}</p>
                      )}

                      <div className="flex gap-2 pt-3">
                        <Button size="sm" asChild>
                          <Link href={`/scholarships?q=${encodeURIComponent(s.title)}`}>View</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!getApplicationUrl(s)}
                          onClick={async () => {
                            await handleApplyWithReturnCheck(s)
                          }}
                        >
                          {getApplicationUrl(s) ? "Apply" : "Apply (link unavailable)"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>

            <Card>
              <CardContent className="pt-6 space-y-3">
                {loading && (
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </>
                )}
                {!loading && activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                )}
                {!loading &&
                  activities.map((activity, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      • {activity}
                    </p>
                  ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
