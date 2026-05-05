import { apiFetchJson } from "@/lib/api"

export type CommunityChannel = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  createdAt?: string
}

export type CommunityMessage = {
  id: string
  channelId: string
  userId: string
  parentMessageId: string | null
  body: string
  createdAt: string
  authorFullName: string
}

export type ChannelsResponse = {
  channels: CommunityChannel[]
}

export type MessagesResponse = {
  channel: {
    id: string
    slug: string
    name: string
    description: string | null
  }
  messages: CommunityMessage[]
  pagination: {
    hasMore: boolean
    oldestCreatedAt: string | null
  }
}

export async function fetchCommunityChannels() {
  return apiFetchJson<ChannelsResponse>("/api/community/channels", {
    method: "GET",
    auth: true,
  })
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
) {
  return apiFetchJson<CommunityMessage>(`/api/community/channels/${encodeURIComponent(channelId)}/messages`, {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body,
      ...(parentMessageId ? { parentMessageId } : {}),
    }),
  })
}

export async function deleteCommunityMessage(messageId: string) {
  return apiFetchJson<null>(`/api/community/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    auth: true,
  })
}
