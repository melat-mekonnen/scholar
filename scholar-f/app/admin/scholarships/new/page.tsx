"use client"

import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Globe2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  ListChecks,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type CreateScholarshipResponse = {
  id: string
  status: string
}

type MeResponse = {
  role?: string
}

const DEGREE_OPTIONS = [
  { value: "high_school", label: "High school" },
  { value: "bachelor", label: "Bachelor" },
  { value: "master", label: "Master" },
  { value: "phd", label: "PhD" },
] as const

const FUNDING_OPTIONS = [
  { value: "fully_funded", label: "Fully funded" },
  { value: "partially_funded", label: "Partially funded" },
  { value: "tuition_waiver", label: "Tuition waiver" },
  { value: "stipend_only", label: "Stipend only" },
  { value: "merit_based", label: "Merit-based" },
  { value: "needs_based", label: "Needs-based" },
] as const

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value.trim())
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-emerald-100/70 pb-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm ring-1 ring-emerald-200/80">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
  )
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

    if (!form.degreeLevel.trim()) {
      setError("Please select a degree level.")
      setSubmitting(false)
      return
    }
    if (!form.fundingType.trim()) {
      setError("Please select a funding type.")
      setSubmitting(false)
      return
    }

    const urlTrim = form.applicationUrl.trim()
    if (urlTrim && !isValidHttpUrl(urlTrim)) {
      setError("Application URL must be a valid http or https link.")
      setSubmitting(false)
      return
    }

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
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-36 w-full max-w-3xl rounded-2xl" />
        <Skeleton className="h-12 w-64 rounded-md" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="rounded-2xl border border-slate-200/90 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="border-l-4 border-emerald-500 pl-4">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">Create scholarship</h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-600">
              Accurate programs for EthioScholar students—each listing stays in pending until verified.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
              <Link href="/admin">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Admin home
              </Link>
            </Button>
            <Button variant="outline" asChild className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
              <Link href="/admin/scholarships/pending">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Pending list
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
        <CardHeader className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/40 to-teal-50/30 px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Scholarship details</CardTitle>
          <CardDescription className="mt-1 max-w-2xl text-sm text-slate-600">
            Required fields are marked. Amount and application URL are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={onSubmit}>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-emerald-100/80 bg-slate-50/50 p-4 sm:p-5">
              <SectionHeader icon={Building2} title="Basic information" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title" className="text-slate-700">
                    Scholarship title <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. Global Future Leaders Scholarship"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="h-11 rounded-md border-emerald-100/90 bg-white shadow-sm focus-visible:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-slate-700">
                    Organization <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/60" />
                    <Input
                      id="organizationName"
                      placeholder="University or sponsor name"
                      value={form.organizationName}
                      onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))}
                      className="h-11 rounded-md border-emerald-100/90 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-slate-700">
                    Country <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/60" />
                    <Input
                      id="country"
                      placeholder="e.g. Germany"
                      value={form.country}
                      onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                      className="h-11 rounded-md border-emerald-100/90 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-emerald-100/80 bg-slate-50/50 p-4 sm:p-5">
              <SectionHeader icon={GraduationCap} title="Eligibility & timeline" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="degreeLevel" className="text-slate-700">
                    Degree level <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={form.degreeLevel || undefined}
                    onValueChange={(value) => setForm((p) => ({ ...p, degreeLevel: value }))}
                  >
                    <SelectTrigger
                      id="degreeLevel"
                      className="h-11 rounded-md border-emerald-100/90 bg-white shadow-sm focus:ring-emerald-500"
                    >
                      <SelectValue placeholder="Select degree level" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEGREE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldOfStudy" className="text-slate-700">
                    Field of study <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="fieldOfStudy"
                    placeholder="e.g. Computer Science"
                    value={form.fieldOfStudy}
                    onChange={(e) => setForm((p) => ({ ...p, fieldOfStudy: e.target.value }))}
                    className="h-11 rounded-md border-emerald-100/90 bg-white shadow-sm focus-visible:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fundingType" className="text-slate-700">
                    Funding type <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={form.fundingType || undefined}
                    onValueChange={(value) => setForm((p) => ({ ...p, fundingType: value }))}
                  >
                    <SelectTrigger
                      id="fundingType"
                      className="h-11 rounded-md border-emerald-100/90 bg-white shadow-sm focus:ring-emerald-500"
                    >
                      <SelectValue placeholder="Select funding type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNDING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-slate-700">
                    Deadline <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/60" />
                    <Input
                      id="deadline"
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                      className="h-11 rounded-md border-emerald-100/90 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-emerald-100/80 bg-slate-50/50 p-4 sm:p-5">
              <SectionHeader icon={ClipboardList} title="Application details" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-slate-700">
                    Amount (optional)
                  </Label>
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/60" />
                    <Input
                      id="amount"
                      placeholder="e.g. 10000 USD"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      className="h-11 rounded-md border-emerald-100/90 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationUrl" className="text-slate-700">
                    Application URL (optional)
                  </Label>
                  <Input
                    id="applicationUrl"
                    type="url"
                    inputMode="url"
                    placeholder="https://example.edu/apply"
                    value={form.applicationUrl}
                    onChange={(e) => setForm((p) => ({ ...p, applicationUrl: e.target.value }))}
                    className="h-11 rounded-md border-emerald-100/90 bg-white shadow-sm focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="text-slate-700">
                    Description <span className="text-red-600">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Eligibility, benefits, how to apply."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="min-h-[160px] rounded-md border-emerald-100/90 bg-white shadow-sm focus-visible:ring-emerald-500"
                    required
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-emerald-100/80 pt-6">
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              >
                <ListChecks className="mr-2 h-4 w-4" />
                {submitting ? "Creating…" : "Create scholarship"}
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
              >
                <Link href="/admin/scholarships/pending">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
