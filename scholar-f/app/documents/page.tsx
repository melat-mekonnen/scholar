"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Search as SearchIcon,
  Users,
  Bookmark,
  UserCircle2,
  Settings,
} from "lucide-react"

import { apiFetchJson, API_BASE_URL } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"

type DocumentItem = {
  id: string
  title: string
  type: string
  originalName: string
  downloadCount: number
  createdAt: string
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scholarships", label: "Browse Scholarships", icon: SearchIcon },
    { href: "/applications", label: "My Applications", icon: FileText },
    { href: "/community", label: "Community", icon: Users },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark },
    { href: "/profile", label: "Profile", icon: UserCircle2 },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: true },
  ]

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

  const sorted = useMemo(
    () => [...docs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [docs]
  )

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-blue-100/70 bg-white p-6 md:block">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Student Portal</h2>

          <nav className="space-y-1.5">
            {sidebarLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.active
                      ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 px-3 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
                      : "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  }
                >
                  <span
                    className={
                      item.active
                        ? "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100"
                        : "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200"
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="flex-1 w-full px-4 py-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex justify-end">
              <ProfileAvatarLink />
            </div>
            <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Document Resources</h1>
                <p className="text-sm text-blue-50">
                  CV templates, recommendation guides, and application resources.
                </p>
              </div>
              <img
                src="/ethioscholar-logo.svg"
                alt="EthioScholar"
                className="hidden h-10 w-auto brightness-0 invert md:block"
              />
            </div>
            </header>

            <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-xl">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search documents..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
                  />
                </div>
                <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50">
                  <Link href="/scholarships">Back to Scholarships</Link>
                </Button>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {loading ? (
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                Loading...
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {sorted.map((d) => (
                <Card
                  key={d.id}
                  className="group relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="line-clamp-2 text-base text-slate-900 transition-colors group-hover:text-blue-700">
                          {d.title}
                        </CardTitle>
                        <p className="mt-1 text-sm text-slate-500">
                          {d.type} · {d.originalName}
                        </p>
                      </div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        <FileText className="h-5 w-5" />
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 pt-0">
                    <p className="text-xs text-slate-500">Downloads: {d.downloadCount}</p>
                    <a
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
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
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

