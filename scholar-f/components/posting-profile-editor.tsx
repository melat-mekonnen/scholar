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
  Loader2,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

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

const cardShell = "rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5"
const fieldClass = "h-11 rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
const textareaClass = "rounded-xl border-emerald-100/90 shadow-sm focus-visible:ring-emerald-500"
const iconClass = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70"

export function PostingProfileEditor({
  dashboardHref,
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
  const isManagerWorkspace = !isOwnerWorkspace
  const embeddedInOwnerShell = isOwnerWorkspace && !showSidebar
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

  const inactiveNav =
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
  const inactiveNavIcon =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
  const activeProfileNav =
    "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200/80"
  const activeProfileIcon =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"

  if (!ready) {
    return (
      <main
        className={cn(
          embeddedInOwnerShell ? "px-4 py-6 sm:py-8" : "min-h-screen p-8",
          !embeddedInOwnerShell && isManagerWorkspace && "bg-slate-100",
        )}
      >
        <div
          className={cn(
            "w-full max-w-4xl space-y-4",
            embeddedInOwnerShell ? "mr-auto" : "mx-auto",
          )}
        >
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </main>
    )
  }

  return (
    <main
      className={cn(
        "text-slate-900",
        embeddedInOwnerShell ? "" : "min-h-screen",
        !embeddedInOwnerShell && isManagerWorkspace && "bg-slate-100",
      )}
    >
      <div className={cn(embeddedInOwnerShell ? "" : "flex min-h-screen")}>
        {showSidebar && isManagerWorkspace ? (
          <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white p-6 shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen">
            <div className="mb-8 flex items-center gap-3">
              <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Manager portal</p>
            <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-900">
              University Representative
            </h2>

            <nav className="flex flex-1 flex-col space-y-1 rounded-2xl border border-emerald-100/80 bg-white p-2">
              <Link href={basePath} className={inactiveNav}>
                <span className={inactiveNavIcon}>
                  <LayoutDashboard className="h-4 w-4" />
                </span>
                <span>Dashboard</span>
              </Link>
              <Link href={dashboardHref} className={activeProfileNav}>
                <span className={activeProfileIcon}>
                  <IdCard className="h-4 w-4" />
                </span>
                <span>Your profile</span>
              </Link>
              <Link href={newScholarshipPath} className={inactiveNav}>
                <span className={inactiveNavIcon}>
                  <FilePlus2 className="h-4 w-4" />
                </span>
                <span>New scholarship</span>
              </Link>
              <Link href={manageScholarshipsPath} className={inactiveNav}>
                <span className={inactiveNavIcon}>
                  <ListChecks className="h-4 w-4" />
                </span>
                <span>Manage scholarships</span>
              </Link>
              <Link href={documentsPath} className={inactiveNav}>
                <span className={inactiveNavIcon}>
                  <Files className="h-4 w-4" />
                </span>
                <span>Documents</span>
              </Link>
            </nav>

            <div className="mt-auto border-t border-emerald-100/80 pt-6">
              <Button
                variant="outline"
                className="group w-full justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50"
                onClick={() => {
                  void logoutFromServer()
                  clearToken()
                  router.push("/signin")
                }}
              >
                <span className="inline-flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">Sign out</span>
                </span>
              </Button>
            </div>
          </aside>
        ) : null}

        <div
          className={cn(
            "relative w-full max-w-4xl",
            embeddedInOwnerShell
              ? "mr-auto space-y-6 px-4 py-6 sm:pl-5 sm:pr-6 sm:py-8"
              : "mx-auto px-4 py-8 md:px-6",
          )}
        >
          <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-64 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <header className={cn(cardShell, "mb-6 border-l-4 border-l-emerald-500 px-6 py-6")}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                <IdCard className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
                <p className="mt-1 text-sm text-slate-600">{pageDescription}</p>
              </div>
            </div>
          </header>

          <Card className={cardShell}>
            <CardHeader className="border-b border-emerald-100/80">
              <CardTitle className="text-lg text-slate-900">Posting & contact</CardTitle>
              <CardDescription className="text-slate-600">
                Separate from your student applicant profile. Use this for how you appear when posting scholarships.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              ) : (
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="text-slate-700">
                        Job title
                      </Label>
                      <Input
                        id="jobTitle"
                        placeholder="e.g. Scholarship coordinator"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizationName" className="text-slate-700">
                        Organization
                      </Label>
                      <div className="relative">
                        <Building2 className={iconClass} />
                        <Input
                          id="organizationName"
                          placeholder="Organization or program name"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          className={cn(fieldClass, "pl-9")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-700">
                      Short bio
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="A few sentences students see alongside your postings (optional)."
                      rows={5}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className={textareaClass}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="publicContactEmail" className="text-slate-700">
                        Public contact email
                      </Label>
                      <div className="relative">
                        <Mail className={iconClass} />
                        <Input
                          id="publicContactEmail"
                          type="email"
                          placeholder="Optional contact email"
                          value={publicContactEmail}
                          onChange={(e) => setPublicContactEmail(e.target.value)}
                          className={cn(fieldClass, "pl-9")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="websiteUrl" className="text-slate-700">
                        Website
                      </Label>
                      <div className="relative">
                        <Globe className={iconClass} />
                        <Input
                          id="websiteUrl"
                          type="url"
                          placeholder="https://"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className={cn(fieldClass, "pl-9")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:max-w-sm">
                    <Label htmlFor="phone" className="text-slate-700">
                      Phone
                    </Label>
                    <div className="relative">
                      <Phone className={iconClass} />
                      <Input
                        id="phone"
                        placeholder="Optional"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={cn(fieldClass, "pl-9")}
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-emerald-600 px-6 text-white shadow-sm hover:bg-emerald-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        saveButtonLabel
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-slate-500">
            Need GPA, degree, and interests for your own applications? Use the{" "}
            <Link
              href="/profile?intent=student"
              className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              student applicant profile
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
