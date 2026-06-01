import { apiFetchJson } from "@/lib/api"

export type FilterFacet = {
  value: string
  count: number
}

export function normalizeFilterFacets(
  items?: Array<string | FilterFacet> | null,
): FilterFacet[] {
  if (!items?.length) return []
  return items.map((item) =>
    typeof item === "string" ? { value: item, count: 0 } : item,
  )
}

export function formatFacetLabel(value: string, count: number): string {
  if (count > 0) return `${value} (${count.toLocaleString()})`
  return value
}

export function degreeLevelLabel(level: string): string {
  switch (level) {
    case "high_school":
      return "High school"
    case "bachelor":
      return "Bachelor"
    case "master":
      return "Master"
    case "phd":
      return "PhD"
    default:
      return level.replace(/_/g, " ")
  }
}

export function hostRegionLabel(region: string): string {
  switch (region.toLowerCase()) {
    case "united_kingdom":
      return "United Kingdom"
    case "north_america":
      return "North America"
    case "europe":
      return "Europe"
    case "africa":
      return "Africa"
    case "asia_pacific":
      return "Asia-Pacific"
    case "global":
      return "Global / multi-country"
    default:
      return region.replace(/_/g, " ")
  }
}

export function eligibleRegionLabel(region: string): string {
  switch (region.toLowerCase()) {
    case "africa":
      return "Africa"
    case "commonwealth":
      return "Commonwealth"
    case "developing":
      return "Developing countries"
    case "asia":
      return "Asia"
    default:
      return region.replace(/_/g, " ")
  }
}

export function availabilityFilterLabel(value: AvailabilityFilter): string {
  switch (value) {
    case "open":
      return "Open now"
    case "rolling":
      return "Rolling"
    case "closing_soon":
      return "Closing soon"
    default:
      return value
  }
}

export type AvailabilityFilter = "" | "open" | "rolling" | "closing_soon"

export type DegreeLevel = "high_school" | "bachelor" | "master" | "phd"

export type RecordType = "scholarship" | "study_programme"

export type DescriptionSection = {
  heading: string
  body: string
}

export type ScholarshipPublic = {
  id: string
  title: string
  recordType?: RecordType
  organizationName?: string
  country: string
  degreeLevel: DegreeLevel
  fieldOfStudy?: string
  fieldCategory?: string
  fundingType?: string
  deadline?: string
  startDate?: string
  endDate?: string
  isRolling?: boolean
  amount?: string
  description?: string
  descriptionEn?: string
  descriptionAm?: string
  applicationUrl?: string
  applicationStatus?: "open" | "closed" | "rolling" | "unknown"
  createdAt?: string
  updatedAt?: string
  /** Present when the student is logged in (from `is_bookmarked` / `isBookmarked`). */
  isBookmarked?: boolean
  bookmarkCount?: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  return t.length ? t : undefined
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v
  if (v === 1 || v === "1" || v === "true") return true
  if (v === 0 || v === "0" || v === "false") return false
  return undefined
}

/** Deadline badge/label for cards and detail (rolling vs fixed date). */
export function formatScholarshipDeadlineLabel(s: {
  deadline?: string
  endDate?: string
  isRolling?: boolean
}): string | null {
  if (s.isRolling && !s.deadline && !s.endDate) return "Open / rolling"
  if (s.endDate) return s.endDate
  if (s.deadline) return s.deadline
  if (s.isRolling) return "Open / rolling"
  return null
}

export type ScholarshipDateLine = {
  label: string
  value: string
  variant?: "start" | "deadline" | "rolling"
}

/** Structured date rows for card/detail components (not description text). */
export function getScholarshipDateLines(s: {
  deadline?: string
  endDate?: string
  startDate?: string
  isRolling?: boolean
}): ScholarshipDateLine[] {
  const lines: ScholarshipDateLine[] = []
  if (s.startDate) {
    lines.push({ label: "Opens", value: s.startDate, variant: "start" })
  }

  const deadlineLabel = formatScholarshipDeadlineLabel(s)
  if (deadlineLabel) {
    if (s.isRolling && !s.deadline && !s.endDate) {
      lines.push({ label: "Applications", value: deadlineLabel, variant: "rolling" })
    } else if (s.isRolling) {
      lines.push({ label: "Deadline", value: deadlineLabel, variant: "deadline" })
    } else {
      lines.push({ label: "Closes", value: deadlineLabel, variant: "deadline" })
    }
  }

  return lines
}

export function hasScholarshipDateInfo(s: {
  deadline?: string
  endDate?: string
  startDate?: string
  isRolling?: boolean
}): boolean {
  return Boolean(s.startDate || s.endDate || s.deadline || s.isRolling)
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v
  return undefined
}

