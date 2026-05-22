import re
from pathlib import Path

PAGES = [
    "app/dashboard/page.tsx",
    "app/scholarships/page.tsx",
    "app/saved/page.tsx",
    "app/ai-matches/page.tsx",
    "app/ai-chat/page.tsx",
    "app/community/page.tsx",
    "app/documents/page.tsx",
    "app/profile/page.tsx",
    "app/applications/page.tsx",
    "app/settings/page.tsx",
]

ASIDE_RE = re.compile(
    r"\n\s*<aside className=\"hidden w-72[\s\S]*?</aside>",
    re.MULTILINE,
)

IMPORT_INLINE = (
    'import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"\n'
)
IMPORT_SIDEBAR = 'import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"\n'

for rel in PAGES:
    p = Path(rel)
    text = p.read_text(encoding="utf-8")
    if "<StudentPortalInlineAside" in text:
        print("already shared sidebar", rel)
        continue
    if "const sidebarLinks = useStudentSidebarNav()" in text:
        text = text.replace("  const sidebarLinks = useStudentSidebarNav()\n\n", "")
    elif "const sidebarLinks = useStudentSidebarNav()\n" in text:
        text = text.replace("  const sidebarLinks = useStudentSidebarNav()\n", "")

    text = re.sub(
        r'import \{ useStudentSidebarNav \} from "@/hooks/use-student-sidebar-nav"\n',
        "",
        text,
    )

    if IMPORT_INLINE not in text:
        anchor = "import { StudentPortalSidebarLogout }"
        if anchor in text:
            text = text.replace(anchor, IMPORT_INLINE + anchor, 1)
        else:
            anchor = 'import { ProfileAvatarLink }'
            text = text.replace(anchor, IMPORT_INLINE + anchor, 1)

    new_text, n = ASIDE_RE.subn("\n      <StudentPortalInlineAside />", text, count=1)
    if n != 1:
        print("WARN aside not replaced", rel, n)
        continue
    p.write_text(new_text, encoding="utf-8", newline="\n")
    print("ok", rel)
