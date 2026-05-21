"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { startTrackedApplication } from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { StudentPortalFooter } from "@/components/student-portal/student-footer"
import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"
import {
  studentPortalHeaderClass,
  studentPortalHeroAccentClass,
  studentPortalHeroCardClass,
  studentPortalPageBg,
  studentPortalStatCardAccentClass,
  studentPortalStatCardClass,
  studentPortalCardClass,
} from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"

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

function initialsFromName(fullName?: string | null, email?: string | null) {
  const name = (fullName ?? "").trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? ""
    const second = parts[1]?.[0] ?? ""
    const out = `${first}${second}`.toUpperCase()
    return out || "U"
  }
  const e = (email ?? "").trim()
  return (e[0]?.toUpperCase() ?? "U")
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
    <div className={cn("flex min-h-screen", studentPortalPageBg)}>
      <StudentPortalSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className={studentPortalHeaderClass}>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>

          <Link
            href="/profile"
            aria-label="Go to profile"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <Avatar className="transition-transform hover:scale-[1.02]">
              <AvatarFallback className="bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-700 ring-1 ring-blue-100">
                {initialsFromName(me?.fullName, me?.email)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <main className="p-6 space-y-8">
          <div className={studentPortalHeroCardClass}>
            <div className={studentPortalHeroAccentClass}>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Welcome back{firstNameFromFullName(me?.fullName) ? `, ${firstNameFromFullName(me?.fullName)}` : ""} 👋
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
                    className={studentPortalStatCardClass}
                  >
                    <div className={studentPortalStatCardAccentClass} />
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
              <Card className={studentPortalCardClass}>
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
                    className={cn(studentPortalStatCardClass, "hover:shadow-lg")}
                  >
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 text-slate-900 transition-colors group-hover:text-blue-700">
                        {s.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-500">Country: {s.country}</p>
                      {s.deadline && (
                        <p className="text-sm text-slate-500">Deadline: {s.deadline}</p>
                      )}

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
                          onClick={async () => {
                            const created = await startTrackedApplication(s.id)
                            if (created.res.status === 401 || created.res.status === 403) {
                              clearToken()
                              router.replace("/signin")
                              return
                            }
                            if (!created.res.ok && created.res.status !== 409) {
                              toast({
                                title: "Could not track application",
                                description:
                                  created.errorMessage ||
                                  "Failed to save this application in your tracker.",
                                variant: "destructive",
                              })
                              return
                            }

                            const ok = await openScholarshipApplication(s)
                            if (!ok) {
                              toast({
                                title: "Application link unavailable",
                                description:
                                  "This scholarship does not have an official application URL yet.",
                                variant: "destructive",
                              })
                            } else {
                              toast({
                                title: "Application started",
                                description: "Saved to your application tracker.",
                              })
                            }
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
            <h3 className="mb-4 text-xl font-semibold text-slate-900">Recent Activity</h3>

            <Card className={studentPortalCardClass}>
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
        <StudentPortalFooter />
      </div>
    </div>
  )
}
