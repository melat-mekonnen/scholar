"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  Bookmark,
  LayoutDashboard,
  Search,
  FileText,
  Users,
  UserCircle2,
  Settings,
  FolderOpen,
} from "lucide-react"

import { fetchBookmarksPage } from "@/lib/bookmarks"
import {
  getApplicationUrl,
  normalizeScholarship,
  openScholarshipApplication,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { clearToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { apiFetchJson } from "@/lib/api"
import { createApplication, updateApplicationStatus } from "@/lib/applications"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScholarshipBookmarkButton } from "@/components/scholarship-bookmark-button"
import { ScholarshipDetailDialog } from "@/components/scholarship-detail-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalFooter } from "@/components/student-portal/student-footer"

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function formatDegreeLevel(value?: string | null) {
  if (!value) return "N/A"
  return value.replace("_", " ")
}

export default function SavedScholarshipsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useStudentI18n()

  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ScholarshipPublic[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [viewScholarship, setViewScholarship] = useState<ScholarshipPublic | null>(null)
  const sidebarLinks = [
    { href: "/dashboard", label: t("Dashboard"), icon: LayoutDashboard },
    { href: "/scholarships", label: t("Browse Scholarships"), icon: Search },
    { href: "/applications", label: t("My Applications"), icon: FileText },
    { href: "/community", label: t("Community"), icon: Users },
    { href: "/saved", label: t("Saved Scholarships"), icon: Bookmark, active: true },
    { href: "/profile", label: t("Profile"), icon: UserCircle2 },
    { href: "/settings", label: t("Settings"), icon: Settings },
    { href: "/documents", label: t("Documents"), icon: FolderOpen },
  ]

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const loadBookmarks = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { res, data, errorMessage } = await fetchBookmarksPage(page, limit)
    if (res.status === 401) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!res.ok || !data) {
      setLoading(false)
      setError(errorMessage || "Failed to load saved scholarships")
      return
    }
    const rawList = data.results ?? data.scholarships ?? []
    const items = rawList.map((r) => {
      const s = normalizeScholarship(r)
      return { ...s, isBookmarked: true as const }
    })
    setResults(items)
    setTotal(data.total ?? items.length)
    setLoading(false)
  }, [page, limit, router])

  useEffect(() => {
    void loadBookmarks()
  }, [loadBookmarks])

  useEffect(() => {
    async function loadMe() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
      if (res.ok && data) setMe(data)
    }
    void loadMe()
  }, [])

  async function handleApplyWithReturnCheck(s: ScholarshipPublic) {
    const ok = await openScholarshipApplication(s)
    if (!ok) {
      toast({
        title: "Application link unavailable",
        description: "This scholarship does not have an official application URL yet.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Application opened",
      description: "After you finish and come back, we will ask if you applied.",
    })

    window.setTimeout(() => {
      const onFocus = async () => {
        const applied = window.confirm("Did you submit your application on the official site?")
        if (!applied) {
          toast({
            title: "No problem",
            description: "Kept in listing only. It was not added to My Applications.",
          })
          return
        }

        const created = await createApplication(s.id)
        if (created.res.status === 401 || created.res.status === 403) {
          clearToken()
          router.replace("/signin")
          return
        }
        if (!created.res.ok && created.res.status !== 409) {
          toast({
            title: "Could not track application",
            description: created.errorMessage || "Failed to save this application in your tracker.",
            variant: "destructive",
          })
          return
        }

        if (created.data?.id) {
          await updateApplicationStatus(created.data.id, "submitted")
        }

        toast({
          title: "Added to My Applications",
          description: "Saved as submitted in your application tracker.",
        })
      }
      window.addEventListener("focus", onFocus, { once: true })
    }, 800)
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-72 border-r border-blue-100/70 bg-white p-6 md:block">
        <div className="mb-8 flex items-center gap-3">
          <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
        </div>
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{t("Student Portal")}</h2>

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

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-blue-100/70 bg-white/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Saved scholarships</h1>
            {me?.role && (
              <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-700">
                {me.role}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ProfileAvatarLink />
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white hover:bg-slate-50"
              onClick={() => {
                clearToken()
                router.push("/signin")
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 p-6">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">Saved for later</h2>
            <p className="mt-1 text-sm text-blue-50">
              Scholarships you bookmarked. Remove the bookmark to take them off this list.
            </p>
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                  <CardContent className="space-y-3 p-6">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bookmark className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No saved scholarships yet</EmptyTitle>
                <EmptyDescription>
                  Browse listings and tap the bookmark icon to save opportunities here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.map((s) => (
                  <Card
                    key={s.id}
                    className="group relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug text-slate-900 transition-colors group-hover:text-blue-700">{s.title}</CardTitle>
                        <ScholarshipBookmarkButton
                          scholarshipId={s.id}
                          isBookmarked
                          onBookmarkedChange={(next) => {
                            if (!next) {
                              setResults((prev) => prev.filter((row) => row.id !== s.id))
                              setTotal((t) => Math.max(0, t - 1))
                            } else {
                              void loadBookmarks()
                            }
                          }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-sm text-slate-500">
                        {s.country} · {formatDegreeLevel(s.degreeLevel)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {typeof s.bookmarkCount === "number" && s.bookmarkCount > 0 && (
                          <Badge variant="outline">{s.bookmarkCount} saved</Badge>
                        )}
                        {s.deadline && (
                          <Badge variant="outline">Deadline: {s.deadline}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-md border-slate-300 bg-white hover:bg-slate-50"
                          onClick={() => setViewScholarship(s)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={!getApplicationUrl(s)}
                          onClick={async () => {
                            await handleApplyWithReturnCheck(s)
                          }}
                        >
                          {getApplicationUrl(s) ? "Apply" : "Apply (link unavailable)"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setPage((p) => Math.max(1, p - 1))
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, idx) => {
                      const p = idx + 1
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault()
                              setPage(p)
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setPage((p) => Math.min(totalPages, p + 1))
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                </div>
              )}
            </>
          )}
        </main>
        <StudentPortalFooter />
      </div>

      <ScholarshipDetailDialog
        open={viewScholarship !== null}
        onOpenChange={(open) => {
          if (!open) setViewScholarship(null)
        }}
        summary={viewScholarship}
        footerStartExtra={
          viewScholarship ? (
            <ScholarshipBookmarkButton
              scholarshipId={viewScholarship.id}
              isBookmarked={viewScholarship.isBookmarked ?? true}
              onBookmarkedChange={(next) => {
                if (!next) {
                  setResults((prev) => prev.filter((row) => row.id !== viewScholarship.id))
                  setTotal((t) => Math.max(0, t - 1))
                  setViewScholarship(null)
                } else {
                  void loadBookmarks()
                }
              }}
              size="sm"
            />
          ) : undefined
        }
      />
    </div>
  )
}
