import { apiFetchJson } from "@/lib/api"

export type CommunityAttachment = {
  id: string
  messageId: string
  kind: "image" | "pdf" | "cv"
  originalName: string
  mimeType: string
  fileSize: number
  url: string
}

export type CommunityMessage = {
  id: string
  channelId: string
  userId: string
  parentMessageId: string | null
  body: string
  createdAt: string
  editedAt?: string | null
  authorFullName: string
  pinnedAt?: string | null
  attachments?: CommunityAttachment[]
}

export const COMMUNITY_MAX_FILES = 4
export const COMMUNITY_MAX_FILE_MB = 8
export const COMMUNITY_ACCEPT_FILES =
  ".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/gif"

export type CommunityChannel = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  isActive?: boolean
  createdAt?: string
  pinnedMessage?: CommunityMessage | null
}

export type ChannelsResponse = {
  channels: CommunityChannel[]
}

export type MessagesResponse = {
  channel: CommunityChannel
  messages: CommunityMessage[]
  pagination: {
    hasMore: boolean
    oldestCreatedAt: string | null
  }
}

export type PinResponse = {
  channelId: string
  pinnedMessage: CommunityMessage | null
}

export async function fetchCommunityChannels() {
  return apiFetchJson<ChannelsResponse>("/api/community/channels", {
    method: "GET",
    auth: true,
  })
}

export type MessageSearchResponse = {
  query: string
  messages: CommunityMessage[]
}

export async function searchCommunityMessages(channelId: string, query: string, limit = 30) {
  const q = query.trim()
  const params = new URLSearchParams({ q })
  if (limit != null) params.set("limit", String(limit))
  return apiFetchJson<MessageSearchResponse>(
    `/api/community/channels/${encodeURIComponent(channelId)}/messages/search?${params.toString()}`,
    { method: "GET", auth: true },
  )
}

export async function fetchCommunityMessages(
  channelId: string,
  options?: { before?: string | null; limit?: number },
) {
  const params = new URLSearchParams()
  if (options?.before) params.set("before", options.before)
  if (options?.limit != null) params.set("limit", String(options.limit))
  const q = params.toString()
  return apiFetchJson<MessagesResponse>(
    `/api/community/channels/${encodeURIComponent(channelId)}/messages${q ? `?${q}` : ""}`,
    { method: "GET", auth: true },
  )
}

export async function postCommunityMessage(
  channelId: string,
  body: string,
  parentMessageId?: string | null,
  files?: File[],
) {
  const form = new FormData()
  form.append("body", body)
  if (parentMessageId) form.append("parentMessageId", parentMessageId)
  for (const file of files ?? []) {
    form.append("files", file)
  }
  return apiFetchJson<CommunityMessage>(
    `/api/community/channels/${encodeURIComponent(channelId)}/messages`,
    {
      method: "POST",
      auth: true,
      body: form,
    },
  )
}

export async function deleteCommunityMessage(messageId: string) {
  return apiFetchJson<null>(`/api/community/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    auth: true,
  })
}

export async function updateCommunityMessage(messageId: string, body: string) {
  return apiFetchJson<CommunityMessage>(`/api/community/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  })
}

export async function pinCommunityMessage(channelId: string, messageId: string) {
  return apiFetchJson<PinResponse>(
    `/api/community/channels/${encodeURIComponent(channelId)}/pin/${encodeURIComponent(messageId)}`,
    { method: "PUT", auth: true },
  )
}

export async function unpinCommunityMessage(channelId: string) {
  return apiFetchJson<PinResponse>(
    `/api/community/channels/${encodeURIComponent(channelId)}/pin`,
    { method: "DELETE", auth: true },
  )
}

export async function hideCommunityMessage(messageId: string) {
  return apiFetchJson<{ id: string; channelId: string; isHidden: boolean }>(
    `/api/community/messages/${encodeURIComponent(messageId)}/hide`,
    { method: "PUT", auth: true },
  )
}

export async function reportCommunityMessage(messageId: string, reason: string) {
  return apiFetchJson<{ id: string; messageId: string; reason: string; status: string }>(
    `/api/community/messages/${encodeURIComponent(messageId)}/report`,
    {
      method: "POST",
      auth: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  )
}

export async function fetchOwnerCommunityChannels() {
  return apiFetchJson<ChannelsResponse>("/api/owner/community/channels", {
    method: "GET",
    auth: true,
  })
}

export async function createOwnerCommunityChannel(payload: {
  name: string
  slug?: string
  description?: string
  sortOrder?: number
}) {
  return apiFetchJson<CommunityChannel>("/api/owner/community/channels", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function updateOwnerCommunityChannel(
  channelId: string,
  payload: Partial<{
    name: string
    slug: string
    description: string
    sortOrder: number
    isActive: boolean
  }>,
) {
  return apiFetchJson<CommunityChannel>(`/api/owner/community/channels/${encodeURIComponent(channelId)}`, {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}
