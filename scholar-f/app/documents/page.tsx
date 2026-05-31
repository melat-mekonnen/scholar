"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  Search,
  Sparkles,
  MessageSquare,
  Users,
  Bookmark,
  UserCircle2,
  Settings,
} from "lucide-react"

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
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-background dark:text-foreground transition-colors duration-200">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6 dark:border-border dark:bg-card dark:text-foreground dark:shadow-none transition-colors duration-200">
          <div>
            <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">Document Resources</h1>
            <p className="text-xs text-slate-600">Templates and guides for your scholarship applications.</p>
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
