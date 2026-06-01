"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Files, FolderOpen, Sparkles, Upload } from "lucide-react"

import { apiFetch, apiFetchJson, API_BASE_URL } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useScholarshipWorkspaceGate } from "@/hooks/use-scholarship-workspace-gate"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getScholarshipWorkspaceConfig, type ScholarshipWorkspace } from "@/lib/scholarship-workspace"
import { cn } from "@/lib/utils"
import { ScholarshipWorkspaceLayout } from "@/components/scholarship-workspace/scholarship-workspace-shell"
import {
  outlineEmeraldButton,
  textMuted,
  textPrimary,
  workspaceCardShell,
  workspacePageHeader,
} from "@/lib/theme"

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
  const isManager = workspace === "manager"
  const gate = useScholarshipWorkspaceGate(workspace)
  const router = useRouter()
  const [myUserId, setMyUserId] = useState<string>("")
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    type: "",
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
        try {
          const parsed = JSON.parse(txt) as { message?: string }
          setFormError(parsed.message || txt || "Upload failed")
        } catch {
          setFormError(txt || "Upload failed")
        }
        return
      }

      setForm({ title: "", type: "", file: null })
      await loadMeAndDocs()
    } finally {
      setLoading(false)
    }
  }

  if (gate !== "ready") {
    return (
      <ScholarshipWorkspaceLayout workspace={workspace}>
        <p className={cn("text-sm", textMuted)}>Loading…</p>
      </ScholarshipWorkspaceLayout>
    )
  }

  const accountHint =
    workspace === "owner"
      ? "Filtering documents by your owner account."
      : "Filtering documents by your manager account."

  return (
    <ScholarshipWorkspaceLayout workspace={workspace}>
      <div className="relative mx-auto max-w-5xl space-y-6">
        <header className={workspacePageHeader}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            {isManager ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                    <Files className="h-6 w-6" />
                  </div>
                  <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">
                    {cfg.documentPageHeading}
                  </h1>
                </div>
                <p className={cn("max-w-xl text-sm", textMuted)}>
                  Upload PDFs, CV guides, and tips as general document resources for applicants.
                </p>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Accepted formats: PDF, Word, or plain text
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                    <Files className="h-6 w-6" />
                  </div>
                  <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">{cfg.documentPageHeading}</h1>
                </div>
                <p className={cn("max-w-xl text-sm", textMuted)}>
                  Upload and manage general document resources (guides, templates, tips).
                </p>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Organized document workspace
                </div>
              </div>
            )}
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <Button
                asChild
                variant="outline"
                className={cn("rounded-xl", outlineEmeraldButton)}
              >
                <Link href={cfg.profilePath}>{cfg.profileLinkLabel}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className={cn("rounded-xl", outlineEmeraldButton)}
              >
                <Link href={cfg.basePath}>{cfg.opsBackLabel}</Link>
              </Button>
            </div>
          </div>
        </header>

        <Card className={workspaceCardShell}>
          <CardHeader className="border-b border-emerald-100/80">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <Upload className="h-5 w-5 text-emerald-600" />
              Upload new document
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
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
                  className="h-11 rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
                  required
                />
                <Input
                  placeholder="Type (cv_template, tips, guide, etc.)"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="h-11 rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
                  required
                />
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                  className="h-11 rounded-xl border-emerald-100/90 shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-800 hover:file:bg-emerald-100 md:col-span-2"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-900/15 ring-1 ring-emerald-500/25 hover:bg-emerald-700"
              >
                {loading ? "Uploading…" : "Upload document"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={workspaceCardShell}>
          <CardHeader className="border-b border-emerald-100/80">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <FolderOpen className="h-5 w-5 text-emerald-600" />
              My uploaded documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {docs.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-emerald-100/80 bg-emerald-50/25 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{d.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {d.originalName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-200/90 bg-white text-emerald-800"
                      >
                        {d.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-emerald-200/90 bg-white text-emerald-800"
                      >
                        Downloads: {d.downloadCount}
                      </Badge>
                    </div>
                  </div>
                  <a
                    className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
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
              <p
                className="rounded-lg border border-emerald-100/80 bg-emerald-50/30 px-3 py-3 text-sm text-slate-600"
              >
                No documents yet.
              </p>
            ) : null}
            {myUserId ? (
              <p className="text-xs text-slate-500">{accountHint}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </ScholarshipWorkspaceLayout>
  )
}
