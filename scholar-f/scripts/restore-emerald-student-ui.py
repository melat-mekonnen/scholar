"""Restore emerald student portal sidebars (pre–owner-shell redesign)."""
import re
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"

PAGES = {
    "dashboard/page.tsx": "/dashboard",
    "scholarships/page.tsx": "/scholarships",
    "applications/page.tsx": "/applications",
    "community/page.tsx": "/community",
    "saved/page.tsx": "/saved",
    "ai-matches/page.tsx": "/ai-matches",
    "ai-chat/page.tsx": "/ai-chat",
    "profile/page.tsx": "/profile",
    "settings/page.tsx": "/settings",
    "documents/page.tsx": "/documents",
}

ASIDE_BLOCK = re.compile(
    r"<aside className=\"hidden w-72[^\"]*\"[^>]*>.*?</aside>\s*",
    re.DOTALL,
)

SIDEBAR_LINKS_ARRAY = re.compile(
    r"\n\s*const sidebarLinks = \[[\s\S]*?\n\s*\]\n",
)

SIDEBAR_LINKS_MEMO = re.compile(
    r"\n\s*const sidebarLinks = useMemo\(\s*\(\) => \[[\s\S]*?\n\s*\],\s*\[[^\]]*\]\s*\)\n",
)


def ensure_imports(text: str) -> str:
    if "StudentPortalSidebar" in text:
        return text
    block = (
        'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n'
        'import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"\n'
    )
    if 'import { ProfileAvatarLink }' in text:
        return text.replace(
            'import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"\n',
            block,
        )
    return text.replace('"use client"\n\n', '"use client"\n\n' + block + "\n", 1)


def emeraldize(text: str) -> str:
    pairs = [
        ("flex min-h-screen bg-slate-50", "flex min-h-screen bg-slate-100"),
        ("min-h-screen bg-slate-50", "min-h-screen bg-slate-100"),
        ("border-blue-100/70", "border-slate-200/80"),
        ("border-blue-100/80", "border-emerald-100/80"),
        ("border border-blue-100 ", "border border-emerald-100/80 "),
        ("border-blue-100 ", "border-emerald-100/80 "),
        (
            "border-b border-slate-200/80 bg-white/95 p-4 backdrop-blur",
            "border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm md:px-6",
        ),
        ("from-blue-50 to-emerald-50", "from-emerald-50 to-teal-50"),
        ("from-blue-600 to-emerald-600", "from-emerald-500 to-teal-500"),
        ("bg-gradient-to-r from-blue-600", "bg-gradient-to-r from-emerald-500"),
        ("text-blue-700", "text-emerald-800"),
        ("text-blue-50", "text-slate-600"),
        ("ring-blue-100", "ring-emerald-200/80"),
        ("from-blue-500 to-emerald-500", "from-emerald-500 to-teal-500"),
        ("hover:text-blue-700", "hover:text-emerald-800"),
        ("bg-blue-600 text-white", "bg-teal-600 text-white"),
    ]
    for a, b in pairs:
        text = text.replace(a, b)
    return text


for rel, active in PAGES.items():
    path = APP / rel
    if not path.exists():
        print("skip", rel)
        continue
    t = path.read_text(encoding="utf-8")
    orig = t
    t = SIDEBAR_LINKS_ARRAY.sub("\n", t)
    t = SIDEBAR_LINKS_MEMO.sub("\n", t)
    t = ensure_imports(t)
    if ASIDE_BLOCK.search(t):
        t = ASIDE_BLOCK.sub(
            f'<StudentPortalSidebar activeHref="{active}" />\n\n      ',
            t,
            count=1,
        )
    t = emeraldize(t)
    if t != orig:
        path.write_text(t, encoding="utf-8")
        print("updated", rel)
