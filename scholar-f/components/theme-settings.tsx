"use client"

import { useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"]

/**
 * Appearance control for Settings — single source of truth with next-themes (localStorage).
 */
export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Skeleton className="h-[7.25rem] w-full max-w-md rounded-xl" />
  }

  const active: ThemeValue =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system"

  return (
    <div className="space-y-3">
      <div
        className="grid max-w-md grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Color theme"
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = active === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors duration-200",
                selected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100"
                  : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {active === "system"
          ? `Following your system (${resolvedTheme === "dark" ? "dark" : "light"}).`
          : `${active === "dark" ? "Dark" : "Light"} mode is active.`}{" "}
        Your choice is saved in this browser.
      </p>
    </div>
  )
}
