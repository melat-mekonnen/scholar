"use client"

import { useEffect, useState } from "react"

import { apiFetchJson } from "@/lib/api"
import {
  DocumentResourcesGallery,
  type DocumentResource,
} from "@/components/student-portal/document-resources-gallery"
import {
  StudentPortalFrame,
  StudentPortalTopHeader,
} from "@/components/student-portal/student-portal-frame"

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

  return (
    <StudentPortalFrame
      header={<StudentPortalTopHeader title="Document Resources" />}
      mainClassName="min-h-0 flex-1 space-y-0 p-4 md:p-6"
    >
      <DocumentResourcesGallery
        documents={docs}
        loading={loading}
        error={error}
        search={q}
        onSearchChange={setQ}
      />
    </StudentPortalFrame>
  )
}
