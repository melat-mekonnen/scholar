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
  "Applications open": "ማመልከቻ ክፍት ነው",
  "Applications closed": "ማመልከቻ ተዘግቷል",
  "Rolling applications": "ቀጣይ ማመልከቻ",
  "Apply on official site": "በኦፊሴላዊ ጣቢያ ላይ ያመልክቱ",
  "View details": "ዝርዝሮችን ይመልከቱ",
  Close: "ዝጋ",
  "Find your next scholarship": "የሚቀጥለውን ስኮላርሺፕዎን ያግኙ",
  "Search verified opportunities and filter by host region, eligibility, degree, field, and funding.":
    "የተረጋገጡ እድሎችን ይፈልጉ እና በአስተናጋጅ ክልል፣ ብቁነት፣ ዲግሪ፣ መስክ እና የገንዘብ ድጋፍ ያጣሩ",
  "Search by keyword (e.g. engineering, Germany, fully funded)":
    "በቁልፍ ቃል ይፈልጉ (ለምሳሌ ምህንድስና፣ ጀርመን፣ ሙሉ ድጋፍ)",
  Sort: "ደርድር",
  Relevance: "አግባብነት",
  "Featured mix": "ተለዋዋጭ ምርጫ",
  "Deadline (soonest)": "ቀነ-ገደብ (በቅርቡ)",
  "Deadline (latest)": "ቀነ-ገደብ (ከፍተኛ)",
  "Funding amount": "የገንዘብ ድጋፍ መጠን",
  "Recently added": "በቅርቡ ታክሏል",
  Availability: "ተገኝነት",
  "Host region": "አስተናጋጅ ክልል",
  "Eligible regions": "ብቁ ክልሎች",
  Eligible: "ብቁ",
  "Open now": "አሁን ክፍት",
  Rolling: "ቀጣይ",
  "Closing soon": "በቅርቡ ይዘጋል",
  From: "ከ",
  To: "እስከ",
  "No options match your search.": "ከፍለጋዎ ጋር የሚዛመዱ አማራጮች የሉም",
  "Host regions will appear when the backend returns filter options.":
    "የማጣሪያ አማራጮች ሲኖሩ አስተናጋጅ ክልሎች ይታያሉ",
  "Eligible regions will appear when the backend returns filter options.":
    "የማጣሪያ አማራጮች ሲኖሩ ብቁ ክልሎች ይታያሉ",
  "Fields will appear when the backend returns filter options.":
    "የማጣሪያ አማራጮች ሲኖሩ የጥናት መስኮች ይታያሉ",
  "Funding types will appear when the backend returns filter options.":
    "የማጣሪያ አማራጮች ሲኖሩ የገንዘብ ድጋፍ ዓይነቶች ይታያሉ",
  "Active filters": "ንቁ ማጣሪያዎች",
  "Clear all": "ሁሉንም አጽዳ",
  All: "ሁሉም",
  Submitted: "ተላልፏል",
  "Not submitted": "አልተላለፈም",
  Pending: "በመጠባበቅ ላይ",
  saved: "ተቀምጧል",
  results: "ውጤቶች",
  Page: "ገጽ",
  of: "ከ",
  Search: "ፈልግ",
  "Failed to load scholarships": "ስኮላርሺፖችን መጫን አልተሳካም",
  "Try adjusting your filters or searching with different keywords.":
    "ማጣሪያዎችዎን ይለውጡ ወይም በተለያዩ ቁልፍ ቃላት ይፈልጉ",
  "Clear search & filters": "ፍለጋን እና ማጣሪያዎችን አጽዱ",
  "Sign in required": "መግባት ያስፈልጋል",
  "Sign in to filter scholarships by application status.":
    "በማመልከቻ ሁኔታ ለማጣራት ይግቡ",
  Previous: "ቀዳሚ",
  Next: "ቀጣይ",
  "Open / rolling": "ክፍት / ቀጣይ",
  "fully funded": "ሙሉ ድጋፍ",
  "partially funded": "ከፊል ድጋፍ",
  "self funded": "በራስ የገንዘብ ድጋፍ",
  "high school": "ሁለተኛ ደረጃ ትምህርት",
  bachelor: "የመጀመሪያ ዲግሪ",
  master: "ሁለተኛ ዲግሪ",
  phd: "ዶክትሬት",
  "United Kingdom": "ዩናይትድ ኪንግደም",
  "North America": "ሰሜን አሜሪካ",
  Europe: "አውሮፓ",
  Africa: "አፍሪካ",
  "Asia-Pacific": "እስያ-ፓሲፊክ",
  "Global / multi-country": "ዓለም አቀፍ / ባለብዙ-ሀገር",
  Commonwealth: "ኮመንዌልዝ",
  "Developing countries": "በማደግ ላይ ያሉ ሀገሮች",
  Asia: "እስያ",
  international: "ዓለም አቀፍ",
  "Public health": "የህዝብ ጤና",
  "International development": "ዓለም አቀፍ ልማት",
  "Business & management": "ንግድ እና አስተዳደር",
  "Data science & analytics": "የውሂብ ሳይንስ እና ትንታኔ",
  Law: "ሕግ",
  Education: "ትምህርት",
  "Engineering & technology": "ምህንድስና እና ቴክኖሎጂ",
  "Doctoral research": "የዶክትሬት ጥናት",
  "Professional development": "ሙያዊ እድገት",
  "General / multi-disciplinary": "አጠቃላይ / ባለብዙ-ዲሲፕሊን",
  About: "ስለ",
  Eligibility: "ብቁነት",
  "How to apply": "እንዴት እንደሚያመልክቱ",
  Benefits: "ጥቅሞች",
  Requirements: "መስፈርቶች",
  "No extended description is available for this listing.":
    "ለዚህ ዝርዝር ተጨማሪ መግለጫ የለም",
  Scholarship: "ስኮላርሺፕ",
  "Apply (link unavailable)": "ያመልክቱ (ሊንክ የለም)",
  "Could not track application": "ማመልከቻ መከታተል አልተሳካም",
  "Failed to save this application in your tracker.":
    "ይህን ማመልከቻ በመከታተያዎ ውስጥ መቀመጥ አልተሳካም",
  "Application started": "ማመልከቻ ተጀመረ",
  "Already in your application tracker.": "ቀድሞውኑ በማመልከቻ መከታተያዎ ውስጥ ነው",
  "Saved to your application tracker.": "በማመልከቻ መከታተያዎ ውስጥ ተቀምጧል",
  "United States": "ዩናይትድ ስቴተት",
  Germany: "ጀርመን",
  France: "ፈረንሳይ",
  Canada: "ካናዳ",
  Australia: "አውስትራሊያ",
  China: "ቻይና",
  Japan: "ጃፓን",
  Netherlands: "ኔዘርላንድ",
  "multiple disciplines": "በርካታ ዲሲፕሊኖች",
  "Multiple disciplines": "በርካታ ዲሲፕሊኖች",
  general: "አጠቃላይ",
  General: "አጠቃላይ",
  "Important dates": "አስፈላጊ ቀናት",
  "Selection process": "የምርጫ ሂደት",
  Overview: "አጠቃላይ እይታ",
  Funding: "የገንዘብ ድጋፍ",
  "Official links": "ይፋዊ ሊንኮች",
  "Degree level:": "የዲግሪ ደረጃ:",
  "Field of study:": "የጥናት መስክ:",
  "Host / destination:": "አስተናጋጅ / መድረሻ:",
  "Funding type:": "የገንዘት ድጋፍ ዓይነት:",
  "Apply via the official page:": "በይፋዊ ገጽ በኩል ያመልክቱ:",
  "not funded": "ገንዘብ አልተደገፈም",
  "not funded": "ድጋፍ የለም",
  "Templates and guides for your scholarship applications.":
    "ለስኮላርሺፕ ማመልከቻዎችዎ አብነቶች እና መመሪያዎች",
  "Failed to load documents": "ሰነዶችን መጫን አልተሳካም",
}

function lookupAmharic(text: string): string | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  if (Object.prototype.hasOwnProperty.call(AMHARIC, trimmed)) {
    return AMHARIC[trimmed as keyof typeof AMHARIC]
  }
  const lower = trimmed.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(AMHARIC, lower)) {
    return AMHARIC[lower as keyof typeof AMHARIC]
  }
  for (const [key, value] of Object.entries(AMHARIC)) {
    if (key.toLowerCase() === lower) return value
  }
  return undefined
}

export function translateLabel(lang: StudentLang, text: string): string {
  if (lang !== "am") return text
  return lookupAmharic(text) ?? text
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
