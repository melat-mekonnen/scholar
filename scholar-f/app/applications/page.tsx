"use client"

// Core icons used across the UI (navigation + feature hints)
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

// Next.js navigation utilities
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

// UI + reusable components
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"

// API + auth helpers
import { getMyApplications, updateApplicationStatus, type ApplicationStatus, type StudentApplication } from "@/lib/applications"
import {
  formatScholarshipDateDisplay,
  formatScholarshipDeadlineLabel,
} from "@/lib/scholarship-dates"
import { clearToken } from "@/lib/auth"

// UI components (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function ApplicationsPage() {
  const router = useRouter()
  const { toast } = useToast()

  // State: applications list
  const [items, setItems] = useState<StudentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user applications on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { res, data, errorMessage } = await getMyApplications()

      // Handle unauthorized access
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }

      // Handle API failure
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load applications")
        setLoading(false)
        return
      }

      // Store fetched applications
      setItems(data.applications ?? [])
      setLoading(false)
    }

    void load()
  }, [router])

  // Update application status
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

    // Update UI state optimistically
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))

    toast({ title: "Status updated", description: "Application status saved." })
  }

  // Sort applications by latest update time
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items]
  )

  // Compute stats for dashboard cards
  const stats = useMemo(() => {
    const total = items.length
    const submitted = items.filter((a) => a.status === "submitted").length
    const accepted = items.filter((a) => a.status === "accepted").length
    const pending = items.filter((a) => a.status === "pending").length
    return { total, submitted, accepted, pending }
  }, [items])

  // Render status badge UI
  function statusBadge(status: ApplicationStatus) {
    if (status === "accepted") return <Badge className="bg-emerald-600 text-white">Accepted</Badge>
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
    if (status === "submitted") return <Badge className="bg-teal-600 text-white">Submitted</Badge>
    return <Badge className="bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80">Pending</Badge>
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Sidebar navigation */}
      <StudentPortalInlineAside />

      <div className="flex min-h-screen flex-1 flex-col">

        {/* Top header */}
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <h1 className="text-lg font-semibold text-emerald-950">My Applications</h1>
          <ProfileAvatarLink />
        </header>

        {/* Main content area */}
        <main className="relative flex-1 space-y-6 p-6">

          {/* Background decorative blobs */}
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          {/* Page hero section */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="border-l-4 border-emerald-500 pl-4">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Application tracker</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  See every scholarship you have started or submitted, and update status as you hear back.
                </p>
              </div>

              {/* Navigation buttons */}
              <div className="flex flex-shrink-0 flex-wrap gap-2 md:pt-1">
                <Button asChild variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
                <Button asChild variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          {!loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total applications */}
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Total</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.total}</p>
                </CardContent>
              </Card>

              {/* Submitted applications */}
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Submitted</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.submitted}</p>
                </CardContent>
              </Card>

              {/* Accepted applications */}
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Accepted</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.accepted}</p>
                </CardContent>
              </Card>

              {/* Pending applications */}
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Pending</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.pending}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Error + loading states */}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}

          {loading ? (
            <p className="rounded-lg border border-emerald-100/80 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
              Loading applications...
            </p>
          ) : null}

          {/* Empty state */}
          {!loading && sorted.length === 0 ? (
            <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
              <CardHeader>
                <CardTitle className="text-base text-slate-900">No applications yet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Start with a scholarship, click Apply, and it will appear here for tracking.
                </p>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Applications list */}
          {!loading && sorted.length > 0 ? (
            <section className="space-y-4">

              {/* summary bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-50">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-emerald-700">{sorted.length}</span> application
                  {sorted.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-slate-500">Sorted by latest update</p>
              </div>

              {/* application cards */}
              <div className="grid gap-4">
                {sorted.map((a) => (
                  <Card
                    key={a.id}
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />

                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-900 transition-colors group-hover:text-emerald-800">
                        {a.scholarship.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">

                      {/* badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(a.status)}

                        {a.scholarship.country ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {a.scholarship.country}
                          </Badge>
                        ) : null}

                        {formatScholarshipDateDisplay(a.scholarship.startDate) && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            Opens {formatScholarshipDateDisplay(a.scholarship.startDate)}
                          </Badge>
                        )}

                        {formatScholarshipDeadlineLabel(a.scholarship) && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {formatScholarshipDeadlineLabel(a.scholarship)}
                          </Badge>
                        )}

                        <Badge variant="outline" className="border-emerald-100 bg-emerald-50/50 text-slate-600">
                          Updated: {new Date(a.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>

                      {/* actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Select value={a.status} onValueChange={(v) => void changeStatus(a.id, v as ApplicationStatus)}>
                          <SelectTrigger className="w-[190px] rounded-lg border-emerald-200 bg-white focus:ring-emerald-500">
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
                          className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
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
