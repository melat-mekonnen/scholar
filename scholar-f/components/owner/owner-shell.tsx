"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Briefcase,
  Building2,
  ClipboardList,
  Download,
  FileText,
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

const NAV: NavItem[] = [
  { href: "/owner", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/owner/approvals", label: "Pending approvals", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/owner/trusted-import", label: "Trusted import", icon: <Download className="h-4 w-4" /> },
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
  { href: "/owner/posting-profile", label: "Posting profile", icon: <IdCard className="h-4 w-4" /> },
  { href: "/owner/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { href: "/owner/users", label: "Students & managers", icon: <Users className="h-4 w-4" /> },
  { href: "/owner/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { href: "/owner/community", label: "Community", icon: <MessageSquareWarning className="h-4 w-4" /> },
]

function isActive(pathname: string, item: NavItem) {
  return pathname === item.href
}

type NotificationResponse = {
  notifications: Array<{ isRead: boolean }>
}

function NavLinks({
  pathname,
  cfg,
  unreadCount,
  pendingCount,
  onNavigate,
}: {
  pathname: string
  cfg: ReturnType<typeof getScholarshipWorkspaceConfig>
  unreadCount: number
  pendingCount: number
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-0.5 text-sm">
      {NAV.map((item) => {
        const active = isActive(pathname, item)
        const isNotifications = item.href === "/owner/notifications"
        const isApprovals = item.href === "/owner/approvals"
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex w-full items-center justify-between gap-1.5 rounded-xl px-2.5 py-1.5 font-medium transition-colors",
              active
                ? "bg-gradient-to-r from-blue-50 to-emerald-50 text-blue-700 ring-1 ring-blue-100"
                : "text-slate-600 hover:bg-gradient-to-r hover:from-blue-50/70 hover:to-emerald-50/70 hover:text-slate-900",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-white text-blue-700 ring-1 ring-blue-100"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200",
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </span>
            {isNotifications && unreadCount > 0 ? (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            ) : null}
            {isApprovals && pendingCount > 0 ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
                {pendingCount}
              </Badge>
            ) : null}
          </Link>
        )
      })}
    </nav>
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

  const pageLabel = NAV.find((n) => isActive(pathname, n))?.label ?? "Owner"

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className="hidden w-72 shrink-0 flex-col border-r border-blue-100/70 bg-gradient-to-b from-blue-50/30 to-emerald-50/20 md:flex"
      >
        <div className="border-b px-6 py-4">
          <div className="mb-4 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-gradient-to-br from-blue-50 to-emerald-50 p-2 text-blue-700 ring-1 ring-blue-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <span className="block font-semibold">Owner workspace</span>
              <span className="text-xs text-muted-foreground">Platform administration</span>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <NavLinks pathname={pathname} cfg={cfg} unreadCount={unreadCount} pendingCount={pendingCount} />
        </div>
        <div className="mt-auto border-t border-blue-100/70 p-4">
          <button
            type="button"
            className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            onClick={signOut}
          >
            <span className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-rose-100 group-hover:text-rose-700">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">Sign out</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-5">
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
                <div className="flex h-full flex-col border-r border-blue-100/70 bg-gradient-to-b from-blue-50/30 to-emerald-50/20">
                  <div className="border-b px-4 py-3">
                    <div className="mb-3">
                      <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-8 w-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-gradient-to-br from-blue-50 to-emerald-50 p-2 text-blue-700 ring-1 ring-blue-100">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <span className="font-semibold">Owner</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <NavLinks
                      pathname={pathname}
                      cfg={cfg}
                      unreadCount={unreadCount}
                      pendingCount={pendingCount}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </div>
                  <div className="border-t p-3">
                    <Button variant="outline" className="w-full" onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="truncate text-lg font-semibold">{pageLabel}</h1>
            <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground sm:inline">
              owner
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/owner/notifications">
                <Bell className="mr-1 h-4 w-4" />
                {unreadCount > 0 ? `${unreadCount} unread` : "Alerts"}
              </Link>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-muted/20">{children}</div>
      </div>
    </div>
  )
}
