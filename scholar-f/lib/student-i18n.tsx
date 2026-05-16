"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type StudentLang = "en" | "am"

const STORAGE_KEY = "student_lang"

const AMHARIC: Record<string, string> = {
  "Scholarship Portal": "የስኮላርሺፕ ፖርታል",
  Dashboard: "ዳሽቦርድ",
  "Browse Scholarships": "ስኮላርሺፖችን ይመልከቱ",
  "My Applications": "የእኔ ማመልከቻዎች",
  Community: "ማህበረሰብ",
  "Saved Scholarships": "የተቀመጡ ስኮላርሺፖች",
  Profile: "መገለጫ",
  Settings: "ቅንብሮች",
  Documents: "ሰነዶች",
  "Welcome back": "እንኳን ደህና መጡ",
  "Loading...": "በመጫን ላይ...",
  Loading: "በመጫን ላይ...",
  "Browse scholarships": "ስኮላርሺፖችን ይመልከቱ",
  Saved: "ተቀምጧል",
  "Back to Dashboard": "ወደ ዳሽቦርድ ተመለስ",
  "No results": "ውጤት አልተገኘም",
  Filters: "ማጣሪያዎች",
  Country: "ሀገር",
  "Degree level": "የትምህርት ደረጃ",
  "Field of study": "የትምህርት መስክ",
  "Funding type": "የድጋፍ አይነት",
  Deadline: "መጨረሻ ቀን",
  "Clear filters": "ማጣሪያዎችን አጥፋ",
  "Reset": "እንደነበረ መልስ",
  View: "ይመልከቱ",
  Apply: "ያመልክቱ",
  "Mark all read": "ሁሉንም እንደተነበበ አድርግ",
  "AI Matches": "AI ማዕከለኛ ውጤቶች",
  "AI Chatbot": "AI ደብረ ተዋናይ",
  "Student Portal": "የተማሪ ፖርታል",
  "Document Resources": "ሰነድ ሀብቶች",
}

type StudentI18nContextValue = {
  lang: StudentLang
  setLang: (lang: StudentLang) => void
  t: (text: string) => string
}

const StudentI18nContext = createContext<StudentI18nContextValue | null>(null)

export function StudentI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<StudentLang>("en")

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (saved === "en" || saved === "am") {
      setLangState(saved)
    }
  }, [])

  function setLang(next: StudentLang) {
    setLangState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  const value = useMemo<StudentI18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (text: string) => (lang === "am" ? AMHARIC[text] ?? text : text),
    }),
    [lang],
  )

  return <StudentI18nContext.Provider value={value}>{children}</StudentI18nContext.Provider>
}

export function useStudentI18n() {
  const ctx = useContext(StudentI18nContext)
  if (!ctx) {
    throw new Error("useStudentI18n must be used within StudentI18nProvider")
  }
  return ctx
}

