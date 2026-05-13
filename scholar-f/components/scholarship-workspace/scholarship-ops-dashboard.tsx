"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  CalendarClock,
  Eye,
  FilePlus2,
  Files,
  Home,
  IdCard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  User,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useScholarshipWorkspaceGate } from "@/hooks/use-scholarship-workspace-gate"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  getScholarshipWorkspaceConfig,
  type ScholarshipWorkspace,
} from "@/lib/scholarship-workspace"

type DashboardResponse = {
  statistics: {
    totalScholarshipsPosted: number
    scholarshipsByStatus: { pending: number; verified: number; expired: number }
    totalApplicationsReceived: number
    applicationsByStatus: { pending: number; submitted: number; accepted: number; rejected: number }
  }
  upcomingDeadlines: Array<{ id: string; title: string; deadline: string; status: string }>
  mostViewedScholarships: Array<{ id: string; title: string; views: number }>
  recentActivity: Array<{ type: string; message: string; at: string }>
}

type Props = {
  workspace: ScholarshipWorkspace
  showSidebar?: boolean
}

export function ScholarshipOpsDashboard({ workspace, showSidebar = true }: Props) {
  const cfg = getScholarshipWorkspaceConfig(workspace)
  const router = useRouter()
  const gate = useScholarshipWorkspaceGate(workspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)

  useEffect(() => {
    if (gate !== "ready") return

    async function loadDashboard() {
      setLoading(true)
      setError(null)
      const { res, data, errorMessage } = await apiFetchJson<DashboardResponse>(
        "/api/manager/dashboard",
        { method: "GET" },
      )
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load dashboard")
        setLoading(false)
        return
      }
      setDashboard(data)
      setLoading(false)
    }
    void loadDashboard()
  }, [gate, router, workspace])

  const stats = dashboard?.statistics
  const topDeadlines = useMemo(() => dashboard?.upcomingDeadlines ?? [], [dashboard?.upcomingDeadlines])

  if (gate !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        {showSidebar ? (
          <aside
            className={`hidden md:flex w-72 flex-col border-r ${cfg.shellClassName}`}
          >
            <div className="border-b px-6 py-5">
              <div className="mb-4 flex items-center gap-3">
                <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
              </div>
              <div className="leading-tight">
                <span className="block font-semibold text-emerald-600">
                  {workspace === "manager" ? "University Representative" : cfg.shellTitle}
                </span>
                <span className="text-xs text-slate-500">{cfg.shellSubtitle}</span>
              </div>
            </div>

            <nav className="p-4 space-y-1.5 text-sm">
              <Link
                href={cfg.basePath}
                className={`flex items-center gap-2 w-full rounded-xl px-3 py-2.5 font-medium ${cfg.navActiveClass}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href={cfg.profilePath}
                className={`flex items-center gap-2 w-full rounded-xl px-3 py-2.5 ${cfg.navInactiveClass}`}
              >
                <IdCard className="h-4 w-4" />
                {cfg.profileLinkLabel}
              </Link>
              <Link
                href={cfg.newScholarshipPath}
                className={`flex items-center gap-2 w-full rounded-xl px-3 py-2.5 ${cfg.navInactiveClass}`}
              >
                <FilePlus2 className="h-4 w-4" />
                New scholarship
              </Link>
              <Link
                href={cfg.manageScholarshipsPath}
                className={`flex items-center gap-2 w-full rounded-xl px-3 py-2.5 ${cfg.navInactiveClass}`}
              >
                <ListChecks className="h-4 w-4" />
                Manage scholarships
              </Link>
              <Link
                href={cfg.documentsPath}
                className={`flex items-center gap-2 w-full rounded-xl px-3 py-2.5 ${cfg.navInactiveClass}`}
              >
                <Files className="h-4 w-4" />
                Documents
              </Link>
              {workspace === "owner" ? (
                <Link
                  href={cfg.ownerHomePath}
                  className={`flex items-center gap-2 w-full rounded-xl px-3 py-2.5 ${cfg.navInactiveClass}`}
                >
                  <Home className="h-4 w-4" />
                  Owner home
                </Link>
              ) : null}
            </nav>

            <div className="mt-auto border-t p-4">
              <button
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  clearToken()
                  router.push("/signin")
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-rose-100 group-hover:text-rose-700">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">Sign out</span>
                </span>
              </button>
            </div>
          </aside>
        ) : null}

        <div className="relative flex-1">
          <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-52 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <main className="p-6 space-y-6">
            <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{cfg.dashboardHeading}</h1>
                  <p className="mt-1 text-sm text-blue-50">{cfg.dashboardTagline}</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                  <User className="h-5 w-5" />
                </div>
              </div>
            </header>

            {error ? (
              <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            ) : null}

            <section className="grid gap-4 md:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-80" />
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500">Total Scholarships Posted</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.totalScholarshipsPosted ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 opacity-80" />
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500">Total Applications Received</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.totalApplicationsReceived ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-80" />
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500">Verified Scholarships</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.scholarshipsByStatus.verified ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 to-slate-700 opacity-80" />
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500">Pending Scholarships</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.scholarshipsByStatus.pending ?? 0}</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : topDeadlines.length ? (
                    topDeadlines.map((d) => (
                      <div key={d.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <p className="font-medium text-slate-900">{d.title}</p>
                        <p className="text-sm text-slate-500">
                          Deadline: {new Date(d.deadline).toLocaleDateString()}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {d.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Most Viewed Scholarships</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.mostViewedScholarships?.length ? (
                    dashboard.mostViewedScholarships.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <p className="font-medium text-slate-900">{s.title}</p>
                        <span className="text-sm text-slate-500">{s.views} views</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No scholarship views yet.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Applications by Status</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-slate-600">Pending</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.pending ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-slate-600">Submitted</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.submitted ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-slate-600">Accepted</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.accepted ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-slate-600">Rejected</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.rejected ?? 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.recentActivity?.length ? (
                    dashboard.recentActivity.map((a, idx) => (
                      <div key={`${a.type}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <p className="text-sm">{a.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(a.at).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  )}
                </CardContent>
              </Card>
            </section>

          </main>
        </div>
      </div>
    </div>
  )
}
