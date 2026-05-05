"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"

type VerificationStatus = "draft" | "pending" | "verified" | "rejected" | "expired"

type ScholarshipDetail = {
  id: string
  title: string
  country?: string | null
  degreeLevel?: "high_school" | "bachelor" | "master" | "phd" | null
  status: VerificationStatus
  deadline?: string | null
  fundingType?: string
  fieldOfStudy?: string
  amount?: string
  description?: string
  applicationUrl?: string
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
  const [savingDetails, setSavingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: "",
    country: "",
    degreeLevel: "",
    fieldOfStudy: "",
    fundingType: "",
    deadline: "",
    amount: "",
    description: "",
    applicationUrl: "",
  })

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
      setEditForm({
        title: data.title ?? "",
        country: data.country ?? "",
        degreeLevel: data.degreeLevel ?? "",
        fieldOfStudy: data.fieldOfStudy ?? "",
        fundingType: data.fundingType ?? "",
        deadline: data.deadline ?? "",
        amount: data.amount ?? "",
        description: data.description ?? "",
        applicationUrl: data.applicationUrl ?? "",
      })
    }
    load()
  }, [id, router])

  function formatDegreeLevel(value?: string | null) {
    if (!value) return "N/A"
    return value.replace("_", " ")
  }

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

  async function handleSaveDetails() {
    if (!id) return
    setSavingDetails(true)
    setError(null)
    try {
      const { res, data, errorMessage } = await apiFetchJson<ScholarshipDetail>(`/api/scholarships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to save scholarship details")
        return
      }
      setScholarship((prev) => (prev ? { ...prev, ...data } : data))
    } finally {
      setSavingDetails(false)
    }
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scholarship Review</h1>
            <p className="text-sm text-muted-foreground">
              Carefully review scholarship details before approving or rejecting.
            </p>
          </div>
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
                <CardHeader>
                  <CardTitle className="text-base">Edit scholarship details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Title"
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Country"
                      value={editForm.country}
                      onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                    />
                    <Input
                      placeholder="Degree level (high_school, bachelor, master, phd)"
                      value={editForm.degreeLevel}
                      onChange={(e) => setEditForm((p) => ({ ...p, degreeLevel: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Field of study"
                      value={editForm.fieldOfStudy}
                      onChange={(e) => setEditForm((p) => ({ ...p, fieldOfStudy: e.target.value }))}
                    />
                    <Input
                      placeholder="Funding type (fully_funded, partially_funded, self_funded)"
                      value={editForm.fundingType}
                      onChange={(e) => setEditForm((p) => ({ ...p, fundingType: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
                    />
                    <Input
                      placeholder="Amount"
                      value={editForm.amount}
                      onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                    <Input
                      placeholder="Application URL"
                      value={editForm.applicationUrl}
                      onChange={(e) => setEditForm((p) => ({ ...p, applicationUrl: e.target.value }))}
                    />
                  </div>
                  <Textarea
                    placeholder="Description"
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveDetails} disabled={savingDetails}>
                      {savingDetails ? "Saving..." : "Save details"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">{scholarship.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {scholarship.country || "N/A"} · {formatDegreeLevel(scholarship.degreeLevel)}
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
                      <p className="font-medium">{scholarship.deadline || "N/A"}</p>
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

