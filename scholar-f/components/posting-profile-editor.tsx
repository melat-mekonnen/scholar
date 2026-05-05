"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, IdCard, LogOut } from "lucide-react"

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
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
              <Link href={dashboardHref} aria-label={backAriaLabel}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <IdCard className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{pageTitle}</h1>
                <p className="text-sm text-muted-foreground">{pageDescription}</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void logoutFromServer()
              clearToken()
              router.push("/signin")
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Posting & contact</CardTitle>
            <CardDescription>
              Separate from the student applicant profile (GPA, degree, etc.). Use this for how you
              present yourself when posting scholarships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading your profile…</p>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g. Scholarship coordinator"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization</Label>
                  <Input
                    id="organizationName"
                    placeholder="Organization or program name"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Short bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="A few sentences students see alongside your postings (optional)."
                    rows={5}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publicContactEmail">Public contact email</Label>
                  <Input
                    id="publicContactEmail"
                    type="email"
                    placeholder="Optional — shown to applicants if set (defaults to your account email otherwise)"
                    value={publicContactEmail}
                    onChange={(e) => setPublicContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Optional"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? "Saving…" : saveButtonLabel}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need GPA, degree, and interests for your own applications? Use the{" "}
          <Link href="/profile?intent=student" className="text-primary underline">
            student applicant profile
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
