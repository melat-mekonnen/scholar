"use client"

import type { ReactNode } from "react"

import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalFooter } from "@/components/student-portal/student-footer"
import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StudentPortalFrameProps = {
  children: ReactNode
  header?: ReactNode
  mainClassName?: string
  showFooter?: boolean
}

/** Sidebar + full-width content column (matches Dashboard layout). */
export function StudentPortalFrame({
  children,
  header,
  mainClassName,
  showFooter = true,
}: StudentPortalFrameProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <StudentPortalSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header}
        <main className={cn("min-h-0 flex-1 space-y-6 p-6", mainClassName)}>{children}</main>
        {showFooter ? <StudentPortalFooter /> : null}
      </div>
    </div>
  )
}

type StudentPortalTopHeaderProps = {
  title: string
  role?: string
  end?: ReactNode
}

export function StudentPortalTopHeader({ title, role, end }: StudentPortalTopHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-blue-100/70 bg-white/95 px-4 py-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {role ? (
          <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-700">
            {role}
          </Badge>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {end}
        <ProfileAvatarLink />
      </div>
    </header>
  )
}
