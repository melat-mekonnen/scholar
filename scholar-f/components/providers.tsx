"use client"

import type { ReactNode } from "react"

import { StudentI18nProvider } from "@/lib/student-i18n"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StudentI18nProvider>
      {children}
      <StudentLanguageToggle />
      <Toaster />
    </StudentI18nProvider>
  )
}
