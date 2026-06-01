/** Shared layout + surface classes (emerald student theme). See lib/theme.ts */

import {
  emeraldCard,
  headerShellAlt,
  pageShell,
  themeTransition,
} from "@/lib/theme"

export const studentPortalPageBg = pageShell

export const studentPortalHeaderClass = `flex shrink-0 items-center justify-between px-4 py-3 md:px-6 ${headerShellAlt}`

export const studentPortalHeroCardClass = `rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm dark:border-border dark:bg-card dark:text-card-foreground ${themeTransition}`

export const studentPortalHeroAccentClass = "border-l-4 border-emerald-500 pl-4 dark:border-emerald-400"

export const studentPortalCardClass = emeraldCard

export const studentPortalStatCardClass = `${emeraldCard} transition-all hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/30`

export const studentPortalStatCardAccentClass =
  "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80"

export const studentPortalSectionClass = `rounded-2xl border border-emerald-100/70 bg-white/90 p-3 shadow-sm dark:border-border dark:bg-card/90 ${themeTransition}`
