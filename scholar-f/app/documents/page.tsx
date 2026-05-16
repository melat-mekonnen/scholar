"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Search,
  Sparkles,
  MessageSquare,
  Users,
  Bookmark,
  UserCircle2,
  Settings,
} from "lucide-react"

import { apiFetchJson, API_BASE_URL } from "@/lib/api"
import { useStudentI18n } from "@/lib/student-i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"
import { StudentLanguageToggle } from "@/components/student-language-toggle"

type DocumentItem = {
  id: string
  title: string
  type: string
  originalName: string
  downloadCount: number
  createdAt: string
}

function formatDocDate(iso: string) {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default function DocumentsPage() {
  const { t } = useStudentI18n()
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      const { res, data, errorMessage } = await apiFetchJson<{ documents: DocumentItem[] }>(
        `/api/documents${params.toString() ? `?${params.toString()}` : ""}`,
        { method: "GET", auth: false },
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

  const sorted = useMemo(
    () => [...docs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [docs],
  )

  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: false },
    { href: "/applications", label: "My Applications", icon: FileText, active: false },
    { href: "/community", label: "Community", icon: Users, active: false },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: false },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: false },
    { href: "/ai-chat", label: "AI Chatbot", icon: MessageSquare, active: false },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: false },
    { href: "/settings", label: "Settings", icon: Settings, active: false },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: true },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Student Portal</p>

          <nav className="flex flex-col gap-0.5">
            {sidebarLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.active
                      ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                      : "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
                  }
                >
                  <span
                    className={
                      item.active
                        ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"
                        : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.active ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                  ) : (
                    <span className="w-1.5 shrink-0" aria-hidden />
                  )}
                </Link>
              )
            })}
          </nav>
          <StudentPortalSidebarLogout tone="primary" className="mt-10 border-emerald-100/80" />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-emerald-950">Document Resources</h1>
            <p className="text-xs text-slate-600">Templates and guides for your scholarship applications.</p>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="rounded-2xl border border-emerald-100/80 bg-white px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Application resources</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    CV templates, recommendation guides, and other documents to support your applications.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/applications">My Applications</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100/80 bg-white p-4 shadow-sm shadow-emerald-900/5 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70" />
                <Input
                  placeholder="Search documents..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 rounded-xl border-emerald-200/80 bg-white pl-9 shadow-sm focus-visible:border-emerald-300 focus-visible:ring-emerald-200/60"
                />
              </div>
              <Button asChild variant="outline" className="h-11 shrink-0 rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/scholarships">{t("Browse Scholarships")}</Link>
              </Button>
            </div>
          </div>

          {!loading && sorted.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-50">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-emerald-700">{sorted.length}</span> document
                {sorted.length === 1 ? "" : "s"}
                {q.trim() ? (
                  <span className="text-slate-500">
                    {" "}
                    matching &ldquo;{q.trim()}&rdquo;
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                  <CardContent className="space-y-3 p-6">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
              <CardContent className="space-y-4 p-6 text-center sm:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100 sm:mx-0">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">No documents found</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {q.trim()
                      ? "Try a different search term or clear the search to see all resources."
                      : "Check back later — new templates and guides are added by the team."}
                  </p>
                </div>
                {q.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                    onClick={() => setQ("")}
                  >
                    Clear search
                  </Button>
                ) : (
                  <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link href="/scholarships">{t("Browse Scholarships")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sorted.map((d) => (
                <Card
                  key={d.id}
                  className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="line-clamp-2 text-base text-slate-900 transition-colors group-hover:text-emerald-800">
                          {d.title}
                        </CardTitle>
                        <p className="mt-1 text-sm text-slate-500">
                          {d.type} · {d.originalName}
                        </p>
                        {d.createdAt ? (
                          <p className="mt-1 text-xs text-slate-400">Added {formatDocDate(d.createdAt)}</p>
                        ) : null}
                      </div>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80">
                        <FileText className="h-5 w-5" />
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-xs font-medium text-emerald-800">
                      {d.downloadCount} download{d.downloadCount === 1 ? "" : "s"}
                    </Badge>
                    <a
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                      href={`${API_BASE_URL}/api/documents/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
