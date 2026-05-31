import { apiFetchJson } from "@/lib/api"

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
    createdAt: str(r.createdAt) ?? str(r.created_at),
    updatedAt: str(r.updatedAt) ?? str(r.updated_at),
    ...(isBookmarked !== undefined ? { isBookmarked } : {}),
    ...(bookmarkCount !== undefined ? { bookmarkCount } : {}),
  }
}

export function getApplicationUrl(s: ScholarshipPublic): string | undefined {
  const u = s.applicationUrl?.trim()
  if (!u) return undefined
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}

/** Parse ## Section markdown from refined descriptions. */
export function parseDescriptionSections(description?: string): DescriptionSection[] {
  const text = String(description || "").trim()
  if (!text) return []

  const parts = text.split(/^##\s+/m).filter(Boolean)
  if (parts.length <= 1 && !text.startsWith("##")) {
    return [{ heading: "Overview", body: text }]
  }

  return parts.map((block) => {
    const nl = block.indexOf("\n")
    const heading = nl >= 0 ? block.slice(0, nl).trim() : block.trim()
    const body = nl >= 0 ? block.slice(nl + 1).trim() : ""
    return { heading, body }
  })
}

function normalizeUrlForCompare(url: string): string {
  try {
    const u = new URL(url.trim())
    return `${u.origin}${u.pathname}`.replace(/\/+$/, "").toLowerCase()
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase()
  }
}

/** Host label for apply links (e.g. warwick.ac.uk). */
export function getApplicationUrlHost(url?: string): string | undefined {
  const u = url?.trim()
  if (!u) return undefined
  try {
    return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./i, "")
  } catch {
    return undefined
  }
}

/** Remove boilerplate URLs from description text when Apply already provides the link. */
export function stripRedundantDescriptionUrls(text: string, applyUrl?: string): string {
  let t = String(text || "").trim()
  if (!t) return ""

  const applyNorm = applyUrl ? normalizeUrlForCompare(applyUrl) : null

  const trailingPatterns = [
    /Official course page:\s*https?:\/\/\S+/gi,
    /Course page:\s*https?:\/\/\S+/gi,
    /Official scheme:[^\n]*https?:\/\/\S+/gi,
    /Apply via the official page:\s*https?:\/\/\S+/gi,
    /Use the official course page[^\n]*https?:\/\/\S+/gi,
  ]
  for (const pattern of trailingPatterns) {
    t = t.replace(pattern, "").trim()
  }

  const lines = t
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return true
      const bare = line.replace(/^[-*•]\s+/, "").trim()
      if (!/^https?:\/\//i.test(bare)) return true
      if (applyNorm && normalizeUrlForCompare(bare) === applyNorm) return false
      return true
    })

  t = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return t
}

function isOfficialLinksOnlySection(body: string, applyUrl?: string): boolean {
  if (!applyUrl) return false
  const applyNorm = normalizeUrlForCompare(applyUrl)
  const lines = body
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean)
  if (!lines.length) return true
  return lines.every((line) => normalizeUrlForCompare(line) === applyNorm)
}

/** Sections ready for the detail UI (no duplicate apply URLs). */
export function prepareDescriptionSections(
  description?: string,
  applyUrl?: string,
): DescriptionSection[] {
  const apply = applyUrl?.trim()
    ? getApplicationUrl({ id: "", title: "", country: "", degreeLevel: "bachelor", applicationUrl: applyUrl })
    : undefined

  return parseDescriptionSections(description)
    .map((section) => ({
      heading: section.heading,
      body: stripRedundantDescriptionUrls(section.body, apply),
    }))
    .filter((section) => {
      if (!section.body.trim()) return false
      if (section.heading.toLowerCase() === "official links" && isOfficialLinksOnlySection(section.body, apply)) {
        return false
      }
      if (section.heading.toLowerCase() === "how to apply" && isOfficialLinksOnlySection(section.body, apply)) {
        return false
      }
      return true
    })
}

export function degreeLevelLabel(degreeLevel?: string): string {
  if (!degreeLevel) return "—"
  const normalized =
    degreeLevel.trim().toLowerCase() === "masters" ? "master" : degreeLevel.trim().toLowerCase()
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isStudyProgramme(s: Pick<ScholarshipPublic, "recordType" | "fundingType">): boolean {
  return s.recordType === "study_programme" || s.fundingType === "not_funded"
}

export function fundingTypeLabel(fundingType?: string): string {
  if (!fundingType) return "—"
  if (fundingType === "not_funded") return "Fees apply"
  return fundingType.replace(/_/g, " ")
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
