from pathlib import Path

line = 'import { StudentPortalSidebarLogout } from "@/components/student-portal/student-portal-sidebar-logout"\n'

for p in Path("app").rglob("page.tsx"):
    text = p.read_text(encoding="utf-8")
    if "StudentPortalInlineAside" not in text or line not in text:
        continue
    p.write_text(text.replace(line, "", 1), encoding="utf-8", newline="\n")
    print("cleaned", p)
