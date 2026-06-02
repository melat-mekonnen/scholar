"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  BookOpen,
  ListChecks,
  MessageCircle,
  MessageSquareQuote,
  Link2,
  Paperclip,
  Pin,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react"

import type { CommunityChannel, CommunityMessage } from "@/lib/community"
import {
  COMMUNITY_ACCEPT_FILES,
  COMMUNITY_MAX_FILES,
  COMMUNITY_MAX_FILE_MB,
  searchCommunityMessages,
} from "@/lib/community"
import { CommunityMessageActions } from "@/components/student-portal/community-message-actions"
import { CommunityMessageAttachments } from "@/components/student-portal/community-message-attachments"
import { CommunityMessageBody } from "@/components/student-portal/community-message-body"
import { CommunityShareLinkDialog } from "@/components/student-portal/community-share-link-dialog"
import { cn } from "@/lib/utils"
import { inputSurface, outlineEmeraldButton, textMuted, textPrimary, textSubtle } from "@/lib/theme"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

const CHANNEL_META: Record<string, { icon: LucideIcon; gradient: string }> = {
  welcome: { icon: Sparkles, gradient: "from-violet-500 to-purple-600" },
  "application-steps": { icon: ListChecks, gradient: "from-blue-500 to-indigo-600" },
  experiences: { icon: BookOpen, gradient: "from-emerald-500 to-teal-600" },
  feedback: { icon: MessageSquareQuote, gradient: "from-amber-500 to-orange-600" },
}

