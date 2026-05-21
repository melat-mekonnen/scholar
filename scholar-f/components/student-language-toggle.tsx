"use client"

import { usePathname } from "next/navigation"

import { useStudentI18n } from "@/lib/student-i18n"
import { Button } from "@/components/ui/button"

const STUDENT_ROUTE_PREFIXES = [
  "/dashboard",
  "/scholarships",
  "/applications",
  "/community",
  "/saved",
  "/profile",
  "/settings",
  "/documents",
  "/ai-matches",
  "/ai-chat",
]

export function StudentLanguageToggle() {
  const pathname = usePathname()
  const { lang, setLang } = useStudentI18n()

  const onStudentRoute = STUDENT_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  if (!onStudentRoute) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border bg-background p-1 shadow-sm">
      <Button
        size="sm"
        variant={lang === "en" ? "default" : "ghost"}
        className="h-8 rounded-full px-3"
        onClick={() => setLang("en")}
      >
        EN
      </Button>
      <Button
        size="sm"
        variant={lang === "am" ? "default" : "ghost"}
        className="h-8 rounded-full px-3"
        onClick={() => setLang("am")}
      >
        አማ
      </Button>
    </div>
  )
}

