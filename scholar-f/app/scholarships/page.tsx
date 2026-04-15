"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Filter, Search as SearchIcon, X } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  getApplicationUrl,
  normalizeScholarship,
  openScholarshipApplication,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { createApplication } from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import { ScholarshipDetailDialog } from "@/components/scholarship-detail-dialog"
import { ScholarshipBookmarkButton } from "@/components/scholarship-bookmark-button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DegreeLevel = "high_school" | "bachelor" | "master" | "phd"

type FiltersResponse = {
  countries?: string[]
  degreeLevels?: DegreeLevel[]
  fieldsOfStudy?: string[]
  fundingTypes?: string[]
}

type SearchResponse = {
  results: ScholarshipPublic[]
  total: number
  page: number
  limit: number
}

type SortOption =
  | "relevance"
  | "deadline_asc"
  | "deadline_desc"
  | "funding_amount"
  | "recent"

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function buildParams(options: {
  q: string
  countries: string[]
  degreeLevels: string[]
  fieldsOfStudy: string[]
  fundingTypes: string[]
  deadlineFrom: string
  deadlineTo: string
  sort: SortOption
  page: number
  limit: number
}) {
  const params = new URLSearchParams()
  if (options.q.trim()) params.set("q", options.q.trim())
  options.countries.forEach((c) => params.append("country", c))
  options.degreeLevels.forEach((d) => params.append("degree_level", d))
  options.fieldsOfStudy.forEach((f) => params.append("field_of_study", f))
  options.fundingTypes.forEach((f) => params.append("funding_type", f))
  if (options.deadlineFrom) params.set("deadline_from", options.deadlineFrom)
  if (options.deadlineTo) params.set("deadline_to", options.deadlineTo)
  params.set("sort", options.sort)
  params.set("page", String(options.page))
  params.set("limit", String(options.limit))
  // Verified by default (backend may ignore, but keeps behavior explicit)
  params.set("status", "verified")
  return params
}

