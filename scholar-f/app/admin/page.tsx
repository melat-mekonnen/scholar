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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  const totals = dashboard?.totals

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage scholarships, users, and platform operations.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="rounded-lg">
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-44" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card className="rounded-lg">
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Active Scholarships</p>
                      <p className="text-3xl font-bold">{totals?.scholarships.verified ?? 0}</p>
                      <p className="text-xs text-gray-400">Currently open for applications</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg">
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Pending Approvals</p>
                      <p className="text-3xl font-bold">{totals?.scholarships.pending ?? 0}</p>
                      <p className="text-xs text-gray-400">Scholarships awaiting review</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg">
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Total Applications</p>
                      <p className="text-3xl font-bold">{totals?.applications.total ?? 0}</p>
                      <p className="text-xs text-gray-400">Across all listed scholarships</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg">
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">Total Users</p>
                      <p className="text-3xl font-bold">{totals?.users.total ?? 0}</p>
                      <p className="text-xs text-gray-400">Registered student accounts</p>
                    </CardContent>
                  </Card>
                </>
              )}
      </section>

      <section className="rounded-lg border bg-white">
              <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold">Needs Approval / Unverified</h2>

                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" className="rounded-md">
                    <Link href="/admin/scholarships/pending">Scholarship Listings</Link>
                  </Button>
                  <Button asChild className="rounded-md">
                    <Link href="/admin/scholarships/new">Create Scholarship</Link>
                  </Button>
                </div>
              </div>

              <div className="p-5">
                {/* toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="relative min-w-[260px] flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 rounded-md"
                      placeholder="Search scholarships..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px] rounded-md">
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
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-gray-50">
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
                          <TableRow key={s.id} className="hover:bg-gray-50/60">
                            <TableCell className="font-medium text-indigo-700">
                              {s.title}
                            </TableCell>
                            <TableCell>{getStatusBadge(s.status)}</TableCell>
                            <TableCell>{s.fundingType ?? "N/A"}</TableCell>
                            <TableCell>{s.deadline ?? "N/A"}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button size="icon-sm" variant="outline" asChild>
                                  <Link href={`/admin/scholarships/${s.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>

                                <Button
                                  size="icon-sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
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

                                <Button size="icon-sm" variant="outline" disabled aria-label="Delete scholarship">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                            No scholarships found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
      </section>
    </main>
  )
}