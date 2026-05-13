"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Download, ShieldCheck, Sparkles } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type TrustedImportResponse = {
  discovered: number
  saved: number
  errors?: Array<{ sourceName: string; message: string }>
}

export default function OwnerTrustedImportPage() {
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importTrustedSources() {
    setImporting(true)
    setMessage(null)
    setError(null)
    try {
      const { res, data: json, errorMessage } = await apiFetchJson<TrustedImportResponse>(
        "/api/owner/discovery/import-trusted",
        { method: "POST" },
      )
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !json) {
        setError(errorMessage || "Import failed")
        return
      }
      const failed = (json.errors || []).length
      setMessage(
        `Imported ${json.saved} of ${json.discovered} listings from trusted sources${failed ? ` (${failed} source errors).` : "."} New items may appear under Pending approvals for review.`,
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Download className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Trusted import</h1>
          </div>
          <p className="text-sm text-blue-50">
            Pull scholarship listings from configured trusted feeds (e.g. Fastweb). Imports typically land in your
            approval queue.
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-blue-50">
            <Sparkles className="h-3.5 w-3.5" />
            Automated discovery from trusted sources
          </div>
        </div>
      </header>

      <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Run import</CardTitle>
          <CardDescription className="text-slate-500">
            This calls the server discovery job. Check results here and in Pending approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-600">
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Trusted-only import
              </p>
              <p>Only configured trusted feeds are processed.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-600">
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Approval workflow
              </p>
              <p>Imported listings appear in your pending approvals queue.</p>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}
          <Button onClick={() => void importTrustedSources()} disabled={importing} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
            {importing ? "Importing…" : "Import from trusted sites"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
