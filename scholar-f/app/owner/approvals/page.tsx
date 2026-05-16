"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Globe,
  Inbox,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

type PendingScholarship = {
  id: string
  title: string
  country?: string
  status: "pending" | "verified" | "rejected" | "draft" | "expired"
  deadline?: string
}

function formatDeadline(value?: string) {
  if (!value) return "No deadline"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function OwnerApprovalsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingScholarship[]>([])
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState("")

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
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
    } else {
      setPending(data?.scholarships ?? [])
    }

    setLoading(false)
    setRefreshing(false)
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  async function approve(id: string) {
    setActionMessage(null)
    setBusyIds((p) => ({ ...p, [id]: true }))
    try {
      const { res, errorMessage } = await apiFetchJson(`/api/admin/scholarships/${id}/verify`, { method: "PUT" })
      if (res.ok) {
        setPending((prev) => prev.filter((s) => s.id !== id))
        setActionMessage("Scholarship approved and published.")
      } else {
        setActionMessage(errorMessage || "Could not approve this scholarship.")
      }
    } finally {
      setBusyIds((p) => ({ ...p, [id]: false }))
    }
  }

  async function reject(id: string) {
    setActionMessage(null)
    setBusyIds((p) => ({ ...p, [id]: true }))
    try {
      const { res, errorMessage } = await apiFetchJson(`/api/admin/scholarships/${id}/reject`, { method: "PUT" })
      if (res.ok) {
        setPending((prev) => prev.filter((s) => s.id !== id))
        setActionMessage("Scholarship rejected.")
      } else {
        setActionMessage(errorMessage || "Could not reject this scholarship.")
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

  const cardShell = "rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5"

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

      <header
        className={cn(
          cardShell,
          "border-l-4 border-l-emerald-500 px-6 py-6",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Pending approvals</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Review manager-submitted and imported scholarships before they go live for students.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {actionMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {actionMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In queue</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{pending.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Showing</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{visible.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-emerald-800">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                {pending.length ? "Awaiting review" : "Queue clear"}
              </p>
            </div>
          </>
        )}
      </div>

      <Card className={cardShell}>
        <CardHeader className="space-y-4 border-b border-emerald-100/70 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-slate-900">Approval queue</CardTitle>
              <CardDescription className="text-slate-600">
                Approve to publish, reject to remove, or open a full review.
              </CardDescription>
            </div>
            {!loading && pending.length > 0 ? (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">
                {visible.length} of {pending.length}
              </Badge>
            ) : null}
          </div>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by title, country, or deadline"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 rounded-xl border-emerald-100/80 bg-white pl-9 pr-9 focus-visible:ring-emerald-500/30"
              disabled={loading}
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : visible.length ? (
            visible.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border border-emerald-100/80 bg-emerald-50/20 p-4 transition-colors hover:bg-emerald-50/35 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{s.title}</p>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-amber-200 bg-amber-50 text-amber-900 capitalize"
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                      {s.country || "Country not set"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      {formatDeadline(s.deadline)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
                    asChild
                  >
                    <Link href={`/owner/approvals/${s.id}`}>Review</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    onClick={() => void approve(s.id)}
                    disabled={!!busyIds[s.id]}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
                    onClick={() => void reject(s.id)}
                    disabled={!!busyIds[s.id]}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          ) : pending.length > 0 && query ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-900">No matches for your search</p>
              <p className="mt-1 text-sm text-slate-500">Try a different title, country, or deadline.</p>
              <Button
                type="button"
                variant="link"
                className="mt-2 text-emerald-700"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-emerald-200/80 bg-emerald-50/30 px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                {pending.length === 0 ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Inbox className="h-6 w-6" />
                )}
              </div>
              <p className="font-medium text-slate-900">No scholarships waiting for approval</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
                New submissions from managers and trusted imports will appear here for review.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                  onClick={() => void load(true)}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Refresh queue
                </Button>
                <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/owner/trusted-import">Run trusted import</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
