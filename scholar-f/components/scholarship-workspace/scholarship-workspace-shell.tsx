"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ComponentType, ReactNode } from "react"
import {
  Bell,
  FilePlus2,
  Files,
  Home,
  IdCard,
  LayoutDashboard,
  ListChecks,
  LogOut,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { clearToken, logoutFromServer } from "@/lib/auth"
import {
  getScholarshipWorkspaceConfig,
  type ScholarshipWorkspace,
} from "@/lib/scholarship-workspace"
import { navLinkActive, navLinkInactive, pageShell, sidebarShell, textMuted } from "@/lib/theme"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  match?: "exact" | "prefix"
}

function navIsActive(pathname: string, href: string, match: NavItem["match"] = "prefix") {
  if (match === "exact") return pathname === href
  if (href === "/manager" || href === "/owner/scholarships") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

type ScholarshipWorkspaceShellProps = {
  workspace: ScholarshipWorkspace
  children: ReactNode
  /** Classes on the main content column (e.g. padding). */
  mainClassName?: string
}

/**
 * Wraps content in the manager workspace shell, or renders content only when
 * `workspace === "owner"` (parent `OwnerShell` already provides navigation).
 */
export function ScholarshipWorkspaceLayout({
  workspace,
  children,
  mainClassName,
}: ScholarshipWorkspaceShellProps) {
  if (workspace === "owner") {
    return <div className={cn("px-4 py-6 sm:p-6", mainClassName)}>{children}</div>
  }
  return (
    <ScholarshipWorkspaceShell workspace={workspace} mainClassName={mainClassName}>
      {children}
    </ScholarshipWorkspaceShell>
  )
}

export function ScholarshipWorkspaceShell({
  workspace,
  children,
  mainClassName = "space-y-6 p-4 sm:p-6",
}: ScholarshipWorkspaceShellProps) {
  const cfg = getScholarshipWorkspaceConfig(workspace)
  const pathname = usePathname()
  const router = useRouter()
  const isManager = workspace === "manager"
  const isOwner = workspace === "owner"

  const navItems: NavItem[] = [
    { href: cfg.basePath, label: "Dashboard", icon: LayoutDashboard, match: "exact" },
    { href: cfg.profilePath, label: cfg.profileLinkLabel, icon: IdCard },
    { href: cfg.newScholarshipPath, label: "New scholarship", icon: FilePlus2 },
    { href: cfg.manageScholarshipsPath, label: "Manage scholarships", icon: ListChecks },
    { href: cfg.documentsPath, label: "Documents", icon: Files },
    ...(isManager
      ? [{ href: "/manager/notifications", label: "Notifications", icon: Bell }]
      : []),
    ...(isOwner
      ? [{ href: cfg.ownerHomePath, label: "Owner home", icon: Home, match: "exact" as const }]
      : []),
  ]

  return (
    <div className={cn("min-h-screen", pageShell)}>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "hidden w-72 shrink-0 flex-col md:flex md:min-h-screen",
            sidebarShell,
          )}
        >
          <div className="border-b border-emerald-100/80 px-6 py-5 dark:border-border">
            <div className="mb-4 flex items-center justify-between gap-2">
              <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
              <ThemeToggle variant="compact" />
            </div>
            {isManager ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-emerald-400">
                Manager portal
              </p>
            ) : isOwner ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-emerald-400">
                Owner portal
              </p>
            ) : null}
            <div className="leading-tight">
              <span className="block font-semibold text-slate-900 dark:text-foreground">
                {isManager ? "University Representative" : cfg.shellTitle}
              </span>
              {cfg.shellSubtitle ? (
                <span className={cn("text-xs", textMuted)}>{cfg.shellSubtitle}</span>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 p-4 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = navIsActive(pathname, item.href, item.match)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium transition-colors duration-200",
                    active ? navLinkActive : navLinkInactive,
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-emerald-100/80 px-4 pb-4 pt-3 dark:border-border">
            <button
              type="button"
              className="group flex w-full items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50 dark:border-border dark:bg-card dark:text-emerald-200 dark:hover:bg-accent"
              onClick={() => {
                void logoutFromServer()
                clearToken()
                router.push("/signin")
              }}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:group-hover:bg-emerald-900/50">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          {!isManager ? (
            <>
              <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-20 top-52 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
            </>
          ) : null}
          <main className={mainClassName}>{children}</main>
        </div>
      </div>
    </div>
  )
}
