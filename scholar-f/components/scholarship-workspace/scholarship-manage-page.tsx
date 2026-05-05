"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

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
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Manage scholarships</h1>
            <p className="text-sm text-muted-foreground">
              {workspace === "owner"
                ? "Review and manage all scholarships across managers."
                : "Update your scholarships. Manager updates go back to pending review."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={cfg.basePath}>{cfg.opsBackLabel}</Link>
            </Button>
            <Button asChild>
              <Link href={cfg.newScholarshipPath}>New scholarship</Link>
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Scholarship list</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search title..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-56"
              />
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
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
          </CardHeader>
          <CardContent>
            <Table>
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
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>{s.organizationName || "-"}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell>{s.deadline || "-"}</TableCell>
                      <TableCell className="max-w-52 truncate text-xs text-muted-foreground">
                        {s.rejectionReason || "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => void openEdit(s.id)}>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit scholarship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Title"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
              <Input
                placeholder="Organization"
                value={editForm.organizationName}
                onChange={(e) => setEditForm((p) => ({ ...p, organizationName: e.target.value }))}
              />
              <Input
                placeholder="Country"
                value={editForm.country}
                onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
              />
              <Input
                placeholder="Degree level"
                value={editForm.degreeLevel}
                onChange={(e) => setEditForm((p) => ({ ...p, degreeLevel: e.target.value }))}
              />
              <Input
                placeholder="Field of study"
                value={editForm.fieldOfStudy}
                onChange={(e) => setEditForm((p) => ({ ...p, fieldOfStudy: e.target.value }))}
              />
              <Input
                placeholder="Funding type"
                value={editForm.fundingType}
                onChange={(e) => setEditForm((p) => ({ ...p, fundingType: e.target.value }))}
              />
              <Input
                type="date"
                value={editForm.deadline}
                onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
              />
              <Input
                placeholder="Amount"
                value={editForm.amount}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
              />
              <Input
                placeholder="Application URL"
                value={editForm.applicationUrl}
                onChange={(e) => setEditForm((p) => ({ ...p, applicationUrl: e.target.value }))}
              />
              <Textarea
                placeholder="Description"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveEdit()} disabled={saving}>
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
