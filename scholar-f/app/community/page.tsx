"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  deleteCommunityMessage,
  fetchCommunityChannels,
  fetchCommunityMessages,
  hideCommunityMessage,
  pinCommunityMessage,
  postCommunityMessage,
  reportCommunityMessage,
  unpinCommunityMessage,
  updateCommunityMessage,
  type CommunityChannel,
  type CommunityMessage,
} from "@/lib/community"
import { buildLinkShareMessage } from "@/lib/community-links"
import { clearToken, getToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { CommunityChat } from "@/components/student-portal/community-chat"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { Badge } from "@/components/ui/badge"

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<CommunityMessage | null>(null)
  const streamRef = useRef<EventSource | null>(null)

  function startEdit(message: CommunityMessage) {
    setEditingMessage(message)
    setReplyTo(null)
    setPendingFiles([])
    setDraft(message.body)
  }

  function cancelEdit() {
    setEditingMessage(null)
    setDraft("")
  }

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === channelId) ?? null,
    [channels, channelId],
  )

  const pinnedMessage = selectedChannel?.pinnedMessage ?? null
  const isModerator =
    me?.role === "admin" || me?.role === "manager" || me?.role === "owner"

  function updateChannelPin(cid: string, pinned: CommunityMessage | null) {
    setChannels((prev) =>
      prev.map((c) => (c.id === cid ? { ...c, pinnedMessage: pinned } : c)),
    )
  }

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
      if (data.channel?.id) {
        updateChannelPin(data.channel.id, data.channel.pinnedMessage ?? null)
      }
      setLoadingMessages(false)
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
    },
    [router, toast],
  )

  useEffect(() => {
    cancelEdit()
    setReplyTo(null)
    setPendingFiles([])
  }, [channelId])

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
      `/api/community/channels/${encodeURIComponent(channelId)}/stream?token=${encodeURIComponent(token)}`,
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
    source.addEventListener("message_deleted", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data) as { id: string }
        setMessages((prev) => prev.filter((m) => m.id !== payload.id))
        setChannels((prev) =>
          prev.map((c) =>
            c.pinnedMessage?.id === payload.id ? { ...c, pinnedMessage: null } : c,
          ),
        )
      } catch {
        /* ignore */
      }
    })
    source.addEventListener("message_hidden", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data) as { id: string }
        setMessages((prev) => prev.filter((m) => m.id !== payload.id))
        setChannels((prev) =>
          prev.map((c) =>
            c.pinnedMessage?.id === payload.id ? { ...c, pinnedMessage: null } : c,
          ),
        )
      } catch {
        /* ignore */
      }
    })
    source.addEventListener("pin_updated", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data) as {
          channelId: string
          pinnedMessage: CommunityMessage | null
        }
        updateChannelPin(payload.channelId, payload.pinnedMessage)
      } catch {
        /* ignore */
      }
    })
    source.addEventListener("message_updated", (evt) => {
      try {
        const msg = JSON.parse((evt as MessageEvent).data) as CommunityMessage
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
        setChannels((prev) =>
          prev.map((c) =>
            c.pinnedMessage?.id === msg.id ? { ...c, pinnedMessage: msg } : c,
          ),
        )
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

  async function shareLink(url: string, note: string) {
    if (!channelId || sending || editingMessage) return
    const text = buildLinkShareMessage(url, note)
    if (!text) {
      toast({ title: "Invalid link", variant: "destructive" })
      return
    }
    setSending(true)
    const parentReply = replyTo && !replyTo.parentMessageId ? replyTo.id : undefined
    const { res, data, errorMessage } = await postCommunityMessage(
      channelId,
      text,
      parentReply,
      [],
    )
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      setSending(false)
      return
    }
    if (!res.ok || !data) {
      setSending(false)
      toast({
        title: "Link not shared",
        description: errorMessage ?? "Please try again.",
        variant: "destructive",
      })
      return
    }
    setMessages((prev) => [...prev, data])
    setReplyTo(null)
    setSending(false)
    toast({ title: "Link shared" })
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  async function saveEdit() {
    const text = draft.trim()
    if (!editingMessage || sending || !text) return
    setSending(true)
    const { res, data, errorMessage } = await updateCommunityMessage(editingMessage.id, text)
    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      setSending(false)
      return
    }
    if (!res.ok || !data) {
      setSending(false)
      toast({
        title: "Edit not saved",
        description: errorMessage ?? "Please try again.",
        variant: "destructive",
      })
      return
    }
    setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)))
    setChannels((prev) =>
      prev.map((c) => (c.pinnedMessage?.id === data.id ? { ...c, pinnedMessage: data } : c)),
    )
    cancelEdit()
    setSending(false)
    toast({ title: "Message updated" })
  }

  async function sendMessage() {
    if (editingMessage) {
      await saveEdit()
      return
    }
    const text = draft.trim()
    if (!channelId || sending || (!text && pendingFiles.length === 0)) return
    setSending(true)
    const parentReply = replyTo && !replyTo.parentMessageId ? replyTo.id : undefined
    const { res, data, errorMessage } = await postCommunityMessage(
      channelId,
      text,
      parentReply,
      pendingFiles,
    )
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
    setPendingFiles([])
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
    if (pinnedMessage?.id === m.id && channelId) {
      updateChannelPin(channelId, null)
    }
  }

  async function hideMessage(m: CommunityMessage) {
    const { res } = await hideCommunityMessage(m.id)
    if (!res.ok) {
      toast({ title: "Could not remove message", variant: "destructive" })
      return
    }
    setMessages((prev) => prev.filter((x) => x.id !== m.id))
    if (pinnedMessage?.id === m.id && channelId) {
      updateChannelPin(channelId, null)
    }
    toast({ title: "Message removed", description: "Hidden from the channel for all members." })
  }

  async function pinMessage(m: CommunityMessage) {
    if (!channelId) return
    const { res, data } = await pinCommunityMessage(channelId, m.id)
    if (!res.ok || !data) {
      toast({ title: "Could not pin message", variant: "destructive" })
      return
    }
    updateChannelPin(channelId, data.pinnedMessage)
    toast({ title: "Message pinned", description: "Visible at the top of this channel." })
  }

  async function unpinMessage() {
    if (!channelId) return
    const { res, data } = await unpinCommunityMessage(channelId)
    if (!res.ok || !data) {
      toast({ title: "Could not unpin", variant: "destructive" })
      return
    }
    updateChannelPin(channelId, null)
    toast({ title: "Message unpinned" })
  }

  function copyMessage(text: string) {
    void navigator.clipboard.writeText(text).then(
      () => toast({ title: "Copied to clipboard" }),
      () => toast({ title: "Could not copy", variant: "destructive" }),
    )
  }

  function scrollToMessage(messageId: string) {
    document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  function jumpToMessage(message: CommunityMessage) {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    })
    requestAnimationFrame(() => {
      window.setTimeout(() => scrollToMessage(message.id), 80)
    })
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
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Portal</span>
          </Link>
          <div className="min-w-0 border-l border-emerald-100 pl-3">
            <h1 className="truncate text-lg font-semibold text-emerald-950">Community</h1>
            <p className="truncate text-xs text-slate-600">
              {loadingChannels
                ? "Loading channels…"
                : selectedChannel
                  ? selectedChannel.name
                  : `${channels.length} channel${channels.length === 1 ? "" : "s"} · live chat`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StudentLanguageToggle />
          {me?.role ? (
            <Badge className="hidden border-emerald-200 bg-emerald-50 capitalize text-emerald-800 ring-1 ring-emerald-100 sm:inline-flex">
              {me.role}
            </Badge>
          ) : null}
          <ProfileAvatarLink />
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
        <div className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-20 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-lg shadow-emerald-900/5 ring-1 ring-emerald-50">
          <div className="pointer-events-none h-1 shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500" />
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
                onRetryChannels={() => void loadChannels()}
                draft={draft}
                onDraftChange={setDraft}
                replyTo={replyTo}
                onReplyToChange={(m) => {
                  setReplyTo(m)
                  if (m) cancelEdit()
                }}
                editingMessage={editingMessage}
                onEdit={startEdit}
                onCancelEdit={cancelEdit}
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
                sending={sending}
                canPost={canPost}
                isModerator={isModerator}
                pinnedMessage={pinnedMessage}
                onSend={() => void sendMessage()}
                onCopy={copyMessage}
                onDelete={(m) => void removeMessage(m)}
                onReport={(m) => void reportMessage(m)}
                onPin={(m) => void pinMessage(m)}
                onUnpin={() => void unpinMessage()}
                onHide={(m) => void hideMessage(m)}
                onScrollToMessage={scrollToMessage}
                onJumpToMessage={jumpToMessage}
                onShareLink={(url, note) => void shareLink(url, note)}
                bottomRef={bottomRef}
              />
        </div>
      </main>
    </div>
  )
}
