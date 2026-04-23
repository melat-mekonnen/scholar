import { apiFetchJson } from "@/lib/api"

export type DegreeLevel = "high_school" | "bachelor" | "master" | "phd"

export type ScholarshipPublic = {
  id: string
  title: string
  organizationName?: string
  country: string
  degreeLevel: DegreeLevel
  fieldOfStudy?: string
  fundingType?: string
  deadline?: string
  startDate?: string
  endDate?: string
  amount?: string
  description?: string
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
  return undefined
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v
  return undefined
}

/** Accepts camelCase or snake_case keys from the API. */
export function normalizeScholarship(raw: unknown): ScholarshipPublic {
  const r = isRecord(raw) ? raw : {}
  const dlRaw = r.degreeLevel ?? r.degree_level
  const dl =
    typeof dlRaw === "string" && ["high_school", "bachelor", "master", "phd"].includes(dlRaw)
      ? (dlRaw as DegreeLevel)
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

  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
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
      str(r.application_end_date) ??
      str(r.deadline),
    amount: str(r.amount),
    description: str(r.description),
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

/**
 * Opens the official application URL in a new tab.
 * If the list payload has no URL, tries GET `/api/scholarships/:id`.
 */
export async function openScholarshipApplication(
  s: ScholarshipPublic,
): Promise<boolean> {
  const popup = window.open("", "_blank", "noopener,noreferrer")
  if (!popup) return false

  const direct = getApplicationUrl(s)
  if (direct) {
    popup.location.href = direct
    return true
  }
  if (!s.id) {
    popup.close()
    return false
  }
  const { res, data } = await apiFetchJson<unknown>(`/api/scholarships/${s.id}`, {
    method: "GET",
    auth: false,
  })
  if (!res.ok || !data) {
    popup.close()
    return false
  }
  const url = getApplicationUrl(normalizeScholarship(data))
  if (!url) {
    popup.close()
    return false
  }
  popup.location.href = url
  return true
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
    amount: detail.amount ?? list.amount,
    isBookmarked: detail.isBookmarked ?? list.isBookmarked,
    bookmarkCount: detail.bookmarkCount ?? list.bookmarkCount,
  }
}
