"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { messages, type Locale } from "@/lib/i18n/messages"

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = "scholar.locale"

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (saved === "en" || saved === "am") {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
      document.documentElement.lang = next
    }
  }

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string, fallback?: string) => messages[locale][key] ?? fallback ?? key,
    }),
    [locale]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider")
  }
  return ctx
}

