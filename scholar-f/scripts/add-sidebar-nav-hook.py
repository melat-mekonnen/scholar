import re
from pathlib import Path

PAGES = [
    "app/saved/page.tsx",
    "app/ai-matches/page.tsx",
    "app/ai-chat/page.tsx",
    "app/community/page.tsx",
    "app/documents/page.tsx",
    "app/profile/page.tsx",
    "app/applications/page.tsx",
    "app/settings/page.tsx",
]

for rel in PAGES:
    p = Path(rel)
    text = p.read_text(encoding="utf-8")
    if "const sidebarLinks = [" not in text:
        print("skip", rel)
        continue
    if "useStudentSidebarNav" in text:
        print("already", rel)
        continue
    if "use-student-sidebar-nav" not in text:
        anchor = "import { StudentPortalSidebarLogout }"
        if anchor not in text:
            anchor = "import { ProfileAvatarLink }"
        text = text.replace(
            anchor,
            'import { useStudentSidebarNav } from "@/hooks/use-student-sidebar-nav"\n' + anchor,
            1,
        )
    text = re.sub(
        r"  const sidebarLinks = \[[\s\S]*?  \]\n",
        "  const sidebarLinks = useStudentSidebarNav()\n",
        text,
        count=1,
    )
    p.write_text(text, encoding="utf-8", newline="\n")
    print("updated", rel)
