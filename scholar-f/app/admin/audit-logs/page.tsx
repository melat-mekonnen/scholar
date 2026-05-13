"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, Search as SearchIcon, ShieldCheck } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AuditLogRow = {
  id: string
  actor_user_id: string
  actor_full_name?: string | null
  actor_email?: string | null
  action: string
  target_type?: string | null
  target_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

type AuditLogsResponse = {
  logs: AuditLogRow[]
  total: number
  page: number
  pageSize: number
}

function prettyAction(action: string) {
  return action.replaceAll(".", " ")
}

function actionTone(action: string) {
  if (action.startsWith("user.")) return "border-blue-200 bg-blue-50 text-blue-700"
  if (action.startsWith("admin.")) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (action.startsWith("scholarship.")) return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

export default function AdminAuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchAction, setSearchAction] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (searchAction.trim()) {
        params.set("action", searchAction.trim())
      }

      const { res, data, errorMessage } = await apiFetchJson<AuditLogsResponse>(
        `/api/admin/audit-logs?${params.toString()}`,
        { method: "GET" },
      )
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load audit logs")
        setLoading(false)
        return
      }
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
      setLoading(false)
    }
    void load()
  }, [page, pageSize, router, searchAction])

  const rows = useMemo(() => logs, [logs])
  const currentPageAdminEvents = useMemo(
    () => rows.filter((r) => r.action.startsWith("admin.")).length,
    [rows],
  )
  const currentPageUserEvents = useMemo(
    () => rows.filter((r) => r.action.startsWith("user.")).length,
    [rows],
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-slate-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-slate-500/10 blur-3xl" />

        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin audit logs</h1>
                  <p className="text-sm text-slate-500">
                    Track admin actions across scholarships and users.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild className="rounded-xl border-slate-300 bg-white hover:bg-slate-50">
                <Link href="/admin/users">Users</Link>
              </Button>
              <Button variant="outline" asChild className="rounded-xl border-slate-300 bg-white hover:bg-slate-50">
                <Link href="/admin">Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
              Total logs: {total.toLocaleString()}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
              Page size: {pageSize}
            </span>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Logs on this page</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{rows.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Admin-prefixed actions</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{currentPageAdminEvents}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">User-prefixed actions</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{currentPageUserEvents}</p>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Activity className="h-3.5 w-3.5" />
                Live governance trail
              </span>
            </div>
            <div className="relative max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 rounded-xl border-slate-200 pl-9"
                placeholder="Filter by action (e.g. user.role_change)"
                value={searchAction}
                onChange={(e) => {
                  setPage(1)
                  setSearchAction(e.target.value)
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        Loading logs…
                      </TableCell>
                    </TableRow>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/60">
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-700">
                              {new Date(row.created_at).toLocaleDateString()}
                            </p>
                            <p>{new Date(row.created_at).toLocaleTimeString()}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{row.actor_full_name || "Unknown admin"}</p>
                          <p className="text-xs text-muted-foreground">{row.actor_email || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${actionTone(
                              row.action,
                            )}`}
                          >
                            {prettyAction(row.action)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-700">{row.target_type || "n/a"}</p>
                            <p className="text-xs">{row.target_id || "n/a"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[360px] text-xs text-muted-foreground">
                          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed">
                            {row.metadata ? JSON.stringify(row.metadata, null, 2) : "{}"}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No audit logs yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-slate-300 bg-white hover:bg-slate-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-slate-300 bg-white hover:bg-slate-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
