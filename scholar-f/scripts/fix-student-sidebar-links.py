"""Fix sidebarLinks scope and lucide imports on student pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

SIDEBAR_BLOCK = """  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search, active: false },
    { href: "/applications", label: "My Applications", icon: FileText, active: false },
    { href: "/community", label: "Community", icon: Users, active: false },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark, active: false },
    { href: "/ai-matches", label: "AI Matches", icon: Sparkles, active: false },
    { href: "/ai-chat", label: "AI Chatbot", icon: MessageSquare, active: false },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: false },
    { href: "/settings", label: "Settings", icon: Settings, active: false },
    { href: "/documents", label: "Document Resources", icon: FolderOpen, active: false },
  ]

"""

SIDEBAR_RE = re.compile(
    r"\n  const sidebarLinks = \[\n.*?\n  \]\n\n",
    re.DOTALL,
)


def strip_sidebar_from_navlink(t: str) -> str:
    return SIDEBAR_RE.sub("\n", t, count=1)


def fix_ai_chat():
    p = ROOT / "app/ai-chat/page.tsx"
    t = p.read_text(encoding="utf-8")
    t = t.replace("import { Bot, Send, Sparkles, User } from \"lucide-react\"", "import { Bot, Send, User } from \"lucide-react\"")
    t = strip_sidebar_from_navlink(t)
    active = SIDEBAR_BLOCK.replace("ai-chat\", label: \"AI Chatbot\", icon: MessageSquare, active: false", "ai-chat\", label: \"AI Chatbot\", icon: MessageSquare, active: true")
    if "const sidebarLinks" not in t.split("export default function AiChatPage")[1].split("return (")[0]:
        t = t.replace("    setSending(false)\n  }\n\n  return (", "    setSending(false)\n  }\n\n" + active + "  return (")
    p.write_text(t, encoding="utf-8", newline="\n")
    print("ai-chat: ok")


def fix_ai_matches():
    p = ROOT / "app/ai-matches/page.tsx"
    t = p.read_text(encoding="utf-8")
    t = t.replace('import { Sparkles } from "lucide-react"\n\n', "")
    t = strip_sidebar_from_navlink(t)
    active = SIDEBAR_BLOCK.replace("ai-matches\", label: \"AI Matches\", icon: Sparkles, active: false", "ai-matches\", label: \"AI Matches\", icon: Sparkles, active: true")
    if "const sidebarLinks" not in t.split("export default function AiMatchesPage")[1].split("return (")[0]:
        t = t.replace("  }, [router])\n\n  return (", "  }, [router])\n\n" + active + "  return (")
    p.write_text(t, encoding="utf-8", newline="\n")
    print("ai-matches: ok")


def fix_community():
    p = ROOT / "app/community/page.tsx"
    t = p.read_text(encoding="utf-8")
    t = strip_sidebar_from_navlink(t)
    active = SIDEBAR_BLOCK.replace("community\", label: \"Community\", icon: Users, active: false", "community\", label: \"Community\", icon: Users, active: true")
    if "const canPost" in t and "const sidebarLinks" not in t.split("const canPost")[1].split("return (")[0]:
        t = t.replace("  const canPost = me?.role === \"student\" || me?.role === \"admin\"\n\n  return (", "  const canPost = me?.role === \"student\" || me?.role === \"admin\"\n\n" + active + "  return (")
    p.write_text(t, encoding="utf-8", newline="\n")
    print("community: ok")


def add_imports(path: Path, extra: str):
    t = path.read_text(encoding="utf-8")
    if extra.split(",")[0].strip() in t:
        return
    t = t.replace("  Bookmark,\n", f"  Bookmark,\n{extra}\n")
    path.write_text(t, encoding="utf-8", newline="\n")


def fix_settings():
    p = ROOT / "app/settings/page.tsx"
    t = p.read_text(encoding="utf-8")
    if "Sparkles," not in t:
        t = t.replace("  Bookmark,\n", "  Bookmark,\n  Sparkles,\n  MessageSquare,\n")
    t = t.replace(
        '{ href: "/settings", label: "Settings", icon: Settings, active: true }',
        '{ href: "/settings", label: "Settings", icon: SettingsIcon, active: true }',
    )
    p.write_text(t, encoding="utf-8", newline="\n")
    print("settings: ok")


if __name__ == "__main__":
    fix_ai_chat()
    fix_ai_matches()
    fix_community()
    add_imports(ROOT / "app/profile/page.tsx", "  Sparkles,\n  MessageSquare,")
    add_imports(ROOT / "app/saved/page.tsx", "  Sparkles,\n  MessageSquare,")
    fix_settings()
    print("done")
