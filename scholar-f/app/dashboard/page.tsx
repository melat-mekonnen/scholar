"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { createApplication } from "@/lib/applications"
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
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-8">Scholarship Portal</h2>

        <nav className="space-y-3">
          <Link href="/dashboard" className="block text-sm font-medium hover:text-primary">
            Dashboard
          </Link>
          <Link href="/scholarships" className="block text-sm font-medium hover:text-primary">
            Browse Scholarships
          </Link>
          <Link href="/applications" className="block text-sm font-medium hover:text-primary">
            My Applications
          </Link>
          <Link href="/community" className="block text-sm font-medium hover:text-primary">
            Community
          </Link>
          <Link href="/saved" className="block text-sm font-medium hover:text-primary">
            Saved Scholarships
          </Link>
          <Link href="/profile" className="block text-sm font-medium hover:text-primary">
            Profile
          </Link>
          <Link href="/settings" className="block text-sm font-medium hover:text-primary">
            Settings
          </Link>
          <Link href="/documents" className="block text-sm font-medium hover:text-primary">
            Document Resources
          </Link>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b p-4 bg-card">
          <h1 className="text-lg font-semibold">Dashboard</h1>

          <Avatar>
            <AvatarFallback>ES</AvatarFallback>
          </Avatar>
        </header>

        <main className="p-6 space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Welcome back 👋</h2>
            <p className="text-muted-foreground">
              Discover scholarships that match your profile.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              : statCards.map((stat) => (
                  <Card key={stat.title}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Recommended Scholarships</h3>

            {loading && (
              <div className="grid md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
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
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  No featured scholarships yet. Managers can mark scholarships as recommended in the database
                  (<code className="text-xs">is_recommended_default</code>), or you can{" "}
                  <Link href="/scholarships" className="text-primary underline underline-offset-2">
                    browse all scholarships
                  </Link>
                  .
                </CardContent>
              </Card>
            )}

            {!loading && recommended.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                {recommended.map((s) => (
                  <Card key={s.id}>
                    <CardHeader>
                      <CardTitle>{s.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">Country: {s.country}</p>
                      {s.deadline && (
                        <p className="text-sm text-muted-foreground">Deadline: {s.deadline}</p>
                      )}

                      <div className="flex gap-2 pt-3">
                        <Button size="sm" asChild>
                          <Link href={`/scholarships?q=${encodeURIComponent(s.title)}`}>View</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!getApplicationUrl(s)}
                          onClick={async () => {
                            const created = await createApplication(s.id)
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
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>

            <Card>
              <CardContent className="pt-6 space-y-3">
                {loading && (
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </>
                )}
                {!loading && activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                )}
                {!loading &&
                  activities.map((activity, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      • {activity}
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
