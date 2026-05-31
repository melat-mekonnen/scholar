"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, FileText, Search as SearchIcon, Trash2 } from "lucide-react"

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
      { method: "GET" },
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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="rounded-2xl border border-slate-200/90 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400/30">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">Document management</h1>
              <p className="mt-1 text-sm text-slate-600">
                Search and moderate uploaded resources available to students.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild className="rounded-xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>
      </header>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70" />
        <Input
          placeholder="Search by title..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 rounded-xl border-emerald-100/90 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
        />
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3">
        {rows.map((d) => (
          <Card key={d.id} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
            <CardHeader className="border-b border-emerald-100/70 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base text-slate-900">{d.title}</CardTitle>
                  <p className="mt-1 truncate text-sm text-slate-500">{d.originalName}</p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80">
                  <FileText className="h-5 w-5" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                  {d.type}
                </Badge>
                <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                  by {d.uploadedByName || "Unknown"}
                </Badge>
                <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                  downloads: {d.downloadCount}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                  href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <Button variant="destructive" size="sm" className="rounded-md" onClick={() => void removeDoc(d.id)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!rows.length ? (
          <p className="rounded-xl border border-emerald-100/90 bg-emerald-50/40 px-4 py-3 text-center text-sm text-slate-600">
            No documents found.
          </p>
        ) : null}
      </div>
    </div>
  )
}
