"""Restore per-page inline emerald sidebars (state before owner-style sidebar redesign)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"

LUCIDE_IMPORT = """import {
  LayoutDashboard,
  Search,
  FileText,
  Users,
  Bookmark,
  Sparkles,
  MessageSquare,
  UserCircle2,
  Settings,
  FolderOpen,
} from "lucide-react"
"""

LOGOUT_IMPORT = 'import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"\n'

SIDEBAR_LINKS = """  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: {active_dashboard} },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: {active_scholarships} },
    { href: "/applications", label: "My Applications", icon: FileText, active: {active_applications} },
    { href: "/community", label: "Community", icon: Users, active: {active_community} },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: {active_saved} },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: {active_ai_matches} },
    { href: "/ai-chat", label: "AI Chatbot", icon: MessageSquare, active: {active_ai_chat} },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: {active_profile} },
    { href: "/settings", label: "Settings", icon: Settings, active: {active_settings} },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: {active_documents} },
  ]
"""

ASIDE = """      <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5 md:flex md:min-h-screen md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-8 flex items-center gap-3">
            <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Student Portal</p>

          <nav className="flex flex-col gap-0.5">
            {sidebarLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.active
                      ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
                      : "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-[color,background-color,box-shadow] duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]"
                  }
                >
                  <span
                    className={
                      item.active
                        ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-teal-100"
                        : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[color,background-color,box-shadow,ring-color] duration-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-[0_2px_10px_-2px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-300/80"
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.active ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                  ) : (
                    <span className="w-1.5 shrink-0" aria-hidden />
                  )}
                </Link>
              )
            })}
          </nav>
          <StudentPortalSidebarLogout tone="primary" className="mt-10 border-emerald-100/80" />
        </div>
      </aside>
"""

PAGES = {
    "dashboard/page.tsx": "dashboard",
    "scholarships/page.tsx": "scholarships",
    "applications/page.tsx": "applications",
    "community/page.tsx": "community",
    "saved/page.tsx": "saved",
    "ai-matches/page.tsx": "ai_matches",
    "ai-chat/page.tsx": "ai_chat",
    "profile/page.tsx": "profile",
    "settings/page.tsx": "settings",
    "documents/page.tsx": "documents",
}

def active_flags(key: str) -> dict[str, str]:
    keys = [
        "dashboard",
        "scholarships",
        "applications",
        "community",
        "saved",
        "ai_matches",
        "ai_chat",
        "profile",
        "settings",
        "documents",
    ]
    return {f"active_{k}": "true" if k == key else "false" for k in keys}


def process(path: Path, active_key: str) -> None:
    text = path.read_text(encoding="utf-8")
    if "sidebarLinks.map" in text and "StudentPortalSidebar" not in text:
        print("skip already inline", path.name)
        return

    text = re.sub(
        r'import \{ StudentPortalSidebar \} from "@/components/student-portal/student-portal-sidebar"\n',
        "",
        text,
    )

    if "LayoutDashboard" not in text:
        text = text.replace('"use client"\n\n', '"use client"\n\n' + LUCIDE_IMPORT + "\n", 1)

    if "StudentPortalSidebarLogout" not in text:
        if 'from "@/components/student-portal/profile-avatar-link"' in text:
            text = text.replace(
                'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n',
                'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n' + LOGOUT_IMPORT,
            )
        else:
            text = text.replace('"use client"\n\n', '"use client"\n\n' + LOGOUT_IMPORT, 1)

    flags = active_flags(active_key)
    links = SIDEBAR_LINKS
    for k, v in flags.items():
        links = links.replace("{" + k + "}", v)

    if "const sidebarLinks" not in text:
        text = re.sub(
            r"\n  return \(\n",
            "\n" + links + "\n  return (\n",
            text,
            count=1,
        )

    aside = ASIDE
    text = re.sub(
        r"<StudentPortalSidebar activeHref=\"[^\"]+\" />\s*\n\s*",
        aside + "\n",
        text,
        count=1,
    )

    path.write_text(text, encoding="utf-8")
    print("inlined", path.relative_to(APP.parent))


for rel, key in PAGES.items():
    p = APP / rel
    if p.exists():
        process(p, key)
