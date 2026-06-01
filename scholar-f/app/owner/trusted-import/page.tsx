"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Download, Loader2, ShieldCheck, Sparkles } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type TrustedImportResponse = {
  discovered: number
  saved: number
  errors?: Array<{ sourceName: string; message: string }>
}

const cardShell = "rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5"

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
    <div className="relative mr-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:pl-5 sm:pr-6 sm:py-8">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

      <header className={cn(cardShell, "border-l-4 border-l-emerald-500 px-6 py-6")}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
            <Download className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">Trusted import</h1>
            <p className="text-sm text-slate-600">
              Pull scholarship listings from configured trusted feeds (e.g. Fastweb). Imports typically land in your
              approval queue.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              Automated discovery from trusted sources
            </div>
          </div>
        </div>
      </header>

      <Card className={cardShell}>
        <CardHeader className="border-b border-emerald-100/70 pb-4">
          <CardTitle className="text-lg text-slate-900">Run import</CardTitle>
          <CardDescription className="text-slate-600">
            This calls the server discovery job. Check results here and in Pending approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/25 px-4 py-4 text-sm leading-relaxed text-slate-600">
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Trusted-only import
              </p>
              <p>Only configured trusted feeds are processed.</p>
            </div>
            <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/25 px-4 py-4 text-sm leading-relaxed text-slate-600">
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Approval workflow
              </p>
              <p>Imported listings appear in your pending approvals queue.</p>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <Button
            onClick={() => void importTrustedSources()}
            disabled={importing}
            className="rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              "Import from trusted sites"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
