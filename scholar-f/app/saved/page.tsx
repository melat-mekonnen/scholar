"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Bookmark } from "lucide-react"

import { fetchBookmarksPage } from "@/lib/bookmarks"
import {
  getApplicationUrl,
  normalizeScholarship,
  openScholarshipApplication,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { cn } from "@/lib/utils"
import { clearToken } from "@/lib/auth"
import { apiFetchJson } from "@/lib/api"
import { createApplication } from "@/lib/applications"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function NavLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        "block text-sm font-medium hover:text-primary",
        active && "text-primary",
      )}
    >
      {children}
    </Link>
  )
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
    async function loadMe() {
      const { res, data } = await apiFetchJson<MeResponse>("/auth/me", { method: "GET" })
      if (res.ok && data) setMe(data)
    }
    void loadMe()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-6 md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">Scholarship Portal</h2>
          <p className="mt-1 text-xs text-muted-foreground">Student dashboard</p>
        </div>

        <nav className="space-y-3">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/scholarships">Browse Scholarships</NavLink>
          <NavLink href="/applications">My Applications</NavLink>
          <NavLink href="/community">Community</NavLink>
          <NavLink href="/saved">Saved Scholarships</NavLink>
          <NavLink href="/profile">Profile</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Saved scholarships</h1>
            {me?.role && (
              <Badge variant="secondary" className="capitalize">
                {me.role}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {(me?.fullName?.trim()
                  ? me.fullName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")
                  : me?.email?.[0]?.toUpperCase()) || "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearToken()
                router.push("/signin")
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Saved for later</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Scholarships you bookmarked. Remove the bookmark to take them off this list.
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
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
                <Button asChild>
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.map((s) => (
                  <Card key={s.id} className="rounded-2xl">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{s.title}</CardTitle>
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
                      <p className="text-muted-foreground text-sm">
                        {s.country} · {s.degreeLevel.replace("_", " ")}
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
                          onClick={() => setViewScholarship(s)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          disabled={!getApplicationUrl(s)}
                          onClick={async () => {
                            const created = await createApplication(s.id)
                            if (created.res.status === 401 || created.res.status === 403) {
                              clearToken()
                              router.replace("/signin")
                              return
                            }
                            if (!created.res.ok && created.res.status !== 409) {
                              toast({
                                title: "Could not track application",
                                description:
                                  created.errorMessage || "Failed to save this application in your tracker.",
                                variant: "destructive",
                              })
                              return
                            }

                            const ok = await openScholarshipApplication(s)
                            if (!ok) {
                              toast({
                                title: "Application link unavailable",
                                description:
                                  "This scholarship does not have an official application URL yet.",
                                variant: "destructive",
                              })
                            } else {
                              toast({
                                title: "Application started",
                                description: "Saved to your application tracker.",
                              })
                            }
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
              )}
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
