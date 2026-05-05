"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Building2, CalendarClock, Eye } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type OwnerDashboard = {
  role: string
  message?: string
}

type ManagerDashboardResponse = {
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

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ownerMeta, setOwnerMeta] = useState<OwnerDashboard | null>(null)
  const [metrics, setMetrics] = useState<ManagerDashboardResponse | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const [ownerRes, dashRes] = await Promise.all([
        apiFetchJson<OwnerDashboard>("/api/owner/dashboard", { method: "GET" }),
        apiFetchJson<ManagerDashboardResponse>("/api/manager/dashboard", { method: "GET" }),
      ])
      if (ownerRes.res.status === 401 || ownerRes.res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!ownerRes.res.ok || !ownerRes.data) {
        setError(ownerRes.errorMessage || "Could not load owner workspace")
        setLoading(false)
        return
      }
      setOwnerMeta(ownerRes.data)

      if (dashRes.res.status === 401 || dashRes.res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!dashRes.res.ok || !dashRes.data) {
        setError(dashRes.errorMessage || "Could not load dashboard metrics")
        setLoading(false)
        return
      }
      setMetrics(dashRes.data)
      setLoading(false)
    }
    void load()
  }, [router])

  const stats = metrics?.statistics
  const topDeadlines = useMemo(() => metrics?.upcomingDeadlines?.slice(0, 4) ?? [], [metrics?.upcomingDeadlines])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-8 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {ownerMeta?.message ||
              "High-level platform and scholarship performance. Use the sidebar for moderation, imports, and operations."}
          </p>
        </div>
      </header>

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {error && !loading && <p className="text-sm text-destructive">{error}</p>}

      {!loading && stats && (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Scholarships posted</p>
                <p className="text-3xl font-bold tabular-nums">{stats.totalScholarshipsPosted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Applications received</p>
                <p className="text-3xl font-bold tabular-nums">{stats.totalApplicationsReceived}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Verified</p>
                <p className="text-3xl font-bold tabular-nums">{stats.scholarshipsByStatus.verified}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pending review</p>
                <p className="text-3xl font-bold tabular-nums">{stats.scholarshipsByStatus.pending}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Upcoming deadlines</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {topDeadlines.length ? (
                  topDeadlines.map((d) => (
                    <div key={d.id} className="rounded-md border p-3">
                      <p className="font-medium leading-snug">{d.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(d.deadline).toLocaleDateString()}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {d.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming deadlines in this window.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Most viewed</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics?.mostViewedScholarships?.length ? (
                  metrics.mostViewedScholarships.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <p className="min-w-0 font-medium leading-snug">{s.title}</p>
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{s.views} views</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No view data yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Applications by status</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Pending: {stats.applicationsByStatus.pending}</p>
                <p>Submitted: {stats.applicationsByStatus.submitted}</p>
                <p>Accepted: {stats.applicationsByStatus.accepted}</p>
                <p>Rejected: {stats.applicationsByStatus.rejected}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics?.recentActivity?.length ? (
                  metrics.recentActivity.slice(0, 6).map((a, idx) => (
                    <div key={`${a.type}-${idx}`} className="rounded-md border p-3 text-sm">
                      <p>{a.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(a.at).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/owner/scholarships">Scholarship operations</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/owner/approvals">Pending approvals</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/owner/users">Students &amp; managers</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
