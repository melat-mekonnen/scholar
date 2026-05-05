"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { apiFetchJson, API_BASE_URL } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Doc = {
  id: string
  title: string
  type: string
  originalName: string
  uploadedByName?: string
  downloadCount: number
}

export default function AdminDocumentsPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<Doc[]>([])
  const [q, setQ] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { res, data, errorMessage } = await apiFetchJson<{ documents: Doc[] }>(
      `/api/documents${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
      { method: "GET" }
    )
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!res.ok || !data) {
      setError(errorMessage || "Failed to load documents")
      return
    }
    setError(null)
    setDocs(data.documents ?? [])
  }

  useEffect(() => {
    void load()
  }, [q])

  async function removeDoc(id: string) {
    const { res, errorMessage } = await apiFetchJson(`/api/documents/${id}`, { method: "DELETE" })
    if (!res.ok) {
      setError(errorMessage || "Failed to delete document")
      return
    }
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const rows = useMemo(() => docs, [docs])

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Document Management</h1>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>

        <Input placeholder="Search by title..." value={q} onChange={(e) => setQ(e.target.value)} />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-3">
          {rows.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="text-base">{d.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {d.type} · {d.originalName} · by {d.uploadedByName || "Unknown"} · downloads: {d.downloadCount}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    className="text-sm text-primary underline"
                    href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                  <Button variant="destructive" size="sm" onClick={() => void removeDoc(d.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

