const URL_IN_TEXT =
  /https?:\/\/[^\s<>"']+/gi

export function normalizeShareUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.href
  } catch {
    return null
  }
}

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_IN_TEXT)
  return matches ? [...new Set(matches)] : []
}

export function buildLinkShareMessage(url: string, note?: string): string {
  const normalized = normalizeShareUrl(url)
  if (!normalized) return ""
  const trimmedNote = note?.trim()
  return trimmedNote ? `${trimmedNote}\n${normalized}` : normalized
}

export function getPrimaryUrl(text: string): string | null {
  const urls = extractUrls(text)
  return urls[0] ?? null
}

export function getLinkShareNote(text: string, url: string): string | null {
  const note = text.replace(url, "").trim()
  return note.length > 0 ? note : null
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
