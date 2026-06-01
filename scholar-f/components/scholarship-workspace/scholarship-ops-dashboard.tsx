"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, CalendarClock, Eye, LayoutDashboard } from "lucide-react"

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
import { ScholarshipWorkspaceShell } from "@/components/scholarship-workspace/scholarship-workspace-shell"
import { textMuted, textPrimary, textSubtle, workspaceCardShell, workspacePageHeader } from "@/lib/theme"

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
  /** When false, omit workspace shell (e.g. embedded in owner layout). */
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
      <div className="min-h-screen bg-slate-100 p-8 dark:bg-background dark:text-foreground transition-colors duration-200">
        <p className="text-sm text-slate-600 dark:text-foreground/70">Loading…</p>
      </div>
    )
  }

  const listWell =
    "rounded-xl border border-emerald-100/80 bg-emerald-50/30 p-3 dark:border-border dark:bg-muted/30"
  const statRow =
    "flex items-center justify-between rounded-lg border border-emerald-100/60 bg-white px-3 py-2 dark:border-border dark:bg-card dark:text-foreground"

  const body = (
    <>
      <header className={workspacePageHeader}>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h1 className={cn("min-w-0 text-2xl font-semibold tracking-tight", textPrimary)}>
              {cfg.dashboardHeading}
            </h1>
          </div>
          <p className={cn("text-sm", textMuted)}>{cfg.dashboardTagline}</p>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive dark:border-red-900 dark:bg-red-950/40">
          {error}
        </p>
      ) : null}

            <section className="grid gap-4 md:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className={workspaceCardShell}>
                    <CardContent className="space-y-2 p-4">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card className={cn("relative overflow-hidden", workspaceCardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className={cn("text-xs font-medium", textSubtle)}>Total Scholarships Posted</p>
                      <p className={cn("text-3xl font-semibold tracking-tight", textPrimary)}>
                        {stats?.totalScholarshipsPosted ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className={cn("relative overflow-hidden", workspaceCardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className={cn("text-xs font-medium", textSubtle)}>Total Applications Received</p>
                      <p className={cn("text-3xl font-semibold tracking-tight", textPrimary)}>
                        {stats?.totalApplicationsReceived ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className={cn("relative overflow-hidden", workspaceCardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className={cn("text-xs font-medium", textSubtle)}>Verified Scholarships</p>
                      <p className={cn("text-3xl font-semibold tracking-tight", textPrimary)}>
                        {stats?.scholarshipsByStatus.verified ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className={cn("relative overflow-hidden", workspaceCardShell)}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <CardContent className="p-4 pt-5">
                      <p className={cn("text-xs font-medium", textSubtle)}>Pending Scholarships</p>
                      <p className={cn("text-3xl font-semibold tracking-tight", textPrimary)}>
                        {stats?.scholarshipsByStatus.pending ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className={workspaceCardShell}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/70 pb-3 dark:border-border">
                  <CardTitle className={cn("text-base", textPrimary)}>Upcoming Deadlines</CardTitle>
                  <CalendarClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : topDeadlines.length ? (
                    topDeadlines.map((d) => (
                      <div key={d.id} className={listWell}>
                        <p className={cn("font-medium", textPrimary)}>{d.title}</p>
                        <p className={cn("text-sm", textSubtle)}>
                          Deadline: {new Date(d.deadline).toLocaleDateString()}
                        </p>
                        <Badge variant="outline" className="mt-2 border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-200">
                          {d.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className={cn("text-sm", textSubtle)}>No upcoming deadlines.</p>
                  )}
                </CardContent>
              </Card>

              <Card className={workspaceCardShell}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/70 pb-3">
                  <CardTitle className={cn("text-base", textPrimary)}>Most Viewed Scholarships</CardTitle>
                  <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.mostViewedScholarships?.length ? (
                    dashboard.mostViewedScholarships.map((s) => (
                      <div key={s.id} className={cn("flex items-center justify-between", listWell)}>
                        <p className={cn("font-medium", textPrimary)}>{s.title}</p>
                        <span className={cn("text-sm", textSubtle)}>{s.views} views</span>
                      </div>
                    ))
                  ) : (
                    <p className={cn("text-sm", textSubtle)}>No scholarship views yet.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className={workspaceCardShell}>
                <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/70 pb-3">
                  <CardTitle className={cn("text-base", textPrimary)}>Applications by Status</CardTitle>
                  <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className={statRow}>
                    <span className={textMuted}>Pending</span>
                    <span className={cn("font-semibold", textPrimary)}>{stats?.applicationsByStatus.pending ?? 0}</span>
                  </div>
                  <div className={statRow}>
                    <span className={textMuted}>Submitted</span>
                    <span className={cn("font-semibold", textPrimary)}>{stats?.applicationsByStatus.submitted ?? 0}</span>
                  </div>
                  <div className={statRow}>
                    <span className={textMuted}>Accepted</span>
                    <span className={cn("font-semibold", textPrimary)}>{stats?.applicationsByStatus.accepted ?? 0}</span>
                  </div>
                  <div className={statRow}>
                    <span className={textMuted}>Rejected</span>
                    <span className={cn("font-semibold", textPrimary)}>{stats?.applicationsByStatus.rejected ?? 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className={workspaceCardShell}>
                <CardHeader className="border-b border-emerald-100/70 pb-3">
                  <CardTitle className={cn("text-base", textPrimary)}>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.recentActivity?.length ? (
                    dashboard.recentActivity.map((a, idx) => (
                      <div key={`${a.type}-${idx}`} className={listWell}>
                        <p className={cn("text-sm", textPrimary)}>{a.message}</p>
                        <p className={cn("mt-1 text-xs", textSubtle)}>{new Date(a.at).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className={cn("text-sm", textSubtle)}>No recent activity.</p>
                  )}
                </CardContent>
              </Card>
            </section>
    </>
  )

  if (!showSidebar) {
    return <div className="space-y-6 p-4 sm:p-6">{body}</div>
  }

  return <ScholarshipWorkspaceShell workspace={workspace}>{body}</ScholarshipWorkspaceShell>
}
