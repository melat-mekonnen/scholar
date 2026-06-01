"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useStudentI18n } from "@/lib/student-i18n"
import { getStudentSidebarLinks, isStudentSidebarActive } from "@/lib/student-portal-sidebar"
import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"

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
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex">
      <div className="flex min-h-0 flex-1 flex-col p-6">
        <div className="mb-8 flex items-center gap-3">
          <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
        </div>
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          {t("Student Portal")}
        </p>

        <nav className="flex flex-col gap-0.5">
          {links.map((item) => {
            const Icon = item.icon
            const active = isStudentSidebarActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                    : "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
                }
              >
                <span
                  className={
                    active
                      ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"
                      : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                ) : (
                  <span className="w-1.5 shrink-0" aria-hidden />
                )}
              </Link>
            )
          })}
        </nav>

        <StudentPortalSidebarLogout tone="primary" className="mt-auto border-emerald-100/80 pt-6" />
      </div>
    </aside>
  )
}
