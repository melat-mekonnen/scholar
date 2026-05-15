"use client"

import { StudentPortalShell, type StudentPortalHero } from "@/components/student-portal/student-portal-shell"

type StudentPortalLayoutProps = {
  title: string
  subtitle?: string
  heroTitle: string
  heroDescription: string
  role?: string
  children: React.ReactNode
  maxWidthClass?: string
}

export function StudentPortalLayout({
  title,
  subtitle,
  heroTitle,
  heroDescription,
  role,
  children,
  maxWidthClass = "max-w-5xl",
}: StudentPortalLayoutProps) {
  const hero: StudentPortalHero = { title: heroTitle, description: heroDescription }

  return (
    <StudentPortalShell
      title={title}
      subtitle={subtitle}
      role={role}
      hero={hero}
      mainClassName={`w-full space-y-8 p-6 ${maxWidthClass}`}
    >
      {children}
    </StudentPortalShell>
  )
}
