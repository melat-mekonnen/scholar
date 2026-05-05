"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Bell, CalendarClock, Eye, IdCard, LayoutDashboard, LogOut, User } from "lucide-react"

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
  /** When true (owner under app/owner layout), omit duplicate sidebar / full-page shell. */
  embedded?: boolean
}

type NotificationResponse = {
  notifications: Array<{ isRead: boolean }>
}

export function ScholarshipOpsDashboard({ workspace, embedded = false }: Props) {
  const cfg = getScholarshipWorkspaceConfig(workspace)
  const router = useRouter()
  const gate = useScholarshipWorkspaceGate(workspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (gate !== "ready") return

    async function loadDashboard() {
      setLoading(true)
      setError(null)
      const [dashboardRes, notificationsRes] = await Promise.all([
        apiFetchJson<DashboardResponse>("/api/manager/dashboard", { method: "GET" }),
        apiFetchJson<NotificationResponse>("/api/notifications/mine?unread=true&limit=100", { method: "GET" }),
      ])
      const { res, data, errorMessage } = dashboardRes
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
      if (notificationsRes.res.ok && notificationsRes.data?.notifications) {
        setUnreadCount(notificationsRes.data.notifications.length)
      }
      setLoading(false)
    }
    void loadDashboard()
  }, [gate, router, workspace])

  const stats = dashboard?.statistics
  const topDeadlines = useMemo(() => dashboard?.upcomingDeadlines ?? [], [dashboard?.upcomingDeadlines])

  if (gate !== "ready") {
    return (
      <div className={embedded ? "p-6" : "min-h-screen bg-gray-50 p-8"}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const mainColumn = (
    <div className={embedded ? "flex min-h-full flex-1 flex-col" : "flex-1"}>
      <header className="sticky top-0 z-10 border-b bg-white dark:bg-card">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold">{cfg.dashboardHeading}</h1>
            <p className="text-sm text-gray-500 dark:text-muted-foreground">{cfg.dashboardTagline}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={workspace === "owner" ? "/owner/notifications" : "/manager/notifications"}>
                <Bell className="mr-1 h-4 w-4" />
                Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
              </Link>
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-6 p-5">
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
                      <p className="text-xs text-gray-500">Total Scholarships Posted</p>
                      <p className="text-3xl font-bold">{stats?.totalScholarshipsPosted ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Total Applications Received</p>
                      <p className="text-3xl font-bold">{stats?.totalApplicationsReceived ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Verified Scholarships</p>
                      <p className="text-3xl font-bold">{stats?.scholarshipsByStatus.verified ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Pending Scholarships</p>
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
  );

  if (embedded) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-gray-50 text-gray-900 dark:bg-background">
        {mainColumn}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex">
        <aside className={`hidden w-64 flex-col border-r md:flex ${cfg.shellClassName}`}>
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <div className={`rounded-md p-2 ${cfg.badgeClass}`}>
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <span className="block font-semibold">{cfg.shellTitle}</span>
              <span className="text-xs text-muted-foreground">{cfg.shellSubtitle}</span>
            </div>
          </div>

          <nav className="space-y-1 p-4 text-sm">
            <Link
              href={cfg.basePath}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 font-medium ${cfg.navActiveClass}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href={cfg.profilePath}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${cfg.navInactiveClass}`}
            >
              <IdCard className="h-4 w-4" />
              {cfg.profileLinkLabel}
            </Link>
            <Link
              href={cfg.newScholarshipPath}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${cfg.navInactiveClass}`}
            >
              <span className="text-lg leading-none">+</span>
              New scholarship
            </Link>
            <Link
              href={cfg.manageScholarshipsPath}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${cfg.navInactiveClass}`}
            >
              Manage scholarships
            </Link>
            <Link
              href={cfg.documentsPath}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${cfg.navInactiveClass}`}
            >
              Documents
            </Link>
            <Link
              href={workspace === "owner" ? "/owner/notifications" : "/manager/notifications"}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 ${cfg.navInactiveClass}`}
            >
              <span className="inline-flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </span>
              {unreadCount > 0 ? (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {unreadCount}
                </Badge>
              ) : null}
            </Link>
            {workspace === "owner" ? (
              <Link
                href={cfg.ownerHomePath}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 ${cfg.navInactiveClass}`}
              >
                Owner home
              </Link>
            ) : null}
          </nav>

          <div className="mt-auto border-t p-4">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-muted/50"
              onClick={() => {
                clearToken()
                router.push("/signin")
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {mainColumn}
      </div>
    </div>
  )
}
