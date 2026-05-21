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

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"
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

  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: true },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: false },
    { href: "/applications", label: "My Applications", icon: FileText, active: false },
    { href: "/community", label: "Community", icon: Users, active: false },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: false },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: false },
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
                  No featured scholarships yet. Managers can mark scholarships as recommended in the database
                  (<code className="text-xs">is_recommended_default</code>), or you can{" "}
                  <Link href="/scholarships" className="text-emerald-600 underline underline-offset-2">
                    browse all scholarships
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
                                description:
                                  "Saved as pending — confirm when you finish on the official site.",
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
                  <p className="text-sm text-slate-500">No recent activity yet.</p>
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
