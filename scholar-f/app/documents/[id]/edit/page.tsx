"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Download, Save, Sparkles, Wand2 } from "lucide-react"

import { getToken, clearToken } from "@/lib/auth"
import {
  clearDraft,
  downloadTextFile,
  fetchDocumentContent,
  fuseDocumentWithProfile,
  loadDraft,
  saveDraft,
  formatDocumentType,
} from "@/lib/documents"
import {
  StudentPortalFrame,
  StudentPortalTopHeader,
} from "@/components/student-portal/student-portal-frame"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { studentPortalCardClass } from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"

export default function DocumentEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = String(params?.id ?? "")

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [fusing, setFusing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEditor = useCallback(async () => {
    if (!getToken()) {
      router.replace(`/signin?next=/documents/${id}/edit`)
      return
    }
    setLoading(true)
    setError(null)
    const draft = loadDraft(id)
    const { res, data, errorMessage } = await fetchDocumentContent(id)
    if (res.status === 401 || res.status === 403) {
      if (res.status === 401) {
        clearToken()
        router.replace(`/signin?next=/documents/${id}/edit`)
        return
      }
      setError(errorMessage || "This template requires Pro.")
      setLoading(false)
      return
    }
    if (!res.ok || !data) {
      setError(errorMessage || "Could not load template")
      setLoading(false)
      return
    }
    setTitle(data.title)
    setContent(draft ?? data.content)
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    void loadEditor()
  }, [loadEditor])

  async function handleFuse() {
    setFusing(true)
    const { res, data, errorMessage } = await fuseDocumentWithProfile(id, content)
    setFusing(false)
    if (!res.ok || !data) {
      if (res.status === 403) {
        router.push("/settings/subscription?reason=document-pro")
        return
      }
      toast({
        title: "Could not fuse profile",
        description: errorMessage || "Complete your profile first, then try again.",
        variant: "destructive",
      })
      return
    }
    setContent(data.fused)
    saveDraft(id, data.fused)
    toast({
      title: data.profileUsed ? "Profile fused" : "Template updated",
      description: data.profileUsed
        ? "Placeholders were filled from your applicant profile. Review and edit anything that needs a personal touch."
        : "Add more details in your profile for richer auto-fill.",
    })
  }

  function handleSaveDraft() {
    saveDraft(id, content)
    toast({ title: "Draft saved", description: "Saved in this browser." })
  }

  function handleDownload() {
    const name = title.replace(/\s+/g, "-").toLowerCase() || "document"
    downloadTextFile(`${name}.txt`, content)
  }

  function handleReset() {
    clearDraft(id)
    void loadEditor()
    toast({ title: "Draft cleared", description: "Reloaded template from server." })
  }

  return (
    <StudentPortalFrame
      header={<StudentPortalTopHeader title="Edit template" />}
      mainClassName="min-h-0 flex-1 p-4 md:p-6"
      showFooter={false}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/documents/${id}`} className="text-sm text-blue-700 hover:underline">
            ← Back to template
          </Link>
          {title ? (
            <p className="mt-1 text-lg font-semibold text-slate-900">{title}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleFuse()}
            disabled={fusing || loading}
            className="border-blue-200"
          >
            <Wand2 className="mr-1.5 h-4 w-4" />
            {fusing ? "Fusing…" : "Fuse with my profile"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={loading}>
            <Save className="mr-1.5 h-4 w-4" />
            Save draft
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleDownload}
            disabled={loading}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="min-h-[480px] w-full rounded-xl" />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-destructive">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/settings/subscription">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Editor</p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[520px] font-mono text-sm leading-relaxed"
              spellCheck
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Edit freely — bracketed placeholders can be fused from your profile.</span>
              <button type="button" className="text-blue-700 hover:underline" onClick={handleReset}>
                Reset to template
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Preview</p>
            <div className={cn(studentPortalCardClass, "min-h-[520px] overflow-auto rounded-xl p-6")}>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                {content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </StudentPortalFrame>
  )
}
