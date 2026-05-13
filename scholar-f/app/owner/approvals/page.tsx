"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ClipboardList, Search, X } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PendingScholarship = {
  id: string
  title: string
  country?: string
  status: "pending" | "verified" | "rejected" | "draft" | "expired"
  deadline?: string
}

export default function OwnerApprovalsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingScholarship[]>([])
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { res, data, errorMessage } = await apiFetchJson<{ scholarships: PendingScholarship[] }>(
        "/api/admin/scholarships/pending",
        { method: "GET" },
      )
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok) {
        setError(errorMessage || "Could not load pending scholarships")
        setLoading(false)
        return
      }
      setPending(data?.scholarships ?? [])
      setLoading(false)
    }
    void load()
  }, [router])

  async function approve(id: string) {
    setBusyIds((p) => ({ ...p, [id]: true }))
    try {
      const { res } = await apiFetchJson(`/api/admin/scholarships/${id}/verify`, { method: "PUT" })
      if (res.ok) {
        setPending((prev) => prev.filter((s) => s.id !== id))
      }
    } finally {
      setBusyIds((p) => ({ ...p, [id]: false }))
    }
  }

  async function reject(id: string) {
    setBusyIds((p) => ({ ...p, [id]: true }))
    try {
      const { res } = await apiFetchJson(`/api/admin/scholarships/${id}/reject`, { method: "PUT" })
      if (res.ok) {
        setPending((prev) => prev.filter((s) => s.id !== id))
      }
    } finally {
      setBusyIds((p) => ({ ...p, [id]: false }))
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pending
    return pending.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.country ?? "").toLowerCase().includes(q) ||
        (s.deadline ?? "").toLowerCase().includes(q),
    )
  }, [pending, query])

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <header className="rounded-2xl border border-blue-100/80 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-emerald-50 p-2.5 text-blue-700 ring-1 ring-blue-100">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Pending approvals</h1>
              <p className="text-sm text-slate-500">
                Review manager-submitted scholarships before publication.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
              Pending: {pending.length}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
              Ready for review
            </span>
          </div>
        </div>
      </header>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading && (
        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Queue ({visible.length})</CardTitle>
            </div>
            <CardDescription>Review each listing, then approve or reject.</CardDescription>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search title, country, or deadline"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {visible.length ? (
              visible.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {s.country || "N/A"} · deadline {s.deadline || "N/A"}
                    </p>
                    <div className="mt-1">
                      <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">pending</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="border-slate-300 bg-white hover:bg-slate-50" asChild>
                      <Link href={`/owner/approvals/${s.id}`}>Review</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => void approve(s.id)}
                      disabled={!!busyIds[s.id]}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void reject(s.id)}
                      disabled={!!busyIds[s.id]}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                No scholarships waiting for approval.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
