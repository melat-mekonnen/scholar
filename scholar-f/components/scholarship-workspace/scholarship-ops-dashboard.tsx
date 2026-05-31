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
import { cn } from "@/lib/utils"

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
  const isManager = workspace === "manager"
  const isOwner = workspace === "owner"
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
      <div className="min-h-screen bg-slate-100 p-8 dark:bg-background dark:text-foreground transition-colors duration-200">
        <p className="text-sm text-slate-600 dark:text-foreground/70">Loading…</p>
      </div>
    )
  }

  const cardShell = "rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5"
  const listWell =
    "rounded-xl border border-emerald-100/80 bg-emerald-50/30 p-3 dark:border-border dark:bg-muted/30"
  const statRow =
    "flex items-center justify-between rounded-lg border border-emerald-100/60 bg-white px-3 py-2 dark:border-border dark:bg-card dark:text-foreground"

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-background dark:text-foreground transition-colors duration-200">
      <div className="flex">
        {showSidebar ? (
          <aside className={cn("hidden w-72 shrink-0 flex-col border-r md:flex md:min-h-screen", cfg.shellClassName)}>
            <div className="border-b border-emerald-100/80 px-6 py-5 dark:border-border">
              <div className="mb-4 flex items-center gap-3">
                <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
              </div>
              {isManager ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Manager portal</p>
              ) : isOwner ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Owner portal</p>
              ) : null}
              <div className="leading-tight">
                <span className="block font-semibold text-slate-900 dark:text-foreground">
                  {workspace === "manager" ? "University Representative" : cfg.shellTitle}
                </span>
                <span className="text-xs text-slate-500">{cfg.shellSubtitle}</span>
              </div>
            </div>

            <nav className="flex flex-1 flex-col space-y-1 p-6 text-sm">
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

            <div className="mt-auto border-t border-emerald-100/80 px-4 pb-3 pt-2">
              <button
                type="button"
                className="group flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50"
                onClick={() => {
                  clearToken()
                  router.push("/signin")
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">Sign out</span>
                </span>
              </button>
            </div>
          </aside>
        ) : null}

        <div className="relative min-w-0 flex-1">
          {!isManager ? (
            <>
              <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-20 top-52 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
            </>
          ) : null}
          <main className="space-y-6 p-6">
            <header className="rounded-2xl border border-emerald-100/80 border-l-4 border-l-emerald-500 bg-white px-6 py-7 shadow-sm shadow-emerald-900/5">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                    <LayoutDashboard className="h-6 w-6" />
                  </div>
                  <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">{cfg.dashboardHeading}</h1>
                </div>
                <p className="text-sm text-slate-600">{cfg.dashboardTagline}</p>
              </div>
            </header>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}

            <section className="grid gap-4 md:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className={cardShell}>
                    <CardContent className="space-y-2 p-4">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card className={cn("relative overflow-hidden", cardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className="text-xs font-medium text-slate-500">Total Scholarships Posted</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.totalScholarshipsPosted ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className={cn("relative overflow-hidden", cardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className="text-xs font-medium text-slate-500">Total Applications Received</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.totalApplicationsReceived ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className={cn("relative overflow-hidden", cardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className="text-xs font-medium text-slate-500">Verified Scholarships</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.scholarshipsByStatus.verified ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className={cn("relative overflow-hidden", cardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className="text-xs font-medium text-slate-500">Pending Scholarships</p>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stats?.scholarshipsByStatus.pending ?? 0}</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className={cardShell}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/70 pb-3">
                  <CardTitle className="text-base text-slate-900">Upcoming Deadlines</CardTitle>
                  <CalendarClock className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : topDeadlines.length ? (
                    topDeadlines.map((d) => (
                      <div key={d.id} className={listWell}>
                        <p className="font-medium text-slate-900">{d.title}</p>
                        <p className="text-sm text-slate-500">
                          Deadline: {new Date(d.deadline).toLocaleDateString()}
                        </p>
                        <Badge variant="outline" className="mt-2 border-emerald-200 text-emerald-800">
                          {d.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No upcoming deadlines.</p>
                  )}
                </CardContent>
              </Card>

              <Card className={cardShell}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/70 pb-3">
                  <CardTitle className="text-base text-slate-900">Most Viewed Scholarships</CardTitle>
                  <Eye className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.mostViewedScholarships?.length ? (
                    dashboard.mostViewedScholarships.map((s) => (
                      <div key={s.id} className={cn("flex items-center justify-between", listWell)}>
                        <p className="font-medium text-slate-900">{s.title}</p>
                        <span className="text-sm text-slate-500">{s.views} views</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No scholarship views yet.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className={cardShell}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/70 pb-3">
                  <CardTitle className="text-base text-slate-900">Applications by Status</CardTitle>
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className={statRow}>
                    <span className="text-slate-600">Pending</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.pending ?? 0}</span>
                  </div>
                  <div className={statRow}>
                    <span className="text-slate-600">Submitted</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.submitted ?? 0}</span>
                  </div>
                  <div className={statRow}>
                    <span className="text-slate-600">Accepted</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.accepted ?? 0}</span>
                  </div>
                  <div className={statRow}>
                    <span className="text-slate-600">Rejected</span>
                    <span className="font-semibold text-slate-900">{stats?.applicationsByStatus.rejected ?? 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className={cardShell}>
                <CardHeader className="border-b border-emerald-100/70 pb-3">
                  <CardTitle className="text-base text-slate-900">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.recentActivity?.length ? (
                    dashboard.recentActivity.map((a, idx) => (
                      <div key={`${a.type}-${idx}`} className={listWell}>
                        <p className="text-sm text-slate-700">{a.message}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(a.at).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No recent activity.</p>
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