/** Accepts camelCase or snake_case keys from the API. */
export function normalizeScholarship(raw: unknown): ScholarshipPublic {
  const r = isRecord(raw) ? raw : {}
  const dlRaw = r.degreeLevel ?? r.degree_level
  const dlNormalized =
    typeof dlRaw === "string"
      ? dlRaw.trim().toLowerCase() === "masters"
        ? "master"
        : dlRaw.trim().toLowerCase()
      : ""
  const dl =
    ["high_school", "bachelor", "master", "phd"].includes(dlNormalized)
      ? (dlNormalized as DegreeLevel)
      : "bachelor"

  const url =
    str(r.applicationUrl) ??
    str(r.application_url) ??
    str(r.applyUrl) ??
    str(r.apply_url) ??
    str(r.externalUrl) ??
    str(r.external_url)

  const isBookmarked =
    bool(r.isBookmarked) ?? bool(r.is_bookmarked) ?? undefined
  const bookmarkCount =
    num(r.bookmarkCount) ?? num(r.bookmark_count) ?? undefined

  const recordTypeRaw = r.recordType ?? r.record_type
  const recordType =
    recordTypeRaw === "study_programme" ? ("study_programme" as RecordType) : ("scholarship" as RecordType)

  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    recordType,
    organizationName: str(r.organizationName) ?? str(r.organization_name),
    country: String(r.country ?? ""),
    degreeLevel: dl,
    fieldOfStudy: str(r.fieldOfStudy) ?? str(r.field_of_study),
    fieldCategory: str(r.fieldCategory) ?? str(r.field_category),
    fundingType: str(r.fundingType) ?? str(r.funding_type),
    deadline: str(r.deadline),
    startDate:
      str(r.startDate) ??
      str(r.start_date) ??
      str(r.applicationStartDate) ??
      str(r.application_start_date),
    endDate:
      str(r.endDate) ??
      str(r.end_date) ??
      str(r.applicationEndDate) ??
      str(r.application_end_date),
    isRolling: bool(r.isRolling) ?? bool(r.is_rolling),
    amount: str(r.amount),
    description: str(r.description),
    descriptionEn: str(r.descriptionEn) ?? str(r.description_en),
    descriptionAm: str(r.descriptionAm) ?? str(r.description_am),
    applicationUrl: url,
    applicationStatus:
      r.applicationStatus === "open" ||
      r.applicationStatus === "closed" ||
      r.applicationStatus === "rolling" ||
      r.applicationStatus === "unknown"
        ? r.applicationStatus
        : r.application_status === "open" ||
            r.application_status === "closed" ||
            r.application_status === "rolling" ||
            r.application_status === "unknown"
          ? r.application_status
          : undefined,
    createdAt: str(r.createdAt) ?? str(r.created_at),
    updatedAt: str(r.updatedAt) ?? str(r.updated_at),
    ...(isBookmarked !== undefined ? { isBookmarked } : {}),
    ...(bookmarkCount !== undefined ? { bookmarkCount } : {}),
  }
}

export function getApplicationUrl(s: ScholarshipPublic): string | undefined {
  const u = s.applicationUrl?.trim()
  if (!u) return undefined
  const withScheme = /^https?:\/\//i.test(u) ? u : `https://${u}`
  return rewriteKnownApplyUrl(withScheme)
}

const DAAD_STABLE_BASE =
  "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database"

const DAAD_DETAIL_BY_LEGACY_PATH: Array<[RegExp, string]> = [
  [/\/in-region-scholarships\/?$/i, "10000486"],
  [/\/(development-related-postgraduate-courses-epos|epos)\/?$/i, "50076777"],
  [/\/research-grants\/?$/i, "57742121"],
  [/\/study-scholarships\/?$/i, "50026200"],
  [/\/study-stipends\/?$/i, "50035295"],
  [/\/graduate-schools\/?$/i, "57135739"],
  [/\/undergraduate-scholarships\/?$/i, "10000207"],
]

function rewriteKnownApplyUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  const host = parsed.hostname.toLowerCase()
  if (!host.endsWith("daad.de")) return url

  // Keep already-stable DAAD detail links as-is.
  if (
    host === "www2.daad.de" &&
    parsed.pathname.toLowerCase().includes("/stipendium/datenbank/") &&
    parsed.searchParams.has("detail")
  ) {
    return parsed.toString()
  }

  const path = parsed.pathname.toLowerCase().replace(/\/+$/, "")
  for (const [pattern, detailId] of DAAD_DETAIL_BY_LEGACY_PATH) {
    if (pattern.test(path)) {
      return `${DAAD_STABLE_BASE}/?detail=${detailId}`
    }
  }

  return url
}

