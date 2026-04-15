"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type CreateScholarshipResponse = {
  id: string
  status: string
}

export default function NewManagerScholarshipPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      const { res, data, errorMessage } = await apiFetchJson<CreateScholarshipResponse>("/api/scholarships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }

      if (!res.ok || !data?.id) {
        setFormError(errorMessage || "Failed to create scholarship")
        return
      }

      router.push("/manager")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Create Scholarship</h1>
          <Button variant="outline" asChild>
            <Link href="/manager">Back to Manager Dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scholarship Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {formError ? (
                <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">
                  {formError}
                </p>
              ) : null}

              <Input
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <Input
                placeholder="Country"
                value={formData.country}
                onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                required
              />
              <Input
                placeholder="Degree Level (e.g. bachelor, master, phd)"
                value={formData.degreeLevel}
                onChange={(e) => setFormData((p) => ({ ...p, degreeLevel: e.target.value }))}
                required
              />
              <Input
                placeholder="Field of Study"
                value={formData.fieldOfStudy}
                onChange={(e) => setFormData((p) => ({ ...p, fieldOfStudy: e.target.value }))}
                required
              />
              <Input
                placeholder="Funding Type (e.g. fully_funded, partially_funded)"
                value={formData.fundingType}
                onChange={(e) => setFormData((p) => ({ ...p, fundingType: e.target.value }))}
                required
              />
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData((p) => ({ ...p, deadline: e.target.value }))}
                required
              />
              <Input
                placeholder="Amount (optional)"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
              />
              <Input
                placeholder="Application URL (optional)"
                value={formData.applicationUrl}
                onChange={(e) => setFormData((p) => ({ ...p, applicationUrl: e.target.value }))}
              />
              <Textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                required
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Scholarship"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

