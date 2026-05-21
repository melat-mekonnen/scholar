#!/usr/bin/env python3
"""Merge community page: ui-update2 shell + main CommunityChat."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "community" / "page.tsx"

main_src = subprocess.check_output(["git", "show", "main:scholar-f/app/community/page.tsx"]).decode("utf-8")

# Keep everything before `return (` from main
idx = main_src.find("  return (")
if idx < 0:
    raise SystemExit("return not found in main")
logic = main_src[:idx]

# Fix imports: add sidebar imports, remove StudentPortalShell
logic = logic.replace(
    '"use client"\n\nimport { useCallback',
    '''"use client"

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
} from "lucide-react"

import Link from "next/link"
import { useCallback''',
)
logic = logic.replace(
    'import { useToast } from "@/hooks/use-toast"\nimport { StudentPortalShell } from "@/components/student-portal/student-portal-shell"\nimport { CommunityChat } from "@/components/student-portal/community-chat"',
    '''import { useToast } from "@/hooks/use-toast"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"
import { CommunityChat } from "@/components/student-portal/community-chat"
import { Badge } from "@/components/ui/badge"''',
)

return_block = '''
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-emerald-950">Community</h1>
            <p className="text-xs text-slate-600">
              Peer tips, experiences, and constructive feedback — stay kind and on-topic.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {me?.role ? (
              <Badge className="border-emerald-200 bg-emerald-50 capitalize text-emerald-800 ring-1 ring-emerald-100">
                {me.role}
              </Badge>
            ) : null}
            <ProfileAvatarLink />
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="pointer-events-none absolute -left-20 top-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-32 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative shrink-0 border-b border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-4 py-4 shadow-sm shadow-emerald-900/5 md:px-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Community support</h2>
              <p className="mt-1 text-sm text-slate-600">
                Join a channel, share experiences, and help other students on their scholarship journey.
              </p>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  )
}
'''

OUT.write_text(logic + return_block, encoding="utf-8", newline="\n")
print("wrote", OUT)
