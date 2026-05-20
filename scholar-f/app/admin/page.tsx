"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  Check,
  Eye,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Search,
  Settings,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScholarshipLinks } from "@/components/admin/scholarship-links"

type AdminDashboardResponse = {
  totals: {
    users: { total: number; byRole: Record<string, number> }
    scholarships: { total: number; verified: number; pending: number }
    applications: { total: number; byStatus: Record<string, number> }
  }
}

type AdminScholarship = {
  id: string
  title: string
  status: "pending" | "verified" | "rejected" | "draft" | "expired"
  fundingType?: string
  deadline?: string
  applicationUrl?: string
  sourceUrl?: string
}

type PendingResponse = {
  scholarships: AdminScholarship[]
}

function getStatusBadge(status: AdminScholarship["status"]) {
  if (status === "verified") return <Badge className="bg-green-600 text-white">Verified</Badge>
  if (status === "pending") return <Badge className="bg-yellow-500 text-white">Pending</Badge>
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
  if (status === "expired") return <Badge variant="secondary">Expired</Badge>
  return <Badge variant="outline">Draft</Badge>
}

export default function AdminDashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null)
  const [scholarships, setScholarships] = useState<AdminScholarship[]>([])

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Optional: disable buttons while approving/rejecting
  const [mutatingIds, setMutatingIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      const [dashboardRes, pendingRes] = await Promise.all([
        apiFetchJson<AdminDashboardResponse>("/api/admin/dashboard", { method: "GET" }),
        apiFetchJson<PendingResponse>("/api/admin/scholarships?status=all", { method: "GET" }),
      ])

      if (
        dashboardRes.res.status === 401 ||
        dashboardRes.res.status === 403 ||
        pendingRes.res.status === 401 ||
        pendingRes.res.status === 403
      ) {
        clearToken()
        router.replace("/signin")
        return
      }

      if (!dashboardRes.res.ok || !dashboardRes.data) {
        setError(dashboardRes.errorMessage || "Failed to load admin dashboard")
        setLoading(false)
        return
      }

      setDashboard(dashboardRes.data)

      if (pendingRes.res.ok && pendingRes.data) {
        setScholarships(pendingRes.data.scholarships ?? [])
      }

      setLoading(false)
    }

    loadData()
  }, [router])

  const visibleScholarships = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scholarships.filter((s) => {
      const matchesQuery = !q || s.title.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [query, scholarships, statusFilter])

  async function approveScholarship(id: string) {
    setMutatingIds((prev) => ({ ...prev, [id]: true }))
    try {
      const { res } = await apiFetchJson(`/api/admin/scholarships/${id}/verify`, {
        method: "PUT",
      })
      if (res.ok) {
        setScholarships((prev) => prev.map((s) => (s.id === id ? { ...s, status: "verified" } : s)))
      }
    } finally {
      setMutatingIds((prev) => ({ ...prev, [id]: false }))
    }
  }

  async function rejectScholarship(id: string) {
    setMutatingIds((prev) => ({ ...prev, [id]: true }))
    try {
      const { res } = await apiFetchJson(`/api/admin/scholarships/${id}/reject`, {
        method: "PUT",
      })
      if (res.ok) {
        setScholarships((prev) => prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s)))
      }
    } finally {
      setMutatingIds((prev) => ({ ...prev, [id]: false }))
    }
  }

  async function deleteScholarship(id: string) {
    if (!window.confirm("Delete this scholarship permanently?")) return
    setMutatingIds((prev) => ({ ...prev, [id]: true }))
    setError(null)
    try {
      const { res, errorMessage } = await apiFetchJson(`/api/admin/scholarships/${id}`, {
        method: "DELETE",
      })
      if (res.status === 204 || res.ok) {
        setScholarships((prev) => prev.filter((s) => s.id !== id))
        const dash = await apiFetchJson<AdminDashboardResponse>("/api/admin/dashboard", {
          method: "GET",
        })
        if (dash.res.ok && dash.data) setDashboard(dash.data)
        return
      }
      setError(errorMessage || "Failed to delete scholarship")
    } finally {
      setMutatingIds((prev) => ({ ...prev, [id]: false }))
    }
  }

  const totals = dashboard?.totals

  return (
    <div className="relative p-6 space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-56 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h2>
            <p className="text-sm text-blue-50">
              Manage scholarships, users, and platform operations for EthioScholar.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
              <Bell className="h-5 w-5" />
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
              <User className="h-5 w-5" />
            </span>
          </div>
        </div>
      </header>
            {error ? (
              <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            ) : null}

            {/* Overview cards */}
            <section className="grid gap-4 md:grid-cols-4 mb-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-44" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-80" />
                    <CardContent className="p-5">
                      <p className="text-xs text-slate-500">Active Scholarships</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.scholarships.verified ?? 0}</p>
                      <p className="mt-1 text-xs text-slate-400">Currently open for applications</p>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600 opacity-80" />
                    <CardContent className="p-5">
                      <p className="text-xs text-slate-500">Pending Approvals</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.scholarships.pending ?? 0}</p>
                      <p className="mt-1 text-xs text-slate-400">Scholarships awaiting review</p>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 opacity-80" />
                    <CardContent className="p-5">
                      <p className="text-xs text-slate-500">Total Applications</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.applications.total ?? 0}</p>
                      <p className="mt-1 text-xs text-slate-400">Across all listed scholarships</p>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-600 to-slate-800 opacity-80" />
                    <CardContent className="p-5">
                      <p className="text-xs text-slate-500">Total Users</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.users.total ?? 0}</p>
                      <p className="mt-1 text-xs text-slate-400">Registered accounts</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </section>

            {/* Scholarships needing approval */}
            <section className="rounded-2xl border border-blue-100/80 bg-white shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold">Needs Approval / Unverified</h2>

                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" className="rounded-xl border-slate-300 bg-white hover:bg-slate-50">
                    <Link href="/admin/scholarships/pending">Scholarship Listings</Link>
                  </Button>
                  <Button asChild className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link href="/admin/scholarships/new">Create Scholarship</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-slate-300 bg-white hover:bg-slate-50">
                    <Link href="/admin/audit-logs">View Audit Logs</Link>
                  </Button>
                </div>
              </div>

              <div className="p-5">
                {/* toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="relative min-w-[260px] flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="h-10 pl-8 rounded-xl border-slate-200"
                      placeholder="Search scholarships..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Scholarship Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Funding</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Links</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : visibleScholarships.length ? (
                        visibleScholarships.map((s) => (
                          <TableRow key={s.id} className="hover:bg-slate-50/60">
                            <TableCell className="font-medium text-slate-900">
                              {s.title}
                            </TableCell>
                            <TableCell>{getStatusBadge(s.status)}</TableCell>
                            <TableCell>{s.fundingType ?? "N/A"}</TableCell>
                            <TableCell>{s.deadline ?? "N/A"}</TableCell>
                            <TableCell>
                              <ScholarshipLinks
                                applicationUrl={s.applicationUrl}
                                sourceUrl={s.sourceUrl}
                                compact
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button size="icon-sm" variant="outline" asChild className="border-slate-300 bg-white hover:bg-slate-50">
                                  <Link href={`/admin/scholarships/${s.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>

                                <Button
                                  size="icon-sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => approveScholarship(s.id)}
                                  disabled={!!mutatingIds[s.id]}
                                  aria-label="Approve scholarship"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>

                                <Button
                                  size="icon-sm"
                                  variant="destructive"
                                  onClick={() => rejectScholarship(s.id)}
                                  disabled={!!mutatingIds[s.id]}
                                  aria-label="Reject scholarship"
                                >
                                  <X className="h-4 w-4" />
                                </Button>

                                <Button
                                  size="icon-sm"
                                  variant="outline"
                                  disabled={!!mutatingIds[s.id]}
                                  onClick={() => void deleteScholarship(s.id)}
                                  aria-label="Delete scholarship"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                            No scholarships found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>
    </div>
  )
}