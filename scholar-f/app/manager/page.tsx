"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, CalendarClock, Eye, LayoutDashboard, LogOut, User } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

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

export default function ManagerDashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError(null)

      const { res, data, errorMessage } = await apiFetchJson<DashboardResponse>("/api/manager/dashboard", {
        method: "GET",
      })

      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }

      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load manager dashboard")
        setLoading(false)
        return
      }

      setDashboard(data)
      setLoading(false)
    }

    loadDashboard()
  }, [router])

  const stats = dashboard?.statistics

  const topDeadlines = useMemo(() => dashboard?.upcomingDeadlines ?? [], [dashboard?.upcomingDeadlines])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex">
        <aside className="hidden md:flex w-64 flex-col border-r bg-white">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className="font-semibold">Manager Panel</span>
          </div>

          <nav className="p-4 space-y-1 text-sm">
            <Link
              href="/manager"
              className="flex items-center gap-2 w-full rounded-md bg-primary/10 px-3 py-2 font-medium text-primary"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </nav>

          <div className="mt-auto p-4 border-t">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100"
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

        <div className="flex-1">
          <header className="sticky top-0 z-10 bg-white border-b">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Manager Dashboard</h1>
                <p className="text-sm text-gray-500">Track scholarship performance and application activity.</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            </div>
          </header>

          <main className="p-5 space-y-6">
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

            <section className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/manager">Manage Scholarships</Link>
              </Button>
              <Button asChild>
                <Link href="/manager/scholarships/new">Post New Scholarship</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/manager/documents">Manage Documents</Link>
              </Button>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

