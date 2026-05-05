"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { apiFetchJson, API_BASE_URL } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type DocumentItem = {
  id: string
  title: string
  type: string
  originalName: string
  downloadCount: number
  createdAt: string
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      const { res, data, errorMessage } = await apiFetchJson<{ documents: DocumentItem[] }>(
        `/api/documents${params.toString() ? `?${params.toString()}` : ""}`,
        { method: "GET", auth: false }
      )
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load documents")
        setLoading(false)
        return
      }
      setDocs(data.documents ?? [])
      setLoading(false)
    }
    void load()
  }, [q])

  const sorted = useMemo(
    () => [...docs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [docs]
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Document Resources</h1>
          <p className="text-sm text-muted-foreground">
            CV templates, recommendation guides, and application resources.
          </p>
        </header>

        <div className="flex gap-2">
          <Input
            placeholder="Search documents..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button asChild variant="outline">
            <Link href="/scholarships">Back to Scholarships</Link>
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="text-base">{d.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {d.type} · {d.originalName}
                </p>
                <p className="text-xs text-muted-foreground">Downloads: {d.downloadCount}</p>
                <a
                  className="text-sm text-primary underline"
                  href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

