import { apiFetchJson } from "@/lib/api"

export type BookmarksListResponse = {
  results?: unknown[]
  scholarships?: unknown[]
  total?: number
  page?: number
  limit?: number
}

/**
 * POST /api/scholarships/:id/bookmark — expect 201 on success, 409 if duplicate.
 */
export async function addBookmark(scholarshipId: string) {
  return apiFetchJson<unknown>(`/api/scholarships/${scholarshipId}/bookmark`, {
    method: "POST",
  })
}

/**
 * DELETE /api/scholarships/:id/bookmark — expect 204 on success, 404 if not bookmarked.
 */
export async function removeBookmark(scholarshipId: string) {
  return apiFetchJson<unknown>(`/api/scholarships/${scholarshipId}/bookmark`, {
    method: "DELETE",
  })
}

/**
 * GET /api/bookmarks — paginated saved scholarships for the current student.
 */
export async function fetchBookmarksPage(page: number, limit: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return apiFetchJson<BookmarksListResponse>(`/api/bookmarks?${params.toString()}`, {
    method: "GET",
  })
}
