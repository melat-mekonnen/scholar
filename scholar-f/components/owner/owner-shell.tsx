"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Briefcase,
  ClipboardList,
  Download,
  FileText,
  Files,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Plus,
  Users,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import { getScholarshipWorkspaceConfig } from "@/lib/scholarship-workspace"
import { ThemeToggle } from "@/components/theme-toggle"
import { EthioScholarLogo } from "@/components/ethioscholar-logo"
import { headerShell, mainScroll, pageShell } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type NavItem = {
  href: string
  label: string
  icon: ReactNode
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/owner", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/owner/approvals", label: "Pending approvals", icon: <ClipboardList className="h-4 w-4" /> },
      { href: "/owner/trusted-import", label: "Trusted import", icon: <Download className="h-4 w-4" /> },
    ],
  },
  {
    label: "Scholarships",
    items: [
      {
        href: "/owner/scholarships",
        label: "Scholarship operations",
        icon: <Briefcase className="h-4 w-4" />,
      },
      { href: "/owner/scholarships/new", label: "New scholarship", icon: <Plus className="h-4 w-4" /> },
      {
        href: "/owner/scholarships/manage",
        label: "Manage scholarships",
        icon: <FileText className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/owner/posting-profile", label: "Posting profile", icon: <IdCard className="h-4 w-4" /> },
      { href: "/owner/documents", label: "Documents", icon: <Files className="h-4 w-4" /> },
      { href: "/owner/users", label: "Students & managers", icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/owner/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
      { href: "/owner/community", label: "Community", icon: <MessageSquareWarning className="h-4 w-4" /> },
    ],
  },
]

const FLAT_NAV = NAV_GROUPS.flatMap((g) => g.items)

function navItemActive(pathname: string, item: NavItem) {
  const matches = FLAT_NAV.filter((i) => {
    if (pathname === i.href) return true
    if (i.href === "/owner") return false
    return pathname.startsWith(`${i.href}/`)
  })
  if (!matches.length) return false
  const best = [...matches].sort((a, b) => b.href.length - a.href.length)[0]
  return best.href === item.href
}

type NotificationResponse = {
  notifications: Array<{ isRead: boolean }>
}

const inactiveNavRow =
  "group flex w-full items-center justify-between gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50/90 hover:text-emerald-800 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.2)] dark:text-foreground/80 dark:hover:bg-accent dark:hover:text-emerald-300"
const inactiveNavIcon =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.28)] group-hover:ring-1 group-hover:ring-emerald-300/80 dark:bg-muted dark:text-foreground/70 dark:group-hover:bg-accent dark:group-hover:text-emerald-300"
const activeNavRow =
  "group flex w-full items-center justify-between gap-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200/80 dark:from-emerald-950/50 dark:to-teal-950/40 dark:text-emerald-200 dark:ring-emerald-800/60"
const activeNavIcon =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-teal-700 ring-1 ring-teal-100 dark:bg-muted dark:text-emerald-300 dark:ring-border"

function NavLinks({
  pathname,
  unreadCount,
  pendingCount,
  onNavigate,
}: {
  pathname: string
  unreadCount: number
  pendingCount: number
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {group.label}
          </p>
          <nav className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = navItemActive(pathname, item)
              const isNotifications = item.href === "/owner/notifications"
              const isApprovals = item.href === "/owner/approvals"
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={active ? activeNavRow : inactiveNavRow}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className={active ? activeNavIcon : inactiveNavIcon}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {isNotifications && unreadCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 border-rose-200 bg-rose-50 px-1.5 text-[10px] font-semibold text-rose-800"
                    >
                      {unreadCount}
                    </Badge>
                  ) : null}
                  {isApprovals && pendingCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-semibold tabular-nums text-emerald-900"
                    >
                      {pendingCount}
                    </Badge>
                  ) : null}
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
    </div>
  )
}

