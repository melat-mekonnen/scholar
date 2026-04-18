export const TOKEN_STORAGE_KEY = "scholar_jwt"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export async function logoutFromServer() {
  if (typeof window === "undefined") return
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
  try {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    })
  } catch {
    // Ignore network issues; local logout should still proceed.
  }
}

