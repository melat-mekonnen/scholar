"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type StudentLang = "en" | "am"

const STORAGE_KEY = "student_lang"

/** English UI strings mapped to Amharic (via Google Translate, with scholarship-context fixes). */
const AMHARIC: Record<string, string> = {
  "Scholarship Portal": "የስኮላርሺፕ ፖርታል",
  Dashboard: "ዳሽቦርድ",
  "Browse Scholarships": "ስኮላርሺፖችን ያስሱ",
  "My Applications": "የእኔ ማመልከቻዎች",
  Community: "ማህበረሰብ",
  "Saved Scholarships": "የተቀመጡ ስኮላርሺፖች",
  "Active Applications": "ንቁ ማመልከቻዎች",
  "Recommended Matches": "የተመከሩ ግጥሚያዎች",
  "Upcoming Deadlines": "ቀጣይ ቀነ-ገደቦች",
  "Recommended Scholarships": "የተመከሩ ስኮላርሺፖች",
  "Discover scholarships that match your profile.": "ከመገለጫዎ ጋር የሚዛመዱ ስኮላርሺፖችን ያግኙ።",
  Profile: "መገለጫ",
  Settings: "ቅንብሮች",
  Billing: "የሂሳብ አከፋፈል",
  Documents: "ሰነዶች",
  "Welcome back": "እንኳን ደህና መጡ",
  "Loading...": "በመጫን ላይ...",
  Loading: "በመጫን ላይ",
  "Browse scholarships": "ስኮላርሺፖችን ያስሱ",
  Saved: "ተቀምጧል",
  "Back to Dashboard": "ወደ ዳሽቦርድ ተመለስ",
  "No results": "ምንም ውጤት የለም",
  Filters: "ማጣሪያዎች",
  Country: "ሀገር",
  "Degree level": "የዲግሪ ደረጃ",
  "Field of study": "የጥናት መስክ",
  "Funding type": "የገንዘብ ድጋፍ ዓይነት",
  Deadline: "ቀነ-ገደብ",
  "Clear filters": "ማጣሪያዎችን አጽዳ",
  Reset: "ዳግም አስጀምር",
  View: "ይመልከቱ",
  Apply: "ያመልክቱ",
  "Mark all read": "ሁሉንም እንደተነበቡ ምልክት ያድርጉ",
  "AI Matches": "AI ግጥሚያዎች",
  "AI Chatbot": "AI ውይይት ረዳት",
  "Student Portal": "የተማሪ ፖርታል",
  "Document Resources": "የሰነድ መርጃዎች",
  Verified: "የተረጋገጠ",
  "Study programme": "የጥናት ፕሮግራም",
  "Fees apply": "ክፍያ ይጠይቃል",
  "About this scholarship": "ስለዚህ ስኮላርሺፕ",
  "About this programme": "ስለዚህ ፕሮግራም",
  "Dates not specified": "ቀኖች አልተገለጹም",
  Opens: "ይከፈታል",
  Closes: "ይዘጋል",
  Applications: "ማመልከቻዎች",
  Status: "ሁኔታ",
  "Applications open": "ማመልከቻዎች ክፍት ናቸው",
  "Applications closed": "ማመልከቻዎች ተዘጉ",
  "Rolling applications": "ቀጣይ / ተራ ማመልከቻ",
  "Apply on official site": "በኦፊሴላዊ ጣቢያ ያመልክቱ",
  "View details": "ዝርዝር ይመልከቱ",
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

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang
    }
  }, [lang])

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
      t: (text: string) => translateLabel(lang, text),
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
