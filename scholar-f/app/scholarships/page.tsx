"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  formatScholarshipDateRange,
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
import { ScholarshipBookmarkButton } from "@/components/scholarship-bookmark-button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScholarshipFilterDropdown } from "@/components/scholarship-filter-dropdown"
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

type FilterOption = {
  id: string
  label: string
  count?: number
}

type FiltersResponse = {
  regions?: FilterOption[]
  fieldCategories?: FilterOption[]
  degreeLevels?: DegreeLevel[]
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

function buildParams(options: {
  q: string
  region: string
  degreeLevel: string
  fieldCategory: string
  fundingType: string
  deadlineFrom: string
  deadlineTo: string
  sort: SortOption
  page: number
  limit: number
}) {
  const params = new URLSearchParams()
  if (options.q.trim()) params.set("q", options.q.trim())
  if (options.region) params.set("region", options.region)
  if (options.degreeLevel) params.set("degree_level", options.degreeLevel)
  if (options.fieldCategory) params.set("field_category", options.fieldCategory)
  if (options.fundingType) params.set("funding_type", options.fundingType)
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

  const [qInput, setQInput] = useState("")
  const [q, setQ] = useState("")
  const [region, setRegion] = useState("")
  const [degreeLevel, setDegreeLevel] = useState("")
  const [fieldCategory, setFieldCategory] = useState("")
  const [fundingType, setFundingType] = useState("")
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
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const resultsScrollRef = useRef<HTMLElement>(null)
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
    const handle = window.setTimeout(() => setQ(qInput.trim()), 350)
    return () => window.clearTimeout(handle)
  }, [qInput])

  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    const initialQ = sp.get("q") ?? ""
    setQInput(initialQ)
    setQ(initialQ)
    setRegion(sp.get("region") ?? sp.getAll("country")[0] ?? "")
    setDegreeLevel(sp.get("degree_level") ?? sp.getAll("degree_level")[0] ?? "")
    setFieldCategory(sp.get("field_category") ?? sp.getAll("field_of_study")[0] ?? "")
    setFundingType(sp.get("funding_type") ?? sp.getAll("funding_type")[0] ?? "")
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
        region,
        degreeLevel,
        fieldCategory,
        fundingType,
        deadlineFrom,
        deadlineTo,
        sort,
        page,
        limit,
      }),
    [
      q,
      region,
      degreeLevel,
      fieldCategory,
      fundingType,
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
        { method: "GET", auth: false },
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
    const useSplitLayout = window.matchMedia("(min-width: 1024px)").matches
    const scrollEl = useSplitLayout ? resultsScrollRef.current : contentScrollRef.current
    scrollEl?.scrollTo({ top: 0, behavior: "smooth" })
  }, [page, sort])

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
    setQInput("")
    setQ("")
    setRegion("")
    setDegreeLevel("")
    setFieldCategory("")
    setFundingType("")
    setDeadlineFrom("")
    setDeadlineTo("")
    setSort("relevance")
    setPage(1)
  }

  function setFilterPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1)
      setter(value)
    }
  }

  const regionOptions = useMemo(
    () => (filters?.regions ?? []).map((r) => ({ value: r.id, label: r.label })),
    [filters?.regions],
  )

  const fieldCategoryOptions = useMemo(
    () => (filters?.fieldCategories ?? []).map((f) => ({ value: f.id, label: f.label })),
    [filters?.fieldCategories],
  )

  const degreeOptions = useMemo(() => {
    const levels = filters?.degreeLevels ?? ["high_school", "bachelor", "master", "phd"]
    return levels.map((d) => ({
      value: d,
      label: d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }))
  }, [filters?.degreeLevels])

  const fundingOptions = useMemo(
    () =>
      (filters?.fundingTypes ?? []).map((f) => ({
        value: f,
        label: t(fundingTypeLabel(f)),
      })),
    [filters?.fundingTypes, t],
  )

  const activeRegionLabel = regionOptions.find((o) => o.value === region)?.label
  const activeFieldLabel = fieldCategoryOptions.find((o) => o.value === fieldCategory)?.label
  const activeDegreeLabel = degreeOptions.find((o) => o.value === degreeLevel)?.label
  const activeFundingLabel = fundingOptions.find((o) => o.value === fundingType)?.label

  function FilterPanel({ compact }: { compact?: boolean }) {
    return (
      <div className={compact ? "space-y-5 p-4" : "space-y-5"}>
        <ScholarshipFilterDropdown
          label="Region"
          value={region}
          onChange={setFilterPageReset(setRegion)}
          placeholder="All regions"
          options={regionOptions}
          disabled={!regionOptions.length}
        />

        <ScholarshipFilterDropdown
          label="Degree level"
          value={degreeLevel}
          onChange={setFilterPageReset(setDegreeLevel)}
          placeholder="All degree levels"
          options={degreeOptions}
        />

        <ScholarshipFilterDropdown
          label="Field of study"
          value={fieldCategory}
          onChange={setFilterPageReset(setFieldCategory)}
          placeholder="All fields"
          options={fieldCategoryOptions}
          disabled={!fieldCategoryOptions.length}
        />

        <ScholarshipFilterDropdown
          label="Funding type"
          value={fundingType}
          onChange={setFilterPageReset(setFundingType)}
          placeholder="All funding types"
          options={fundingOptions}
          disabled={!fundingOptions.length}
        />

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
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-slate-100 text-slate-900">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 sm:px-6">
          <h1 className="min-w-0 truncate text-base font-semibold text-emerald-950 sm:text-lg">
            Browse Scholarships
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative shrink-0 space-y-4 sm:space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-4 py-5 shadow-sm shadow-emerald-900/5 sm:px-6 sm:py-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="border-l-4 border-emerald-500 pl-3 sm:pl-4">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Find your next scholarship
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Search verified opportunities and filter by country, degree, field of study, and funding.
              </p>
            </div>
          </div>

        <div className="rounded-2xl border border-emerald-100/80 bg-white p-3 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-50 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full min-w-0 lg:max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
            <Input
              value={qInput}
              onChange={(e) => {
                setPage(1)
                setQInput(e.target.value)
              }}
              placeholder="Search scholarships…"
              className="h-11 rounded-xl border-emerald-200 bg-white pl-9 text-base shadow-sm focus-visible:ring-emerald-500 sm:text-sm"
            />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden lg:block">
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
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-xl border-emerald-200 bg-white shadow-sm hover:bg-emerald-50 sm:flex-none lg:hidden"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex w-full max-w-sm flex-col gap-0 border-l border-emerald-100 p-0 sm:max-w-md"
                >
                  <SheetHeader className="shrink-0 border-b border-emerald-100 bg-emerald-50/50 px-4 py-4 text-left">
                    <SheetTitle className="text-emerald-950">Filters</SheetTitle>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-8">
                    <FilterPanel compact />
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                onClick={clearAll}
                className="hidden h-11 rounded-xl border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50 lg:inline-flex"
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
          </div>

        <div
          ref={contentScrollRef}
          className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-y-contain pb-6 lg:mt-5 lg:grid lg:grid-cols-[minmax(0,272px)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden"
        >
          {/* Desktop filters — independent scroll */}
          <aside className="hidden min-h-0 min-w-0 lg:flex lg:flex-col">
            <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader className="shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                    <Filter className="h-4 w-4" />
                  </span>
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
                <FilterPanel />
              </CardContent>
            </Card>
          </aside>

          {/* Results — independent scroll on desktop */}
          <section
            ref={resultsScrollRef}
            className="min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-y-contain lg:pr-1 [-webkit-overflow-scrolling:touch]"
          >
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 rounded-xl border border-emerald-100/80 bg-white px-3 py-3 shadow-sm ring-1 ring-emerald-100/60 sm:flex-row sm:items-center sm:justify-between sm:px-4">
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
              <div className="w-full lg:hidden">
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    setPage(1)
                    setSort(v as SortOption)
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-emerald-200 bg-white shadow-sm focus:ring-emerald-500 sm:w-48">
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
            {(region || fieldCategory || degreeLevel || fundingType) && (
              <div className="flex flex-wrap gap-2">
                {region && activeRegionLabel && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  >
                    {activeRegionLabel}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-emerald-100"
                      aria-label="Remove region filter"
                      onClick={() => {
                        setPage(1)
                        setRegion("")
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {degreeLevel && activeDegreeLabel && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-slate-200 bg-slate-50 text-slate-800"
                  >
                    {activeDegreeLabel}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-slate-100"
                      aria-label="Remove degree level filter"
                      onClick={() => {
                        setPage(1)
                        setDegreeLevel("")
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {fieldCategory && activeFieldLabel && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-teal-200 bg-teal-50/80 text-teal-900"
                  >
                    {activeFieldLabel}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-teal-100"
                      aria-label="Remove field of study filter"
                      onClick={() => {
                        setPage(1)
                        setFieldCategory("")
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {fundingType && activeFundingLabel && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  >
                    {activeFundingLabel}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-emerald-100"
                      aria-label="Remove funding type filter"
                      onClick={() => {
                        setPage(1)
                        setFundingType("")
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              <Button
                variant={applicationFilter === "all" ? "default" : "outline"}
                size="sm"
                className={`shrink-0 ${applicationFilter === "all" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}`}
                onClick={() => setApplicationFilter("all")}
              >
                All
              </Button>
              <Button
                variant={applicationFilter === "applied" ? "default" : "outline"}
                size="sm"
                className={`shrink-0 ${applicationFilter === "applied" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                onClick={() => setApplicationFilter("applied")}
              >
                Applied
              </Button>
              <Button
                variant={applicationFilter === "not_applied" ? "default" : "outline"}
                size="sm"
                className={`shrink-0 ${applicationFilter === "not_applied" ? "bg-teal-600 text-white hover:bg-teal-700" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                onClick={() => setApplicationFilter("not_applied")}
              >
                Not Applied
              </Button>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="rounded-2xl border-emerald-100/80 bg-white shadow-sm">
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
              <Empty className="rounded-2xl border border-emerald-100/80 bg-white/90">
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
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardContent className="space-y-3 p-4 sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
                            {s.title}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-500">
                            {[
                              s.organizationName,
                              s.country,
                              s.degreeLevel.replace("_", " "),
                              s.fieldOfStudy,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {formatScholarshipDateRange(s) ? (
                            <p className="mt-1 text-xs text-slate-600">{formatScholarshipDateRange(s)}</p>
                          ) : (
                            <p className="mt-1 text-xs text-slate-500">Dates not specified</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center justify-end sm:justify-start">
                          <ScholarshipBookmarkButton
                            scholarshipId={s.id}
                            isBookmarked={s.isBookmarked ?? false}
                            onBookmarkedChange={(next) =>
                              updateScholarshipBookmark(s.id, next)
                            }
                          />
                        </div>
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
                        {formatScholarshipDateRange(s) && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {formatScholarshipDateRange(s)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 w-full rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 sm:w-auto"
                          onClick={() => setViewScholarship(s)}
                        >
                          {t("View details")}
                        </Button>
                        <ScholarshipApplyButton
                          scholarship={s}
                          className="h-10 w-full rounded-md bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
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
              <div className="rounded-xl border border-emerald-100/80 bg-white px-2 py-3 shadow-sm ring-1 ring-emerald-100/60 sm:px-3">
                <Pagination className="mx-0 w-full justify-start overflow-x-auto overscroll-x-contain">
                  <PaginationContent className="flex-nowrap gap-0.5 sm:flex-wrap">
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

