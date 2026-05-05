"use client"

import { useEffect, useState } from "react"
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

type MeResponse = {
  role?: string
}

export default function AdminNewScholarshipPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    organizationName: "",
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
    async function gate() {
      const me = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
      if (me.res.status === 401 || me.res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (me.data?.role !== "admin") {
        router.replace("/dashboard")
        return
      }
      setAuthorized(true)
    }
    void gate()
  }, [router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { res, data, errorMessage } = await apiFetchJson<CreateScholarshipResponse>("/api/scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data?.id) {
        setError(errorMessage || "Failed to create scholarship")
        return
      }
      router.push("/admin/scholarships/pending")
    } finally {
      setSubmitting(false)
    }
  }

  if (!authorized) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </main>
    )
  }

  return (
    <main>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Create scholarship (admin)</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scholarship details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <Input
                placeholder="Organization"
                value={form.organizationName}
                onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))}
                required
              />
              <Input
                placeholder="Country"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                required
              />
              <Input
                placeholder="Degree level"
                value={form.degreeLevel}
                onChange={(e) => setForm((p) => ({ ...p, degreeLevel: e.target.value }))}
                required
              />
              <Input
                placeholder="Field of study"
                value={form.fieldOfStudy}
                onChange={(e) => setForm((p) => ({ ...p, fieldOfStudy: e.target.value }))}
                required
              />
              <Input
                placeholder="Funding type"
                value={form.fundingType}
                onChange={(e) => setForm((p) => ({ ...p, fundingType: e.target.value }))}
                required
              />
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                required
              />
              <Input
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
              <Input
                placeholder="Application URL"
                value={form.applicationUrl}
                onChange={(e) => setForm((p) => ({ ...p, applicationUrl: e.target.value }))}
              />
              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                required
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create scholarship"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
