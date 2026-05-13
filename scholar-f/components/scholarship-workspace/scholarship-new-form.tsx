"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, CircleDollarSign, Globe2, GraduationCap, Landmark, Sparkles } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useScholarshipWorkspaceGate } from "@/hooks/use-scholarship-workspace-gate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getScholarshipWorkspaceConfig, type ScholarshipWorkspace } from "@/lib/scholarship-workspace"

type CreateScholarshipResponse = {
  id: string
  status: string
}

type Props = {
  workspace: ScholarshipWorkspace
}

export function ScholarshipNewForm({ workspace }: Props) {
  const cfg = getScholarshipWorkspaceConfig(workspace)
  const gate = useScholarshipWorkspaceGate(workspace)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (gate !== "ready") return
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
      router.push(cfg.manageScholarshipsPath)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (gate !== "ready") {
    return (
      <main className={cfg.standaloneSurfaceClass}>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    )
  }

  return (
    <main className={cfg.standaloneSurfaceClass}>
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{cfg.newScholarshipTitle}</h1>
              <p className="text-sm text-blue-50">
                Publish a complete scholarship listing with clear eligibility and application details.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-blue-50">
                <Sparkles className="h-3.5 w-3.5" />
                Professional listing experience
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={cfg.profilePath}>{cfg.profileLinkLabel}</Link>
            </Button>
              <Button variant="outline" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={cfg.basePath}>{cfg.opsBackLabel}</Link>
            </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Scholarship details</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={onSubmit}>
              {formError ? (
                <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">
                  {formError}
                </p>
              ) : null}

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Basic information</h3>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      Required
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="title">Scholarship title</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Global Future Leaders Scholarship"
                        value={formData.title}
                        onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
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
                          value={formData.organizationName}
                          onChange={(e) => setFormData((p) => ({ ...p, organizationName: e.target.value }))}
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
                          value={formData.country}
                          onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                          className="h-11 rounded-xl border-slate-200 pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Eligibility & funding</h3>
                    <Badge variant="outline">Academic</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="degreeLevel">Degree level</Label>
                      <div className="relative">
                        <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="degreeLevel"
                          placeholder="e.g. bachelor, master, phd"
                          value={formData.degreeLevel}
                          onChange={(e) => setFormData((p) => ({ ...p, degreeLevel: e.target.value }))}
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
                        value={formData.fieldOfStudy}
                        onChange={(e) => setFormData((p) => ({ ...p, fieldOfStudy: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fundingType">Funding type</Label>
                      <Input
                        id="fundingType"
                        placeholder="e.g. fully_funded, partially_funded"
                        value={formData.fundingType}
                        onChange={(e) => setFormData((p) => ({ ...p, fundingType: e.target.value }))}
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
                          value={formData.deadline}
                          onChange={(e) => setFormData((p) => ({ ...p, deadline: e.target.value }))}
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
                          value={formData.amount}
                          onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                          className="h-11 rounded-xl border-slate-200 pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicationUrl">Application URL (optional)</Label>
                      <Input
                        id="applicationUrl"
                        placeholder="https://..."
                        value={formData.applicationUrl}
                        onChange={(e) => setFormData((p) => ({ ...p, applicationUrl: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe eligibility, benefits, and the application process."
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        className="min-h-[140px] rounded-xl border-slate-200"
                        required
                      />
                    </div>
                  </div>
                </section>

                <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                  {isSubmitting ? "Creating…" : "Create scholarship"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-2xl border-blue-100/80 bg-white shadow-sm lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-base">Publishing tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p className="rounded-lg bg-slate-50 px-3 py-2">
                Use a clear, specific scholarship title to improve discoverability.
              </p>
              <p className="rounded-lg bg-slate-50 px-3 py-2">
                Keep deadline and funding type accurate for better student trust.
              </p>
              <p className="rounded-lg bg-slate-50 px-3 py-2">
                Write practical eligibility details in the description.
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                Listings submitted by managers may enter review before verification.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
