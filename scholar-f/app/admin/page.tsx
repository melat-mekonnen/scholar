"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Eye, Search, Trash2, X } from "lucide-react"

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
}

type PendingResponse = {
  scholarships: AdminScholarship[]
}

function getStatusBadge(status: AdminScholarship["status"]) {
  if (status === "verified") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Verified</Badge>
  if (status === "pending") return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Pending</Badge>
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
  if (status === "expired") return <Badge variant="secondary">Expired</Badge>
  return (
    <Badge variant="outline" className="border-emerald-200 text-emerald-800">
      Draft
    </Badge>
  )
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

  const totals = dashboard?.totals

  return (
    <div className="space-y-8 p-6">
      <header className="rounded-2xl border border-slate-200/90 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 px-6 py-7 shadow-sm">
        <div className="border-l-4 border-emerald-500 pl-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">Admin Dashboard</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Manage scholarships, users, and platform operations for EthioScholar.
          </p>
        </div>
      </header>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {/* Overview cards — same tokens as student /dashboard stat cards */}
      <section className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200">
              <CardContent className="space-y-2 pt-6">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-44" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Active Scholarships</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.scholarships.verified ?? 0}</p>
                <p className="mt-1 text-xs text-slate-400">Currently open for applications</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600 opacity-90" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.scholarships.pending ?? 0}</p>
                <p className="mt-1 text-xs text-slate-400">Scholarships awaiting review</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Total Applications</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.applications.total ?? 0}</p>
                <p className="mt-1 text-xs text-slate-400">Across all listed scholarships</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Total Users</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totals?.users.total ?? 0}</p>
                <p className="mt-1 text-xs text-slate-400">Registered accounts</p>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* Scholarships needing approval — list shell aligned with student applications */}
      <section className="rounded-2xl border border-emerald-100/80 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200/90 p-3 shadow-sm shadow-emerald-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/80 px-3 py-3 sm:px-4 sm:py-4">
          <h2 className="text-lg font-semibold text-slate-900">Needs approval / unverified</h2>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
            >
              <Link href="/admin/scholarships/pending">Scholarship Listings</Link>
            </Button>
            <Button asChild className="rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
              <Link href="/admin/scholarships/new">Create Scholarship</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
            >
              <Link href="/admin/audit-logs">View Audit Logs</Link>
            </Button>
          </div>
        </div>

        <div className="p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-600/70" />
              <Input
                className="h-10 rounded-md border-emerald-100/90 bg-white pl-8 shadow-sm focus-visible:ring-emerald-500"
                placeholder="Search scholarships..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[180px] rounded-md border-emerald-100/90 bg-white shadow-sm">
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

          <div className="overflow-x-auto rounded-xl border border-emerald-100/90 bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-emerald-50/60">
                <TableRow>
                  <TableHead>Scholarship Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Funding</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : visibleScholarships.length ? (
                  visibleScholarships.map((s) => (
                    <TableRow key={s.id} className="transition-colors hover:bg-emerald-50/50">
                      <TableCell className="font-medium text-slate-900">{s.title}</TableCell>
                      <TableCell>{getStatusBadge(s.status)}</TableCell>
                      <TableCell>{s.fundingType ?? "N/A"}</TableCell>
                      <TableCell>{s.deadline ?? "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            asChild
                            className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                          >
                            <Link href={`/admin/scholarships/${s.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>

                          <Button
                            size="icon-sm"
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => approveScholarship(s.id)}
                            disabled={!!mutatingIds[s.id]}
                            aria-label="Approve scholarship"
                          >
                            <Check className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon-sm"
                            variant="destructive"
                            className="rounded-md"
                            onClick={() => rejectScholarship(s.id)}
                            disabled={!!mutatingIds[s.id]}
                            aria-label="Reject scholarship"
                          >
                            <X className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="rounded-md"
                            disabled
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
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
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