"use client"

import { usePathname } from "next/navigation"

import { useStudentI18n } from "@/lib/student-i18n"
import {
  getStudentSidebarLinks,
  isStudentSidebarActive,
  type StudentSidebarLink,
} from "@/lib/student-portal-sidebar"

/**
 * @deprecated Prefer `<StudentPortalInlineAside />` (same as main `StudentPortalSidebar`).
 * Sidebar nav with Billing + i18n labels (parity with main).
 */
export function useStudentSidebarNav(): StudentSidebarLink[] {
  const pathname = usePathname()
  const { t } = useStudentI18n()

  const links = getStudentSidebarLinks({
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
  })

  return links.map((item) => ({
    ...item,
    active: isStudentSidebarActive(pathname, item.href),
  }))
}
