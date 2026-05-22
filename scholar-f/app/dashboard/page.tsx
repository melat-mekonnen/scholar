"use client"


import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { apiFetchJson } from "@/lib/api"
import {
  getApplicationUrl,
  normalizeScholarship,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { applyWithReturnConfirmation, unauthorizedHandler } from "@/lib/track-and-apply"
import { ScholarshipDates } from "@/components/scholarship-dates"
import { clearToken } from "@/lib/auth"
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
  fullName?: string
  email?: string
  role?: string
}

function firstNameFromFullName(fullName?: string | null) {
  const name = (fullName ?? "").trim()
  if (!name) return null
  const first = name.split(/\s+/).filter(Boolean)[0]
  return first || null
}

function toScholarshipCard(row: DashboardSummary["recommendedScholarships"][number]): ScholarshipPublic {
  return normalizeScholarship({
    id: row.id,
    title: row.title,
    country: row.country,
    deadline: row.deadline,
    applicationUrl: row.applicationUrl,
    degree_level: "bachelor",
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { res, data } = await apiFetchJson<DashboardSummary>("/dashboard/summary", {
        method: "GET",
        auth: true,
      })
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

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET", auth: true })
      if (cancelled) return
      if (res.status === 401 || res.status === 403) return
      if (res.ok && data) setMe(data)
    }
    void loadMe()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = summary?.stats
  const statCards = stats
    ? [
        { title: "Active Applications", value: String(stats.activeApplications) },
        { title: "Saved Scholarships", value: String(stats.savedScholarships) },
        { title: "Recommended Matches", value: String(stats.recommendedMatches) },
        { title: "Upcoming Deadlines", value: String(stats.upcomingDeadlines) },
      ]
    : []

  const recommended = (summary?.recommendedScholarships ?? []).map(toScholarshipCard)
  const activities = summary?.recentActivity ?? []

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <h1 className="text-lg font-semibold text-emerald-950">Dashboard</h1>
          <ProfileAvatarLink />
        </header>

        <main className="flex-1 space-y-8 p-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm">
            <div className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Welcome back{firstNameFromFullName(me?.fullName) ? `, ${firstNameFromFullName(me?.fullName)}` : ""}{" "}
                👋
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Discover scholarships that match your profile.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                    <CardContent className="pt-6">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              : statCards.map((stat) => (
                  <Card
                    key={stat.title}
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
                    <CardContent className="pt-6">
                      <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
          </div>

          <div>
            <h3 className="mb-4 text-xl font-semibold text-slate-900">Recommended Scholarships</h3>

            {loading && (
              <div className="grid md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
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
              <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <CardContent className="pt-6 text-sm text-slate-500">
                  No verified scholarships are available to show yet. Once listings are published, upcoming
                  deadlines will appear here. You can also{" "}
                  <Link href="/scholarships" className="text-emerald-600 underline underline-offset-2">
                    browse all scholarships
                  </Link>{" "}
                  or try{" "}
                  <Link href="/ai-matches" className="text-emerald-600 underline underline-offset-2">
                    AI Matches
                  </Link>
                  .
                </CardContent>
              </Card>
            )}

            {!loading && recommended.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                {recommended.map((s) => (
                  <Card
                    key={s.id}
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 text-slate-900 transition-colors group-hover:text-emerald-800">
                        {s.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-500">Country: {s.country}</p>
                      <ScholarshipDates scholarship={s} />

                      <div className="flex gap-2 pt-3">
                        <Button
                          size="sm"
                          asChild
                          className="rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                        >
                          <Link href={`/scholarships?q=${encodeURIComponent(s.title)}`}>View</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-md border-slate-300 bg-white hover:bg-slate-50"
                          disabled={!getApplicationUrl(s)}
                          onClick={() =>
                            void applyWithReturnConfirmation({
                              scholarship: s,
                              toast,
                              onUnauthorized: () => unauthorizedHandler(router),
                            })
                          }
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
            <h3 className="mb-4 text-xl font-semibold text-slate-900">Recent Activity</h3>

            <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
              <CardContent className="pt-6 space-y-3">
                {loading && (
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </>
                )}
                {!loading && activities.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No activity yet. Save a scholarship, start an application, or update an application status
                    to see updates here.
                  </p>
                )}
                {!loading &&
                  activities.map((activity, index) => (
                    <p key={index} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {activity}
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
