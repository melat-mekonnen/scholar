import type { LucideIcon } from "lucide-react"
import {
  Bookmark,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react"

export type StudentSidebarLink = {
  href: string
  label: string
  icon: LucideIcon
  active?: boolean
}

export type StudentSidebarLabels = {
  dashboard: string
  scholarships: string
  applications: string
  community: string
  saved: string
  aiMatches?: string
  aiChat?: string
  profile: string
  billing: string
  settings: string
  documents: string
}

const DEFAULT_LABELS: StudentSidebarLabels = {
  dashboard: "Dashboard",
  scholarships: "Browse Scholarships",
  applications: "My Applications",
  community: "Community",
  saved: "Saved Scholarships",
  aiMatches: "AI Matches",
  aiChat: "AI Chatbot",
  profile: "Profile",
  billing: "Billing",
  settings: "Settings",
  documents: "Document Resources",
}

export function getStudentSidebarLinks(
  labels: Partial<StudentSidebarLabels> = {},
  options?: { activeHref?: string; documentsLabel?: string }
): StudentSidebarLink[] {
  const L = { ...DEFAULT_LABELS, ...labels }
  const activeHref = options?.activeHref
  const documentsLabel = options?.documentsLabel ?? L.documents

  const link = (href: string, label: string, icon: LucideIcon): StudentSidebarLink => ({
    href,
    label,
    icon,
    active: activeHref === href,
  })

  return [
    link("/dashboard", L.dashboard, LayoutDashboard),
    link("/scholarships", L.scholarships, Search),
    link("/applications", L.applications, FileText),
    link("/community", L.community, Users),
    link("/saved", L.saved, Bookmark),
    link("/ai-matches", L.aiMatches!, Sparkles),
    link("/ai-chat", L.aiChat!, MessageSquare),
    link("/profile", L.profile, UserCircle2),
    link("/settings/subscription", L.billing, CreditCard),
    link("/settings", L.settings, Settings),
    link("/documents", documentsLabel, FolderOpen),
  ]
}

export function isStudentSidebarActive(pathname: string, href: string): boolean {
  if (href === "/settings") {
    return pathname === "/settings"
  }
  if (href === "/settings/subscription") {
    return pathname === "/settings/subscription" || pathname.startsWith("/settings/subscription/")
  }
  return pathname === href
}
