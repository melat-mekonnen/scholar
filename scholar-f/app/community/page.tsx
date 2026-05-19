"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import {
  deleteCommunityMessage,
  fetchCommunityChannels,
  fetchCommunityMessages,
  postCommunityMessage,
  reportCommunityMessage,
  type CommunityChannel,
  type CommunityMessage,
} from "@/lib/community"
import { clearToken, getToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { StudentPortalShell } from "@/components/student-portal/student-portal-shell"
import { CommunityChat } from "@/components/student-portal/community-chat"

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

export default function CommunityPage() {
  const router = useRouter()
  const { toast } = useToast()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const [me, setMe] = useState<MeResponse | null>(null)
  const [channels, setChannels] = useState<CommunityChannel[]>([])
  const [channelId, setChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [oldestCursor, setOldestCursor] = useState<string | null>(null)
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [channelsError, setChannelsError] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState("")
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null)
  const streamRef = useRef<EventSource | null>(null)

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === channelId) ?? null,
    [channels, channelId]
  )

  useEffect(() => {
    if (!getToken()) {
      router.replace("/signin")
    }
  }, [router])

  useEffect(() => {
    async function loadMe() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET", auth: true })
      if (res.ok && data) setMe(data)
    }
    void loadMe()
  }, [])

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true)
    setChannelsError(null)
    const { res, data } = await fetchCommunityChannels()
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!res.ok || !data) {
      setLoadingChannels(false)
      setChannelsError("Could not load community channels.")
      toast({
        title: "Could not load community",
        description: "Try again in a moment.",
        variant: "destructive",
      })
      return
    }
    setChannels(data.channels ?? [])
    setChannelId((prev) => {
      if (prev && data.channels?.some((c) => c.id === prev)) return prev
      const fromUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("channel")
          : null
      if (fromUrl && data.channels?.some((c) => c.id === fromUrl)) return fromUrl
      return data.channels?.[0]?.id ?? null
    })
    setLoadingChannels(false)
  }, [router, toast])

  useEffect(() => {
    void loadChannels()
  }, [loadChannels])

  const loadMessagesFirst = useCallback(
    async (cid: string) => {
      setLoadingMessages(true)
      setMessages([])
      setOldestCursor(null)
      setHasMore(false)
      const { res, data } = await fetchCommunityMessages(cid, { limit: 50 })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data) {
        setLoadingMessages(false)
        toast({ title: "Could not load messages", variant: "destructive" })
        return
      }
      setMessages(data.messages ?? [])
      setHasMore(data.pagination?.hasMore ?? false)
      setOldestCursor(data.pagination?.oldestCreatedAt ?? null)
      setLoadingMessages(false)
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
    },
    [router, toast]
  )

  useEffect(() => {
    if (channelId) {
      void loadMessagesFirst(channelId)
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href)
        u.searchParams.set("channel", channelId)
        router.replace(`${u.pathname}?${u.searchParams.toString()}`, { scroll: false })
      }
    }
  }, [channelId, loadMessagesFirst, router])

  useEffect(() => {
    if (!channelId) return
    if (streamRef.current) {
      streamRef.current.close()
      streamRef.current = null
    }
    const token = getToken()
    if (!token) return
    const source = new EventSource(
      `/api/community/channels/${encodeURIComponent(channelId)}/stream?token=${encodeURIComponent(token)}`
    )
    source.addEventListener("message_created", (evt) => {
      try {
        const msg = JSON.parse((evt as MessageEvent).data) as CommunityMessage
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
      } catch {
        /* ignore */
      }
    })
    streamRef.current = source
    return () => {
      source.close()
      if (streamRef.current === source) streamRef.current = null
    }
  }, [channelId])

  async function loadOlder() {
    if (!channelId || !oldestCursor || loadingMore) return
    setLoadingMore(true)
    const { res, data } = await fetchCommunityMessages(channelId, {
      before: oldestCursor,
      limit: 50,
    })
    if (!res.ok || !data) {
      setLoadingMore(false)
      return
    }
    const older = data.messages ?? []
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id))
      return [...older.filter((m) => !seen.has(m.id)), ...prev]
    })
    setHasMore(data.pagination?.hasMore ?? false)
    setOldestCursor(data.pagination?.oldestCreatedAt ?? null)
    setLoadingMore(false)
  }

  async function sendMessage() {
    const text = draft.trim()
    if (!channelId || !text || sending) return
    setSending(true)
    const parentReply = replyTo && !replyTo.parentMessageId ? replyTo.id : undefined
    const { res, data, errorMessage } = await postCommunityMessage(channelId, text, parentReply)
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      setSending(false)
      return
    }
    if (!res.ok || !data) {
      setSending(false)
      toast({
        title: "Message not sent",
        description: errorMessage ?? "Please try again.",
        variant: "destructive",
      })
      return
    }
    setMessages((prev) => [...prev, data])
    setDraft("")
    setReplyTo(null)
    setSending(false)
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  async function removeMessage(m: CommunityMessage) {
    if (!me || m.userId !== me.id) return
    const { res } = await deleteCommunityMessage(m.id)
    if (res.status === 401) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!res.ok) {
      toast({ title: "Could not delete", variant: "destructive" })
      return
    }
    setMessages((prev) => prev.filter((x) => x.id !== m.id))
  }

  async function reportMessage(m: CommunityMessage) {
    const reason = window.prompt("Why are you reporting this message?")
    if (!reason?.trim()) return
    const { res, errorMessage } = await reportCommunityMessage(m.id, reason.trim())
    if (!res.ok) {
      toast({
        title: "Could not submit report",
        description: errorMessage || "Try again.",
        variant: "destructive",
      })
      return
    }
    toast({ title: "Report submitted", description: "Moderators will review this message." })
  }

  const canPost = me?.role === "student" || me?.role === "admin"

  return (
    <StudentPortalShell
      title="Community"
      subtitle="Peer tips, experiences, and constructive feedback — stay kind and on-topic."
      role={me?.role}
      mainClassName="flex min-h-0 flex-1 flex-col p-0"
      showFooter={false}
    >
      <CommunityChat
        channels={channels}
        channelId={channelId}
        onChannelSelect={setChannelId}
        selectedChannel={selectedChannel}
        messages={messages}
        meId={me?.id ?? null}
        loadingChannels={loadingChannels}
        loadingMessages={loadingMessages}
        channelsError={channelsError}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadOlder={() => void loadOlder()}
        draft={draft}
        onDraftChange={setDraft}
        replyTo={replyTo}
        onReplyToChange={setReplyTo}
        sending={sending}
        canPost={canPost}
        onSend={() => void sendMessage()}
        onDelete={(m) => void removeMessage(m)}
        onReport={(m) => void reportMessage(m)}
        bottomRef={bottomRef}
      />
    </StudentPortalShell>
  )
}
