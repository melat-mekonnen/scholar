import { API_BASE_URL } from "@/lib/api"
import { getToken } from "@/lib/auth"

export function getCommunityAttachmentUrl(
  attachmentId: string,
  options?: { download?: boolean },
) {
  const params = new URLSearchParams()
  const token = getToken()
  if (token) params.set("token", token)
  if (options?.download) params.set("download", "1")
  const query = params.toString()
  const base = `${API_BASE_URL}/api/community/attachments/${encodeURIComponent(attachmentId)}`
  return query ? `${base}?${query}` : base
}
