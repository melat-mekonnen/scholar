"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, CircleDollarSign, Globe2, GraduationCap, Landmark, Sparkles } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
      <main className="min-h-screen bg-background p-8">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Create scholarship</h1>
            <p className="text-sm text-blue-50">
              Create a scholarship listing as an admin. You can publish verified opportunities directly.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-blue-50">
              <Sparkles className="h-3.5 w-3.5" />
              Admin publishing workflow
            </div>
          </div>
        </header>

        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Scholarship details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={onSubmit}>
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Basic information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="title">Scholarship title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Global Future Leaders Scholarship"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      className="h-11 rounded-xl border-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization</Label>
                    <div className="relative">
                      <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="organizationName"
                        placeholder="Organization or university name"
                        value={form.organizationName}
                        onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <div className="relative">
                      <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="country"
                        placeholder="e.g. Germany"
                        value={form.country}
                        onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Eligibility & timeline</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="degreeLevel">Degree level</Label>
                    <div className="relative">
                      <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="degreeLevel"
                        placeholder="e.g. bachelor, master, phd"
                        value={form.degreeLevel}
                        onChange={(e) => setForm((p) => ({ ...p, degreeLevel: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fieldOfStudy">Field of study</Label>
                    <Input
                      id="fieldOfStudy"
                      placeholder="e.g. Computer Science"
                      value={form.fieldOfStudy}
                      onChange={(e) => setForm((p) => ({ ...p, fieldOfStudy: e.target.value }))}
                      className="h-11 rounded-xl border-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fundingType">Funding type</Label>
                    <Input
                      id="fundingType"
                      placeholder="e.g. fully_funded, partially_funded"
                      value={form.fundingType}
                      onChange={(e) => setForm((p) => ({ ...p, fundingType: e.target.value }))}
                      className="h-11 rounded-xl border-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="deadline"
                        type="date"
                        value={form.deadline}
                        onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Application details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (optional)</Label>
                    <div className="relative">
                      <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="amount"
                        placeholder="e.g. 10000 USD"
                        value={form.amount}
                        onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="applicationUrl">Application URL (optional)</Label>
                    <Input
                      id="applicationUrl"
                      placeholder="https://..."
                      value={form.applicationUrl}
                      onChange={(e) => setForm((p) => ({ ...p, applicationUrl: e.target.value }))}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe eligibility, benefits, and the application process."
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      className="min-h-[140px] rounded-xl border-slate-200"
                      required
                    />
                  </div>
                </div>
              </section>

              <Button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                {submitting ? "Creating..." : "Create scholarship"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