function channelMeta(slug: string) {
  return (
    CHANNEL_META[slug] ?? {
      icon: Users,
      gradient: "from-emerald-500 to-teal-600",
    }
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatMessageTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatDateSeparator(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function sameDay(a: string, b: string) {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

type CommunityChatProps = {
  channels: CommunityChannel[]
  channelId: string | null
  onChannelSelect: (id: string) => void
  selectedChannel: CommunityChannel | null
  messages: CommunityMessage[]
  meId: string | null
  loadingChannels: boolean
  loadingMessages: boolean
  channelsError: string | null
  hasMore: boolean
  loadingMore: boolean
  onLoadOlder: () => void
  onRetryChannels?: () => void
  draft: string
  onDraftChange: (v: string) => void
  replyTo: CommunityMessage | null
  onReplyToChange: (m: CommunityMessage | null) => void
  editingMessage: CommunityMessage | null
  onEdit: (m: CommunityMessage) => void
  onCancelEdit: () => void
  pendingFiles: File[]
  onPendingFilesChange: (files: File[]) => void
  sending: boolean
  canPost: boolean
  isModerator: boolean
  pinnedMessage: CommunityMessage | null
  onSend: () => void
  onCopy: (text: string) => void
  onDelete: (m: CommunityMessage) => void
  onReport: (m: CommunityMessage) => void
  onPin: (m: CommunityMessage) => void
  onUnpin: () => void
  onHide: (m: CommunityMessage) => void
  onScrollToMessage?: (messageId: string) => void
  onJumpToMessage?: (message: CommunityMessage) => void
  onShareLink: (url: string, note: string) => void
  bottomRef: React.RefObject<HTMLDivElement | null>
}

export function CommunityChat({
  channels,
  channelId,
  onChannelSelect,
  selectedChannel,
  messages,
  meId,
  loadingChannels,
  loadingMessages,
  channelsError,
  hasMore,
  loadingMore,
  onLoadOlder,
  onRetryChannels,
  draft,
  onDraftChange,
  replyTo,
  onReplyToChange,
  editingMessage,
  onEdit,
  onCancelEdit,
  pendingFiles,
  onPendingFilesChange,
  sending,
  canPost,
  isModerator,
  pinnedMessage,
  onSend,
  onCopy,
  onDelete,
  onReport,
  onPin,
  onUnpin,
  onHide,
  onScrollToMessage,
  onJumpToMessage,
  onShareLink,
  bottomRef,
}: CommunityChatProps) {
  const [channelSearch, setChannelSearch] = useState("")
  const [messageSearchOpen, setMessageSearchOpen] = useState(false)
  const [messageQuery, setMessageQuery] = useState("")
  const [messageSearchLoading, setMessageSearchLoading] = useState(false)
  const [messageSearchResults, setMessageSearchResults] = useState<CommunityMessage[]>([])
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [shareLinkOpen, setShareLinkOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messageSearchInputRef = useRef<HTMLInputElement | null>(null)
  const isEditing = Boolean(editingMessage)
  const canSendMessage = isEditing
    ? Boolean(draft.trim())
    : Boolean(draft.trim() || pendingFiles.length)

  const filteredChannels = useMemo(() => {
    const q = channelSearch.trim().toLowerCase()
    if (!q) return channels
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    )
  }, [channels, channelSearch])

  useEffect(() => {
    setMessageSearchOpen(false)
    setMessageQuery("")
    setMessageSearchResults([])
  }, [channelId])

  useEffect(() => {
    if (!messageSearchOpen || !channelId) return
    const q = messageQuery.trim()
    if (q.length < 2) {
      setMessageSearchResults([])
      setMessageSearchLoading(false)
      return
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setMessageSearchLoading(true)
        const { res, data } = await searchCommunityMessages(channelId, q)
        setMessageSearchResults(res.ok && data ? data.messages : [])
        setMessageSearchLoading(false)
      })()
    }, 300)

    return () => window.clearTimeout(timer)
  }, [messageQuery, channelId, messageSearchOpen])

  useEffect(() => {
    if (messageSearchOpen) {
      requestAnimationFrame(() => messageSearchInputRef.current?.focus())
    }
  }, [messageSearchOpen])

  function toggleMessageSearch() {
    setMessageSearchOpen((open) => {
      if (open) {
        setMessageQuery("")
        setMessageSearchResults([])
      }
      return !open
    })
  }

  function selectSearchResult(message: CommunityMessage) {
    if (onJumpToMessage) {
      onJumpToMessage(message)
    } else {
      onScrollToMessage?.(message.id)
    }
    setMessageSearchOpen(false)
    setMessageQuery("")
    setMessageSearchResults([])
  }

  const lastPreviewByChannel = useMemo(() => {
    const map: Record<string, string> = {}
    if (channelId && messages.length > 0) {
      const last = messages[messages.length - 1]
      map[channelId] = `${last.authorFullName}: ${last.body.slice(0, 72)}${last.body.length > 72 ? "…" : ""}`
    }
    return map
  }, [channelId, messages])

  function selectChannel(id: string) {
    onChannelSelect(id)
    setMobileShowChat(true)
  }

  const selectedMeta = selectedChannel ? channelMeta(selectedChannel.slug) : null
  const SelectedIcon = selectedMeta?.icon ?? MessageCircle

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      {/* Channel sidebar */}
      <aside
        className={cn(
          "flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-r border-emerald-100/80 bg-slate-50/80 transition-colors duration-200 dark:border-border dark:bg-card md:w-[min(100%,360px)]",
          mobileShowChat && channelId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b border-emerald-100/70 bg-white px-4 py-4 dark:border-border dark:bg-card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-border">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-foreground">Channels</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {loadingChannels ? "Loading…" : `${channels.length} discussion topics`}
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
            <Input
              placeholder="Search channels…"
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="h-10 rounded-xl border-emerald-100/90 bg-white pl-9 text-sm shadow-sm focus-visible:ring-emerald-500/30 dark:border-border dark:bg-background"
            />
          </div>
        </div>

        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain p-2 [-webkit-overflow-scrolling:touch]">
          {loadingChannels &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-1 py-1">
                <Skeleton className="h-[4.5rem] w-full rounded-xl" />
              </li>
            ))}

          {!loadingChannels && channelsError && (
            <li className="m-2 rounded-xl border border-red-100 bg-red-50/80 p-4 text-center">
              <p className="text-sm font-medium text-red-800">{channelsError}</p>
              {onRetryChannels ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 border-red-200 text-red-800 hover:bg-red-100"
                  onClick={onRetryChannels}
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Try again
                </Button>
              ) : null}
            </li>
          )}

          {!loadingChannels &&
            !channelsError &&
            filteredChannels.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">No channels match your search.</li>
            )}

          {!loadingChannels &&
            filteredChannels.map((c) => {
              const active = c.id === channelId
              const meta = channelMeta(c.slug)
              const Icon = meta.icon
              const preview = lastPreviewByChannel[c.id] ?? c.description ?? "Open to join the discussion"

              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectChannel(c.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all",
                      active
                        ? "bg-white shadow-md shadow-emerald-900/5 ring-1 ring-emerald-200/90 dark:bg-card dark:shadow-none dark:ring-border"
                        : "hover:bg-white/80 hover:shadow-sm dark:hover:bg-accent",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                        meta.gradient,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm font-semibold",
                            active ? "text-emerald-900 dark:text-emerald-200" : "text-slate-900 dark:text-foreground",
                          )}
                        >
                          {c.name}
                        </span>
                        {active ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">{preview}</p>
                    </div>
                  </button>
                </li>
              )
            })}
        </ul>
      </aside>

      {/* Conversation */}
      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 dark:from-background dark:via-background dark:to-emerald-950/15",
          !mobileShowChat && !channelId ? "hidden md:flex" : "flex",
          !channelId && "md:flex",
        )}
      >
        {!channelId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-emerald-400/10 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/15">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-foreground">Choose a channel to begin</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
                Connect with other applicants, share timelines, and get constructive feedback on your
                scholarship journey.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["Be respectful", "Stay on-topic", "No spam"].map((rule) => (
                <Badge
                  key={rule}
                  variant="secondary"
                  className="border-emerald-100 bg-white text-emerald-800 ring-1 ring-emerald-100 dark:border-border dark:bg-card dark:text-emerald-200 dark:ring-border"
                >
                  {rule}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex shrink-0 items-center gap-3 border-b border-emerald-100/80 bg-white/95 px-3 py-3 backdrop-blur-sm dark:border-border dark:bg-card/95 md:px-5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                onClick={() => setMobileShowChat(false)}
                aria-label="Back to channels"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {selectedChannel && selectedMeta && (
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                    selectedMeta.gradient,
                  )}
                >
                  <SelectedIcon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900 dark:text-foreground">{selectedChannel?.name}</h2>
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-emerald-100 bg-emerald-50 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                  >
                    Live
                  </Badge>
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-muted-foreground">
                  {selectedChannel?.description ?? "Peer discussion"}
                </p>
              </div>
              <Button
                type="button"
                variant={messageSearchOpen ? "secondary" : "outline"}
                size="icon"
                className={cn(
                  "h-10 w-10 shrink-0 rounded-xl border-emerald-100 dark:border-border",
                  messageSearchOpen && "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
                )}
                onClick={toggleMessageSearch}
                aria-label={messageSearchOpen ? "Close message search" : "Search messages"}
                aria-expanded={messageSearchOpen}
              >
                <Search className="h-4 w-4" />
              </Button>
              <div className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-emerald-100/80 bg-emerald-50/50 px-2.5 py-1.5 text-emerald-800 dark:border-border dark:bg-emerald-950/40 dark:text-emerald-200 lg:flex">
                <Shield className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Moderated</span>
              </div>
            </header>

            {messageSearchOpen ? (
              <div className="shrink-0 border-b border-emerald-100/80 bg-white px-3 py-3 dark:border-border dark:bg-card md:px-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                  <Input
                    ref={messageSearchInputRef}
                    placeholder={`Search in ${selectedChannel?.name ?? "this channel"}…`}
                    value={messageQuery}
                    onChange={(e) => setMessageQuery(e.target.value)}
                    className={cn("h-10 rounded-xl pl-9 pr-9 text-sm", inputSurface)}
                  />
                  {messageQuery ? (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-accent dark:hover:text-foreground"
                      onClick={() => {
                        setMessageQuery("")
                        setMessageSearchResults([])
                      }}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-emerald-100/80 bg-slate-50/50 dark:border-border dark:bg-muted/40">
                  {messageQuery.trim().length < 2 ? (
                    <p className={cn("px-3 py-4 text-center text-xs", textSubtle)}>
                      Type at least 2 characters to search messages, names, and file names.
                    </p>
                  ) : messageSearchLoading ? (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  ) : messageSearchResults.length === 0 ? (
                    <p className={cn("px-3 py-4 text-center text-xs", textSubtle)}>
                      No messages match &ldquo;{messageQuery.trim()}&rdquo;.
                    </p>
                  ) : (
                    <ul className="divide-y divide-emerald-100/60 p-1 dark:divide-border">
                      {messageSearchResults.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => selectSearchResult(m)}
                            className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white dark:hover:bg-accent"
                          >
                            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                              {m.authorFullName}
                              <span className="ml-2 font-normal text-slate-400 dark:text-muted-foreground">
                                {formatMessageTime(m.createdAt)}
                              </span>
                            </span>
                            <span className={cn("line-clamp-2 text-sm", textPrimary)}>{m.body}</span>
                            {(m.attachments?.length ?? 0) > 0 ? (
                              <span className={cn("text-[11px]", textSubtle)}>
                                {m.attachments!.length} attachment
                                {m.attachments!.length === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 md:px-6 [-webkit-overflow-scrolling:touch]">
              {pinnedMessage ? (
                <button
                  type="button"
                  onClick={() => onScrollToMessage?.(pinnedMessage.id)}
                  className="mb-4 flex w-full items-start gap-3 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-amber-50 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-card dark:hover:bg-amber-950/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <Pin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                      Pinned · {pinnedMessage.authorFullName}
                    </p>
                    <p className={cn("mt-0.5 line-clamp-2 text-sm", textPrimary)}>{pinnedMessage.body}</p>
                  </div>
                </button>
              ) : null}

              {hasMore && (
                <div className="mb-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("rounded-full text-xs shadow-sm", outlineEmeraldButton)}
                    disabled={loadingMore || loadingMessages}
                    onClick={onLoadOlder}
                  >
                    {loadingMore ? "Loading…" : "Load earlier messages"}
                  </Button>
                </div>
              )}

              {loadingMessages && (
                <div className="space-y-4">
                  <Skeleton className="ml-auto h-16 w-[72%] rounded-2xl rounded-br-md" />
                  <Skeleton className="h-16 w-[68%] rounded-2xl rounded-bl-md" />
                  <Skeleton className="ml-auto h-12 w-[55%] rounded-2xl rounded-br-md" />
                </div>
              )}

              {!loadingMessages &&
                messages.map((m, i) => {
                  const isOwn = m.userId === meId
                  const showDate =
                    i === 0 || !sameDay(messages[i - 1]!.createdAt, m.createdAt)
                  const parent = m.parentMessageId
                    ? messages.find((x) => x.id === m.parentMessageId)
                    : null
                  const isPinned = pinnedMessage?.id === m.id

                  return (
                    <div key={m.id} id={`msg-${m.id}`}>
                      {showDate && (
                        <div className="my-5 flex justify-center">
                          <span className="rounded-full bg-white px-4 py-1 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80 dark:bg-muted dark:text-muted-foreground dark:ring-border">
                            {formatDateSeparator(m.createdAt)}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "group mb-3 flex gap-2.5",
                          isOwn ? "flex-row-reverse" : "flex-row",
                          m.parentMessageId && !isOwn && "ml-6 md:ml-10",
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="mt-0.5 h-9 w-9 shrink-0 ring-2 ring-white shadow-sm dark:ring-border">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-50 to-teal-50 text-[10px] font-semibold text-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/40 dark:text-emerald-200">
                              {initials(m.authorFullName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "relative max-w-[min(100%,32rem)]",
                            isOwn ? "items-end" : "items-start",
                          )}
                        >
                          {!isOwn && (
                            <p className="mb-1 px-1 text-[11px] font-semibold text-emerald-900/90 dark:text-emerald-200">
                              {m.authorFullName}
                            </p>
                          )}
                          <div
                            className={cn(
                              "relative rounded-2xl px-4 py-2.5 shadow-sm",
                              isOwn
                                ? "rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-900/10"
                                : "rounded-bl-md border border-slate-200/80 bg-white text-slate-900 dark:border-border dark:bg-muted dark:text-foreground",
                              isPinned && "ring-2 ring-amber-300/90 ring-offset-1",
                            )}
                          >
                            {isPinned ? (
                              <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                                <Pin className="h-3 w-3" />
                                Pinned
                              </span>
                            ) : null}
                            {parent && (
                              <div
                                className={cn(
                                  "mb-2 rounded-lg border-l-[3px] px-2 py-1.5 text-[11px]",
                                  isOwn
                                    ? "border-emerald-200/80 bg-white/10"
                                    : "border-emerald-500 bg-emerald-50/80 text-slate-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-muted-foreground",
                                )}
                              >
                                <span className="font-semibold">{parent.authorFullName}</span>
                                <p className="line-clamp-2 opacity-90">{parent.body}</p>
                              </div>
                            )}
                            {m.body &&
                            !(m.body === "Shared files" && (m.attachments?.length ?? 0) > 0) ? (
                              <CommunityMessageBody
                                body={m.body}
                                isOwn={isOwn}
                                editedAt={m.editedAt}
                              />
                            ) : null}
                            {m.attachments && m.attachments.length > 0 ? (
                              <CommunityMessageAttachments
                                attachments={m.attachments}
                                isOwn={isOwn}
                              />
                            ) : null}
                            <p
                              className={cn(
                                "mt-1.5 text-right text-[10px]",
                                isOwn ? "text-emerald-100/90" : "text-slate-400",
                              )}
                            >
                              {formatMessageTime(m.createdAt)}
                            </p>
                          </div>

                          <div
                            className={cn(
                              "mt-1 flex",
                              isOwn ? "justify-end" : "justify-start",
                            )}
                          >
                            <CommunityMessageActions
                              message={m}
                              isOwn={isOwn}
                              canPost={canPost}
                              isModerator={isModerator}
                              isPinned={isPinned}
                              onCopy={onCopy}
                              onReply={onReplyToChange}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onReport={onReport}
                              onPin={onPin}
                              onUnpin={onUnpin}
                              onHide={onHide}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

              {!loadingMessages && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-border">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                  <p className={cn("font-medium", textPrimary)}>Start the conversation</p>
                  <p className={cn("max-w-xs text-sm", textSubtle)}>
                    Be the first to share a tip, question, or experience in this channel.
                  </p>
                </div>
              )}

              <div ref={bottomRef} className="h-1" />
            </div>

            <div className="shrink-0 border-t border-emerald-100/80 bg-white px-3 py-3 dark:border-border dark:bg-card md:px-5 md:py-4">
              {editingMessage ? (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-200/80 bg-blue-50/60 px-3 py-2.5 dark:border-blue-800/60 dark:bg-blue-950/30">
                  <div className="min-w-0 flex-1 border-l-[3px] border-blue-500 pl-2.5">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Editing your message</p>
                    <p className={cn("truncate text-xs", textMuted)}>
                      Changes sync for everyone in this channel
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg"
                    onClick={onCancelEdit}
                    aria-label="Cancel edit"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
              {replyTo && !editingMessage ? (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/30">
                  <div className="min-w-0 flex-1 border-l-[3px] border-emerald-500 pl-2.5">
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Replying to {replyTo.authorFullName}
                    </p>
                    <p className={cn("truncate text-xs", textMuted)}>{replyTo.body}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg"
                    onClick={() => onReplyToChange(null)}
                    aria-label="Cancel reply"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
              {!canPost && (
                <p className={cn("mb-2 text-center text-xs", textSubtle)}>
                  Sign in as a student to post in this channel.
                </p>
              )}
              {pendingFiles.length > 0 ? (
                <ul className="mb-2 flex flex-wrap gap-2">
                  {pendingFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex max-w-full items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-2.5 py-1.5 text-xs text-slate-700 dark:border-border dark:bg-emerald-950/30 dark:text-muted-foreground"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        className="shrink-0 text-slate-500 hover:text-red-600"
                        onClick={() =>
                          onPendingFilesChange(pendingFiles.filter((_, i) => i !== index))
                        }
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={COMMUNITY_ACCEPT_FILES}
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? [])
                  e.target.value = ""
                  if (!picked.length) return
                  const merged = [...pendingFiles, ...picked].slice(0, COMMUNITY_MAX_FILES)
                  onPendingFilesChange(merged)
                }}
              />
              <CommunityShareLinkDialog
                open={shareLinkOpen}
                onOpenChange={setShareLinkOpen}
                onShare={onShareLink}
                sending={sending}
              />
              <div className="flex items-end gap-0 rounded-2xl border border-slate-200/90 bg-slate-50/80 py-1 pl-3 pr-1 shadow-sm focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-border dark:bg-muted/50 dark:focus-within:border-emerald-600">
                <Textarea
                  placeholder={
                    !canPost
                      ? "Read-only"
                      : isEditing
                        ? "Edit your message…"
                        : "Write a message…"
                  }
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  disabled={!canPost || sending}
                  rows={1}
                  className="max-h-32 min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      onSend()
                    }
                    if (e.key === "Escape" && isEditing) {
                      e.preventDefault()
                      onCancelEdit()
                    }
                  }}
                />
                <div className="flex shrink-0 items-center gap-0.5 self-end pb-0.5">
                  {!isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-emerald-300"
                        disabled={!canPost || sending}
                        onClick={() => setShareLinkOpen(true)}
                        aria-label="Share a link"
                      >
                        <Link2 className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-emerald-300"
                        disabled={!canPost || sending || pendingFiles.length >= COMMUNITY_MAX_FILES}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Attach files"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
                    disabled={!canPost || sending || !canSendMessage}
                    onClick={onSend}
                    aria-label={isEditing ? "Save edit" : "Send message"}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className={cn("mt-2 text-center text-[10px] leading-relaxed", textSubtle)}>
                <Shield className="mr-1 inline h-3 w-3" />
                Share links, files (PDF, CV, images), or text · up to {COMMUNITY_MAX_FILES} files,{" "}
                {COMMUNITY_MAX_FILE_MB} MB each
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
