"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"

type VerificationStatus = "draft" | "pending" | "verified" | "rejected" | "expired"

type ScholarshipDetail = {
  id: string
  title: string
  country: string
  degreeLevel: "high_school" | "bachelor" | "master" | "phd"
  status: VerificationStatus
  deadline: string
  fundingType?: string
  fieldOfStudy?: string
  amount?: string
  description?: string
  createdAt?: string
  updatedAt?: string
  postedBy?: {
    id: string
    fullName: string
    email: string
  }
}

function renderStatusBadge(status: VerificationStatus) {
  switch (status) {
    case "verified":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Verified</Badge>
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>
    case "expired":
      return <Badge variant="secondary">Expired</Badge>
    case "draft":
      return (
        <Badge variant="outline" className="border-emerald-200 text-emerald-800">
          Draft
        </Badge>
      )
    case "pending":
    default:
      return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Pending</Badge>
  }
}

export default function ScholarshipReviewPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [scholarship, setScholarship] = useState<ScholarshipDetail | null>(null)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    async function load() {
      setError(null)
      const { res, data, errorMessage } = await apiFetchJson<ScholarshipDetail>(`/api/admin/scholarships/${id}`, {
        method: "GET",
      })

      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }

      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load scholarship")
        return
      }

      setScholarship(data)
    }
    load()
  }, [id, router])

  async function handleApprove() {
    if (!id) return
    setLoading(true)
    setError(null)
    const { res, errorMessage } = await apiFetchJson(`/api/admin/scholarships/${id}/verify`, { method: "PUT" })
    setLoading(false)
    if (!res.ok) {
      setError(errorMessage || "Failed to approve scholarship")
      return
    }
    router.push("/admin/scholarships/pending")
  }

  async function handleReject() {
    if (!id) return
    setLoading(true)
    setError(null)
    const { res, errorMessage } = await apiFetchJson(`/api/admin/scholarships/${id}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: reason.trim() ? JSON.stringify({ reason: reason.trim() }) : undefined,
    })
    setLoading(false)
    if (!res.ok) {
      setError(errorMessage || "Failed to reject scholarship")
      return
    }
    router.push("/admin/scholarships/pending")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="rounded-2xl border border-slate-200/90 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">Scholarship review</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Carefully review scholarship details before approving or rejecting.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0 rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 sm:self-start">
            <Link href="/admin/scholarships/pending">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to pending list
            </Link>
          </Button>
        </div>
      </header>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      {!scholarship ? (
        <p className="text-sm text-slate-600">Loading scholarship…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
              <CardHeader className="space-y-1 border-b border-emerald-100/80 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-foreground">{scholarship.title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-600">
                      {scholarship.country} · {scholarship.degreeLevel.replace("_", " ")}
                    </p>
                  </div>
                  {renderStatusBadge(scholarship.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div className="flex flex-wrap gap-6">
                  {scholarship.fieldOfStudy && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Field of study</p>
                      <p className="mt-0.5 font-medium text-slate-900">{scholarship.fieldOfStudy}</p>
                    </div>
                  )}
                  {scholarship.fundingType && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Funding type</p>
                      <p className="mt-0.5 font-medium text-slate-900">{scholarship.fundingType}</p>
                    </div>
                  )}
                  {scholarship.amount && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</p>
                      <p className="mt-0.5 font-medium text-slate-900">{scholarship.amount}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Deadline</p>
                    <p className="mt-0.5 font-medium text-slate-900">{scholarship.deadline}</p>
                  </div>
                </div>

                {scholarship.description && (
                  <div className="rounded-xl border border-emerald-100/60 bg-emerald-50/30 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Description</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{scholarship.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {scholarship.postedBy && (
              <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
                <CardHeader className="border-b border-emerald-100/80 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-900">Posted by</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-4 text-sm">
                  <p className="font-medium text-slate-900">{scholarship.postedBy.fullName}</p>
                  <p className="text-slate-600">{scholarship.postedBy.email}</p>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
              <CardHeader className="border-b border-emerald-100/80 py-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Verification actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <p className="leading-relaxed text-slate-600">
                  Approve verified, high-quality scholarships. Reject those that do not meet platform standards.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rejection reason (optional)</p>
                  <Textarea
                    placeholder="Provide a brief explanation for rejection (visible to managers)."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="rounded-md border-emerald-100/90 bg-white focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    disabled={loading}
                    onClick={handleApprove}
                    className="rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                  >
                    Approve scholarship
                  </Button>
                  <Button variant="destructive" disabled={loading} onClick={handleReject} className="rounded-md">
                    Reject scholarship
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  )
}
