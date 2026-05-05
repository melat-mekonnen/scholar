"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import {
  createOwnerCommunityChannel,
  fetchOwnerCommunityChannels,
  updateOwnerCommunityChannel,
  type CommunityChannel,
} from "@/lib/community"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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

export default function OwnerCommunityModerationPage() {
  const router = useRouter()
  const [items, setItems] = useState<ReportRow[]>([])
  const [channels, setChannels] = useState<CommunityChannel[]>([])
  const [newChannel, setNewChannel] = useState({ name: "", slug: "", description: "", sortOrder: "0" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const [reportsRes, channelsRes] = await Promise.all([
      apiFetchJson<{ reports: ReportRow[] }>("/api/owner/community/reports?status=open&limit=100", { method: "GET" }),
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
      setLoading(false)
      return
    }
    setItems(data.reports ?? [])
    if (channelsRes.res.ok && channelsRes.data?.channels) {
      setChannels(channelsRes.data.channels)
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

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
      await load()
    }
  }

  async function toggleChannel(id: string, isActive: boolean) {
    const { res } = await updateOwnerCommunityChannel(id, { isActive: !isActive })
    if (res.ok) {
      setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !isActive } : c)))
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Owner community moderation</h1>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/community">Open student community</Link>
        </Button>
      </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading reports...</p> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-4">
              <Input
                placeholder="Channel name"
                value={newChannel.name}
                onChange={(e) => setNewChannel((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder="Slug (optional)"
                value={newChannel.slug}
                onChange={(e) => setNewChannel((p) => ({ ...p, slug: e.target.value }))}
              />
              <Input
                placeholder="Sort order"
                value={newChannel.sortOrder}
                onChange={(e) => setNewChannel((p) => ({ ...p, sortOrder: e.target.value }))}
              />
              <Button onClick={() => void createChannel()}>Add channel</Button>
            </div>
            <Input
              placeholder="Description (optional)"
              value={newChannel.description}
              onChange={(e) => setNewChannel((p) => ({ ...p, description: e.target.value }))}
            />

            <div className="grid gap-2">
              {channels.map((c) => (
                <div key={c.id} className="rounded border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.name} <span className="text-xs text-muted-foreground">({c.slug})</span></p>
                    <p className="text-xs text-muted-foreground">{c.description || "No description"}</p>
                  </div>
                  <Button size="sm" variant={c.isActive === false ? "default" : "outline"} onClick={() => void toggleChannel(c.id, Boolean(c.isActive))}>
                    {c.isActive === false ? "Activate" : "Archive"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {!loading && items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No open reports</CardTitle>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-3">
          {items.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">Report from {r.reporterName || "Student"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Reason:</strong> {r.reason}</p>
                <p className="text-sm text-muted-foreground"><strong>Message:</strong> {r.messageBody}</p>
                <p className="text-xs text-muted-foreground">
                  Author: {r.messageAuthorName || "Unknown"} · {new Date(r.createdAt).toLocaleString()}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="destructive" onClick={() => void hide(r.messageId)}>
                    Hide message
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void resolve(r.id, "resolved")}>
                    Resolve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void resolve(r.id, "dismissed")}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </main>
  )
}
