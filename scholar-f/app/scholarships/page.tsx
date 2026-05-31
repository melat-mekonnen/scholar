"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Filter,
  Search,
  Search as SearchIcon,
  X,
} from "lucide-react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { apiFetchJson } from "@/lib/api"
import {
  formatScholarshipDeadlineLabel,
  fundingTypeLabel,
  isStudyProgramme,
  normalizeScholarship,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { getMyApplications } from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import { ScholarshipApplyButton } from "@/components/scholarship-apply-button"
import { ScholarshipDetailDialog } from "@/components/scholarship-detail-dialog"
import { useStudentI18n } from "@/lib/student-i18n"
import { heroBanner, inlineHeaderRow, summaryBar, textMuted, textPrimary } from "@/lib/theme"
import { cn } from "@/lib/utils"
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
type ApplicationFilter = "all" | "applied" | "not_applied"

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
  const { t } = useStudentI18n()
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
  const [appliedScholarshipIds, setAppliedScholarshipIds] = useState<Set<string>>(new Set())
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>("all")

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const visibleResults = useMemo(() => {
    if (applicationFilter === "all") return results
    return results.filter((s) => {
      const applied = appliedScholarshipIds.has(s.id)
      return applicationFilter === "applied" ? applied : !applied
    })
  }, [results, appliedScholarshipIds, applicationFilter])

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

  useEffect(() => {
    async function loadApplied() {
      const { res, data } = await getMyApplications()
      if (res.status === 401 || res.status === 403 || !res.ok || !data) return
      setAppliedScholarshipIds(new Set((data.applications || []).map((a) => a.scholarshipId)))
    }
    void loadApplied()
  }, [])

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
      <div className={compact ? "space-y-6 p-4" : "space-y-6"}>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Country</p>
          <div className="space-y-2">
            {(filters?.countries ?? []).slice(0, 12).map((c) => (
              <label key={c} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-emerald-50">
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
              <p className="text-xs text-slate-500">
                Countries will appear when backend returns filter options.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Degree level</p>
          <div className="space-y-2">
            {degreeOptions.map((d) => (
              <label key={d} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm capitalize text-slate-700 hover:bg-slate-50">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Field of study</p>
          <div className="space-y-2">
            {(filters?.fieldsOfStudy ?? []).slice(0, 10).map((f) => (
              <label key={f} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
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
              <p className="text-xs text-slate-500">
                Fields will appear when backend returns filter options.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Funding type</p>
          <div className="space-y-2">
            {(filters?.fundingTypes ?? []).slice(0, 10).map((f) => (
              <label key={f} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
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
              <p className="text-xs text-slate-500">
                Funding types will appear when backend returns filter options.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Deadline</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">From</p>
              <Input
                type="date"
                value={deadlineFrom}
                onChange={(e) => {
                  setPage(1)
                  setDeadlineFrom(e.target.value)
                }}
                className="h-10 rounded-lg border-emerald-200 bg-white focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">To</p>
              <Input
                type="date"
                value={deadlineTo}
                onChange={(e) => {
                  setPage(1)
                  setDeadlineTo(e.target.value)
                }}
                className="h-10 rounded-lg border-emerald-200 bg-white focus-visible:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="outline" className="h-10 w-full rounded-lg border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-background dark:text-foreground transition-colors duration-200">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className={cn(inlineHeaderRow)}>
          <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">Browse Scholarships</h1>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className={heroBanner}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="border-l-4 border-emerald-500 pl-4 dark:border-emerald-400">
              <h2 className={`text-2xl font-semibold tracking-tight ${textPrimary}`}>Find your next scholarship</h2>
              <p className={`mt-2 text-sm leading-relaxed ${textMuted}`}>
                Search verified opportunities and filter by country, degree, field of study, and funding.
              </p>
            </div>
          </div>

        <div className={`${summaryBar} p-3 shadow-sm shadow-emerald-900/5`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
            <Input
              value={q}
              onChange={(e) => {
                setPage(1)
                setQ(e.target.value)
              }}
              placeholder="Search by keyword (e.g. engineering, Germany, fully funded)"
              className="h-11 rounded-xl border-emerald-200 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
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
                  <SelectTrigger className="h-11 w-56 rounded-xl border-emerald-200 focus:ring-emerald-500 bg-white shadow-sm">
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
                  <Button variant="outline" className="h-11 rounded-xl border-emerald-200 bg-white shadow-sm hover:bg-emerald-50 md:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="border-l border-emerald-100 p-0">
                  <SheetHeader className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-4">
                    <SheetTitle className="text-emerald-950">Filters</SheetTitle>
                  </SheetHeader>
                  <FilterPanel compact />
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                onClick={clearAll}
                className="hidden h-11 rounded-xl border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50 md:inline-flex"
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          {/* Desktop filters */}
          <aside className="hidden md:block">
            <Card className="relative sticky top-6 overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-teal-700 ring-1 ring-emerald-100"><Filter className="h-4 w-4" /></span>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <FilterPanel />
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-100/60">
              <p className="text-sm text-slate-600">
                {loading ? (
                  "Loading..."
                ) : applicationFilter === "all" ? (
                  <>
                    <span className="font-semibold text-emerald-700">{total.toLocaleString()}</span> results
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-emerald-700">{visibleResults.length.toLocaleString()}</span>{" "}
                    shown on this page
                  </>
                )}
              </p>
              <div className="md:hidden">
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    setPage(1)
                    setSort(v as SortOption)
                  }}
                >
                  <SelectTrigger className="h-10 w-48 rounded-xl border-emerald-200 focus:ring-emerald-500 bg-white shadow-sm">
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
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={applicationFilter === "all" ? "default" : "outline"}
                size="sm"
                className={applicationFilter === "all" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}
                onClick={() => setApplicationFilter("all")}
              >
                All
              </Button>
              <Button
                variant={applicationFilter === "applied" ? "default" : "outline"}
                size="sm"
                className={applicationFilter === "applied" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-300 bg-white hover:bg-slate-50"}
                onClick={() => setApplicationFilter("applied")}
              >
                Applied
              </Button>
              <Button
                variant={applicationFilter === "not_applied" ? "default" : "outline"}
                size="sm"
                className={applicationFilter === "not_applied" ? "bg-teal-600 text-white hover:bg-teal-700" : "border-slate-300 bg-white hover:bg-slate-50"}
                onClick={() => setApplicationFilter("not_applied")}
              >
                Not Applied
              </Button>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200">
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
            ) : visibleResults.length === 0 ? (
              <Empty className="rounded-2xl border border-emerald-100/80 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200/90">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-emerald-50 text-emerald-700">
                    <SearchIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No results</EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your filters or searching with different keywords.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={clearAll}>
                    Clear search & filters
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="grid gap-4">
                {visibleResults.map((s) => (
                  <Card
                    key={s.id}
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-slate-900 transition-colors group-hover:text-emerald-800">{s.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {s.organizationName ? `${s.organizationName} 
 · ` : ""}
                            {s.country} 
 · {s.degreeLevel.replace("_", " ")}
                            {s.fieldOfStudy ? ` 
 · ${s.fieldOfStudy}` : ""}
                          </p>
                        </div>
                        {!s.startDate && !(s.endDate || s.deadline) && (
                          <span className="shrink-0 text-xs text-slate-500">
                            Dates not specified
                          </span>
                        )}
                        <ScholarshipBookmarkButton
                          scholarshipId={s.id}
                          isBookmarked={s.isBookmarked ?? false}
                          onBookmarkedChange={(next) =>
                            updateScholarshipBookmark(s.id, next)
                          }
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                          {isStudyProgramme(s) ? t("Study programme") : t("Verified")}
                        </Badge>
                        {appliedScholarshipIds.has(s.id) && (
                          <Badge className="bg-teal-600 text-white">Applied</Badge>
                        )}
                        {typeof s.bookmarkCount === "number" && s.bookmarkCount > 0 && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.bookmarkCount} saved</Badge>
                        )}
                        {s.fundingType && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {t(fundingTypeLabel(s.fundingType))}
                          </Badge>
                        )}
                        {s.amount && <Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.amount}</Badge>}
                        {s.startDate && <Badge variant="outline" className="border-emerald-200 text-emerald-800">Start: {s.startDate}</Badge>}
                        {formatScholarshipDeadlineLabel(s) && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {s.isRolling && (s.deadline || s.endDate)
                              ? `Deadline: ${formatScholarshipDeadlineLabel(s)}`
                              : s.isRolling
                                ? formatScholarshipDeadlineLabel(s)!
                                : `End: ${formatScholarshipDeadlineLabel(s)}`}
                          </Badge>
                        )}
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                          onClick={() => setViewScholarship(s)}
                        >
                          View
                        </Button>
                        <ScholarshipApplyButton
                          scholarship={s}
                          className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          onTracked={(id) =>
                            setAppliedScholarshipIds((prev) => new Set(prev).add(id))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="rounded-xl border border-emerald-100/80 bg-white px-3 py-3 shadow-sm ring-1 ring-emerald-100/60">
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
                            className={
                              p === page
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : "hover:bg-emerald-50 hover:text-emerald-700"
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
            )}
          </section>
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
      </div>
    </div>
  )
}

