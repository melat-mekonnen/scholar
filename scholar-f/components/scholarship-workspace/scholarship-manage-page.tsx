"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CirclePlus, Filter, Search, Sparkles } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useScholarshipWorkspaceGate } from "@/hooks/use-scholarship-workspace-gate"
import { getScholarshipWorkspaceConfig, type ScholarshipWorkspace } from "@/lib/scholarship-workspace"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ScholarshipRow = {
  id: string
  title: string
  organizationName?: string
  country?: string
  degreeLevel?: string
  fundingType?: string
  deadline?: string
  status: "draft" | "pending" | "verified" | "rejected" | "expired"
  rejectionReason?: string | null
}

type ListResponse = {
  scholarships: ScholarshipRow[]
}

type ScholarshipDetail = {
  id: string
  title: string
  organizationName?: string
  country?: string
  degreeLevel?: string
  fieldOfStudy?: string
  fundingType?: string
  deadline?: string
  amount?: string
  description?: string
  applicationUrl?: string
  status?: string
  rejectionReason?: string | null
}

type Props = {
  workspace: ScholarshipWorkspace
}

function statusBadge(status: ScholarshipRow["status"]) {
  if (status === "verified") return <Badge className="bg-green-600 text-white">verified</Badge>
  if (status === "pending") return <Badge className="bg-yellow-600 text-white">pending</Badge>
  if (status === "rejected") return <Badge variant="destructive">rejected</Badge>
  if (status === "expired") return <Badge variant="secondary">expired</Badge>
  return <Badge variant="outline">draft</Badge>
}

export function ScholarshipManagePage({ workspace }: Props) {
  const cfg = getScholarshipWorkspaceConfig(workspace)
  const gate = useScholarshipWorkspaceGate(workspace)
  const router = useRouter()

  const [items, setItems] = useState<ScholarshipRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [editing, setEditing] = useState<ScholarshipDetail | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    title: "",
    organizationName: "",
    country: "",
    degreeLevel: "",
    fieldOfStudy: "",
    fundingType: "",
    deadline: "",
    amount: "",
    description: "",
    applicationUrl: "",
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const path =
        workspace === "owner"
          ? `/api/admin/scholarships?status=${encodeURIComponent(statusFilter === "all" ? "all" : statusFilter)}&search=${encodeURIComponent(q.trim())}`
          : "/api/manager/scholarships"

      const { res, data, errorMessage } = await apiFetchJson<ListResponse>(path, { method: "GET" })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data) {
        throw new Error(errorMessage || "Failed to load scholarships")
      }
      setItems(data.scholarships ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scholarships")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gate !== "ready") return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, workspace, q, statusFilter])

  const visible = useMemo(() => {
    if (workspace === "owner") return items
    const term = q.trim().toLowerCase()
    return items.filter((s) => {
      const okQ = !term || s.title.toLowerCase().includes(term)
      const okStatus = statusFilter === "all" || s.status === statusFilter
      return okQ && okStatus
    })
  }, [items, q, statusFilter, workspace])
  const summary = useMemo(() => {
    const total = visible.length
    const pending = visible.filter((s) => s.status === "pending").length
    const verified = visible.filter((s) => s.status === "verified").length
    const rejected = visible.filter((s) => s.status === "rejected").length
    return { total, pending, verified, rejected }
  }, [visible])

  async function openEdit(id: string) {
    const { res, data, errorMessage } = await apiFetchJson<ScholarshipDetail>(`/api/scholarships/${id}`, {
      method: "GET",
    })
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!res.ok || !data) {
      setError(errorMessage || "Failed to load scholarship details")
      return
    }
    setEditing(data)
    setEditForm({
      title: data.title ?? "",
      organizationName: data.organizationName ?? "",
      country: data.country ?? "",
      degreeLevel: data.degreeLevel ?? "",
      fieldOfStudy: data.fieldOfStudy ?? "",
      fundingType: data.fundingType ?? "",
      deadline: data.deadline ?? "",
      amount: data.amount ?? "",
      description: data.description ?? "",
      applicationUrl: data.applicationUrl ?? "",
    })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const { res, errorMessage } = await apiFetchJson(`/api/scholarships/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok) {
        throw new Error(errorMessage || "Failed to update scholarship")
      }
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update scholarship")
    } finally {
      setSaving(false)
    }
  }

  async function deleteScholarship(id: string) {
    const yes = window.confirm("Delete this scholarship and related records?")
    if (!yes) return
    setError(null)
    const { res, errorMessage } = await apiFetchJson(`/api/scholarships/${id}`, { method: "DELETE" })
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!res.ok) {
      setError(errorMessage || "Failed to delete scholarship")
      return
    }
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  if (gate !== "ready") {
    return (
      <main className={cfg.standaloneSurfaceClass}>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    )
  }

  return (
    <main className={cfg.standaloneSurfaceClass}>
      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Manage scholarships</h1>
              <p className="text-sm text-blue-50">
                {workspace === "owner"
                  ? "Review and manage all scholarships across managers."
                  : "Update your scholarships. Manager updates go back to pending review."}
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-blue-50">
                <Sparkles className="h-3.5 w-3.5" />
                Organized workflow for scholarship lifecycle
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={cfg.basePath}>{cfg.opsBackLabel}</Link>
            </Button>
              <Button asChild className="bg-white text-blue-700 hover:bg-blue-50">
                <Link href={cfg.newScholarshipPath}>
                  <CirclePlus className="mr-2 h-4 w-4" />
                  New scholarship
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Total in view</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-amber-600">{summary.pending}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Verified</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-emerald-600">{summary.verified}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Rejected</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-rose-600">{summary.rejected}</p>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Scholarship list</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search title..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-10 w-64 rounded-xl border-slate-200 pl-9"
                />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 shadow-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table className="overflow-hidden rounded-xl border border-slate-200">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Rejection</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : visible.length ? (
                  visible.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-medium text-slate-900">{s.title}</TableCell>
                      <TableCell>{s.organizationName || "-"}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell>{s.deadline || "-"}</TableCell>
                      <TableCell className="max-w-52 truncate text-xs text-muted-foreground">
                        {s.rejectionReason || "-"}
                      </TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button size="sm" variant="outline" className="border-slate-300 bg-white hover:bg-slate-50" onClick={() => void openEdit(s.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteScholarship(s.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No scholarships found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {editing ? (
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Edit scholarship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Title"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Organization"
                  value={editForm.organizationName}
                  onChange={(e) => setEditForm((p) => ({ ...p, organizationName: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Country"
                  value={editForm.country}
                  onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Degree level"
                  value={editForm.degreeLevel}
                  onChange={(e) => setEditForm((p) => ({ ...p, degreeLevel: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Field of study"
                  value={editForm.fieldOfStudy}
                  onChange={(e) => setEditForm((p) => ({ ...p, fieldOfStudy: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Funding type"
                  value={editForm.fundingType}
                  onChange={(e) => setEditForm((p) => ({ ...p, fundingType: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Amount"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Application URL"
                  value={editForm.applicationUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, applicationUrl: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200 md:col-span-2"
                />
                <Textarea
                  placeholder="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-[120px] rounded-xl border-slate-200 md:col-span-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-slate-300 bg-white hover:bg-slate-50" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveEdit()} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
