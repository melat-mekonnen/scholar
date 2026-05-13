"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, FolderOpen, Sparkles, Upload } from "lucide-react"

import { apiFetch, apiFetchJson, API_BASE_URL } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useScholarshipWorkspaceGate } from "@/hooks/use-scholarship-workspace-gate"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getScholarshipWorkspaceConfig, type ScholarshipWorkspace } from "@/lib/scholarship-workspace"

type MeResponse = { id: string; role?: string }
type DocumentRow = {
  id: string
  title: string
  type: string
  originalName: string
  scholarshipId?: string | null
  downloadCount: number
  createdAt: string
}

type Props = {
  workspace: ScholarshipWorkspace
}

export function ScholarshipDocumentsPage({ workspace }: Props) {
  const cfg = getScholarshipWorkspaceConfig(workspace)
  const gate = useScholarshipWorkspaceGate(workspace)
  const router = useRouter()
  const [myUserId, setMyUserId] = useState<string>("")
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    type: "",
    scholarshipId: "",
    file: null as File | null,
  })

  async function loadMeAndDocs() {
    const meRes = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
    if (meRes.res.status === 401 || meRes.res.status === 403 || !meRes.data?.id) {
      clearToken()
      router.replace("/signin")
      return
    }
    setMyUserId(meRes.data.id)

    const docsRes = await apiFetchJson<{ documents: DocumentRow[] }>(
      `/api/documents?uploadedByUserId=${encodeURIComponent(meRes.data.id)}`,
      { method: "GET" },
    )
    if (docsRes.res.ok && docsRes.data?.documents) {
      setDocs(docsRes.data.documents)
    }
  }

  useEffect(() => {
    if (gate !== "ready") return
    void loadMeAndDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when gate opens
  }, [gate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.file) {
      setFormError("Please choose a file to upload")
      return
    }
    setFormError(null)
    setLoading(true)

    try {
      const body = new FormData()
      body.append("title", form.title)
      body.append("type", form.type)
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
        setFormError(txt || "Upload failed")
        return
      }

      setForm({ title: "", type: "", scholarshipId: "", file: null })
      await loadMeAndDocs()
    } finally {
      setLoading(false)
    }
  }

  if (gate !== "ready") {
    return (
      <main className={cfg.standaloneSurfaceClass}>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    )
  }

  const accountHint =
    workspace === "owner"
      ? "Filtering documents by your owner account."
      : "Filtering documents by your manager account."

  return (
    <main className={cfg.standaloneSurfaceClass}>
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{cfg.documentPageHeading}</h1>
              <p className="text-sm text-blue-50">
                Upload and manage document resources linked to your scholarships.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-blue-50">
                <Sparkles className="h-3.5 w-3.5" />
                Organized document workspace
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={cfg.profilePath}>{cfg.profileLinkLabel}</Link>
            </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={cfg.basePath}>{cfg.opsBackLabel}</Link>
            </Button>
            </div>
          </div>
        </header>

        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-emerald-600" />
              Upload new document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {formError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                  required
                />
                <Input
                  placeholder="Type (cv_template, tips, guide, etc.)"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                  required
                />
                <Input
                  placeholder="Scholarship ID (required for upload)"
                  value={form.scholarshipId}
                  onChange={(e) => setForm((p) => ({ ...p, scholarshipId: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200 md:col-span-2"
                  required
                />
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                  className="h-11 rounded-xl border-slate-200 md:col-span-2"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                {loading ? "Uploading…" : "Upload document"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              My uploaded documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {docs.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{d.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {d.originalName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{d.type}</Badge>
                      <Badge variant="outline">Downloads: {d.downloadCount}</Badge>
                    </div>
                  </div>
                  <a
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText className="h-4 w-4" />
                    Download/Open
                  </a>
                </div>
              </div>
            ))}
            {!docs.length ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-muted-foreground">
                No documents yet.
              </p>
            ) : null}
            {myUserId ? <p className="text-xs text-muted-foreground">{accountHint}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
