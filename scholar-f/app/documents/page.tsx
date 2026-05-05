"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { apiFetchJson, API_BASE_URL } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { clearToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"

type DocumentItem = {
  id: string
  title: string
  type: string
  originalName: string
  downloadCount: number
  createdAt: string
}

function typeLabel(type: string) {
  switch (type) {
    case "cv_template":
      return "CV template"
    case "resume_template":
      return "Resume template"
    case "cover_letter_template":
      return "Cover letter template"
    default:
      return type.replace(/_/g, " ")
  }
}

function isBuiltInTemplate(doc: DocumentItem) {
  return (
    doc.type === "cv_template" ||
    doc.type === "resume_template" ||
    doc.type === "cover_letter_template"
  )
}

export default function DocumentsPage() {
  const router = useRouter()
  const { t } = useStudentI18n()
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<{ fullName?: string; email: string; role?: string } | null>(null)

  function NavLink({ href, label }: { href: string; label: string }) {
    const active = typeof window !== "undefined" && window.location.pathname === href
    return (
      <Link
        href={href}
        className={cn("block text-sm font-medium hover:text-primary", active && "text-primary")}
      >
        {label}
      </Link>
    )
  }

  function userInitials() {
    if (!me) return "U"
    if (me.fullName?.trim()) {
      const parts = me.fullName.split(" ").filter(Boolean)
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase()
    }
    return (me.email?.[0] || "U").toUpperCase()
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      const { res, data, errorMessage } = await apiFetchJson<{ documents: DocumentItem[] }>(
        `/api/documents${params.toString() ? `?${params.toString()}` : ""}`,
        { method: "GET", auth: false }
      )
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load documents")
        setLoading(false)
        return
      }
      setDocs(data.documents ?? [])
      setLoading(false)
    }
    void load()
  }, [q])

  useEffect(() => {
    async function loadMe() {
      const { res, data } = await apiFetchJson<{ fullName?: string; email: string; role?: string }>(
        "/api/auth/me",
        { method: "GET" },
      )
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (res.ok && data) setMe(data)
    }
    void loadMe()
  }, [router])

  const sorted = useMemo(
    () => [...docs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [docs]
  )

  const templateDocs = useMemo(() => sorted.filter(isBuiltInTemplate), [sorted])
  const otherDocs = useMemo(() => sorted.filter((d) => !isBuiltInTemplate(d)), [sorted])

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-6 md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">{t("Scholarship Portal")}</h2>
        </div>
        <nav className="space-y-3">
          <NavLink href="/dashboard" label={t("Dashboard")} />
          <NavLink href="/scholarships" label={t("Browse Scholarships")} />
          <NavLink href="/applications" label={t("My Applications")} />
          <NavLink href="/community" label={t("Community")} />
          <NavLink href="/saved" label={t("Saved Scholarships")} />
          <NavLink href="/profile" label={t("Profile")} />
          <NavLink href="/settings" label={t("Settings")} />
          <NavLink href="/documents" label={t("Documents")} />
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{t("Documents")}</h1>
            {me?.role && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                {me.role}
              </span>
            )}
          </div>
          <Avatar>
            <AvatarFallback>{userInitials()}</AvatarFallback>
          </Avatar>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="space-y-2">
            <h1 className="text-2xl font-bold">{t("Document Resources")}</h1>
          <p className="text-sm text-muted-foreground">
            Download ready-to-edit CV, resume, and cover letter templates (plain text). Open in Word or
            Google Docs, adjust for each application, then export to PDF if required.
          </p>
        </header>

        <div className="flex gap-2">
          <Input
            placeholder="Search documents..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button asChild variant="outline">
              <Link href="/scholarships">{t("Browse Scholarships")}</Link>
          </Button>
          <Button asChild variant="outline">
              <Link href="/applications">{t("My Applications")}</Link>
          </Button>
          <Button asChild variant="outline">
              <Link href="/saved">{t("Saved")}</Link>
          </Button>
          <Button asChild variant="outline">
              <Link href="/dashboard">{t("Dashboard")}</Link>
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

        {templateDocs.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Templates</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {templateDocs.map((d) => (
                <Card key={d.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <CardTitle className="text-base leading-snug">{d.title}</CardTitle>
                    <Badge variant="secondary">{typeLabel(d.type)}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{d.originalName}</p>
                    <p className="text-xs text-muted-foreground">Downloads: {d.downloadCount}</p>
                    <a
                      className="text-sm text-primary underline"
                      href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {otherDocs.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">More resources</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {otherDocs.map((d) => (
                <Card key={d.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <CardTitle className="text-base leading-snug">{d.title}</CardTitle>
                    <Badge variant="outline">{typeLabel(d.type)}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{d.originalName}</p>
                    <p className="text-xs text-muted-foreground">Downloads: {d.downloadCount}</p>
                    <a
                      className="text-sm text-primary underline"
                      href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. Ask your administrator to run{" "}
            <code className="rounded bg-muted px-1 text-xs">npm run migrate:documents-uploaded-by-nullable</code>{" "}
            and then{" "}
            <code className="rounded bg-muted px-1 text-xs">npm run seed:document-templates</code> on the server,
            or upload resources from the manager tools.
          </p>
        ) : null}
        </main>
      </div>
    </div>
  )
}

