"use client"

import type { ReactNode } from "react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalFooter } from "@/components/student-portal/student-footer"
import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"
import { Badge } from "@/components/ui/badge"
import {
  studentPortalHeaderClass,
  studentPortalHeroAccentClass,
  studentPortalHeroCardClass,
  studentPortalPageBg,
} from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"

export type StudentPortalHero = {
  title: string
  description: string
}

type StudentPortalShellProps = {
  title: string
  subtitle?: string
  role?: string
  hero?: StudentPortalHero | null
  children: ReactNode
  headerEnd?: ReactNode
  documentsLabel?: string
  mainClassName?: string
  showFooter?: boolean
}

export function StudentPortalShell({
  title,
  subtitle,
  role,
  hero,
  children,
  headerEnd,
  documentsLabel = "Document Resources",
  mainClassName = "p-6 space-y-8",
  showFooter = true,
}: StudentPortalShellProps) {
  return (
    <div className={cn("flex min-h-screen", studentPortalPageBg)}>
      <StudentPortalSidebar documentsLabel={documentsLabel} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className={studentPortalHeaderClass}>
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
              {role ? (
                <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-700">
                  {role}
                </Badge>
              ) : null}
            </div>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerEnd}
            <ProfileAvatarLink />
          </div>
        </header>

        <main className={cn("flex min-h-0 flex-1 flex-col", mainClassName)}>
          {hero ? (
            <div className={studentPortalHeroCardClass}>
              <div className={studentPortalHeroAccentClass}>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{hero.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{hero.description}</p>
              </div>
            </div>
          ) : null}
          {children}
        </main>

        {showFooter ? <StudentPortalFooter /> : null}
      </div>
    </div>
  )
}
