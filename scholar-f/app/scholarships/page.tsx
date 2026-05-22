"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
  fundingTypeLabel,
  hostRegionLabel,
  isStudyProgramme,
  normalizeFilterFacets,
  normalizeScholarship,
  translateFundingTypeLabel,
  type AvailabilityFilter,
  type DegreeLevel,
  type FilterFacet,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { getMyApplications } from "@/lib/applications"
import { ScholarshipApplyButton } from "@/components/scholarship-apply-button"
import { ScholarshipDates } from "@/components/scholarship-dates"
import { clearToken } from "@/lib/auth"
import { ScholarshipDetailDialog } from "@/components/scholarship-detail-dialog"
import { useStudentI18n } from "@/lib/student-i18n"
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type FiltersResponse = {
  hostRegions?: FilterFacet[]
  hostCountries?: FilterFacet[]
  eligibleRegions?: FilterFacet[]
  degreeLevels?: FilterFacet[]
  fieldCategories?: FilterFacet[]
  fieldsOfStudy?: FilterFacet[]
  fundingTypes?: FilterFacet[]
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

const SEARCH_DEBOUNCE_MS = 400
const SORT_OPTIONS: SortOption[] = [
  "relevance",
  "deadline_asc",
  "deadline_desc",
  "funding_amount",
  "recent",
]
const DEGREE_LEVEL_OPTIONS: DegreeLevel[] = ["high_school", "bachelor", "master", "phd"]
const FUNDING_TYPE_OPTIONS = ["fully_funded", "partially_funded", "self_funded"] as const
const HOST_REGION_SLUGS = new Set([
  "united_kingdom",
  "north_america",
  "europe",
  "africa",
  "asia_pacific",
  "global",
])
const FIELD_CATEGORY_SLUGS = new Set([
  "public_health",
  "international_development",
  "business",
  "data_science",
  "law",
  "education",
  "engineering",
  "research",
  "professional_development",
  "general",
])

function parseSortParam(value: string | null): SortOption {
  if (value && SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption
  }
  return "relevance"
}

function parseHostRegionParams(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter((value) => HOST_REGION_SLUGS.has(value))
}

function parseFieldCategoryParams(values: string[]): string[] {
  return values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => FIELD_CATEGORY_SLUGS.has(value))
}

