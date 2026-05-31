/**
 * Centralized layout/surface classes for EthioScholar.
 * Light styles are unchanged; dark mode uses CSS variables from globals.css (.dark).
 */
export const themeTransition = "transition-colors duration-200 ease-in-out"

/** Full-page shell (student / admin content area) */
export const pageShell =
  `bg-slate-100 text-slate-900 dark:bg-background dark:text-foreground ${themeTransition}`

/** Sticky top bar */
export const headerShell =
  `border-b border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 dark:border-border dark:bg-card dark:text-card-foreground dark:shadow-none ${themeTransition}`

/** Student inline page top bar (title row) */
export const inlineHeaderRow =
  `flex shrink-0 items-center justify-between gap-3 px-4 py-3 md:px-6 ${headerShell}`

export const headerShellAlt =
  `border-b border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-card-foreground dark:shadow-none ${themeTransition}`

/** Side navigation column */
export const sidebarShell =
  `border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 dark:border-border dark:bg-card ${themeTransition}`

/** Scrollable main column behind cards */
export const mainScroll = `bg-slate-100 dark:bg-background ${themeTransition}`

/** Standard elevated card (emerald-bordered student UI) */
export const emeraldCard =
  `rounded-2xl border border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-card-foreground ${themeTransition}`

/** Neutral card */
export const surfaceCard =
  `rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-border dark:bg-card dark:text-card-foreground ${themeTransition}`

export const textPrimary = "text-slate-900 dark:text-foreground"

export const textMuted = "text-slate-600 dark:text-muted-foreground"

export const textSubtle = "text-slate-500 dark:text-muted-foreground"

export const outlineControl =
  "border-emerald-200 bg-white hover:bg-emerald-50 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent"

export const inputSurface =
  "border-emerald-200/80 bg-white dark:border-border dark:bg-background dark:text-foreground"

export const settingsCardClass =
  `relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5 dark:border-border dark:bg-card dark:text-card-foreground ${themeTransition}`

/** Page hero / intro banner (emerald accent strip) */
export const heroBanner =
  `relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5 dark:border-border dark:from-card dark:via-card dark:to-emerald-950/25 dark:shadow-none ${themeTransition}`

/** Inline count / action bar below hero */
export const summaryBar =
  `flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-50 dark:border-border dark:bg-card dark:ring-border/50 ${themeTransition}`

/** Table wrapper on admin pages */
export const tableShell = "rounded-xl border border-border bg-card shadow-sm"

/** Nav link — inactive */
export const navLinkInactive =
  "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"

/** Nav link — active (emerald) */
export const navLinkActive =
  "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 ring-1 ring-emerald-200/80 dark:from-emerald-950/40 dark:to-teal-950/30 dark:text-emerald-200 dark:ring-emerald-800/50"
