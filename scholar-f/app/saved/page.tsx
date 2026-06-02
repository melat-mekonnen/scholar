"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark } from "lucide-react"

import { fetchBookmarksPage } from "@/lib/bookmarks"
import {
  getApplicationUrl,
  normalizeScholarship,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { clearToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"
import { applyWithReturnConfirmation, unauthorizedHandler } from "@/lib/track-and-apply"
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
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { studentPortalHeroCardClass } from "@/components/student-portal/student-portal-ui"
import {
  accentEmerald,
  emeraldCard,
  inlineHeaderRow,
  outlineControl,
  pageShell,
  scholarshipListCard,
  summaryBar,
  textMuted,
  textPrimary,
  textSubtle,
} from "@/lib/theme"
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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [page])

  useEffect(() => {
    async function loadMe() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
      if (res.ok && data) setMe(data)
    }
    void loadMe()
  }, [])

  function handleApplyWithReturnCheck(s: ScholarshipPublic) {
    void applyWithReturnConfirmation({
      scholarship: s,
      toast,
      onUnauthorized: () => unauthorizedHandler(router),
    })
  }

  return (
    <div className={cn("flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden", pageShell)}>
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <header className={cn(inlineHeaderRow)}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">Saved Scholarships</h1>
            {me?.role ? (
              <Badge className="capitalize border-emerald-200 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                {me.role}
              </Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 space-y-6 overflow-x-hidden p-4 sm:space-y-8 sm:p-6">
          <div className={cn("w-full", studentPortalHeroCardClass)}>
            <div className="border-l-4 border-emerald-500 pl-4 dark:border-emerald-400">
              <h2 className={cn("text-2xl font-semibold tracking-tight", textPrimary)}>Saved for later</h2>
              <p className={cn("mt-2 text-sm leading-relaxed", textMuted)}>
                Scholarships you bookmarked. Remove the bookmark to take them off this list.
              </p>
            </div>
          </div>

          {!loading && results.length > 0 ? (
            <div className={cn("flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4", summaryBar)}>
              <p className={cn("text-sm", textMuted)}>
                <span className={accentEmerald}>{total.toLocaleString()}</span> saved scholarship
                {total === 1 ? "" : "s"}
              </p>
              <Button asChild variant="outline" size="sm" className={cn("shrink-0", outlineControl)}>
                <Link href="/scholarships">Browse more</Link>
              </Button>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive dark:border-red-900/50 dark:bg-red-950/40">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))]">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className={cn(scholarshipListCard, "gap-0 py-0")}>
                  <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results.length === 0 ? (
            <Empty className={cn(emeraldCard, "border-emerald-100/80")}>
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
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
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))]">
                {results.map((s) => (
                  <Card key={s.id} className={cn(scholarshipListCard, "gap-0 py-0")}>
                    <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <CardHeader className="space-y-3 px-4 pb-2 pt-4 sm:px-5">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle
                          className={cn(
                            "text-base leading-snug transition-colors group-hover:text-emerald-800 dark:group-hover:text-emerald-300",
                            textPrimary,
                          )}
                        >
                          {s.title}
                        </CardTitle>
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
                    <CardContent className="space-y-3 px-4 pb-5 pt-0 sm:px-5">
                      <p className={cn("text-sm", textSubtle)}>
                        {s.country} · {formatDegreeLevel(s.degreeLevel)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {typeof s.bookmarkCount === "number" && s.bookmarkCount > 0 && (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300"
                          >
                            {s.bookmarkCount} saved
                          </Badge>
                        )}
                        {s.deadline ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300"
                          >
                            Deadline: {s.deadline}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn("h-10 w-full rounded-md sm:w-auto", outlineControl)}
                          onClick={() => setViewScholarship(s)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="h-10 w-full rounded-md bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                          disabled={!getApplicationUrl(s)}
                          onClick={() => void handleApplyWithReturnCheck(s)}
                        >
                          {getApplicationUrl(s) ? "Apply" : "Apply (link unavailable)"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalPages > 1 ? (
                <div className={cn("rounded-xl px-2 py-3 sm:px-3", summaryBar)}>
                  <Pagination className="mx-0 w-full max-w-full justify-start">
                    <PaginationContent className="flex-wrap gap-0.5">
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
                              className={
                                p === page
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950/70"
                                  : "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-accent dark:hover:text-emerald-200"
                              }
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
              ) : null}
            </>
          )}
        </main>
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
