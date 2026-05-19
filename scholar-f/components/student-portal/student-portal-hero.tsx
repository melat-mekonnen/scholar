"use client"

import type { ReactNode } from "react"

import {
  studentPortalHeroAccentClass,
  studentPortalHeroCardClass,
} from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"

type StudentPortalHeroSectionProps = {
  title: string
  description?: ReactNode
  as?: "h1" | "h2"
  end?: ReactNode
  className?: string
  children?: ReactNode
}

export function StudentPortalHeroSection({
  title,
  description,
  as: Heading = "h2",
  end,
  className,
  children,
}: StudentPortalHeroSectionProps) {
  return (
    <div className={cn(studentPortalHeroCardClass, className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className={cn(studentPortalHeroAccentClass, end ? "min-w-0 flex-1" : undefined)}>
          <Heading className="text-2xl font-semibold tracking-tight text-slate-900">{title}</Heading>
          {description ? (
            <div className="mt-2 text-sm leading-relaxed text-slate-600">{description}</div>
          ) : null}
          {children}
        </div>
        {end}
      </div>
    </div>
  )
}
