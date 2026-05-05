"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type NavItem = {
  href: string
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/scholarships/pending", label: "Scholarships", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/admin/scholarships/new", label: "New scholarship", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/audit-logs", label: "Audit logs", icon: <ListChecks className="h-4 w-4" /> },
  { href: "/admin/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { href: "/admin/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
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
    <nav className="space-y-1 text-sm">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 font-medium",
              active ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100 dark:hover:bg-muted/50",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
            {item.href === "/admin/notifications" && unreadCount > 0 ? (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  function signOut() {
    void logoutFromServer()
    clearToken()
    router.push("/signin")
  }

  const pageLabel = NAV.find((n) => isActive(pathname, n.href))?.label ?? "Admin"

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-white md:flex dark:bg-card">
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="block font-semibold">Admin workspace</span>
            <span className="text-xs text-muted-foreground">Platform control center</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <NavLinks pathname={pathname} unreadCount={unreadCount} />
        </div>
        <div className="mt-auto border-t p-4">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-gray-100 dark:hover:bg-muted/50"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
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
                  <SheetTitle>Admin menu</SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col border-r bg-white dark:bg-card">
                  <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">Admin</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <NavLinks pathname={pathname} unreadCount={unreadCount} onNavigate={() => setMobileOpen(false)} />
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
            <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              admin
            </span>
          </div>
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/admin/notifications">
              <Bell className="mr-1 h-4 w-4" />
              {unreadCount > 0 ? `${unreadCount} unread` : "Alerts"}
            </Link>
          </Button>
        </header>

        <div className="flex-1 overflow-auto bg-muted/20">{children}</div>
      </div>
    </div>
  )
}

