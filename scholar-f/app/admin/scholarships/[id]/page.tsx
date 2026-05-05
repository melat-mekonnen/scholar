"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

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
      const { res, data, errorMessage } = await apiFetchJson<ScholarshipDetail>(
        `/api/admin/scholarships/${id}`,
        { method: "GET" },
      )

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

  function renderStatusBadge(status: VerificationStatus) {
    switch (status) {
      case "verified":
        return <Badge variant="default">Verified</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "expired":
        return <Badge variant="secondary">Expired</Badge>
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "pending":
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  async function handleApprove() {
    if (!id) return
    setLoading(true)
    setError(null)
    const { res, errorMessage } = await apiFetchJson(
      `/api/admin/scholarships/${id}/verify`,
      { method: "PUT" },
    )
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
    const { res, errorMessage } = await apiFetchJson(
      `/api/admin/scholarships/${id}/reject`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: reason.trim() ? JSON.stringify({ reason: reason.trim() }) : undefined,
      },
    )
    setLoading(false)
    if (!res.ok) {
      setError(errorMessage || "Failed to reject scholarship")
      return
    }
    router.push("/admin/scholarships/pending")
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scholarship Review</h1>
            <p className="text-sm text-muted-foreground">
              Carefully review scholarship details before approving or rejecting.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/scholarships/pending")}
          >
            Back to pending list
          </Button>
        </header>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!scholarship ? (
          <p className="text-sm text-muted-foreground">Loading scholarship...</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main details */}
            <section className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">{scholarship.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {scholarship.country} ·{" "}
                        {scholarship.degreeLevel.replace("_", " ")}
                      </p>
                    </div>
                    {renderStatusBadge(scholarship.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-4">
                    {scholarship.fieldOfStudy && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Field of study
                        </p>
                        <p className="font-medium">{scholarship.fieldOfStudy}</p>
                      </div>
                    )}
                    {scholarship.fundingType && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Funding type
                        </p>
                        <p className="font-medium">{scholarship.fundingType}</p>
                      </div>
                    )}
                    {scholarship.amount && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Amount
                        </p>
                        <p className="font-medium">{scholarship.amount}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Deadline
                      </p>
                      <p className="font-medium">{scholarship.deadline}</p>
                    </div>
                  </div>

                  {scholarship.description && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Description
                      </p>
                      <p className="whitespace-pre-line text-sm">
                        {scholarship.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {scholarship.postedBy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Posted by</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{scholarship.postedBy.fullName}</p>
                    <p className="text-muted-foreground">
                      {scholarship.postedBy.email}
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Verification panel */}
            <section className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Verification actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Approve verified, high-quality scholarships. Reject those that do
                    not meet platform standards.
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Rejection reason (optional)
                    </p>
                    <Textarea
                      placeholder="Provide a brief explanation for rejection (visible to managers)."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      disabled={loading}
                      onClick={handleApprove}
                    >
                      Approve scholarship
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={loading}
                      onClick={handleReject}
                    >
                      Reject scholarship
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

