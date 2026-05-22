"use client"

import { useEffect, useState, type ReactNode } from "react"

import { apiFetchJson } from "@/lib/api"
import {
  mergeScholarshipDetail,
  normalizeScholarship,
  parseDescriptionSections,
  filterDescriptionSectionsForDisplay,
  formatDescriptionBodyForDisplay,
  formatScholarshipMetaLine,
  isStudyProgramme,
  translateFundingTypeLabel,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { useStudentI18n } from "@/lib/student-i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ScholarshipApplyButton } from "@/components/scholarship-apply-button"
import { ScholarshipDates } from "@/components/scholarship-dates"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: ScholarshipPublic | null
  /** Shown next to Close (e.g. bookmark control). */
  footerStartExtra?: ReactNode
}

export function ScholarshipDetailDialog({
  open,
  onOpenChange,
  summary,
  footerStartExtra,
}: Props) {
  const { lang, t } = useStudentI18n()
  const [detail, setDetail] = useState<ScholarshipPublic | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !summary?.id) {
      setDetail(null)
      setLoading(false)
      return
    }

    const currentSummary = summary as ScholarshipPublic
    setDetail(null)
    let cancelled = false
    async function load() {
      setLoading(true)
      const { res, data } = await apiFetchJson<unknown>(
        `/api/scholarships/${currentSummary.id}?lang=${lang}`,
        {
          method: "GET",
          auth: false,
        },
      )
      if (cancelled) return
      if (res.ok && data) {
        setDetail(mergeScholarshipDetail(currentSummary, normalizeScholarship(data)))
      } else {
        setDetail(currentSummary)
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, summary, lang])

  const merged = detail ?? summary
  const metaLine = merged ? formatScholarshipMetaLine(t, merged) : ""

  const sections = merged?.description
    ? filterDescriptionSectionsForDisplay(parseDescriptionSections(merged.description))
    : []
  const isProgramme = merged ? isStudyProgramme(merged) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="pointer-events-none h-1 shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500" />

        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-4 text-left">
          <DialogTitle className="pr-8 text-left text-lg leading-snug text-slate-900">
            {merged?.title ?? t("Scholarship")}
          </DialogTitle>
          {merged && (
            <DialogDescription className="text-left text-sm text-slate-500">
              {metaLine}
            </DialogDescription>
          )}
          {merged && <ScholarshipDates scholarship={merged} className="pt-1" compact />}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-4 px-6 py-5">
            {loading && (
              <div className="space-y-3" aria-live="polite" aria-busy="true">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}

            {merged && !loading && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                    {isProgramme ? t("Study programme") : t("Verified")}
                  </Badge>
                  {merged.fundingType && (
                    <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                      {translateFundingTypeLabel(t, merged.fundingType)}
                    </Badge>
                  )}
                  {merged.amount && (
                    <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                      {merged.amount}
                    </Badge>
                  )}
                </div>

                {sections.length > 0 ? (
                  <div className="space-y-5">
                    {sections.map((section) => {
                      const body = formatDescriptionBodyForDisplay(section.body)
                      if (!body) return null
                      return (
                        <section key={section.heading} className="space-y-2">
                          <h3 className="text-sm font-semibold text-slate-900">{t(section.heading)}</h3>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                            {body}
                          </p>
                        </section>
                      )
                    })}
                  </div>
                ) : merged.description ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {isProgramme ? t("About this programme") : t("About this scholarship")}
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                      {formatDescriptionBodyForDisplay(merged.description)}
                    </p>
                  </section>
                ) : (
                  <p className="text-sm text-slate-500">
                    {t("No extended description is available for this listing.")}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Close")}
            </Button>
            {footerStartExtra}
          </div>
          {merged && (
            <ScholarshipApplyButton
              scholarship={merged}
              size="sm"
              label={t("Apply on official site")}
              showExternalIcon
              className="w-full shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
