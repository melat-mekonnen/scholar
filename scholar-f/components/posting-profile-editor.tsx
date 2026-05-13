"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  FilePlus2,
  Files,
  Globe,
  IdCard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Phone,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export type PostingProfileDto = {
  id?: string
  jobTitle?: string | null
  organizationName?: string | null
  bio?: string | null
  publicContactEmail?: string | null
  websiteUrl?: string | null
  phone?: string | null
}

type PostingProfileEditorProps = {
  dashboardHref: string
  backAriaLabel: string
  pageTitle: string
  pageDescription: string
  saveButtonLabel: string
  savedToastDescription: string
  allowedRoles: readonly ("manager" | "owner")[]
  bounceOwnersTo?: string
  bounceManagersTo?: string
  showSidebar?: boolean
}

export function PostingProfileEditor({
  dashboardHref,
  backAriaLabel,
  pageTitle,
  pageDescription,
  saveButtonLabel,
  savedToastDescription,
  allowedRoles,
  bounceOwnersTo,
  bounceManagersTo,
  showSidebar = true,
}: PostingProfileEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [jobTitle, setJobTitle] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [bio, setBio] = useState("")
  const [publicContactEmail, setPublicContactEmail] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [phone, setPhone] = useState("")
  const isOwnerWorkspace = dashboardHref.startsWith("/owner")
  const basePath = isOwnerWorkspace ? "/owner/scholarships" : "/manager"
  const newScholarshipPath = isOwnerWorkspace ? "/owner/scholarships/new" : "/manager/scholarships/new"
  const manageScholarshipsPath = isOwnerWorkspace ? "/owner/scholarships/manage" : "/manager/scholarships"
  const documentsPath = isOwnerWorkspace ? "/owner/documents" : "/manager/documents"

  useEffect(() => {
    async function gateAndLoad() {
      const me = await apiFetchJson<{ role?: string }>("/api/auth/me", { method: "GET" })
      if (me.res.status === 401 || me.res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      const role = me.data?.role as "manager" | "owner" | undefined
      if (!role) {
        router.replace("/dashboard")
        return
      }
      if (bounceOwnersTo && role === "owner") {
        router.replace(bounceOwnersTo)
        return
      }
      if (bounceManagersTo && role === "manager") {
        router.replace(bounceManagersTo)
        return
      }
      if (!allowedRoles.includes(role)) {
        router.replace("/dashboard")
        return
      }
      setReady(true)

      const { res, data } = await apiFetchJson<PostingProfileDto>("/api/manager/profile", {
        method: "GET",
      })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (res.ok && data) {
        setJobTitle(data.jobTitle ?? "")
        setOrganizationName(data.organizationName ?? "")
        setBio(data.bio ?? "")
        setPublicContactEmail(data.publicContactEmail ?? "")
        setWebsiteUrl(data.websiteUrl ?? "")
        setPhone(data.phone ?? "")
      }
      setLoading(false)
    }
    void gateAndLoad()
  }, [router, allowedRoles, bounceOwnersTo, bounceManagersTo])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { res, errorMessage } = await apiFetchJson<PostingProfileDto>("/api/manager/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim() || null,
          organizationName: organizationName.trim() || null,
          bio: bio.trim() || null,
          publicContactEmail: publicContactEmail.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          phone: phone.trim() || null,
        }),
      })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok) {
        throw new Error(errorMessage || "Could not save profile")
      }
      toast({ title: "Saved", description: savedToastDescription })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not save",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-background p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {showSidebar ? (
        <aside className="hidden w-72 border-r border-blue-100/70 bg-white p-6 md:flex md:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
            {isOwnerWorkspace ? "Owner Portal" : "University Representative"}
          </h2>

          <nav className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2">
            <Link
              href={basePath}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:ring-1 hover:ring-slate-200"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              <span>Dashboard</span>
            </Link>
            <Link
              href={dashboardHref}
              className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 px-3 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100">
                <IdCard className="h-4 w-4" />
              </span>
              <span>{isOwnerWorkspace ? "Posting profile" : "Your profile"}</span>
            </Link>
            <Link
              href={newScholarshipPath}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:ring-1 hover:ring-slate-200"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200">
                <FilePlus2 className="h-4 w-4" />
              </span>
              <span>New scholarship</span>
            </Link>
            <Link
              href={manageScholarshipsPath}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:ring-1 hover:ring-slate-200"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200">
                <ListChecks className="h-4 w-4" />
              </span>
              <span>Manage scholarships</span>
            </Link>
            <Link
              href={documentsPath}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 hover:ring-1 hover:ring-slate-200"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200">
                <Files className="h-4 w-4" />
              </span>
              <span>Documents</span>
            </Link>
          </nav>

          <div className="mt-auto pt-6">
            <Button
              variant="outline"
              className="group w-full justify-between rounded-xl border-slate-200 bg-white px-3 py-2.5 text-slate-700 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                void logoutFromServer()
                clearToken()
                router.push("/signin")
              }}
            >
              <span className="inline-flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-rose-100 group-hover:text-rose-700">
                  <LogOut className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">Sign out</span>
              </span>
            </Button>
          </div>
        </aside>
        ) : null}

        <div className="relative mx-auto w-full max-w-4xl px-4 py-8">
          <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-64 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <header className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/15 p-2.5 ring-1 ring-white/20">
                    <IdCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
                    <p className="text-sm text-blue-50">{pageDescription}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Posting & contact</CardTitle>
            <CardDescription className="text-slate-500">
              Separate from your student applicant profile. Use this for how you appear when posting scholarships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Loading your profile...</p>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job title</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g. Scholarship coordinator"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="organizationName"
                        placeholder="Organization or program name"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Short bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="A few sentences students see alongside your postings (optional)."
                    rows={5}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="rounded-xl border-slate-200"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="publicContactEmail">Public contact email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="publicContactEmail"
                        type="email"
                        placeholder="Optional contact email"
                        value={publicContactEmail}
                        onChange={(e) => setPublicContactEmail(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Website</Label>
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="websiteUrl"
                        type="url"
                        placeholder="https://"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:max-w-sm">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="phone"
                      placeholder="Optional"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 pl-9"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <Button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                    {saving ? "Saving..." : saveButtonLabel}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

          <p className="mt-6 text-center text-xs text-slate-500">
            Need GPA, degree, and interests for your own applications? Use the{" "}
            <Link href="/profile?intent=student" className="text-emerald-600 underline underline-offset-2">
              student applicant profile
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
