import re
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"
pat = re.compile(r'<aside className="hidden w-64[^"]*"[^>]*>.*?</aside>\s*', re.DOTALL)
pages = {
    "community/page.tsx": "/community",
    "ai-chat/page.tsx": "/ai-chat",
    "ai-matches/page.tsx": "/ai-matches",
}

for rel, active in pages.items():
    p = APP / rel
    t = p.read_text(encoding="utf-8")
    orig = t
    if "StudentPortalSidebar" not in t:
        block = (
            'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n'
            'import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"\n'
        )
        if 'import { ProfileAvatarLink }' in t:
            t = t.replace(
                'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n',
                block,
            )
        else:
            t = t.replace('"use client"\n\n', '"use client"\n\n' + block + "\n", 1)
    t = pat.sub(f'<StudentPortalSidebar activeHref="{active}" />\n\n      ', t, count=1)
    t = t.replace("flex min-h-screen bg-background", "flex min-h-screen bg-slate-100 text-slate-900")
    t = t.replace(
        "border-b bg-card px-4 py-3",
        "border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm md:px-6",
    )
    if t != orig:
        p.write_text(t, encoding="utf-8")
        print("fixed", rel)
