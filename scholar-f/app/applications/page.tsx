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

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import {
  emeraldCard,
  headerShell,
  heroBanner,
  inputSurface,
  outlineControl,
  pageShell,
  summaryBar,
  textMuted,
  textPrimary,
  textSubtle,
} from "@/lib/theme"
import { getMyApplications, updateApplicationStatus, type ApplicationStatus, type StudentApplication } from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
export default function ApplicationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<StudentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { res, data, errorMessage } = await getMyApplications()
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load applications")
        setLoading(false)
        return
      }
      setItems(data.applications ?? [])
      setLoading(false)
    }
    void load()
  }, [router])

  async function changeStatus(id: string, status: ApplicationStatus) {
    const { res, errorMessage } = await updateApplicationStatus(id, status)
    if (!res.ok) {
      toast({
        title: "Could not update status",
        description: errorMessage || "Try again.",
        variant: "destructive",
      })
      return
    }
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    toast({ title: "Status updated", description: "Application status saved." })
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items]
  )
  const stats = useMemo(() => {
    const total = items.length
    const submitted = items.filter((a) => a.status === "submitted").length
    const accepted = items.filter((a) => a.status === "accepted").length
    const pending = items.filter((a) => a.status === "pending").length
    return { total, submitted, accepted, pending }
  }, [items])

  function statusBadge(status: ApplicationStatus) {
    if (status === "accepted") return <Badge className="bg-emerald-600 text-white">Accepted</Badge>
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
    if (status === "submitted") return <Badge className="bg-teal-600 text-white">Submitted</Badge>
    return <Badge className="bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50">Pending</Badge>
  }

  return (
    <div className={`flex min-h-screen ${pageShell}`}>
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className={`flex items-center justify-between ${headerShell}`}>
          <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">My Applications</h1>
          <ProfileAvatarLink />
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className={heroBanner}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 border-l-4 border-emerald-500 pl-4 dark:border-emerald-400">
                <h2 className={`text-2xl font-semibold tracking-tight ${textPrimary}`}>Application tracker</h2>
                <p className={`mt-2 text-sm leading-relaxed ${textMuted}`}>
                  See every scholarship you have started or submitted, and update status as you hear back.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 md:pt-1">
                <Button asChild variant="outline" className={`text-emerald-800 dark:text-emerald-300 ${outlineControl}`}>
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
                <Button asChild variant="outline" className={`text-emerald-800 dark:text-emerald-300 ${outlineControl}`}>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>

          {!loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className={`relative overflow-hidden ${emeraldCard}`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
                <CardContent className="pt-6">
                  <p className={`text-sm font-medium ${textSubtle}`}>Total</p>
                  <p className={`mt-1 text-3xl font-semibold tracking-tight ${textPrimary}`}>{stats.total}</p>
                </CardContent>
              </Card>
              <Card className={`relative overflow-hidden ${emeraldCard}`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className={`text-sm font-medium ${textSubtle}`}>Submitted</p>
                  <p className={`mt-1 text-3xl font-semibold tracking-tight ${textPrimary}`}>{stats.submitted}</p>
                </CardContent>
              </Card>
              <Card className={`relative overflow-hidden ${emeraldCard}`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className={`text-sm font-medium ${textSubtle}`}>Accepted</p>
                  <p className={`mt-1 text-3xl font-semibold tracking-tight ${textPrimary}`}>{stats.accepted}</p>
                </CardContent>
              </Card>
              <Card className={`relative overflow-hidden ${emeraldCard}`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-80" />
                <CardContent className="pt-6">
                  <p className={`text-sm font-medium ${textSubtle}`}>Pending</p>
                  <p className={`mt-1 text-3xl font-semibold tracking-tight ${textPrimary}`}>{stats.pending}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive dark:border-red-900/50 dark:bg-red-950/40">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${emeraldCard} ${textSubtle}`}>
              Loading applications...
            </p>
          ) : null}

          {!loading && sorted.length === 0 ? (
            <Card className={`relative overflow-hidden ${emeraldCard}`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
              <CardHeader>
                <CardTitle className={`text-base ${textPrimary}`}>No applications yet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className={`text-sm ${textMuted}`}>
                  Start with a scholarship, click Apply, and it will appear here for tracking.
                </p>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!loading && sorted.length > 0 ? (
            <section className="space-y-4">
              <div className={summaryBar}>
                <p className={`text-sm ${textMuted}`}>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{sorted.length}</span> application
                  {sorted.length === 1 ? "" : "s"}
                </p>
                <p className={`text-xs ${textSubtle}`}>Sorted by latest update</p>
              </div>

              <div className="grid gap-4">
                {sorted.map((a) => (
                  <Card
                    key={a.id}
                    className={`group relative overflow-hidden ${emeraldCard} transition-all hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-black/30`}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl dark:bg-emerald-900/20" />
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-base ${textPrimary} transition-colors group-hover:text-emerald-800 dark:group-hover:text-emerald-300`}>
                        {a.scholarship.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(a.status)}
                        {a.scholarship.country ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300">
                            {a.scholarship.country}
                          </Badge>
                        ) : null}
                        {a.scholarship.startDate ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300">
                            Start: {String(a.scholarship.startDate)}
                          </Badge>
                        ) : null}
                        {a.scholarship.endDate || a.scholarship.deadline ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300">
                            End: {String(a.scholarship.endDate || a.scholarship.deadline)}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="border-emerald-100 bg-emerald-50/50 text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground">
                          Updated: {new Date(a.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Select value={a.status} onValueChange={(v) => void changeStatus(a.id, v as ApplicationStatus)}>
                          <SelectTrigger className={`w-[190px] rounded-lg focus:ring-emerald-500 ${inputSurface}`}>
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className={`rounded-md text-emerald-800 dark:text-emerald-300 ${outlineControl}`}
                        >
                          <Link href="/scholarships">View scholarship</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}

