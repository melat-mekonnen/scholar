"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Check, Crown, Download, FileText, Pencil, Sparkles } from "lucide-react"

import { API_BASE_URL } from "@/lib/api"
import { getToken } from "@/lib/auth"
import {
  defaultRequiresPro,
  fetchDocument,
  formatDocumentType,
  type DocumentMeta,
} from "@/lib/documents"
import type { SubscriptionStatus } from "@/lib/subscription-types"
import { apiFetchJson } from "@/lib/api"
import {
  DocumentTemplatePreview,
  previewVariantForDocument,
} from "@/components/student-portal/document-template-preview"
import {
  StudentPortalFrame,
  StudentPortalTopHeader,
} from "@/components/student-portal/student-portal-frame"
import { studentPortalCardClass } from "@/components/student-portal/student-portal-ui"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? "")

  const [doc, setDoc] = useState<DocumentMeta | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requiresPro = doc?.requiresPro ?? (doc ? defaultRequiresPro(doc.type) : false)
  const isPro = subscription?.proActive ?? false
  const canEdit = doc?.editable !== false && (!requiresPro || isPro)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { res, data, errorMessage } = await fetchDocument(id)
      if (!res.ok || !data) {
        setError(errorMessage || "Document not found")
        setLoading(false)
        return
      }
      setDoc({
        ...data,
        requiresPro: data.requiresPro ?? defaultRequiresPro(data.type),
      })
      setLoading(false)
    }
    if (id) void load()
  }, [id])

  useEffect(() => {
    async function loadSub() {
      if (!getToken()) return
      const { res, data } = await apiFetchJson<SubscriptionStatus>("/api/billing/subscription", {
        method: "GET",
        auth: true,
      })
      if (res.ok && data) setSubscription(data)
    }
    void loadSub()
  }, [])

  const variant = useMemo(
    () => (doc ? previewVariantForDocument(doc.type, doc.id) : "classic"),
    [doc]
  )

  function handleUseTemplate() {
    if (!getToken()) {
      router.push(`/signin?next=/documents/${id}/edit`)
      return
    }
    if (requiresPro && !isPro) {
      router.push("/settings/subscription?reason=document-pro")
      return
    }
    if (!doc?.editable) {
      window.open(`${API_BASE_URL}/api/documents/${id}/download`, "_blank")
      return
    }
    router.push(`/documents/${id}/edit`)
  }

  return (
    <StudentPortalFrame
      header={<StudentPortalTopHeader title="Document Resources" />}
      mainClassName="min-h-0 flex-1 space-y-8 p-4 md:p-8"
      showFooter={false}
    >
      <nav className="text-sm text-slate-500">
        <Link href="/documents" className="hover:text-blue-700">
          Document resources
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{doc?.title ?? "Template"}</span>
      </nav>

      {loading ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[8.5/11] w-full max-w-md rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : error || !doc ? (
        <p className="text-destructive">{error ?? "Not found"}</p>
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="mx-auto w-full max-w-md lg:sticky lg:top-6">
            <div className={cn(studentPortalCardClass, "p-4 shadow-lg ring-1 ring-slate-100")}>
              <DocumentTemplatePreview
                title={doc.title}
                type={formatDocumentType(doc.type)}
                variant={variant}
                size="lg"
                className="shadow-none ring-0"
              />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Preview · {doc.downloadCount} downloads
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {requiresPro ? (
                  <Badge className="gap-1 bg-emerald-600 text-white">
                    <Crown className="h-3 w-3" />
                    Pro template
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
                    Free
                  </Badge>
                )}
                <Badge variant="outline">{formatDocumentType(doc.type)}</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {doc.title}
              </h1>
              <p className="mt-3 text-slate-600">
                Use EthioScholar&apos;s document workspace to open this template,{" "}
                <strong className="font-medium text-blue-700">fuse your profile</strong> into
                placeholders, edit in the browser, and download when you&apos;re ready.
              </p>
            </div>

            <ul className="space-y-2 text-sm text-slate-700">
              {[
                "Easily edit placeholders and sections",
                "Fuse with your academic profile in one click",
                "Download unlimited copies as plain text",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="rounded-full bg-emerald-600 px-8 text-white hover:bg-emerald-700"
                onClick={handleUseTemplate}
              >
                {doc.editable ? (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    {requiresPro && !isPro ? "Upgrade to use template" : "Use this template"}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download file
                  </>
                )}
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href="/documents">Show all templates</Link>
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              No watermarks on exports · Profile fusion uses your saved applicant profile ·{" "}
              {requiresPro ? "Pro subscription required for this template" : "Free for all students"}
            </p>

            {!canEdit && requiresPro && !isPro ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-blue-900">
                  <Sparkles className="h-4 w-4" />
                  Unlock editing & profile fusion with Pro
                </p>
                <Button asChild className="mt-3" size="sm">
                  <Link href="/settings/subscription">View Pro plans</Link>
                </Button>
              </div>
            ) : null}

            {!doc.editable ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <FileText className="h-4 w-4" />
                PDF and Word files can be downloaded; in-browser editing is available for text templates.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </StudentPortalFrame>
  )
}
