"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ChevronLeft } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type NotificationItem = {
  id: string
  scholarshipId?: string | null
  type: string
  message: string
  isRead: boolean
  createdAt: string
}

type NotificationResponse = {
  notifications: NotificationItem[]
}

type Props = {
  expectedRole: "manager" | "owner" | "admin"
  title: string
  backHref: string
}

function typeLabel(type: string) {
  if (type === "scholarship_verified") return "Approved"
  if (type === "scholarship_rejected") return "Rejected"
  return "Update"
}

export function NotificationsPage({ expectedRole, title, backHref }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const meRes = await apiFetchJson<{ role?: string }>("/api/auth/me", { method: "GET" })
      if (meRes.res.status === 401 || meRes.res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      const role = meRes.data?.role
      if (role !== expectedRole) {
        router.replace("/dashboard")
        return
      }

      const listRes = await apiFetchJson<NotificationResponse>("/api/notifications/mine", { method: "GET" })
      if (!listRes.res.ok || !listRes.data) {
        setError(listRes.errorMessage || "Failed to load notifications")
        setLoading(false)
        return
      }
      setItems(listRes.data.notifications ?? [])
      setLoading(false)
    }
    void load()
  }, [expectedRole, router])

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items])

  async function markAllRead() {
    setMarking(true)
    try {
      const { res } = await apiFetchJson("/api/notifications/mine/read", { method: "PUT" })
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">Moderation updates for your scholarships.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={backHref}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button onClick={() => void markAllRead()} disabled={marking || unreadCount === 0}>
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark all read
            </Button>
          </div>
        </header>

        {error ? <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>{unreadCount} unread</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : items.length ? (
              items.map((n) => (
                <div key={n.id} className="rounded border bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge variant={n.isRead ? "secondary" : "default"}>{typeLabel(n.type)}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{n.message}</p>
                  {n.scholarshipId ? (
                    <div className="mt-2">
                      <Link className="text-xs text-primary underline-offset-4 hover:underline" href={`/admin/scholarships/${n.scholarshipId}`}>
                        View scholarship
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
