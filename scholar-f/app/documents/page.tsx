"use client"

import { useEffect, useState } from "react"
import { FolderOpen } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  DocumentResourcesGallery,
  type DocumentResource,
} from "@/components/student-portal/document-resources-gallery"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { StudentLanguageToggle } from "@/components/student-language-toggle"

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentResource[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      const { res, data, errorMessage } = await apiFetchJson<{ documents: DocumentResource[] }>(
        `/api/documents${params.toString() ? `?${params.toString()}` : ""}`,
        { method: "GET", auth: false },
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

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-emerald-950">Document Resources</h1>
              <p className="text-xs text-slate-600">
                Templates and guides — edit online, fuse your profile, and download.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <DocumentResourcesGallery
            documents={docs}
            loading={loading}
            error={error}
            search={q}
            onSearchChange={setQ}
          />
        </main>
      </div>
    </div>
  )
}
