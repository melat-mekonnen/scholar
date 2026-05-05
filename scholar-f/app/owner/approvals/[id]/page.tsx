"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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
  postedBy?: {
    id: string
    fullName: string
    email: string
  }
}

export default function OwnerScholarshipReviewPage() {
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
    void load()
  }, [id, router])

  function renderStatusBadge(status: VerificationStatus) {
    if (status === "verified") return <Badge>Verified</Badge>
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
    if (status === "expired") return <Badge variant="secondary">Expired</Badge>
    if (status === "draft") return <Badge variant="outline">Draft</Badge>
    return <Badge variant="outline">Pending</Badge>
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
    router.push("/owner/approvals")
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
    router.push("/owner/approvals")
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
        <header>
          <h1 className="text-2xl font-bold">Owner scholarship review</h1>
          <p className="text-sm text-muted-foreground">Review, edit, approve, or reject this scholarship.</p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!scholarship ? (
          <p className="text-sm text-muted-foreground">Loading scholarship...</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-4 lg:col-span-2">
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
                        {scholarship.country || "N/A"} · {scholarship.degreeLevel || "N/A"}
                      </p>
                    </div>
                    {renderStatusBadge(scholarship.status)}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {scholarship.description || "No description provided."}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Verification actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Textarea
                    placeholder="Optional rejection reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex flex-col gap-2">
                    <Button disabled={loading} onClick={handleApprove}>
                      Approve scholarship
                    </Button>
                    <Button variant="destructive" disabled={loading} onClick={handleReject}>
                      Reject scholarship
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/owner/approvals")}>
                      Back to approvals
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

