import { apiFetchJson } from "@/lib/api"

export type DocumentMeta = {
  id: string
  title: string
  type: string
  originalName: string
  mimeType?: string
  fileSize?: number
  downloadCount: number
  requiresPro: boolean
  editable: boolean
  createdAt: string
  updatedAt?: string
}

export type DocumentWithContent = DocumentMeta & {
  content: string
}

const DRAFT_PREFIX = "ethioscholar-doc-draft:"

export function draftStorageKey(documentId: string) {
  return `${DRAFT_PREFIX}${documentId}`
}

export function loadDraft(documentId: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(draftStorageKey(documentId))
  } catch {
    return null
  }
}

export function saveDraft(documentId: string, content: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(draftStorageKey(documentId), content)
  } catch {
    /* ignore quota */
  }
}

export function clearDraft(documentId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(draftStorageKey(documentId))
  } catch {
    /* ignore */
  }
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function fetchDocument(id: string) {
  return apiFetchJson<DocumentMeta>(`/api/documents/${id}`, { method: "GET", auth: false })
}

export async function fetchDocumentContent(id: string) {
  return apiFetchJson<DocumentWithContent>(`/api/documents/${id}/content`, {
    method: "GET",
    auth: true,
  })
}

export async function fuseDocumentWithProfile(id: string, content?: string) {
  return apiFetchJson<{ documentId: string; fused: string; profileUsed: boolean }>(
    `/api/documents/${id}/fuse`,
    {
      method: "POST",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content != null ? { content } : {}),
    }
  )
}

export function formatDocumentType(type: string) {
  return type.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Fallback when API has no requires_pro column yet */
export function defaultRequiresPro(type: string) {
  return type === "cover_letter_template" || type === "resume_template"
}

export type DocumentSort = "popular" | "newest" | "title"

export function sortDocuments<T extends { title: string; downloadCount: number; createdAt: string }>(
  docs: T[],
  sort: DocumentSort,
): T[] {
  const copy = [...docs]
  if (sort === "popular") {
    return copy.sort((a, b) => b.downloadCount - a.downloadCount || a.title.localeCompare(b.title))
  }
  if (sort === "newest") {
    return copy.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }
  return copy.sort((a, b) => a.title.localeCompare(b.title))
}

export function documentTypeHint(type: string): string {
  const key = type.toLowerCase()
  if (key.includes("cv") || key.includes("resume")) {
    return "Structure your experience for scholarship committees."
  }
  if (key.includes("cover")) {
    return "Tailor your motivation letter for each application."
  }
  if (key.includes("recommendation") || key.includes("reference")) {
    return "Guidance for referees and recommendation requests."
  }
  if (key.includes("checklist") || key.includes("guide")) {
    return "Step-by-step help for application readiness."
  }
  return "Ready-to-use material for your applications."
}
