"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, Bell, CheckCheck, ChevronLeft } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
  /** When false, omit the back link (e.g. owner layout already provides navigation). */
  showBackLink?: boolean
}

function typeLabel(type: string) {
  if (type === "scholarship_verified") return "Approved"
  if (type === "scholarship_rejected") return "Rejected"
  return "Update"
}

function typeTone(type: string, isRead: boolean) {
  if (isRead) return "border-slate-200 bg-slate-50 text-slate-600"
  if (type === "scholarship_verified") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (type === "scholarship_rejected") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-teal-200 bg-teal-50 text-teal-800"
}

function roleSubtitle(role: Props["expectedRole"]) {
  if (role === "admin") return "Scholarship and platform updates in one place."
  return "Moderation updates for your scholarships."
}

function scholarshipReviewHref(role: Props["expectedRole"], scholarshipId: string) {
  if (role === "admin") return `/admin/scholarships/${scholarshipId}`
  if (role === "owner") return `/owner/approvals/${scholarshipId}`
  return "/manager/scholarships"
}

export function NotificationsPage({ expectedRole, title, backHref, showBackLink = true }: Props) {
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
    <div className={showBackLink ? "min-h-screen bg-slate-100 text-slate-900" : "text-slate-900"}>
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="rounded-2xl border border-slate-200/90 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                <p className="text-sm text-slate-600">{roleSubtitle(expectedRole)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showBackLink ? (
                <Button variant="outline" asChild className="rounded-xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                  <Link href={backHref}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Link>
                </Button>
              ) : null}
              <Button
                onClick={() => void markAllRead()}
                disabled={marking || unreadCount === 0}
                className="rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              >
                <CheckCheck className="mr-1 h-4 w-4" />
                Mark all read
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 font-medium text-emerald-900">
              Total: {items.length}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
              Unread: {unreadCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50/80 px-2.5 py-1 font-medium text-teal-900">
              <Activity className="h-3.5 w-3.5 text-teal-700" />
              Activity stream
            </span>
          </div>
        </header>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
          <CardHeader className="border-b border-emerald-100/80">
            <CardTitle className="text-lg text-slate-900">Notifications</CardTitle>
            <CardDescription className="text-slate-600">{unreadCount} unread</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : items.length ? (
              items.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-emerald-100/90 bg-white p-3 shadow-sm transition-colors hover:bg-emerald-50/40"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${typeTone(n.type, n.isRead)}`}
                    >
                      {typeLabel(n.type)}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700">{n.message}</p>
                  {n.scholarshipId ? (
                    <div className="mt-2">
                      <Link
                        className="text-xs font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
                        href={scholarshipReviewHref(expectedRole, n.scholarshipId)}
                      >
                        View scholarship
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-emerald-100/90 bg-emerald-50/40 px-4 py-3 text-center text-sm text-slate-600">
                No notifications yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
