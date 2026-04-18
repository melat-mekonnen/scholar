import { getToken } from "@/lib/auth"

/**
 * Empty = same-origin (`/api/...`), proxied to the backend by `next.config.mjs` rewrites (avoids CORS in dev).
 * Set `NEXT_PUBLIC_API_BASE_URL` when the API is on another origin (e.g. production).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

type Json = Record<string, unknown> | unknown[] | null

async function parseJsonSafe(res: Response): Promise<Json> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as Json
  } catch {
    return null
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`
  const token = init.auth === false ? null : getToken()
  const headers = new Headers(init.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, {
    ...init,
    headers,
  })
}

export async function apiFetchJson<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<{ res: Response; data: T | null; errorMessage: string | null }> {
  const res = await apiFetch(path, init)
  const data = (await parseJsonSafe(res)) as T | null
  const errorMessage =
    res.ok ? null : (data as any)?.message ?? res.statusText ?? "Request failed"
  return { res, data, errorMessage }
}

