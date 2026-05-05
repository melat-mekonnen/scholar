"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ClipboardList, X } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <header className="mb-8 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pending approvals</h1>
          <p className="text-sm text-muted-foreground">
            Manager-submitted scholarships that need owner or admin verification before they go live.
          </p>
        </div>
      </header>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Queue ({pending.length})</CardTitle>
            <CardDescription>Review each listing, then approve or reject.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length ? (
              pending.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.country || "N/A"} · deadline {s.deadline || "N/A"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/owner/approvals/${s.id}`}>Review</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
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
              <p className="text-sm text-muted-foreground">No scholarships waiting for approval.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
