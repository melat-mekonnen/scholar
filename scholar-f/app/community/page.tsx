"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MessageCircle, Send, Trash2 } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  deleteCommunityMessage,
  fetchCommunityChannels,
  fetchCommunityMessages,
  postCommunityMessage,
  type CommunityChannel,
  type CommunityMessage,
} from "@/lib/community"
import { clearToken, getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
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

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        "block text-sm font-medium hover:text-primary",
        active && "text-primary",
      )}
    >
      {children}
    </Link>
  )
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

  const canPost = me?.role === "student" || me?.role === "admin"

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-6 md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">Scholarship Portal</h2>
          <p className="mt-1 text-xs text-muted-foreground">Student community</p>
        </div>

        <nav className="space-y-3">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/scholarships">Browse Scholarships</NavLink>
          <NavLink href="/applications">My Applications</NavLink>
          <NavLink href="/community">Community</NavLink>
          <NavLink href="/saved">Saved Scholarships</NavLink>
          <NavLink href="/profile">Profile</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Community support</h1>
            <p className="text-xs text-muted-foreground">
              Peer tips, experiences, and constructive feedback — stay kind and on-topic.
            </p>
          </div>
          {me?.role && (
            <Badge variant="secondary" className="capitalize">
              {me.role}
            </Badge>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row md:gap-0 md:p-0">
          <div className="w-full shrink-0 border-b bg-muted/30 p-4 md:w-72 md:border-b-0 md:border-r">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Channels</p>
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
                  <p className="text-sm text-muted-foreground">
                    No community channels found. Try running <code>npm run migrate:community</code> again,
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
                            "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                            channelId === c.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.description && (
                            <span
                              className={cn(
                                "mt-0.5 block text-xs opacity-90",
                                channelId === c.id ? "text-primary-foreground/90" : "text-muted-foreground",
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

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b px-4 py-3">
              {selectedChannel ? (
                <>
                  <h2 className="font-semibold">{selectedChannel.name}</h2>
                  {selectedChannel.description && (
                    <p className="text-sm text-muted-foreground">{selectedChannel.description}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a channel to get started.</p>
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
                        "overflow-hidden",
                        m.parentMessageId ? "ml-6 border-l-2 border-primary/30" : "",
                      )}
                    >
                      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{initials(m.authorFullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-sm font-medium">{m.authorFullName}</CardTitle>
                            <span className="text-xs text-muted-foreground">
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
                              className="h-8 w-8"
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
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                      </CardContent>
                    </Card>
                  ))}

                {!loadingMessages && channelId && messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No messages yet. Be the first to share a tip or ask a question.
                  </p>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t bg-card p-4">
              {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    Replying to <strong>{replyTo.authorFullName}</strong>
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                    Cancel
                  </Button>
                </div>
              )}
              {!canPost && me && (
                <p className="mb-2 text-xs text-muted-foreground">
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
                  className="min-h-[88px] flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                />
                <Button
                  type="button"
                  className="sm:mb-0.5"
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
              <p className="mt-2 text-xs text-muted-foreground">
                Tip: <kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">Enter</kbd>{" "}
                to send. Replies are one level deep.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
