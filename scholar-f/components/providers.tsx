"use client"

import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/toaster"
import { StudentI18nProvider } from "@/lib/student-i18n"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StudentI18nProvider>
      {children}
      <Toaster />
    </StudentI18nProvider>
  )
}
