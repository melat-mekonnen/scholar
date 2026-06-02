"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { StudentI18nProvider } from "@/lib/student-i18n"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="theme"
      disableTransitionOnChange={false}
    >
      <StudentI18nProvider>
        {children}
        <Toaster />
      </StudentI18nProvider>
    </ThemeProvider>
  )
}
