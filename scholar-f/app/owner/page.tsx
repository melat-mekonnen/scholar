"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, X } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type OwnerDashboard = {
  role: string
  message?: string
  links?: { managerDashboard?: string; managerScholarships?: string }
}

type PendingScholarship = {
  id: string
  title: string
  country?: string
  status: "pending" | "verified" | "rejected" | "draft" | "expired"
  deadline?: string
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OwnerDashboard | null>(null)
  const [pending, setPending] = useState<PendingScholarship[]>([])
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { res, data: json, errorMessage } = await apiFetchJson<OwnerDashboard>(
        "/api/owner/dashboard",
        { method: "GET" },
      )
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !json) {
        setError(errorMessage || "Could not load owner dashboard")
        setLoading(false)
        return
      }
      setData(json)

      const pendingRes = await apiFetchJson<{ scholarships: PendingScholarship[] }>(
        "/api/admin/scholarships/pending",
        { method: "GET" },
      )
      if (pendingRes.res.ok && pendingRes.data?.scholarships) {
        setPending(pendingRes.data.scholarships)
      }
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

        <header className="mb-6 rounded-2xl border border-emerald-100/80 border-l-4 border-l-emerald-500 bg-white px-6 py-7 shadow-sm shadow-emerald-900/5">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-4">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-900">Owner dashboard</h1>
            </div>
            <p className="max-w-2xl text-sm text-slate-600">
              Posting profile and user roles live here; open <strong className="font-semibold text-emerald-800">Scholarship operations</strong> for
              listings, deadlines, and documents under your owner account.
            </p>
          </div>
        </header>

        {loading && <p className="text-sm text-slate-600">Loading...</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

        {data && !loading && (
          <div className="space-y-4">
            <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
              <CardHeader className="border-b border-emerald-100/70">
                <CardTitle className="text-lg text-slate-900">Overview</CardTitle>
                <CardDescription className="text-slate-600">
                  Owner dashboard for approvals, profile management, and scholarship operations oversight.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pt-2 text-sm">
                <div className="rounded-lg border border-emerald-100/80 bg-emerald-50/30 px-3 py-2">
                  <p className="font-medium text-slate-900">Role</p>
                  <p className="text-slate-600 capitalize">{data.role}</p>
                </div>
                <div className="rounded-lg border border-emerald-100/80 bg-emerald-50/30 px-3 py-2">
                  <p className="font-medium text-slate-900">Pending approvals</p>
                  <p className="text-slate-600">{pending.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
              <CardHeader className="border-b border-emerald-100/70">
                <CardTitle className="text-lg text-slate-900">Needs approval ({pending.length})</CardTitle>
                <CardDescription className="text-slate-600">Pending scholarship submissions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {pending.length ? (
                  pending.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100/80 bg-emerald-50/25 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{s.title}</p>
                        <p className="text-xs text-slate-500">
                          {s.country || "N/A"} · deadline {s.deadline || "N/A"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
                          asChild
                        >
                          <Link href={`/admin/scholarships/${s.id}`}>Review</Link>
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
                  <p className="rounded-lg border border-emerald-100/80 bg-emerald-50/30 px-3 py-3 text-sm text-slate-600">
                    No scholarships waiting for approval.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
