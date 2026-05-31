"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ExternalLink,
  Hash,
  MessageSquareWarning,
  RefreshCw,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import {
  createOwnerCommunityChannel,
  fetchOwnerCommunityChannels,
  updateOwnerCommunityChannel,
  type CommunityChannel,
} from "@/lib/community"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

type ReportRow = {
  id: string
  messageId: string
  reason: string
  status: "open" | "resolved" | "dismissed"
  createdAt: string
  channelId: string
  messageBody: string
  messageAuthorName?: string
  reporterName?: string
}

const cardShell = "rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5"
const fieldClass = "h-10 rounded-xl border-emerald-100/80 bg-white focus-visible:ring-emerald-500/30"

export default function OwnerCommunityModerationPage() {
  const router = useRouter()
  const [items, setItems] = useState<ReportRow[]>([])
  const [channels, setChannels] = useState<CommunityChannel[]>([])
  const [newChannel, setNewChannel] = useState({ name: "", slug: "", description: "", sortOrder: "0" })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    const [reportsRes, channelsRes] = await Promise.all([
      apiFetchJson<{ reports: ReportRow[] }>("/api/owner/community/reports?status=open&limit=100", {
        method: "GET",
      }),
      fetchOwnerCommunityChannels(),
    ])

    const { res, data, errorMessage } = reportsRes
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!res.ok || !data) {
      setError(errorMessage || "Failed to load reports")
    } else {
      setItems(data.reports ?? [])
    }

    if (channelsRes.res.ok && channelsRes.data?.channels) {
      setChannels(channelsRes.data.channels)
    }

    setLoading(false)
    setRefreshing(false)
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  async function resolve(reportId: string, status: "resolved" | "dismissed") {
    const { res } = await apiFetchJson(`/api/owner/community/reports/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setItems((prev) => prev.filter((r) => r.id !== reportId))
    }
  }

  async function hide(messageId: string) {
    const { res } = await apiFetchJson(`/api/owner/community/messages/${messageId}/hide`, {
      method: "PUT",
    })
    if (res.ok) {
      setItems((prev) => prev.filter((r) => r.messageId !== messageId))
    }
  }

  async function createChannel() {
    const payload = {
      name: newChannel.name.trim(),
      slug: newChannel.slug.trim() || undefined,
      description: newChannel.description.trim() || undefined,
      sortOrder: Number(newChannel.sortOrder || "0"),
    }
    const { res } = await createOwnerCommunityChannel(payload)
    if (res.ok) {
      setNewChannel({ name: "", slug: "", description: "", sortOrder: "0" })
      await load(true)
    }
  }

  async function toggleChannel(id: string, isActive: boolean) {
    const { res } = await updateOwnerCommunityChannel(id, { isActive: !isActive })
    if (res.ok) {
      setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !isActive } : c)))
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

      <header className={cn(cardShell, "border-l-4 border-l-emerald-500 px-6 py-6")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
              <MessageSquareWarning className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">Owner community moderation</h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
              onClick={() => void load(true)}
              disabled={loading || refreshing}
            >
              <RefreshCw className={cn("mr-1.5 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild variant="outline" className="w-fit border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/community">
                Open student community
                <ExternalLink className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>


      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <Card className={cardShell}>
          <CardHeader className="border-b border-emerald-100/70 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <Hash className="h-5 w-5 text-emerald-600" />
              Channel management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-2 md:grid-cols-4">
              <Input
                placeholder="Channel name"
                value={newChannel.name}
                onChange={(e) => setNewChannel((p) => ({ ...p, name: e.target.value }))}
                className={fieldClass}
              />
              <Input
                placeholder="Slug (optional)"
                value={newChannel.slug}
                onChange={(e) => setNewChannel((p) => ({ ...p, slug: e.target.value }))}
                className={fieldClass}
              />
              <Input
                placeholder="Sort order"
                value={newChannel.sortOrder}
                onChange={(e) => setNewChannel((p) => ({ ...p, sortOrder: e.target.value }))}
                className={fieldClass}
              />
              <Button
                className="rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                onClick={() => void createChannel()}
              >
                Add channel
              </Button>
            </div>
            <Input
              placeholder="Description (optional)"
              value={newChannel.description}
              onChange={(e) => setNewChannel((p) => ({ ...p, description: e.target.value }))}
              className={fieldClass}
            />

            <div className="grid gap-2">
              {channels.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100/80 bg-emerald-50/20 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {c.name}{" "}
                      <span className="text-xs font-normal text-slate-500">({c.slug})</span>
                    </p>
                    <p className="text-xs text-slate-500">{c.description || "No description"}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={c.isActive === false ? "default" : "outline"}
                    className={
                      c.isActive === false
                        ? "rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        : "rounded-lg border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
                    }
                    onClick={() => void toggleChannel(c.id, Boolean(c.isActive))}
                  >
                    {c.isActive === false ? "Activate" : "Archive"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-3">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <Card className={cardShell}>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">No open reports</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <Card key={r.id} className={cardShell}>
              <CardHeader className="border-b border-emerald-100/70 pb-3">
                <CardTitle className="text-base text-slate-900">
                  Report from {r.reporterName || "Student"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <p className="text-sm text-slate-800">
                  <strong>Reason:</strong> {r.reason}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Message:</strong> {r.messageBody}
                </p>
                <p className="text-xs text-slate-500">
                  Author: {r.messageAuthorName || "Unknown"} · {new Date(r.createdAt).toLocaleString()}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
                    onClick={() => void hide(r.messageId)}
                  >
                    Hide message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
                    onClick={() => void resolve(r.id, "resolved")}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={() => void resolve(r.id, "dismissed")}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
