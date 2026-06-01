"use client"

import type { ReactNode } from "react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { headerShell, pageShell, textMuted } from "@/lib/theme"
import { cn } from "@/lib/utils"

type StudentPortalPageLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  /** Extra controls before language toggle (e.g. search) */
  headerEnd?: ReactNode
  mainClassName?: string
}

/**
 * Standard student portal page shell — matches dashboard/settings layout in light and dark.
 */
export function StudentPortalPageLayout({
  title,
  subtitle,
  children,
  headerEnd,
  mainClassName,
}: StudentPortalPageLayoutProps) {
  return (
    <div className={cn("flex min-h-screen", pageShell)}>
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 px-4 py-3 md:px-6",
            headerShell,
          )}
        >
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">
              {title}
            </h1>
            {subtitle ? (
              <p className={cn("mt-0.5 text-xs", textMuted)}>{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerEnd}
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className={cn("flex-1", mainClassName)}>{children}</main>
      </div>
    </div>
  )
}
