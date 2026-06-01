"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Building2, ExternalLink, GraduationCap, Loader2, MapPin } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  mergeScholarshipDetail,
  normalizeScholarship,
  getApplicationUrl,
  formatScholarshipDateRange,
  hasScholarshipDateInfo,
  prepareDescriptionSections,
  hasProductionReadyDescription,
  fundingTypeLabel,
  degreeLevelLabel,
  isStudyProgramme,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { useStudentI18n } from "@/lib/student-i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScholarshipDescriptionContent } from "@/components/scholarship-description-content"
import { ScholarshipKeyDates } from "@/components/scholarship-key-dates"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: ScholarshipPublic | null
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
  const applyUrl = merged ? getApplicationUrl(merged) : undefined
  const isProgramme = merged ? isStudyProgramme(merged) : false
  const showDates = merged ? hasScholarshipDateInfo(merged) : false

  const sections = useMemo(
    () => (merged?.description ? prepareDescriptionSections(merged.description, applyUrl) : []),
    [merged?.description, applyUrl],
  )

  const hasDescription = merged
    ? hasProductionReadyDescription(merged.description, applyUrl)
    : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,800px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-emerald-100/80 bg-gradient-to-b from-emerald-50/40 to-white px-6 py-5 text-left">
          <div className="flex flex-wrap gap-2 pr-8">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              {isProgramme ? t("Study programme") : t("Verified")}
            </Badge>
            {merged?.fundingType && (
              <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">
                {t(fundingTypeLabel(merged.fundingType))}
              </Badge>
            )}
            {merged?.amount && (
              <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">
                {merged.amount}
              </Badge>
            )}
            {merged && formatScholarshipDateRange(merged) && (
              <Badge
                variant="outline"
                className={
                  merged.isRolling && !merged.deadline && !merged.endDate
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-800"
                }
              >
                {formatScholarshipDateRange(merged)}
              </Badge>
            )}
          </div>

          <DialogTitle className="mt-3 pr-8 text-left text-xl leading-snug text-slate-900">
            {merged?.title ?? "Scholarship"}
          </DialogTitle>

          {merged && (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600">
              {merged.organizationName && (
                <li className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  <span className="font-medium text-slate-800">{merged.organizationName}</span>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                <span>
                  {merged.country}
                  {merged.fieldOfStudy ? ` · ${merged.fieldOfStudy}` : ""}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                <span>{degreeLevelLabel(merged.degreeLevel)}</span>
              </li>
            </ul>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <div className="space-y-5 px-6 py-5 pr-4">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden />
                Loading full details…
              </div>
            )}

            {!loading && merged && showDates && <ScholarshipKeyDates scholarship={merged} />}

            {!loading && merged && !showDates && (
              <p className="text-sm text-slate-500">
                Application dates are not listed. Check the official site for open and close dates.
              </p>
            )}

            {!loading && hasDescription && (
              <ScholarshipDescriptionContent sections={sections} omitApplyUrl={applyUrl} />
            )}

            {!loading && !hasDescription && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                {isProgramme
                  ? "This is a fee-based degree programme. Use Apply to open the official course page for entry requirements, fees, and how to apply."
                  : "Full programme details are on the official website. Use Apply below for eligibility, deadlines, and how to apply."}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-3 border-t border-emerald-100/80 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {footerStartExtra}
          </div>

          {merged && (
            <Button
              size="default"
              className="w-full shrink-0 bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
              asChild={Boolean(applyUrl)}
              disabled={!applyUrl}
            >
              {applyUrl ? (
                <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
                  {t("Apply on official site")}
                </a>
              ) : (
                <span>Apply (link unavailable)</span>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
