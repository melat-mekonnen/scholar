"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { apiFetch, apiFetchJson, API_BASE_URL } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useScholarshipWorkspaceGate } from "@/hooks/use-scholarship-workspace-gate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{cfg.documentPageHeading}</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={cfg.profilePath}>{cfg.profileLinkLabel}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={cfg.basePath}>{cfg.opsBackLabel}</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload new document</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              {formError ? (
                <Textarea value={formError} readOnly className="text-destructive" />
              ) : null}
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <Input
                placeholder="Type (cv_template, tips, guide, etc.)"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                required
              />
              <Input
                placeholder="Scholarship ID (required for upload)"
                value={form.scholarshipId}
                onChange={(e) => setForm((p) => ({ ...p, scholarshipId: e.target.value }))}
                required
              />
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Uploading…" : "Upload document"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My uploaded documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {docs.map((d) => (
              <div key={d.id} className="rounded border p-3">
                <p className="font-medium">{d.title}</p>
                <p className="text-sm text-muted-foreground">
                  {d.type} · {d.originalName} · downloads: {d.downloadCount}
                </p>
                <div className="pt-2">
                  <a
                    className="text-sm text-primary underline"
                    href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download/Open
                  </a>
                </div>
              </div>
            ))}
            {!docs.length ? <p className="text-sm text-muted-foreground">No documents yet.</p> : null}
            {myUserId ? <p className="text-xs text-muted-foreground">{accountHint}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
