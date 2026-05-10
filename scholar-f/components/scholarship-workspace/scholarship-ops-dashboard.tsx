"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, CalendarClock, Eye, IdCard, LayoutDashboard, LogOut, User } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useScholarshipWorkspaceGate } from "@/hooks/use-scholarship-workspace-gate"
import { Button } from "@/components/ui/button"
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
}

export function ScholarshipOpsDashboard({ workspace }: Props) {
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
      <div className="flex flex-col flex-1 p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 pb-10">
      <PageHeader 
        title={cfg.dashboardHeading} 
        description={cfg.dashboardTagline} 
      />

      <main className="p-6 space-y-6 max-w-7xl">
            {error ? (
              <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            ) : null}

            <section className="grid gap-4 md:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Scholarships Posted</p>
                      <p className="text-3xl font-bold">{stats?.totalScholarshipsPosted ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Applications Received</p>
                      <p className="text-3xl font-bold">{stats?.totalApplicationsReceived ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Verified Scholarships</p>
                      <p className="text-3xl font-bold">{stats?.scholarshipsByStatus.verified ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Pending Scholarships</p>
                      <p className="text-3xl font-bold">{stats?.scholarshipsByStatus.pending ?? 0}</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : topDeadlines.length ? (
                    topDeadlines.map((d) => (
                      <div key={d.id} className="rounded border p-3">
                        <p className="font-medium">{d.title}</p>
                        <p className="text-sm text-muted-foreground">
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Most Viewed Scholarships</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.mostViewedScholarships?.length ? (
                    dashboard.mostViewedScholarships.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded border p-3">
                        <p className="font-medium">{s.title}</p>
                        <span className="text-sm text-muted-foreground">{s.views} views</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No scholarship views yet.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Applications by Status</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Pending: {stats?.applicationsByStatus.pending ?? 0}</p>
                  <p>Submitted: {stats?.applicationsByStatus.submitted ?? 0}</p>
                  <p>Accepted: {stats?.applicationsByStatus.accepted ?? 0}</p>
                  <p>Rejected: {stats?.applicationsByStatus.rejected ?? 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : dashboard?.recentActivity?.length ? (
                    dashboard.recentActivity.map((a, idx) => (
                      <div key={`${a.type}-${idx}`} className="rounded border p-3">
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

            <section className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href={cfg.profilePath}>{cfg.profileLinkLabel}</Link>
              </Button>
              <Button asChild>
                <Link href={cfg.newScholarshipPath}>Post new scholarship</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={cfg.manageScholarshipsPath}>Manage scholarships</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={cfg.documentsPath}>Documents</Link>
              </Button>
            </section>
          </main>
    </div>
  )
}
