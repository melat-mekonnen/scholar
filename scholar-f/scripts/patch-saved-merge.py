#!/usr/bin/env python3
"""Merge saved page: ui-update2 shell + main bookmarks/apply logic."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "saved" / "page.tsx"

main = subprocess.check_output(["git", "show", "main:scholar-f/app/saved/page.tsx"]).decode("utf-8")
head = subprocess.check_output(["git", "show", "HEAD:scholar-f/app/saved/page.tsx"]).decode("utf-8")

# Logic + handlers from main (before return)
m = re.split(r"\n  return \(\n", main, maxsplit=1)
logic = m[0]

# Replace imports block in logic
logic = re.sub(
    r'import \{ StudentPortalSidebar \} from "@/components/student-portal/student-portal-sidebar"\n',
    "",
    logic,
)
logic = re.sub(
    r'import \{ apiFetchJson \} from "@/lib/api"\n',
    "",
    logic,
)
logic = logic.replace(
    'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n',
    'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n'
    'import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"\n'
    'import { StudentLanguageToggle } from "@/components/student-language-toggle"\n',
)
logic = re.sub(
    r"import \{ StudentPortalFooter \}.*?import \{ cn \} from \"@/lib/utils\"\n\n",
    "",
    logic,
    flags=re.DOTALL,
)

# Add missing lucide icons for sidebar
if "Sparkles" not in logic:
    logic = logic.replace(
        "  Users,\n",
        "  Users,\n  Sparkles,\n  MessageSquare,\n",
    )

# apiFetchJson needed for loadMe in main
if "apiFetchJson" not in logic:
    logic = logic.replace(
        'import { clearToken } from "@/lib/auth"\n',
        'import { clearToken } from "@/lib/auth"\nimport { apiFetchJson } from "@/lib/api"\n',
    )

# Layout from HEAD (sidebarLinks through end)
h = re.split(r"\n  const sidebarLinks = \[\n", head, maxsplit=1)
if len(h) < 2:
    raise SystemExit("sidebarLinks not found in HEAD")
layout = "  const sidebarLinks = [\n" + h[1]

# Fix header: add language toggle + optional me badge from main
layout = layout.replace(
    """        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <h1 className="text-lg font-semibold text-emerald-950">Saved Scholarships</h1>
          <ProfileAvatarLink />
        </header>""",
    """        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-emerald-950">Saved Scholarships</h1>
            {me?.role ? (
              <Badge className="capitalize border-emerald-200 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
                {me.role}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>""",
)

layout = layout.replace(
    "      <div className=\"flex min-h-screen flex-1 flex-col\">",
    "      <div className=\"flex min-h-0 min-w-0 flex-1 flex-col\">",
)

# Fix middot encoding if present
layout = layout.replace(" Â· ", " · ")

OUT.write_text(logic + "\n  return (\n" + layout, encoding="utf-8", newline="\n")
print("wrote", OUT, "lines", len((logic + layout).splitlines()))
