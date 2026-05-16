"use client"

import {
  LayoutDashboard,
  Search,
  FileText,
  Users,
  Bookmark,
  Sparkles,
  MessageSquare,
  UserCircle2,
  Settings,
  FolderOpen,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react"

import Link from "next/link"
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
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
    [channels, channelId],
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
        toast({
          title: "Could not load messages",
          variant: "destructive",
        })
        return
      }
      setMessages(data.messages ?? [])
      setHasMore(data.pagination?.hasMore ?? false)
      setOldestCursor(data.pagination?.oldestCreatedAt ?? null)
      setLoadingMessages(false)
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
    },
    [router, toast],
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
      } catch {
        // ignore malformed
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
      const merged = [...older.filter((m) => !seen.has(m.id)), ...prev]
      return merged
    })
    setHasMore(data.pagination?.hasMore ?? false)
    setOldestCursor(data.pagination?.oldestCreatedAt ?? null)
    setLoadingMore(false)
  }

  async function sendMessage() {
    const text = draft.trim()
    if (!channelId || !text || sending) return
    setSending(true)
    const parentReply =
      replyTo && !replyTo.parentMessageId ? replyTo.id : undefined
    const { res, data, errorMessage } = await postCommunityMessage(
      channelId,
      text,
      parentReply,
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
    if (!reason || !reason.trim()) return
    const { res, errorMessage } = await reportCommunityMessage(m.id, reason.trim())
    if (!res.ok) {
      toast({ title: "Could not submit report", description: errorMessage || "Try again.", variant: "destructive" })
      return
    }
    toast({ title: "Report submitted", description: "Owner moderators will review this message." })
  }

  const canPost = me?.role === "student" || me?.role === "admin"

  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: false },
    { href: "/applications", label: "My Applications", icon: FileText, active: false },
    { href: "/community", label: "Community", icon: Users, active: true },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: false },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: false },
    { href: "/ai-chat", label: "AI Chatbot", icon: MessageSquare, active: false },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: false },
    { href: "/settings", label: "Settings", icon: Settings, active: false },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: false },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
            <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Student Portal</p>

          <nav className="flex flex-col gap-0.5">
            {sidebarLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.active
                      ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                      : "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
                  }
                >
                  <span
                    className={
                      item.active
                        ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"
                        : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.active ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                  ) : (
                    <span className="w-1.5 shrink-0" aria-hidden />
                  )}
                </Link>
              )
            })}
          </nav>
          <StudentPortalSidebarLogout tone="primary" className="mt-10 border-emerald-100/80" />
        </div>
      </aside>

<div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-emerald-950">Community</h1>
            <p className="text-xs text-slate-600">
              Peer tips, experiences, and constructive feedback — stay kind and on-topic.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {me?.role && (
              <Badge className="border-emerald-200 bg-emerald-50 capitalize text-emerald-800 ring-1 ring-emerald-100">
                {me.role}
              </Badge>
            )}
            <ProfileAvatarLink />
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="pointer-events-none absolute -left-20 top-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-32 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative border-b border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-4 py-5 shadow-sm shadow-emerald-900/5 md:px-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Community support</h2>
              <p className="mt-1 text-sm text-slate-600">
                Join a channel, share experiences, and help other students on their scholarship journey.
              </p>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">

          <div className="w-full shrink-0 border-b border-emerald-100/80 bg-white p-4 md:w-72 md:border-b-0 md:border-r md:bg-gradient-to-b md:from-white md:to-emerald-50/20">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700"><Users className="h-3.5 w-3.5" />Channels</p>
            {loadingChannels && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {!loadingChannels && (
              <>
                {channelsError ? (
                  <p className="text-sm text-destructive">{channelsError}</p>
                ) : channels.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No community channels found. Try running <code className="rounded bg-emerald-50 px-1 text-emerald-800">npm run migrate:community</code> again,
                    or reload the page.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {channels.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setChannelId(c.id)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2 text-left text-sm transition-all",
                            channelId === c.id
                              ? "bg-gradient-to-r from-emerald-50 to-teal-50 font-semibold text-emerald-800 ring-1 ring-emerald-200/80 shadow-sm"
                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
                          )}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.description && (
                            <span
                              className={cn(
                                "mt-0.5 block text-xs opacity-90",
                                channelId === c.id ? "text-emerald-700/90" : "text-slate-500",
                              )}
                            >
                              {c.description}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-slate-50/40">
            <div className="border-b border-emerald-100/80 bg-white px-4 py-3 shadow-sm">
              {selectedChannel ? (
                <>
                  <h2 className="font-semibold text-emerald-950">{selectedChannel.name}</h2>
                  {selectedChannel.description && (
                    <p className="text-sm text-slate-600">{selectedChannel.description}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">Select a channel to get started.</p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <div className="space-y-3 py-4">
                {hasMore && (
                  <div className="flex justify-center pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                      disabled={loadingMore || loadingMessages}
                      onClick={() => void loadOlder()}
                    >
                      {loadingMore ? "Loading…" : "Load earlier messages"}
                    </Button>
                  </div>
                )}

                {loadingMessages && (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                {!loadingMessages &&
                  messages.map((m) => (
                    <Card
                      key={m.id}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-shadow hover:shadow-md",
                        m.parentMessageId ? "ml-6 border-l-4 border-emerald-400/80" : "",
                      )}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500/80 to-teal-500/80" />
                      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
                        <Avatar className="h-9 w-9 ring-2 ring-emerald-100">
                          <AvatarFallback className="bg-emerald-50 text-xs font-medium text-teal-700">{initials(m.authorFullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-sm font-medium">{m.authorFullName}</CardTitle>
                            <span className="text-xs text-slate-500">
                              {new Date(m.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {m.parentMessageId && (
                            <CardDescription className="text-xs">Reply</CardDescription>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {!m.parentMessageId && canPost && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => setReplyTo(m)}
                              aria-label="Reply"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {me?.id === m.userId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => void removeMessage(m)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {me?.id !== m.userId && me?.role === "student" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => void reportMessage(m)}
                            >
                              Report
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                      </CardContent>
                    </Card>
                  ))}

                {!loadingMessages && channelId && messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No messages yet. Be the first to share a tip or ask a question.
                  </p>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t border-emerald-100/80 bg-white p-4 shadow-[0_-4px_24px_-8px_rgba(16,185,129,0.15)]">
              {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm">
                  <span className="truncate text-slate-600">
                    Replying to <strong>{replyTo.authorFullName}</strong>
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                    Cancel
                  </Button>
                </div>
              )}
              {!canPost && me && (
                <p className="mb-2 text-xs text-slate-500">
                  Community posting is available to students. Sign in with a student account to participate.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Textarea
                  placeholder={
                    canPost
                      ? "Share experience, ask for feedback, or offer guidance…"
                      : "Read-only for this account type."
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!canPost || !channelId || sending}
                  className="min-h-[88px] flex-1 resize-none rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                />
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 sm:mb-0.5"
                  disabled={!canPost || !channelId || sending || !draft.trim()}
                  onClick={() => void sendMessage()}
                >
                  {sending ? (
                    "Sending…"
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Tip: <kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">Enter</kbd>{" "}
                to send. Replies are one level deep.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
