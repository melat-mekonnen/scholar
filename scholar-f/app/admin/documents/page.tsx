"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, FileText, Search as SearchIcon, Sparkles, Trash2 } from "lucide-react"

import { apiFetchJson, API_BASE_URL } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Admin Document Management</h1>
              <p className="text-sm text-blue-50">
                Review, search, and moderate uploaded document resources across the platform.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-blue-50">
                <Sparkles className="h-3.5 w-3.5" />
                Centralized document control
              </div>
            </div>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/admin">Back to Admin</Link>
            </Button>
          </div>
        </header>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by title..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white pl-9 shadow-sm"
          />
        </div>
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-3">
          {rows.map((d) => (
            <Card key={d.id} className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base text-slate-900">{d.title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{d.originalName}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <FileText className="h-5 w-5" />
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{d.type}</Badge>
                  <Badge variant="outline">by {d.uploadedByName || "Unknown"}</Badge>
                  <Badge variant="outline">downloads: {d.downloadCount}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  <Button variant="destructive" size="sm" onClick={() => void removeDoc(d.id)}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!rows.length ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
              No documents found.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  )
}

