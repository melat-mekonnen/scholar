"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { apiFetch, apiFetchJson, API_BASE_URL } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null)
  const [form, setForm] = useState({
    title: "",
    type: "",
    scholarshipId: "",
    file: null as File | null,
  })

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

  async function uploadDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!form.file) {
      setError("Please choose a file to upload")
      return
    }
    setError(null)
    setUploading(true)
    try {
      const body = new FormData()
      body.append("title", form.title.trim())
      body.append("type", form.type.trim())
      body.append("file", form.file)
      if (form.scholarshipId.trim()) {
        body.append("scholarshipId", form.scholarshipId.trim())
      }

      const res = await apiFetch("/api/documents", {
        method: "POST",
        body,
      })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok) {
        const txt = await res.text()
        setError(txt || "Failed to upload document")
        return
      }
      setForm({ title: "", type: "", scholarshipId: "", file: null })
      await load()
    } finally {
      setUploading(false)
    }
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Document Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload document</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={uploadDoc}>
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <Input
                placeholder="Type (cv_template, guide, policy, etc.)"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                required
              />
              <Input
                placeholder="Scholarship ID (optional for admin)"
                value={form.scholarshipId}
                onChange={(e) => setForm((p) => ({ ...p, scholarshipId: e.target.value }))}
              />
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                required
              />
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload document"}
              </Button>
            </form>
          </CardContent>
        </Card>

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
                  <button
                    type="button"
                    className="text-sm text-primary underline"
                    onClick={() => setPreviewDoc(d)}
                  >
                    View
                  </button>
                  <a
                    className="text-sm text-primary underline"
                    href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                    download={d.originalName || true}
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
        <Dialog open={previewDoc !== null} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="max-h-[85vh] max-w-5xl">
            <DialogHeader>
              <DialogTitle>{previewDoc?.title || "Document preview"}</DialogTitle>
            </DialogHeader>
            {previewDoc ? (
              <div className="h-[68vh] w-full overflow-hidden rounded border">
                <iframe
                  src={`${API_BASE_URL}/api/documents/${previewDoc.id}/view`}
                  title={previewDoc.title}
                  className="h-full w-full"
                />
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}

