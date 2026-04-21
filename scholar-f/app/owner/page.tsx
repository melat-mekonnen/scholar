"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Building2, Check, IdCard, LayoutDashboard, LogOut, Users, X } from "lucide-react"

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

type NotificationsResponse = {
  notifications: Array<{ isRead: boolean }>
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OwnerDashboard | null>(null)
  const [pending, setPending] = useState<PendingScholarship[]>([])
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [unreadCount, setUnreadCount] = useState(0)

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

      const [pendingRes, notificationsRes] = await Promise.all([
        apiFetchJson<{ scholarships: PendingScholarship[] }>("/api/admin/scholarships/pending", { method: "GET" }),
        apiFetchJson<NotificationsResponse>("/api/notifications/mine?unread=true&limit=100", { method: "GET" }),
      ])
      if (pendingRes.res.ok && pendingRes.data?.scholarships) {
        setPending(pendingRes.data.scholarships)
      }
      if (notificationsRes.res.ok && notificationsRes.data?.notifications) {
        setUnreadCount(notificationsRes.data.notifications.length)
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Owner dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Posting profile and user roles live here; open <strong>Scholarship operations</strong> for
                listings, deadlines, and documents under your owner account.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/owner/users">
                <Users className="mr-2 h-4 w-4" />
                Students & managers
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/owner/posting-profile">
                <IdCard className="mr-2 h-4 w-4" />
                Posting profile
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/owner/scholarships">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Scholarship operations
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/owner/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void logoutFromServer()
                clearToken()
                router.push("/signin")
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && !loading && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>{data.message}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-2">
                  API: <code className="rounded bg-muted px-1">GET /api/owner/dashboard</code>
                </p>
                <p>
                  Use <strong>Students & managers</strong> to promote students to manager (or revert).
                  Later milestones: audit logs and cross-manager analytics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Needs approval ({pending.length})</CardTitle>
                <CardDescription>Manager posts waiting for owner/admin verification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pending.length ? (
                  pending.map((s) => (
                    <div key={s.id} className="rounded border p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.country || "N/A"} · deadline {s.deadline || "N/A"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/scholarships/${s.id}`}>Review</Link>
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
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
          </div>
        )}
      </div>
    </div>
  )
}