export default function ScholarshipsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [filters, setFilters] = useState<FiltersResponse | null>(null)

  const [urlSynced, setUrlSynced] = useState(false)

  const [q, setQ] = useState("")
  const [countries, setCountries] = useState<string[]>([])
  const [degreeLevels, setDegreeLevels] = useState<string[]>([])
  const [fieldsOfStudy, setFieldsOfStudy] = useState<string[]>([])
  const [fundingTypes, setFundingTypes] = useState<string[]>([])
  const [deadlineFrom, setDeadlineFrom] = useState("")
  const [deadlineTo, setDeadlineTo] = useState("")
  const [sort, setSort] = useState<SortOption>("relevance")
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(20)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ScholarshipPublic[]>([])
  const [total, setTotal] = useState(0)
  const [viewScholarship, setViewScholarship] = useState<ScholarshipPublic | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    setQ(sp.get("q") ?? "")
    setCountries(sp.getAll("country"))
    setDegreeLevels(sp.getAll("degree_level"))
    setFieldsOfStudy(sp.getAll("field_of_study"))
    setFundingTypes(sp.getAll("funding_type"))
    setDeadlineFrom(sp.get("deadline_from") ?? "")
    setDeadlineTo(sp.get("deadline_to") ?? "")
    setSort((sp.get("sort") as SortOption) ?? "relevance")
    setPage(Number(sp.get("page") ?? "1") || 1)
    setLimit(Number(sp.get("limit") ?? "20") || 20)
    setUrlSynced(true)
  }, [])

  // Load available filter options
  useEffect(() => {
    async function loadFilters() {
      const { res, data } = await apiFetchJson<FiltersResponse>("/api/scholarships/filters", {
        method: "GET",
        auth: false,
      })
      if (res.ok && data) {
        setFilters(data)
      } else {
        setFilters({
          countries: [],
          degreeLevels: ["high_school", "bachelor", "master", "phd"],
          fieldsOfStudy: [],
          fundingTypes: [],
        })
      }
    }
    loadFilters()
  }, [])

  // Update URL when state changes
  const params = useMemo(
    () =>
      buildParams({
        q,
        countries,
        degreeLevels,
        fieldsOfStudy,
        fundingTypes,
        deadlineFrom,
        deadlineTo,
        sort,
        page,
        limit,
      }),
    [
      q,
      countries,
      degreeLevels,
      fieldsOfStudy,
      fundingTypes,
      deadlineFrom,
      deadlineTo,
      sort,
      page,
      limit,
    ],
  )

  useEffect(() => {
    if (!urlSynced) return
    router.replace(`/scholarships?${params.toString()}`)
  }, [router, params, urlSynced])

  // Search
  useEffect(() => {
    if (!urlSynced) return

    async function search() {
      setLoading(true)
      setError(null)
      const { res, data, errorMessage } = await apiFetchJson<SearchResponse>(
        `/api/scholarships/search?${params.toString()}`,
        { method: "GET" },
      )
      if (!res.ok || !data) {
        setLoading(false)
        setError(errorMessage || "Failed to load scholarships")
        return
      }
      setResults((data.results ?? []).map((r) => normalizeScholarship(r)))
      setTotal(data.total ?? 0)
      setLoading(false)
    }
    search()
  }, [params, urlSynced])

  function updateScholarshipBookmark(scholarshipId: string, isBookmarked: boolean) {
    const patch = (row: ScholarshipPublic): ScholarshipPublic => {
      if (row.id !== scholarshipId) return row
      const was = row.isBookmarked ?? false
      if (was === isBookmarked) return row
      const bc = row.bookmarkCount ?? 0
      return {
        ...row,
        isBookmarked,
        bookmarkCount: Math.max(0, bc + (isBookmarked ? 1 : -1)),
      }
    }
    setResults((prev) => prev.map(patch))
    setViewScholarship((v) => (v ? patch(v) : v))
  }

  function clearAll() {
    setQ("")
    setCountries([])
    setDegreeLevels([])
    setFieldsOfStudy([])
    setFundingTypes([])
    setDeadlineFrom("")
    setDeadlineTo("")
    setSort("relevance")
    setPage(1)
  }

  function FilterPanel({ compact }: { compact?: boolean }) {
    const degreeOptions =
      filters?.degreeLevels ?? ["high_school", "bachelor", "master", "phd"]
    return (
      <div className={compact ? "space-y-5 p-4" : "space-y-5"}>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Country</p>
          <div className="space-y-2">
            {(filters?.countries ?? []).slice(0, 12).map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={countries.includes(c)}
                  onCheckedChange={() => {
                    setPage(1)
                    setCountries((prev) => toggleInList(prev, c))
                  }}
                />
                <span>{c}</span>
              </label>
            ))}
            {!filters?.countries?.length && (
              <p className="text-xs text-muted-foreground">
                Countries will appear when backend returns filter options.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Degree level</p>
          <div className="space-y-2">
            {degreeOptions.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm capitalize">
                <Checkbox
                  checked={degreeLevels.includes(d)}
                  onCheckedChange={() => {
                    setPage(1)
                    setDegreeLevels((prev) => toggleInList(prev, d))
                  }}
                />
                <span>{d.replace("_", " ")}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Field of study</p>
          <div className="space-y-2">
            {(filters?.fieldsOfStudy ?? []).slice(0, 10).map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={fieldsOfStudy.includes(f)}
                  onCheckedChange={() => {
                    setPage(1)
                    setFieldsOfStudy((prev) => toggleInList(prev, f))
                  }}
                />
                <span>{f}</span>
              </label>
            ))}
            {!filters?.fieldsOfStudy?.length && (
              <p className="text-xs text-muted-foreground">
                Fields will appear when backend returns filter options.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Funding type</p>
          <div className="space-y-2">
            {(filters?.fundingTypes ?? []).slice(0, 10).map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={fundingTypes.includes(f)}
                  onCheckedChange={() => {
                    setPage(1)
                    setFundingTypes((prev) => toggleInList(prev, f))
                  }}
                />
                <span>{f}</span>
              </label>
            ))}
            {!filters?.fundingTypes?.length && (
              <p className="text-xs text-muted-foreground">
                Funding types will appear when backend returns filter options.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Deadline</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">From</p>
              <Input
                type="date"
                value={deadlineFrom}
                onChange={(e) => {
                  setPage(1)
                  setDeadlineFrom(e.target.value)
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">To</p>
              <Input
                type="date"
                value={deadlineTo}
                onChange={(e) => {
                  setPage(1)
                  setDeadlineTo(e.target.value)
                }}
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Browse Scholarships</h1>
          <p className="text-sm text-muted-foreground">
            Search verified scholarships and filter by what matters to you.
          </p>
        </header>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setPage(1)
                setQ(e.target.value)
              }}
              placeholder="Search by keyword (e.g. engineering, Germany, fully funded)"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <Select
                value={sort}
                onValueChange={(v) => {
                  setPage(1)
                  setSort(v as SortOption)
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="deadline_asc">Deadline (soonest)</SelectItem>
                  <SelectItem value="deadline_desc">Deadline (latest)</SelectItem>
                  <SelectItem value="funding_amount">Funding amount</SelectItem>
                  <SelectItem value="recent">Recently added</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <FilterPanel compact />
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              onClick={clearAll}
              className="hidden md:inline-flex"
            >
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* Desktop filters */}
          <aside className="hidden md:block">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <FilterPanel />
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading..." : `${total.toLocaleString()} results`}
              </p>
              <div className="md:hidden">
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    setPage(1)
                    setSort(v as SortOption)
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="deadline_asc">Deadline (soonest)</SelectItem>
                    <SelectItem value="deadline_desc">Deadline (latest)</SelectItem>
                    <SelectItem value="funding_amount">Funding amount</SelectItem>
                    <SelectItem value="recent">Recently added</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="rounded-2xl">
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : results.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No results</EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your filters or searching with different keywords.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" onClick={clearAll}>
                    Clear search & filters
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="grid gap-4">
                {results.map((s) => (
                  <Card key={s.id} className="rounded-2xl">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold">{s.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {s.country} · {s.degreeLevel.replace("_", " ")}
                            {s.fieldOfStudy ? ` · ${s.fieldOfStudy}` : ""}
                          </p>
                        </div>
                        <ScholarshipBookmarkButton
                          scholarshipId={s.id}
                          isBookmarked={s.isBookmarked ?? false}
                          onBookmarkedChange={(next) =>
                            updateScholarshipBookmark(s.id, next)
                          }
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Verified</Badge>
                        {typeof s.bookmarkCount === "number" && s.bookmarkCount > 0 && (
                          <Badge variant="outline">{s.bookmarkCount} saved</Badge>
                        )}
                        {s.fundingType && <Badge variant="outline">{s.fundingType}</Badge>}
                        {s.amount && <Badge variant="outline">{s.amount}</Badge>}
                        {s.deadline && <Badge variant="outline">Deadline: {s.deadline}</Badge>}
                      </div>

                      <div className="pt-2 flex gap-2">
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
            )}

            {!loading && totalPages > 1 && (
              <div className="pt-2">
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
          </section>
        </div>
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
              isBookmarked={viewScholarship.isBookmarked ?? false}
              onBookmarkedChange={(next) =>
                updateScholarshipBookmark(viewScholarship.id, next)
              }
              size="sm"
            />
          ) : undefined
        }
      />
    </main>
  )
}

