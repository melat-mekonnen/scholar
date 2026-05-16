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
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"
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
    return <Badge className="bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80">Pending</Badge>
  }

  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: false },
    { href: "/applications", label: "My Applications", icon: FileText, active: true },
    { href: "/community", label: "Community", icon: Users, active: false },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: false },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: false },
    { href: "/ai-chat", label: "AI Chatbot", icon: MessageSquare, active: false },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: false },
    { href: "/settings", label: "Settings", icon: Settings, active: false },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: false },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
            <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Student Portal</p>

          <nav className="flex flex-col gap-0.5">
            {sidebarLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.active
                      ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                      : "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
                  }
                >
                  <span
                    className={
                      item.active
                        ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"
                        : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.active ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                  ) : (
                    <span className="w-1.5 shrink-0" aria-hidden />
                  )}
                </Link>
              )
            })}
          </nav>
          <StudentPortalSidebarLogout tone="primary" className="mt-10 border-emerald-100/80" />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <h1 className="text-lg font-semibold text-emerald-950">My Applications</h1>
          <ProfileAvatarLink />
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="border-l-4 border-emerald-500 pl-4">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Application tracker</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  See every scholarship you have started or submitted, and update status as you hear back.
                </p>
              </div>
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

          {!loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Total</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Submitted</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.submitted}</p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Accepted</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.accepted}</p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Pending</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.pending}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <p className="rounded-lg border border-emerald-100/80 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
              Loading applications...
            </p>
          ) : null}

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

          {!loading && sorted.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-50">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-emerald-700">{sorted.length}</span> application
                  {sorted.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-slate-500">Sorted by latest update</p>
              </div>

              <div className="grid gap-4">
                {sorted.map((a) => (
                  <Card
                    key={a.id}
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-900 transition-colors group-hover:text-emerald-800">
                        {a.scholarship.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(a.status)}
                        {a.scholarship.country ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {a.scholarship.country}
                          </Badge>
                        ) : null}
                        {a.scholarship.startDate ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            Start: {String(a.scholarship.startDate)}
                          </Badge>
                        ) : null}
                        {a.scholarship.endDate || a.scholarship.deadline ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            End: {String(a.scholarship.endDate || a.scholarship.deadline)}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="border-emerald-100 bg-emerald-50/50 text-slate-600">
                          Updated: {new Date(a.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>

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

