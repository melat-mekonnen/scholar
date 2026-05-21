"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { API_BASE_URL } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  studentPortalCardClass,
  studentPortalHeroAccentClass,
  studentPortalHeroCardClass,
  studentPortalPageBg,
} from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"

type ConfirmResponse = {
  success: boolean
  alreadySubmitted?: boolean
  scholarshipTitle?: string
  applicationId?: string | null
}

function ConfirmApplicationInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConfirmResponse | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Missing confirmation link. Open the link from your email again.")
      setLoading(false)
      return
    }

    let cancelled = false
    async function run() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/applications/confirm/${encodeURIComponent(token)}`,
          { method: "GET" },
        )
        const data = (await res.json().catch(() => null)) as ConfirmResponse & { message?: string }
        if (cancelled) return
        if (!res.ok) {
          setError(data?.message || "This confirmation link is invalid or has expired.")
          setLoading(false)
          return
        }
        setResult(data)
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError("Could not reach the server. Try again in a moment.")
          setLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className={cn("flex min-h-screen items-center justify-center p-6", studentPortalPageBg)}>
      <Card className={cn(studentPortalCardClass, "w-full max-w-lg")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Application confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirming your application…
            </div>
          ) : null}

          {error ? (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          {!loading && !error && result ? (
            <div className={studentPortalHeroCardClass}>
              <div className={studentPortalHeroAccentClass}>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {result.alreadySubmitted
                        ? "Already confirmed"
                        : "Application confirmed"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {result.scholarshipTitle
                        ? `"${result.scholarshipTitle}" is marked as submitted in your tracker.`
                        : "Your application tracker has been updated."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/applications">View applications</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default function ConfirmApplicationPage() {
  return (
    <Suspense
      fallback={
        <main className={cn("flex min-h-screen items-center justify-center p-6", studentPortalPageBg)}>
          <p className="text-sm text-slate-500">Loading…</p>
        </main>
      }
    >
      <ConfirmApplicationInner />
    </Suspense>
  )
}
