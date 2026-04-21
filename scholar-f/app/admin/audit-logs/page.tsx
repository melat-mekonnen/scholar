"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Admin audit logs</h1>
            <p className="text-sm text-muted-foreground">
              Track admin actions across scholarships and users.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/notifications">Notifications</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/users">Users</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin">Dashboard</Link>
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <Input
              className="max-w-64"
              placeholder="Filter by action (e.g. user.role_change)"
              value={searchAction}
              onChange={(e) => {
                setPage(1)
                setSearchAction(e.target.value)
              }}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
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
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{row.actor_full_name || "Unknown admin"}</p>
                          <p className="text-xs text-muted-foreground">{row.actor_email || "-"}</p>
                        </TableCell>
                        <TableCell className="font-medium">{prettyAction(row.action)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[row.target_type || "n/a", row.target_id || "n/a"].join(" · ")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.metadata ? JSON.stringify(row.metadata) : "{}"}
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
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
