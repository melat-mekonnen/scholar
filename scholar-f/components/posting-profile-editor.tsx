"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Globe, IdCard, Loader2, Mail, Phone } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ScholarshipWorkspaceShell } from "@/components/scholarship-workspace/scholarship-workspace-shell"
import { inputSurface, textMuted, textPrimary, workspaceCardShell, workspacePageHeader } from "@/lib/theme"

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

const fieldClass = cn("h-11 rounded-xl shadow-sm focus-visible:ring-emerald-500", inputSurface)
const textareaClass = cn("rounded-xl shadow-sm focus-visible:ring-emerald-500", inputSurface)
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
    const loadingBody = (
      <div className={cn("w-full max-w-4xl space-y-4", embeddedInOwnerShell ? "mr-auto" : "mx-auto")}>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
    if (isManagerWorkspace && showSidebar) {
      return <ScholarshipWorkspaceShell workspace="manager">{loadingBody}</ScholarshipWorkspaceShell>
    }
    return (
      <main className={cn(embeddedInOwnerShell ? "px-4 py-6 sm:py-8" : "min-h-screen p-8")}>
        {loadingBody}
      </main>
    )
  }

  const profileBody = (
        <div
          className={cn(
            "relative w-full max-w-4xl",
            embeddedInOwnerShell
              ? "mr-auto space-y-6 px-4 py-6 sm:pl-5 sm:pr-6 sm:py-8"
              : "mx-auto space-y-6",
          )}
        >
          <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-64 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <header className={cn(workspacePageHeader, "mb-6")}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
                <IdCard className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">{pageTitle}</h1>
                <p className={cn("mt-1 text-sm", textMuted)}>{pageDescription}</p>
              </div>
            </div>
          </header>

          <Card className={workspaceCardShell}>
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
  )

  if (isManagerWorkspace && showSidebar) {
    return <ScholarshipWorkspaceShell workspace="manager">{profileBody}</ScholarshipWorkspaceShell>
  }

  return <main className={cn(embeddedInOwnerShell ? "" : "min-h-screen text-slate-900")}>{profileBody}</main>
}
