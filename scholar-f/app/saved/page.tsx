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
import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"
import { apiFetchJson } from "@/lib/api"
import { confirmTrackedApplication, startTrackedApplication } from "@/lib/applications"
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
import { StudentPortalHeroSection } from "@/components/student-portal/student-portal-hero"
import {
  studentPortalCardClass,
  studentPortalHeaderClass,
  studentPortalPageBg,
  studentPortalStatCardClass,
} from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"

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
    const tracked = await startTrackedApplication(s.id)
    if (tracked.res.status === 401 || tracked.res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!tracked.res.ok && tracked.res.status !== 409) {
      toast({
        title: "Could not start tracking",
        description: tracked.errorMessage || "Failed to save this application in your tracker.",
        variant: "destructive",
      })
      return
    }

    const applicationId = tracked.data?.id

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
            description: "Your application stays pending in the tracker until you confirm.",
          })
          return
        }

        if (!applicationId) {
          toast({
            title: "Could not confirm",
            description: "Application record was not found. Try Apply again.",
            variant: "destructive",
          })
          return
        }

        const confirmed = await confirmTrackedApplication(applicationId)
        if (confirmed.res.status === 401 || confirmed.res.status === 403) {
          clearToken()
          router.replace("/signin")
          return
        }
        if (!confirmed.res.ok) {
          toast({
            title: "Could not update status",
            description: confirmed.errorMessage || "Try again from My Applications.",
            variant: "destructive",
          })
          return
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
    <div className={cn("flex min-h-screen", studentPortalPageBg)}>
        <StudentPortalSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className={studentPortalHeaderClass}>
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

        <main className="min-h-0 flex-1 space-y-6 p-6">
          <StudentPortalHeroSection
            title="Saved for later"
            description="Scholarships you bookmarked. Remove the bookmark to take them off this list."
          />

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className={studentPortalCardClass}>
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
                    className={cn(studentPortalStatCardClass, "hover:shadow-lg")}
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
                        {s.country} Â· {formatDegreeLevel(s.degreeLevel)}
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
