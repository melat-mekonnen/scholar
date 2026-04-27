"use client"

import { Globe } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/components/language-provider"
import type { Locale } from "@/lib/i18n/messages"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="fixed left-3 top-3 z-[60] rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
      <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
        <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent px-2 text-xs shadow-none">
          <span className="mr-1 inline-flex items-center">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t("lang.english", "English")}</SelectItem>
          <SelectItem value="am">{t("lang.amharic", "Amharic")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