/** Parse ## Section markdown from refined descriptions. */
export function parseDescriptionSections(description?: string): DescriptionSection[] {
  const text = String(description || "").trim()
  if (!text) return []

  const parts = text.split(/^##\s+/m).filter(Boolean)
  if (parts.length <= 1 && !text.startsWith("##")) {
    return [{ heading: "About", body: text }]
  }

  return parts.map((block) => {
    const nl = block.indexOf("\n")
    const heading = nl >= 0 ? block.slice(0, nl).trim() : block.trim()
    const body = nl >= 0 ? block.slice(nl + 1).trim() : ""
    return { heading, body }
  })
}

/** Hide date sections from prose — dates belong on cards, not in description body. */
export function filterDescriptionSectionsForDisplay(
  sections: DescriptionSection[],
): DescriptionSection[] {
  return sections.filter(
    (section) => !/^important dates$/i.test(section.heading.trim()),
  )
}

export function isStudyProgramme(s: Pick<ScholarshipPublic, "recordType" | "fundingType">): boolean {
  return s.recordType === "study_programme" || s.fundingType === "not_funded"
}

export function applicationStatusLabel(status?: string): string | null {
  if (!status) return null
  switch (status) {
    case "open":
      return "Applications open"
    case "closed":
      return "Applications closed"
    case "rolling":
      return "Rolling applications"
    case "unknown":
      return null
    default:
      return null
  }
}

export function fundingTypeLabel(fundingType?: string): string {
  if (!fundingType) return "—"
  if (fundingType === "not_funded") return "Fees apply"
  if (fundingType === "fully_funded") return "Fully funded"
  if (fundingType === "partially_funded") return "Partially funded"
  if (fundingType === "self_funded") return "Self funded"
  return fundingType.replace(/_/g, " ")
}

export function formatScholarshipMetaLine(
  t: (text: string) => string,
  s: Pick<
    ScholarshipPublic,
    "organizationName" | "country" | "degreeLevel" | "fieldCategory" | "fieldOfStudy"
  >,
): string {
  return [
    s.organizationName ? t(s.organizationName.trim()) : null,
    s.country ? t(s.country.trim()) : null,
    s.degreeLevel ? t(degreeLevelLabel(s.degreeLevel)) : null,
    s.fieldCategory
      ? t(fieldCategoryLabel(s.fieldCategory))
      : s.fieldOfStudy
        ? t(s.fieldOfStudy.trim())
        : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function translateFundingTypeLabel(
  t: (text: string) => string,
  fundingType?: string,
): string {
  return t(fundingTypeLabel(fundingType))
}

export type OpenScholarshipApplicationResult = "opened" | "no_url" | "blocked"

/** Open URL in a new tab; anchor fallback when pop-ups are blocked. */
function openUrlInNewTab(url: string): boolean {
  const opened = window.open(url, "_blank", "noopener,noreferrer")
  if (opened) return true

  try {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.target = "_blank"
    anchor.rel = "noopener noreferrer"
    anchor.click()
    return true
  } catch {
    return false
  }
}

/**
 * Opens the official application URL in a new tab.
 * If the list payload has no URL, tries GET `/api/scholarships/:id`.
 */
export async function openScholarshipApplication(
  s: ScholarshipPublic,
): Promise<OpenScholarshipApplicationResult> {
  let url = getApplicationUrl(s)

  if (!url && s.id) {
    const { res, data } = await apiFetchJson<unknown>(`/api/scholarships/${s.id}`, {
      method: "GET",
      auth: false,
    })
    if (res.ok && data) {
      url = getApplicationUrl(normalizeScholarship(data))
    }
  }

  if (!url) return "no_url"
  return openUrlInNewTab(url) ? "opened" : "blocked"
}

export function mergeScholarshipDetail(
  list: ScholarshipPublic,
  detail: ScholarshipPublic,
): ScholarshipPublic {
  return {
    ...list,
    ...detail,
    title: detail.title || list.title,
    organizationName: detail.organizationName ?? list.organizationName,
    country: detail.country || list.country,
    description: detail.description ?? list.description,
    applicationUrl: detail.applicationUrl ?? list.applicationUrl,
    fieldOfStudy: detail.fieldOfStudy ?? list.fieldOfStudy,
    fundingType: detail.fundingType ?? list.fundingType,
    deadline: detail.deadline ?? list.deadline,
    startDate: detail.startDate ?? list.startDate,
    endDate: detail.endDate ?? list.endDate,
    isRolling: detail.isRolling ?? list.isRolling,
    amount: detail.amount ?? list.amount,
    isBookmarked: detail.isBookmarked ?? list.isBookmarked,
    bookmarkCount: detail.bookmarkCount ?? list.bookmarkCount,
  }
}