function parseMultiParam(values: string[], allowed: Set<string>): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter((value) => allowed.has(value))
}

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function getPaginationPages(current: number, total: number, maxVisible = 7): number[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, current - half)
  let end = start + maxVisible - 1

  if (end > total) {
    end = total
    start = Math.max(1, end - maxVisible + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

const SHUFFLE_SEED_KEY = "scholarshipBrowseShuffleSeed"

function getBrowseShuffleSeed(): string {
  if (typeof window === "undefined") return "browse-default"
  let seed = sessionStorage.getItem(SHUFFLE_SEED_KEY)
  if (!seed || seed.length < 8) {
    seed = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(SHUFFLE_SEED_KEY, seed)
  }
  return seed
}

function sortOptionLabel(sort: SortOption): string {
  switch (sort) {
    case "relevance":
      return "Featured mix"
    case "deadline_asc":
      return "Deadline (soonest)"
    case "deadline_desc":
      return "Deadline (latest)"
    case "funding_amount":
      return "Funding amount"
    case "recent":
      return "Recently added"
    default:
      return sort
  }
}

function buildParams(options: {
  q: string
  hostRegions: string[]
  eligibleRegions: string[]
  availability: AvailabilityFilter
  fieldCategories: string[]
  degreeLevels: string[]
  fundingTypes: string[]
  deadlineFrom: string
  deadlineTo: string
  sort: SortOption
  page: number
  limit: number
  applicationFilter: ApplicationFilter
  lang: "en" | "am"
  shuffleSeed?: string
}) {
  const params = new URLSearchParams()
  if (options.q.trim()) params.set("q", options.q.trim())
  options.hostRegions.forEach((region) => params.append("host_region", region))
  options.eligibleRegions.forEach((r) => params.append("eligible_region", r))
  if (options.availability) params.set("availability", options.availability)
  options.fieldCategories.forEach((f) => params.append("field_category", f))
  options.degreeLevels.forEach((d) => params.append("degree_level", d))
  options.fundingTypes.forEach((f) => params.append("funding_type", f))
  if (options.deadlineFrom) params.set("deadline_from", options.deadlineFrom)
  if (options.deadlineTo) params.set("deadline_to", options.deadlineTo)
  params.set("sort", options.sort)
  params.set("page", String(options.page))
  params.set("limit", String(options.limit))
  if (options.sort === "relevance" && !options.q.trim() && options.shuffleSeed) {
    params.set("shuffle_seed", options.shuffleSeed)
  }
  if (options.applicationFilter !== "all") {
    params.set("application_filter", options.applicationFilter)
  }
  // Verified by default (backend may ignore, but keeps behavior explicit)
  params.set("status", "verified")
  params.set("lang", options.lang)
  return params
}

export default function ScholarshipsPage() {
  const router = useRouter()
  const { t, lang } = useStudentI18n()
  const { toast } = useToast()

  const [filters, setFilters] = useState<FiltersResponse | null>(null)

  const [urlSynced, setUrlSynced] = useState(false)

  const [qInput, setQInput] = useState("")
  const [q, setQ] = useState("")
  const [hostRegions, setHostRegions] = useState<string[]>([])
  const [eligibleRegions, setEligibleRegions] = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilityFilter>("")
  const [fieldCategories, setFieldCategories] = useState<string[]>([])
  const [degreeLevels, setDegreeLevels] = useState<string[]>([])
  const [fundingTypes, setFundingTypes] = useState<string[]>([])
  const [deadlineFrom, setDeadlineFrom] = useState("")
  const [deadlineTo, setDeadlineTo] = useState("")
  const [sort, setSort] = useState<SortOption>("relevance")
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(20)
  const [shuffleSeed] = useState(() =>
    typeof window !== "undefined" ? getBrowseShuffleSeed() : "browse-default",
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ScholarshipPublic[]>([])
  const [total, setTotal] = useState(0)
  const [viewScholarship, setViewScholarship] = useState<ScholarshipPublic | null>(null)
  const [submittedScholarshipIds, setSubmittedScholarshipIds] = useState<Set<string>>(new Set())
  const [pendingScholarshipIds, setPendingScholarshipIds] = useState<Set<string>>(new Set())
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>("all")
  const [canFilterApplications, setCanFilterApplications] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const paginationPages = useMemo(
    () => getPaginationPages(page, totalPages),
    [page, totalPages],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    const initialQ = sp.get("q") ?? ""
    setQInput(initialQ)
    setQ(initialQ)
    setHostRegions(parseHostRegionParams(sp.getAll("host_region")))
    setEligibleRegions(sp.getAll("eligible_region"))
    const initialFieldCategories = sp.getAll("field_category")
    const legacyFieldParams = sp.getAll("field_of_study")
    setFieldCategories(
      parseFieldCategoryParams(
        initialFieldCategories.length ? initialFieldCategories : legacyFieldParams,
      ),
    )
    const initialAvailability = sp.get("availability")
    if (initialAvailability === "open" || initialAvailability === "rolling" || initialAvailability === "closing_soon") {
      setAvailability(initialAvailability)
    } else {
      setAvailability("")
    }
    setDegreeLevels(parseMultiParam(sp.getAll("degree_level"), new Set(DEGREE_LEVEL_OPTIONS)))
    setFundingTypes(parseMultiParam(sp.getAll("funding_type"), new Set(FUNDING_TYPE_OPTIONS)))
    setDeadlineFrom(sp.get("deadline_from") ?? "")
    setDeadlineTo(sp.get("deadline_to") ?? "")
    setSort(parseSortParam(sp.get("sort")))
    setPage(Number(sp.get("page") ?? "1") || 1)
    setLimit(Number(sp.get("limit") ?? "20") || 20)
    const initialApplicationFilter = sp.get("application_filter")
    const loggedIn = Boolean(getToken())
    setCanFilterApplications(loggedIn)
    if (
      loggedIn &&
      (initialApplicationFilter === "applied" || initialApplicationFilter === "not_applied")
    ) {
      setApplicationFilter(initialApplicationFilter)
    } else {
      setApplicationFilter("all")
    }
    setUrlSynced(true)
  }, [])

  useEffect(() => {
    if (!urlSynced) return
    const timer = window.setTimeout(() => {
      setQ((prev) => {
        if (prev === qInput) return prev
        setPage(1)
        return qInput
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [qInput, urlSynced])

  // Load available filter options
  useEffect(() => {
    async function loadFilters() {
      const { res, data } = await apiFetchJson<FiltersResponse>("/api/scholarships/filters", {
        method: "GET",
        auth: false,
      })
      if (res.ok && data) {
        setFilters({
          hostRegions: normalizeFilterFacets(data.hostRegions),
          hostCountries: normalizeFilterFacets(data.hostCountries),
          eligibleRegions: normalizeFilterFacets(data.eligibleRegions),
          degreeLevels: normalizeFilterFacets(data.degreeLevels),
          fieldCategories: normalizeFilterFacets(data.fieldCategories ?? data.fieldsOfStudy),
          fieldsOfStudy: normalizeFilterFacets(data.fieldCategories ?? data.fieldsOfStudy),
          fundingTypes: normalizeFilterFacets(data.fundingTypes),
        })
      } else {
        setFilters({
          hostRegions: [],
          hostCountries: [],
          eligibleRegions: [],
          degreeLevels: [
            { value: "high_school", count: 0 },
            { value: "bachelor", count: 0 },
            { value: "master", count: 0 },
            { value: "phd", count: 0 },
          ],
          fieldsOfStudy: [],
          fieldCategories: [],
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
        hostRegions,
        eligibleRegions,
        availability,
        fieldCategories,
        degreeLevels,
        fundingTypes,
        deadlineFrom,
        deadlineTo,
        sort,
        page,
        limit,
        applicationFilter,
        lang,
        shuffleSeed,
      }),
    [
      q,
      hostRegions,
      eligibleRegions,
      availability,
      fieldCategories,
      degreeLevels,
      fundingTypes,
      deadlineFrom,
      deadlineTo,
      sort,
      page,
      limit,
      applicationFilter,
      lang,
      shuffleSeed,
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
        setError(errorMessage || t("Failed to load scholarships"))
        return
      }
      setResults((data.results ?? []).map((r) => normalizeScholarship(r)))
      setTotal(data.total ?? 0)
      setLoading(false)
    }
    search()
  }, [params, urlSynced])

  useEffect(() => {
    async function loadApplicationTracker() {
      const { res, data } = await getMyApplications()
      if (res.status === 401 || res.status === 403 || !res.ok || !data) return

      const submitted = new Set<string>()
      const pending = new Set<string>()
      for (const application of data.applications || []) {
        if (application.status === "submitted" || application.status === "accepted") {
          submitted.add(application.scholarshipId)
        } else if (application.status === "pending") {
          pending.add(application.scholarshipId)
        }
      }
      setSubmittedScholarshipIds(submitted)
      setPendingScholarshipIds(pending)
    }
    void loadApplicationTracker()
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
    setHostRegions([])
    setEligibleRegions([])
    setAvailability("")
    setFieldCategories([])
    setDegreeLevels([])
    setFundingTypes([])
    setDeadlineFrom("")
    setDeadlineTo("")
    setSort("relevance")
    setApplicationFilter("all")
    setPage(1)
  }

  function toggleAvailability(next: Exclude<AvailabilityFilter, "">) {
    setPage(1)
    setAvailability((prev) => (prev === next ? "" : next))
  }

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = []

    if (q.trim()) {
      chips.push({
        key: "q",
        label: `${t("Search")}: ${q.trim()}`,
        onRemove: () => {
          setQInput("")
          setQ("")
          setPage(1)
        },
      })
    }

    hostRegions.forEach((value) => {
      chips.push({
        key: `host-region-${value}`,
        label: `${t("Host region")}: ${t(hostRegionLabel(value))}`,
        onRemove: () => {
          setPage(1)
          setHostRegions((prev) => prev.filter((item) => item !== value))
        },
      })
    })

    eligibleRegions.forEach((value) => {
      chips.push({
        key: `eligible-region-${value}`,
        label: `${t("Eligible")}: ${t(eligibleRegionLabel(value))}`,
        onRemove: () => {
          setPage(1)
          setEligibleRegions((prev) => prev.filter((item) => item !== value))
        },
      })
    })

    if (availability) {
      chips.push({
        key: "availability",
        label: t(availabilityFilterLabel(availability)),
        onRemove: () => {
          setPage(1)
          setAvailability("")
        },
      })
    }

    degreeLevels.forEach((value) => {
      chips.push({
        key: `degree-${value}`,
        label: t(degreeLevelLabel(value)),
        onRemove: () => {
          setPage(1)
          setDegreeLevels((prev) => prev.filter((item) => item !== value))
        },
      })
    })

    fieldCategories.forEach((value) => {
      chips.push({
        key: `field-${value}`,
        label: t(fieldCategoryLabel(value)),
        onRemove: () => {
          setPage(1)
          setFieldCategories((prev) => prev.filter((item) => item !== value))
        },
      })
    })

    fundingTypes.forEach((value) => {
      chips.push({
        key: `funding-${value}`,
        label: t(fundingTypeLabel(value)),
        onRemove: () => {
          setPage(1)
          setFundingTypes((prev) => prev.filter((item) => item !== value))
        },
      })
    })

    if (deadlineFrom) {
      chips.push({
        key: "deadline-from",
        label: `${t("From")} ${deadlineFrom}`,
        onRemove: () => {
          setPage(1)
          setDeadlineFrom("")
        },
      })
    }

    if (deadlineTo) {
      chips.push({
        key: "deadline-to",
        label: `${t("To")} ${deadlineTo}`,
        onRemove: () => {
          setPage(1)
          setDeadlineTo("")
        },
      })
    }

    if (applicationFilter === "applied") {
      chips.push({
        key: "application-filter",
        label: t("Submitted"),
        onRemove: () => {
          setPage(1)
          setApplicationFilter("all")
        },
      })
    } else if (applicationFilter === "not_applied") {
      chips.push({
        key: "application-filter",
        label: t("Not submitted"),
        onRemove: () => {
          setPage(1)
          setApplicationFilter("all")
        },
      })
    }

    return chips
  }, [
    q,
    hostRegions,
    eligibleRegions,
    availability,
    degreeLevels,
    fieldCategories,
    fundingTypes,
    deadlineFrom,
    deadlineTo,
    applicationFilter,
    t,
  ])

  function setApplicationFilterAndSearch(next: ApplicationFilter) {
    if (next !== "all" && !canFilterApplications) {
      toast({
        title: t("Sign in required"),
        description: t("Sign in to filter scholarships by application status."),
      })
      return
    }
    setPage(1)
    setApplicationFilter(next)
  }

  function FilterPanel({ compact }: { compact?: boolean }) {
    const degreeOptions =
      filters?.degreeLevels?.length
        ? filters.degreeLevels
        : [
            { value: "high_school", count: 0 },
            { value: "bachelor", count: 0 },
            { value: "master", count: 0 },
            { value: "phd", count: 0 },
          ]

    const categoryOptions = filters?.fieldCategories ?? filters?.fieldsOfStudy ?? []
    const hostRegionOptions = filters?.hostRegions ?? []

    const defaultOpenSections = useMemo(() => {
      const open = ["availability"]
      if (hostRegions.length) open.push("host-region")
      if (eligibleRegions.length) open.push("eligible-regions")
      if (degreeLevels.length) open.push("degree-level")
      if (fieldCategories.length) open.push("field-of-study")
      if (fundingTypes.length) open.push("funding-type")
      if (deadlineFrom || deadlineTo) open.push("deadline")
      return open
      // eslint-disable-next-line react-hooks/exhaustive-deps -- accordion default only on first mount
    }, [])

    function renderSectionLabel(title: string, count?: number) {
      return (
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
          {title}
          {count ? (
            <Badge variant="secondary" className="rounded-full bg-emerald-100 px-1.5 py-0 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100">
              {count}
            </Badge>
          ) : null}
        </span>
      )
    }

    function renderFacetList(
      items: FilterFacet[],
      selected: string[],
      onToggle: (value: string) => void,
      labelFor: (value: string) => string,
      scrollable = true,
    ) {
      if (!items.length) {
        return <p className="text-xs text-slate-500">{t("No options match your search.")}</p>
      }

      return (
        <div
          className={
            scrollable
              ? "max-h-48 space-y-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]"
              : "space-y-1"
          }
        >
          {items.map((item) => (
            <label
              key={item.value}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-emerald-50"
            >
              <Checkbox
                checked={selected.includes(item.value)}
                onCheckedChange={() => onToggle(item.value)}
              />
              <span className="leading-snug">
                {formatFacetLabel(t(labelFor(item.value)), item.count)}
              </span>
            </label>
          ))}
        </div>
      )
    }

    return (
      <div className={compact ? "p-4" : ""}>
        <Accordion
          type="multiple"
          defaultValue={defaultOpenSections}
          className="w-full"
        >
          <AccordionItem value="availability" className="border-emerald-100">
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:text-teal-700">
              {renderSectionLabel(t("Availability"), availability ? 1 : undefined)}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {(["open", "rolling", "closing_soon"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={availability === value ? "default" : "outline"}
                    className={
                      availability === value
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50"
                    }
                    onClick={() => toggleAvailability(value)}
                  >
                    {t(availabilityFilterLabel(value))}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="host-region" className="border-emerald-100">
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:text-teal-700">
              {renderSectionLabel(t("Host region"), hostRegions.length || undefined)}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {hostRegionOptions.length ? (
                renderFacetList(
                  hostRegionOptions,
                  hostRegions,
                  (value) => {
                    setPage(1)
                    setHostRegions((prev) => toggleInList(prev, value))
                  },
                  (value) => t(hostRegionLabel(value)),
                  false,
                )
              ) : (
                <p className="text-xs text-slate-500">
                  {t("Host regions will appear when the backend returns filter options.")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="eligible-regions" className="border-emerald-100">
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:text-teal-700">
              {renderSectionLabel(t("Eligible regions"), eligibleRegions.length || undefined)}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {filters?.eligibleRegions?.length ? (
                renderFacetList(
                  filters.eligibleRegions,
                  eligibleRegions,
                  (value) => {
                    setPage(1)
                    setEligibleRegions((prev) => toggleInList(prev, value))
                  },
                  (value) => t(eligibleRegionLabel(value)),
                )
              ) : (
                <p className="text-xs text-slate-500">
                  {t("Eligible regions will appear when the backend returns filter options.")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="degree-level" className="border-emerald-100">
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:text-teal-700">
              {renderSectionLabel(t("Degree level"), degreeLevels.length || undefined)}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {renderFacetList(
                degreeOptions,
                degreeLevels,
                (value) => {
                  setPage(1)
                  setDegreeLevels((prev) => toggleInList(prev, value))
                },
                (value) => t(degreeLevelLabel(value)),
                false,
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="field-of-study" className="border-emerald-100">
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:text-teal-700">
              {renderSectionLabel(t("Field of study"), fieldCategories.length || undefined)}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {categoryOptions.length ? (
                renderFacetList(
                  categoryOptions,
                  fieldCategories,
                  (value) => {
                    setPage(1)
                    setFieldCategories((prev) => toggleInList(prev, value))
                  },
                  (value) => t(fieldCategoryLabel(value)),
                  false,
                )
              ) : (
                <p className="text-xs text-slate-500">
                  {t("Fields will appear when the backend returns filter options.")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="funding-type" className="border-emerald-100">
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:text-teal-700">
              {renderSectionLabel(t("Funding type"), fundingTypes.length || undefined)}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {filters?.fundingTypes?.length ? (
                renderFacetList(
                  filters.fundingTypes,
                  fundingTypes,
                  (value) => {
                    setPage(1)
                    setFundingTypes((prev) => toggleInList(prev, value))
                  },
                  (value) => t(fundingTypeLabel(value)),
                  false,
                )
              ) : (
                <p className="text-xs text-slate-500">
                  {t("Funding types will appear when the backend returns filter options.")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="deadline" className="border-emerald-100">
            <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:text-teal-700">
              {renderSectionLabel(
                t("Deadline"),
                deadlineFrom && deadlineTo ? 2 : deadlineFrom || deadlineTo ? 1 : undefined,
              )}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">{t("From")}</p>
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
                  <p className="text-xs text-slate-500">{t("To")}</p>
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="sticky bottom-0 mt-4 border-t border-emerald-100 bg-white pt-4 md:static md:border-0 md:bg-transparent md:pt-0">
          <Button variant="outline" className="h-10 w-full rounded-lg border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={clearAll}>
            {t("Clear filters")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <h1 className="text-lg font-semibold text-emerald-950">{t("Browse Scholarships")}</h1>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{t("Find your next scholarship")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("Search verified opportunities and filter by host region, eligibility, degree, field, and funding.")}
              </p>
            </div>
          </div>

        <div className="rounded-2xl border border-emerald-100/80 bg-white p-3 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
            <Input
              value={qInput}
              onChange={(e) => {
                setQInput(e.target.value)
              }}
              placeholder={t("Search by keyword (e.g. engineering, Germany, fully funded)")}
              className="h-11 rounded-xl border-emerald-200 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
            />
            </div>

            <div className="flex items-center gap-2">
              <div className="shrink-0">
                <Select
                  key={`sort-desktop-${lang}`}
                  value={sort}
                  onValueChange={(v) => {
                    setPage(1)
                    setSort(v as SortOption)
                  }}
                >
                  <SelectTrigger className="h-11 w-36 rounded-xl border-emerald-200 focus:ring-emerald-500 bg-white shadow-sm sm:w-56">
                    <SelectValue placeholder={t("Sort")}>{t(sortOptionLabel(sort))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(sortOptionLabel(option))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-xl border-emerald-200 bg-white shadow-sm hover:bg-emerald-50 md:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    {t("Filters")}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex h-full flex-col gap-0 overflow-hidden border-l border-emerald-100 p-0 sm:max-w-md">
                  <SheetHeader className="shrink-0 border-b border-emerald-100 bg-emerald-50/50 px-4 py-4">
                    <SheetTitle className="text-emerald-950">{t("Filters")}</SheetTitle>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                    <FilterPanel compact />
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                onClick={clearAll}
                className="hidden h-11 rounded-xl border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50 md:inline-flex"
              >
                <X className="h-4 w-4 mr-2" />
                {t("Reset")}
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          {/* Desktop filters */}
          <aside className="hidden md:block md:self-start">
            <Card className="relative rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-teal-700 ring-1 ring-emerald-100"><Filter className="h-4 w-4" /></span>{t("Filters")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FilterPanel />
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <section className="space-y-4">
            {activeFilterChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-100/60">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Active filters")}</span>
                {activeFilterChips.map((chip) => (
                  <Badge
                    key={chip.key}
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50 pr-1 text-emerald-900"
                  >
                    {chip.label}
                    <button
                      type="button"
                      aria-label={`Remove ${chip.label}`}
                      className="rounded-full p-0.5 hover:bg-emerald-100"
                      onClick={chip.onRemove}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-emerald-800 hover:bg-emerald-50"
                  onClick={clearAll}
                >
                  {t("Clear all")}
                </Button>
              </div>
            ) : null}
            {canFilterApplications ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={applicationFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className={applicationFilter === "all" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}
                  onClick={() => setApplicationFilterAndSearch("all")}
                >
                  {t("All")}
                </Button>
                <Button
                  variant={applicationFilter === "applied" ? "default" : "outline"}
                  size="sm"
                  className={applicationFilter === "applied" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-300 bg-white hover:bg-slate-50"}
                  onClick={() => setApplicationFilterAndSearch("applied")}
                >
                  {t("Submitted")}
                </Button>
                <Button
                  variant={applicationFilter === "not_applied" ? "default" : "outline"}
                  size="sm"
                  className={applicationFilter === "not_applied" ? "bg-teal-600 text-white hover:bg-teal-700" : "border-slate-300 bg-white hover:bg-slate-50"}
                  onClick={() => setApplicationFilterAndSearch("not_applied")}
                >
                  {t("Not submitted")}
                </Button>
              </div>
            ) : null}

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
            ) : results.length === 0 ? (
              <Empty className="rounded-2xl border border-emerald-100/80 bg-white/90">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-emerald-50 text-emerald-700">
                    <SearchIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>{t("No results")}</EmptyTitle>
                  <EmptyDescription>
                    {t("Try adjusting your filters or searching with different keywords.")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={clearAll}>
                    {t("Clear search & filters")}
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="grid gap-4">
                {results.map((s) => (
                  <Card
                    key={s.id}
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-slate-900 transition-colors group-hover:text-emerald-800">{s.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {s.organizationName ? `${s.organizationName} · ` : ""}
                            {s.country} · {s.degreeLevel.replace("_", " ")}
                            {s.fieldOfStudy ? ` · ${s.fieldOfStudy}` : ""}
                          </p>
                          <ScholarshipDates scholarship={s} className="mt-2" />
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
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                          {isStudyProgramme(s) ? t("Study programme") : t("Verified")}
                        </Badge>
                        {submittedScholarshipIds.has(s.id) && (
                          <Badge className="bg-teal-600 text-white">{t("Submitted")}</Badge>
                        )}
                        {!submittedScholarshipIds.has(s.id) && pendingScholarshipIds.has(s.id) && (
                          <Badge className="bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80">
                            {t("Pending")}
                          </Badge>
                        )}
                        {typeof s.bookmarkCount === "number" && s.bookmarkCount > 0 && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.bookmarkCount} {t("saved")}</Badge>
                        )}
                        {s.fundingType && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {translateFundingTypeLabel(t, s.fundingType)}
                          </Badge>
                        )}
                        {s.amount && <Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.amount}</Badge>}
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                          onClick={() => setViewScholarship(s)}
                        >
                          {t("View")}
                        </Button>
                        <ScholarshipApplyButton
                          scholarship={s}
                          className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          label={t("Apply")}
                          unavailableLabel={t("Apply (link unavailable)")}
                          onTracked={(id) =>
                            setPendingScholarshipIds((prev) => new Set(prev).add(id))
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
                        label={t("Previous")}
                        href="#"
                        className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                        onClick={(e) => {
                          e.preventDefault()
                          if (page > 1) setPage(page - 1)
                        }}
                      />
                    </PaginationItem>
                    {paginationPages.map((p) => (
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
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        label={t("Next")}
                        href="#"
                        className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                        onClick={(e) => {
                          e.preventDefault()
                          if (page < totalPages) setPage(page + 1)
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

