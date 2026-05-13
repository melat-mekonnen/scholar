"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, IdCard, LayoutDashboard, LogOut, Users, X } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Building2 className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">Owner dashboard</h1>
            </div>
            <p className="text-sm text-blue-50">
              Posting profile and user roles live here; open <strong>Scholarship operations</strong> for
              listings, deadlines, and documents under your owner account.
            </p>
          </div>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

        {data && !loading && (
          <div className="space-y-4">
            <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Overview</CardTitle>
                <CardDescription className="text-slate-500">
                  Owner dashboard for approvals, profile management, and scholarship operations oversight.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="font-medium text-slate-900">Role</p>
                  <p className="text-slate-600 capitalize">{data.role}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="font-medium text-slate-900">Pending approvals</p>
                  <p className="text-slate-600">{pending.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Needs approval ({pending.length})</CardTitle>
                <CardDescription className="text-slate-500">Pending scholarship submissions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pending.length ? (
                  pending.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{s.title}</p>
                        <p className="text-xs text-slate-500">
                          {s.country || "N/A"} · deadline {s.deadline || "N/A"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-300 bg-white hover:bg-slate-50" asChild>
                          <Link href={`/admin/scholarships/${s.id}`}>Review</Link>
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
          </div>
        )}
      </div>
    </div>
  )
}
