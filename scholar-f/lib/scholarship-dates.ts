/** Parse API date strings (YYYY-MM-DD or ISO datetime) for display. */
export function parseScholarshipDate(value?: string): Date | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDay) {
    const y = Number(isoDay[1])
    const m = Number(isoDay[2])
    const d = Number(isoDay[3])
    const date = new Date(y, m - 1, d)
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return date
    }
    return null
  }
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Normalize to YYYY-MM-DD when possible. */
export function normalizeScholarshipDateField(value?: string): string | undefined {
  const raw = String(value ?? "").trim()
  if (!raw) return undefined
  const isoDay = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDay) return isoDay[1]
  const parsed = parseScholarshipDate(raw)
  if (!parsed) return raw
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, "0")
  const d = String(parsed.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function formatScholarshipDateDisplay(
  value?: string,
  locale = "en-US",
): string | null {
  const parsed = parseScholarshipDate(value)
  if (!parsed) return null
  return parsed.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export type ScholarshipTimelineItem = {
  id: string
  label: string
  value: string
  hint?: string
}

export function getScholarshipTimeline(s: {
  startDate?: string
  endDate?: string
  deadline?: string
  isRolling?: boolean
}): ScholarshipTimelineItem[] {
  const closeRaw = s.endDate || s.deadline
  const items: ScholarshipTimelineItem[] = []

  const open = formatScholarshipDateDisplay(s.startDate)
  if (open) {
    items.push({ id: "open", label: "Applications open", value: open })
  }

  const close = formatScholarshipDateDisplay(closeRaw)
  if (close) {
    items.push({ id: "close", label: "Applications close", value: close })
  }

  if (s.isRolling && !close) {
    items.push({
      id: "rolling",
      label: "Application window",
      value: "Rolling intake",
      hint: "No fixed close date — confirm the current cycle on the official site.",
    })
  } else if (s.isRolling && close) {
    items.push({
      id: "rolling-note",
      label: "Intake",
      value: "May accept late applications",
      hint: "Listed as rolling; verify deadlines on the official site.",
    })
  }

  return items
}

/** User-facing deadline label for cards and badges. */
export function formatScholarshipDeadlineLabel(s: {
  deadline?: string
  endDate?: string
  isRolling?: boolean
}): string | null {
  const closeRaw = s.endDate || s.deadline
  const close = formatScholarshipDateDisplay(closeRaw)

  if (close) {
    return s.isRolling ? `Closes ${close} (rolling)` : `Closes ${close}`
  }

  if (s.isRolling) return "Open — rolling intake"
  return null
}

/** Combined open–close label for cards, e.g. "September 1, 2025 – December 15, 2025". */
export function formatScholarshipDateRange(s: {
  startDate?: string
  endDate?: string
  deadline?: string
  isRolling?: boolean
}): string | null {
  const open = formatScholarshipDateDisplay(s.startDate)
  const close = formatScholarshipDateDisplay(s.endDate || s.deadline)

  if (open && close) return `${open} – ${close}`
  if (open) return `Opens ${open}`
  if (close) return s.isRolling ? `Closes ${close} (rolling)` : `Closes ${close}`
  if (s.isRolling) return "Open — rolling intake"
  return null
}

const ISO_DATE_IN_TEXT = /\b(\d{4}-\d{2}-\d{2})(?:T[\d:.]+Z?)?\b/g

/** Replace raw ISO dates in description copy with readable dates. */
export function humanizeIsoDatesInText(text: string, locale = "en-US"): string {
  return text.replace(ISO_DATE_IN_TEXT, (match) => {
    return formatScholarshipDateDisplay(match, locale) ?? match
  })
}

export function formatScholarshipDeadlineShort(s: {
  deadline?: string
  endDate?: string
  isRolling?: boolean
}): string | null {
  const closeRaw = s.endDate || s.deadline
  const close = formatScholarshipDateDisplay(closeRaw, "en-US")
  if (close) return close
  if (s.isRolling) return "Rolling"
  return null
}
