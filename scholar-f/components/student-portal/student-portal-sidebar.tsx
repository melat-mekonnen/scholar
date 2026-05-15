"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useStudentI18n } from "@/lib/student-i18n"
import { getStudentSidebarLinks, isStudentSidebarActive } from "@/lib/student-portal-sidebar"

type StudentPortalSidebarProps = {
  documentsLabel?: string
}

export function StudentPortalSidebar({
  documentsLabel = "Document Resources",
}: StudentPortalSidebarProps) {
  const pathname = usePathname()
  const { t } = useStudentI18n()

  const links = getStudentSidebarLinks(
    {
      dashboard: t("Dashboard"),
      scholarships: t("Browse Scholarships"),
      applications: t("My Applications"),
      community: t("Community"),
      saved: t("Saved Scholarships"),
      aiMatches: t("AI Matches"),
      aiChat: t("AI Chatbot"),
      profile: t("Profile"),
      billing: t("Billing"),
      settings: t("Settings"),
      documents: t("Documents"),
    },
    { documentsLabel }
  )

  return (
    <aside className="hidden w-72 shrink-0 border-r border-blue-100/70 bg-white p-6 md:block">
      <div className="mb-8 flex items-center gap-3">
        <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
      </div>
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
        {t("Student Portal")}
      </h2>

      <nav className="space-y-1.5">
        {links.map((item) => {
          const Icon = item.icon
          const active = isStudentSidebarActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 px-3 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
                  : "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              }
            >
              <span
                className={
                  active
                    ? "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100"
                    : "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200"
                }
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
