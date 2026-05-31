"use client"

import { useMemo, useState } from "react"
import {
  ArrowLeft,
  Hash,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react"

import type { CommunityChannel, CommunityMessage } from "@/lib/community"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function channelAvatarColor(slug: string) {
  const hues = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-violet-500 to-violet-600",
    "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600",
  ]
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) % hues.length
  return hues[h]!
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
  draft: string
  onDraftChange: (v: string) => void
  replyTo: CommunityMessage | null
  onReplyToChange: (m: CommunityMessage | null) => void
  sending: boolean
  canPost: boolean
  onSend: () => void
  onDelete: (m: CommunityMessage) => void
  onReport: (m: CommunityMessage) => void
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
  draft,
  onDraftChange,
  replyTo,
  onReplyToChange,
  sending,
  canPost,
  onSend,
  onDelete,
  onReport,
  bottomRef,
}: CommunityChatProps) {
  const [search, setSearch] = useState("")
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const filteredChannels = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return channels
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    )
  }, [channels, search])

  const lastPreviewByChannel = useMemo(() => {
    const map: Record<string, string> = {}
    if (channelId && messages.length > 0) {
      const last = messages[messages.length - 1]
      map[channelId] = `${last.authorFullName}: ${last.body.slice(0, 60)}${last.body.length > 60 ? "…" : ""}`
    }
    return map
  }, [channelId, messages])

  function selectChannel(id: string) {
    onChannelSelect(id)
    setMobileShowChat(true)
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-none border-t border-emerald-100/80 bg-slate-100 transition-colors duration-200 dark:border-border dark:bg-background md:rounded-b-2xl">
      {/* Channel list — Telegram-style sidebar */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-emerald-100/80 bg-white transition-colors duration-200 dark:border-border dark:bg-card md:w-[340px]",
          mobileShowChat && channelId ? "hidden md:flex" : "flex"
        )}
      >
        <div className="border-b border-emerald-100/70 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 px-3 py-3 dark:border-border dark:from-card dark:to-muted/40">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Student community
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
            <Input
              placeholder="Search channels…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-emerald-100 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500 dark:border-border dark:bg-background"
            />
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {loadingChannels &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="border-b border-slate-100 px-3 py-3 dark:border-border">
                <Skeleton className="h-12 w-full rounded-lg" />
              </li>
            ))}

          {!loadingChannels && channelsError && (
            <li className="p-4 text-sm text-destructive">{channelsError}</li>
          )}

          {!loadingChannels &&
            filteredChannels.map((c) => {
              const active = c.id === channelId
              const preview = lastPreviewByChannel[c.id] ?? c.description ?? "Tap to open channel"
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectChannel(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors dark:border-border",
                      active
                        ? "bg-gradient-to-r from-blue-50 to-emerald-50/80 dark:from-emerald-950/40 dark:to-teal-950/30"
                        : "hover:bg-slate-50 dark:hover:bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm",
                        channelAvatarColor(c.slug)
                      )}
                    >
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate font-semibold", active ? "text-blue-800 dark:text-emerald-200" : "text-slate-900 dark:text-foreground")}>
                          {c.name}
                        </span>
                        <Hash className="h-3 w-3 shrink-0 text-slate-300 dark:text-muted-foreground" />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-muted-foreground">{preview}</p>
                    </div>
                    {active && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                    )}
                  </button>
                </li>
              )
            })}
        </ul>
      </aside>

      {/* Conversation pane */}
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col bg-[#e8edf5] transition-colors duration-200 dark:bg-background",
          !mobileShowChat && !channelId ? "hidden md:flex" : "flex",
          !channelId && "md:flex"
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5,150,105,0.06) 0%, transparent 50%)",
        }}
      >
        {!channelId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-emerald-950/50 dark:to-blue-950/40">
              <MessageCircle className="h-8 w-8 text-blue-600 dark:text-emerald-400" />
            </div>
            <p className="font-medium text-slate-700 dark:text-foreground">Select a channel</p>
            <p className="max-w-sm text-sm text-slate-500 dark:text-muted-foreground">
              Choose a topic on the left to read tips, share experiences, and connect with other applicants.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <header className="flex shrink-0 items-center gap-3 border-b border-emerald-100/80 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-border dark:bg-card/95 md:px-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileShowChat(false)}
                aria-label="Back to channels"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {selectedChannel && (
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white",
                    channelAvatarColor(selectedChannel.slug)
                  )}
                >
                  {selectedChannel.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-slate-900 dark:text-foreground">{selectedChannel?.name}</h2>
                <p className="truncate text-xs text-emerald-600 dark:text-emerald-400">
                  {selectedChannel?.description ?? "Peer discussion"}
                </p>
              </div>
            </header>

            {/* Messages */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6">
              {hasMore && (
                <div className="mb-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white bg-white/90 text-xs shadow-sm dark:border-border dark:bg-card dark:hover:bg-accent"
                    disabled={loadingMore || loadingMessages}
                    onClick={onLoadOlder}
                  >
                    {loadingMore ? "Loading…" : "Load earlier messages"}
                  </Button>
                </div>
              )}

              {loadingMessages && (
                <div className="space-y-3">
                  <Skeleton className="ml-auto h-14 w-[70%] rounded-2xl rounded-br-md" />
                  <Skeleton className="h-14 w-[65%] rounded-2xl rounded-bl-md" />
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

                  return (
                    <div key={m.id}>
                      {showDate && (
                        <div className="my-4 flex justify-center">
                          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80 dark:bg-card/90 dark:text-muted-foreground dark:ring-border">
                            {formatDateSeparator(m.createdAt)}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "mb-2 flex gap-2",
                          isOwn ? "flex-row-reverse" : "flex-row",
                          m.parentMessageId && !isOwn && "ml-4"
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="mt-1 h-8 w-8 shrink-0 ring-2 ring-white dark:ring-border">
                            <AvatarFallback className="bg-gradient-to-br from-blue-50 to-emerald-50 text-[10px] font-semibold text-blue-800 dark:from-emerald-950/50 dark:to-blue-950/40 dark:text-emerald-200">
                              {initials(m.authorFullName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "group relative max-w-[min(100%,28rem)]",
                            isOwn ? "items-end" : "items-start"
                          )}
                        >
                          {!isOwn && (
                            <p className="mb-0.5 px-1 text-[11px] font-semibold text-blue-800 dark:text-emerald-300">
                              {m.authorFullName}
                            </p>
                          )}
                          <div
                            className={cn(
                              "relative rounded-2xl px-3.5 py-2 shadow-sm",
                              isOwn
                                ? "rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-600 text-white"
                                : "rounded-bl-md border border-white/80 bg-white text-slate-900 dark:border-border dark:bg-card dark:text-foreground"
                            )}
                          >
                            {parent && (
                              <div
                                className={cn(
                                  "mb-2 border-l-2 pl-2 text-[11px] opacity-90",
                                  isOwn ? "border-blue-200" : "border-emerald-500"
                                )}
                              >
                                <span className="font-semibold">{parent.authorFullName}</span>
                                <p className="line-clamp-2">{parent.body}</p>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                            <div
                              className={cn(
                                "mt-1 flex items-center justify-end gap-1 text-[10px]",
                                isOwn ? "text-blue-100" : "text-slate-400"
                              )}
                            >
                              <span>{formatMessageTime(m.createdAt)}</span>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "absolute top-0 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                              isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
                            )}
                          >
                            {!m.parentMessageId && canPost && !isOwn && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full bg-white shadow-sm dark:bg-card dark:hover:bg-accent"
                                onClick={() => onReplyToChange(m)}
                                aria-label="Reply"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isOwn && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full bg-white text-destructive shadow-sm dark:bg-card"
                                onClick={() => onDelete(m)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!isOwn && meId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full bg-white shadow-sm dark:bg-card dark:hover:bg-accent"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onReport(m)}>
                                    Report message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

              {!loadingMessages && messages.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                  No messages yet. Say hello and start the conversation.
                </p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-emerald-100/80 bg-white px-3 py-3 dark:border-border dark:bg-card md:px-4">
              {replyTo && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm dark:border-border dark:bg-muted/40">
                  <div className="min-w-0 flex-1 border-l-2 border-emerald-500 pl-2 dark:border-emerald-400">
                    <p className="text-xs font-medium text-blue-800 dark:text-emerald-300">Reply to {replyTo.authorFullName}</p>
                    <p className="truncate text-xs text-slate-600 dark:text-muted-foreground">{replyTo.body}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onReplyToChange(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!canPost && (
                <p className="mb-2 text-center text-xs text-slate-500 dark:text-muted-foreground">
                  Sign in as a student to post in this channel.
                </p>
              )}
              <div className="flex items-end gap-2">
                <Input
                  placeholder={canPost ? "Write a message…" : "Read-only"}
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  disabled={!canPost || sending}
                  className="min-h-11 flex-1 rounded-2xl border-slate-200 bg-slate-50 px-4 focus-visible:ring-emerald-500 dark:border-border dark:bg-background"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      onSend()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full bg-emerald-600 shadow-md hover:bg-emerald-700"
                  disabled={!canPost || sending || !draft.trim()}
                  onClick={onSend}
                  aria-label="Send"
                >
                  <Send className="h-5 w-5 text-white" />
                </Button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-slate-400 dark:text-muted-foreground">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