function SidebarAlerts({
  pendingCount,
  unreadCount,
  compact,
}: {
  pendingCount: number
  unreadCount: number
  compact?: boolean
}) {
  if (pendingCount === 0 && unreadCount === 0) return null

  return (
    <div
      className={cn(
        "mb-3 grid gap-2",
        compact ? "grid-cols-1" : pendingCount > 0 && unreadCount > 0 ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {pendingCount > 0 ? (
        <Link
          href="/owner/approvals"
          className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
        >
          <span className="block text-[10px] uppercase tracking-wide text-emerald-700/80">Approvals</span>
          <span className="text-sm font-semibold tabular-nums">{pendingCount} pending</span>
        </Link>
      ) : null}
      {unreadCount > 0 ? (
        <Link
          href="/owner/notifications"
          className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-medium text-rose-900 transition-colors hover:bg-rose-100"
        >
          <span className="block text-[10px] uppercase tracking-wide text-rose-700/80">Alerts</span>
          <span className="text-sm font-semibold tabular-nums">{unreadCount} unread</span>
        </Link>
      ) : null}
    </div>
  )
}

function OwnerSidebarHeader({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("border-b border-emerald-100/80 dark:border-border", compact ? "px-4 py-3" : "px-6 py-5")}>
      <div className={cn("flex items-center gap-3", compact ? "mb-3" : "mb-4")}>
        <EthioScholarLogo className={compact ? "h-8" : "h-10"} />
      </div>
      <p
        className={cn(
          "font-semibold uppercase text-teal-700",
          compact ? "text-[10px] tracking-[0.18em]" : "text-xs tracking-[0.2em]",
        )}
      >
        Owner portal
      </p>
    </div>
  )
}

function OwnerSidebarFooter({ onSignOut, compact }: { onSignOut: () => void; compact?: boolean }) {
  return (
    <div className={cn("mt-auto border-t border-emerald-100/80 dark:border-border", compact ? "p-3" : "p-6 pt-4")}>
      <button
        type="button"
        className="group flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50 dark:border-border dark:bg-card dark:text-emerald-300 dark:hover:bg-accent"
        onClick={onSignOut}
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium">Sign out</span>
        </span>
      </button>
    </div>
  )
}

function OwnerSidebarPanel({
  pathname,
  unreadCount,
  pendingCount,
  onNavigate,
  onSignOut,
  compact,
}: {
  pathname: string
  unreadCount: number
  pendingCount: number
  onNavigate?: () => void
  onSignOut: () => void
  compact?: boolean
}) {
  return (
    <>
      <OwnerSidebarHeader compact={compact} />
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", compact ? "px-4 py-3" : "px-6 py-4")}>
        <SidebarAlerts pendingCount={pendingCount} unreadCount={unreadCount} compact={compact} />
        <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/20 p-2 shadow-sm shadow-emerald-900/5 dark:border-border dark:bg-background/40">
          <NavLinks
            pathname={pathname}
            unreadCount={unreadCount}
            pendingCount={pendingCount}
            onNavigate={onNavigate}
          />
        </div>
      </div>
      <OwnerSidebarFooter onSignOut={onSignOut} compact={compact} />
    </>
  )
}

export function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const cfg = getScholarshipWorkspaceConfig("owner")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadBadges() {
      const [notif, pending] = await Promise.all([
        apiFetchJson<NotificationResponse>("/api/notifications/mine?unread=true&limit=100", {
          method: "GET",
        }),
        apiFetchJson<{ scholarships: unknown[] }>("/api/admin/scholarships/pending", { method: "GET" }),
      ])
      if (cancelled) return
      if (notif.res.ok && notif.data?.notifications) {
        setUnreadCount(notif.data.notifications.length)
      }
      if (pending.res.ok && pending.data?.scholarships) {
        setPendingCount(pending.data.scholarships.length)
      }
    }
    void loadBadges()
    return () => {
      cancelled = true
    }
  }, [pathname])

  function signOut() {
    void logoutFromServer()
    clearToken()
    router.push("/signin")
  }

  const pageLabel = FLAT_NAV.find((n) => navItemActive(pathname, n))?.label ?? "Owner"

  return (
    <div className={cn("flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden", pageShell)}>
      <aside
        className={cn("hidden w-72 shrink-0 flex-col md:flex md:min-h-dvh md:self-stretch", cfg.shellClassName)}
      >
        <OwnerSidebarPanel
          pathname={pathname}
          unreadCount={unreadCount}
          pendingCount={pendingCount}
          onSignOut={signOut}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <header className={cn("sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 md:px-5", headerShell)}>
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Owner menu</SheetTitle>
                </SheetHeader>
                <div className={cn("flex h-full flex-col", cfg.shellClassName)}>
                  <OwnerSidebarPanel
                    pathname={pathname}
                    unreadCount={unreadCount}
                    pendingCount={pendingCount}
                    onNavigate={() => setMobileOpen(false)}
                    onSignOut={signOut}
                    compact
                  />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-foreground">{pageLabel}</h1>
            <span className="hidden shrink-0 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-800 sm:inline">
              owner
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden border-emerald-200 text-emerald-800 hover:bg-emerald-50 sm:inline-flex dark:border-border dark:text-emerald-300"
            >
              <Link href="/owner/notifications">
                <Bell className="mr-1 h-4 w-4" />
                {unreadCount > 0 ? `${unreadCount} unread` : "Alerts"}
              </Link>
            </Button>
          </div>
        </header>

        <div className={cn("w-full min-w-0 flex-1 overflow-x-hidden", mainScroll)}>{children}</div>
      </div>
    </div>
  )
}
