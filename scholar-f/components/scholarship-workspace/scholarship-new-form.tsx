"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  CircleDollarSign,
  FilePlus2,
  Globe2,
  GraduationCap,
  Landmark,
  Sparkles,
} from "lucide-react"

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
import { cn } from "@/lib/utils"
import { ScholarshipWorkspaceLayout } from "@/components/scholarship-workspace/scholarship-workspace-shell"
import { outlineEmeraldButton, textMuted, textPrimary, workspacePageHeader } from "@/lib/theme"

type CreateScholarshipResponse = {
  id: string
  status: string
}

type Props = {
  workspace: ScholarshipWorkspace
}

export function ScholarshipNewForm({ workspace }: Props) {
  const cfg = getScholarshipWorkspaceConfig(workspace)
  const isManager = workspace === "manager"
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
      <ScholarshipWorkspaceLayout workspace={workspace}>
        <p className={cn("text-sm", textMuted)}>Loading…</p>
      </ScholarshipWorkspaceLayout>
    )
  }

  return (
    <ScholarshipWorkspaceLayout workspace={workspace}>
      <div className="relative mx-auto max-w-5xl space-y-6">
        <header className={workspacePageHeader}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            {isManager ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                    <FilePlus2 className="h-6 w-6" />
                  </div>
                  <h1 className={cn("min-w-0 text-2xl font-semibold tracking-tight", textPrimary)}>
                    {cfg.newScholarshipTitle}
                  </h1>
                </div>
                <p className={cn("max-w-xl text-sm", textMuted)}>
                  Add a clear title, deadline, and eligibility so students can find and trust your listing.
                </p>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Review may apply before verification
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                    <FilePlus2 className="h-6 w-6" />
                  </div>
                  <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">{cfg.newScholarshipTitle}</h1>
                </div>
                <p className="max-w-xl text-sm text-slate-600">
                  Publish a complete scholarship listing with clear eligibility and application details.
                </p>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Professional listing experience
                </div>
              </div>
            )}
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <Button
                variant="outline"
                asChild
                className={cn("rounded-xl", outlineEmeraldButton)}
              >
                <Link href={cfg.profilePath}>{cfg.profileLinkLabel}</Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className={cn("rounded-xl", outlineEmeraldButton)}
              >
                <Link href={cfg.basePath}>{cfg.opsBackLabel}</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
            <CardHeader className="border-b border-emerald-100/80">
              <CardTitle className="text-lg text-slate-900">Scholarship details</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <form className="space-y-6" onSubmit={onSubmit}>
              {formError ? (
                <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">
                  {formError}
                </p>
              ) : null}

                <section className="space-y-4 rounded-2xl border border-emerald-100/80 bg-emerald-50/25 p-4">
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
                        className="h-11 rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizationName">Organization</Label>
                      <div className="relative">
                        <Landmark
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70"
                        />
                        <Input
                          id="organizationName"
                          placeholder="Organization or university name"
                          value={formData.organizationName}
                          onChange={(e) => setFormData((p) => ({ ...p, organizationName: e.target.value }))}
                          className="h-11 rounded-xl border-emerald-100/90 pl-9 shadow-sm focus-visible:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <div className="relative">
                        <Globe2
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70"
                        />
                        <Input
                          id="country"
                          placeholder="e.g. Germany"
                          value={formData.country}
                          onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                          className="h-11 rounded-xl border-emerald-100/90 pl-9 shadow-sm focus-visible:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-emerald-100/80 bg-emerald-50/25 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Eligibility & funding</h3>
                    <Badge variant="outline" className="border-emerald-200/90 bg-white text-emerald-800">
                      Academic
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="degreeLevel">Degree level</Label>
                      <div className="relative">
                        <GraduationCap
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70"
                        />
                        <Input
                          id="degreeLevel"
                          placeholder="e.g. bachelor, master, phd"
                          value={formData.degreeLevel}
                          onChange={(e) => setFormData((p) => ({ ...p, degreeLevel: e.target.value }))}
                          className="h-11 rounded-xl border-emerald-100/90 pl-9 shadow-sm focus-visible:ring-emerald-500"
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
                        className="h-11 rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
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
                        className="h-11 rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <div className="relative">
                        <CalendarDays
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70"
                        />
                        <Input
                          id="deadline"
                          type="date"
                          value={formData.deadline}
                          onChange={(e) => setFormData((p) => ({ ...p, deadline: e.target.value }))}
                          className="h-11 rounded-xl border-emerald-100/90 pl-9 shadow-sm focus-visible:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-emerald-100/80 bg-emerald-50/25 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Application details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (optional)</Label>
                      <div className="relative">
                        <CircleDollarSign
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70"
                        />
                        <Input
                          id="amount"
                          placeholder="e.g. 10000 USD"
                          value={formData.amount}
                          onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                          className="h-11 rounded-xl border-emerald-100/90 pl-9 shadow-sm focus-visible:ring-emerald-500"
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
                        className="h-11 rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe eligibility, benefits, and the application process."
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        className="min-h-[140px] rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </section>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-900/15 ring-1 ring-emerald-500/25 hover:bg-emerald-700"
                >
                  {isSubmitting ? "Creating…" : "Create scholarship"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5 lg:sticky lg:top-6">
            <CardHeader className="border-b border-emerald-100/80">
              <CardTitle className="text-base text-slate-900">Publishing tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p className="rounded-lg border border-emerald-100/70 bg-emerald-50/40 px-3 py-2">
                Use a clear, specific scholarship title to improve discoverability.
              </p>
              <p className="rounded-lg border border-emerald-100/70 bg-emerald-50/40 px-3 py-2">
                Keep deadline and funding type accurate for better student trust.
              </p>
              <p className="rounded-lg border border-emerald-100/70 bg-emerald-50/40 px-3 py-2">
                Write practical eligibility details in the description.
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                {isManager
                  ? "Listings may be reviewed before they appear as verified to students."
                  : "Owner listings should follow platform guidelines and stay up to date."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScholarshipWorkspaceLayout>
  )
}
