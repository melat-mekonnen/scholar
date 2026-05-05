"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download } from "lucide-react"

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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-8 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Download className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Trusted import</h1>
          <p className="text-sm text-muted-foreground">
            Pull scholarship listings from configured trusted feeds (e.g. Fastweb). Imports typically land in
            your approval queue.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Run import</CardTitle>
          <CardDescription>
            This calls the server discovery job. Check results here and in Pending approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <Button onClick={() => void importTrustedSources()} disabled={importing}>
            {importing ? "Importing…" : "Import from trusted sites"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
