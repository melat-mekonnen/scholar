"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Bell,
  FileText,
  LayoutDashboard,
  ListChecks,
  Menu,
  PlusCircle,
  ShieldCheck,
  Users,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/scholarships/pending", label: "Scholarships", icon: ShieldCheck },
  { href: "/admin/scholarships/new", label: "New scholarship", icon: PlusCircle },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit-logs", label: "Audit logs", icon: ListChecks },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
]

type NotificationsResponse = { notifications: Array<{ isRead: boolean }> }

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({
  pathname,
  unreadCount,
  onNavigate,
}: {
  pathname: string
  unreadCount: number
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href)
        const showUnread = item.href === "/admin/notifications" && unreadCount > 0

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              active
                ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                : "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
            }
          >
            <span
              className={
                active
                  ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"
                  : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
              }
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {showUnread ? (
              <Badge variant="destructive" className="h-5 shrink-0 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            ) : active ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
            ) : (
              <span className="w-1.5 shrink-0" aria-hidden />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

type MeResponse = { role?: string }

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function guard() {
      if (!getToken()) {
        router.replace("/signin")
        return
      }
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
      if (cancelled) return
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (data?.role !== "admin") {
        router.replace(data?.role === "owner" ? "/owner" : "/dashboard")
      }
    }
    void guard()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    let cancelled = false
    async function loadUnread() {
      const { res, data } = await apiFetchJson<NotificationsResponse>("/api/notifications/mine?unread=true&limit=100")
      if (cancelled) return
      if (res.ok && data?.notifications) {
        setUnreadCount(data.notifications.length)
      }
    }
    void loadUnread()
    return () => {
      cancelled = true
    }
  }, [pathname])

  const pageLabel = NAV.find((n) => isActive(pathname, n.href))?.label ?? "Admin"

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Admin Portal</p>

          <NavLinks pathname={pathname} unreadCount={unreadCount} />

          <StudentPortalSidebarLogout tone="primary" className="mt-10 border-emerald-100/80" />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-emerald-200 md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Admin menu</SheetTitle>
                </SheetHeader>
                <div className="flex h-full min-h-0 flex-col border-r border-emerald-100/90 bg-white">
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
                    <div className="mb-8 flex items-center gap-3">
                      <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
                    </div>
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Admin Portal</p>
                    <NavLinks pathname={pathname} unreadCount={unreadCount} onNavigate={() => setMobileOpen(false)} />
                    <StudentPortalSidebarLogout tone="primary" className="mt-10 border-emerald-100/80" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="truncate text-lg font-semibold text-slate-900">{pageLabel}</h1>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 sm:inline-flex"
          >
            <Link href="/admin/notifications">
              <Bell className="mr-1 h-4 w-4" />
              {unreadCount > 0 ? `${unreadCount} unread` : "Alerts"}
            </Link>
          </Button>
        </header>

        <div className="flex-1 overflow-auto bg-slate-100">{children}</div>
      </div>
    </div>
  )
}
