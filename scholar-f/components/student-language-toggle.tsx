"use client"

import { usePathname } from "next/navigation"

import { useStudentI18n } from "@/lib/student-i18n"
import { Button } from "@/components/ui/button"

const STUDENT_ROUTES = new Set([
  "/dashboard",
  "/scholarships",
  "/applications",
  "/community",
  "/saved",
  "/profile",
  "/settings",
  "/documents",
])

export function StudentLanguageToggle() {
  const pathname = usePathname()
  const { lang, setLang } = useStudentI18n()

  if (!STUDENT_ROUTES.has(pathname)) return null

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

