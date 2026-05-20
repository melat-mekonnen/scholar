"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  mergeScholarshipDetail,
  normalizeScholarship,
  getApplicationUrl,
  formatScholarshipDeadlineLabel,
  hasScholarshipDateInfo,
  parseDescriptionSections,
  fundingTypeLabel,
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
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const applyUrl = merged ? getApplicationUrl(merged) : undefined
  const deadlineLabel = merged ? formatScholarshipDeadlineLabel(merged) : null
  const degreeLevelLabel =
    merged && typeof merged.degreeLevel === "string"
      ? merged.degreeLevel.replace("_", " ")
      : "—"
  const sections = merged?.description ? parseDescriptionSections(merged.description) : []
  const isProgramme = merged ? isStudyProgramme(merged) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle className="pr-8 text-left leading-snug">
            {merged?.title ?? "Scholarship"}
          </DialogTitle>
          {merged && (
            <p className="text-muted-foreground pt-1 text-sm">
              {merged.country} · {degreeLevelLabel}
              {merged.fieldOfStudy ? ` · ${merged.fieldOfStudy}` : ""}
            </p>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[min(52vh,480px)]">
            <div className="space-y-4 px-6 py-4 pb-6 pr-4">
              {loading && (
                <p className="text-muted-foreground text-sm">Loading full details…</p>
              )}

              {merged && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {isProgramme ? t("Study programme") : t("Verified")}
                    </Badge>
                    {merged.fundingType && (
                      <Badge variant="outline">{t(fundingTypeLabel(merged.fundingType))}</Badge>
                    )}
                    {merged.amount && <Badge variant="outline">{merged.amount}</Badge>}
                    {merged.startDate && (
                      <Badge variant="outline">Start: {merged.startDate}</Badge>
                    )}
                    {deadlineLabel && (
                      <Badge
                        variant="outline"
                        className={
                          merged.isRolling && !merged.deadline && !merged.endDate
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : undefined
                        }
                      >
                        {merged.isRolling && (merged.deadline || merged.endDate)
                          ? `Deadline: ${deadlineLabel}`
                          : merged.isRolling
                            ? deadlineLabel
                            : `End: ${deadlineLabel}`}
                      </Badge>
                    )}
                    {!hasScholarshipDateInfo(merged) && (
                      <span className="text-muted-foreground self-center text-xs">
                        Dates not specified
                      </span>
                    )}
                  </div>

                  {sections.length > 0 ? (
                    <div className="space-y-4">
                      {sections.map((section) => (
                        <div key={section.heading} className="space-y-1">
                          <p className="text-sm font-medium">{section.heading}</p>
                          <p className="text-muted-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {section.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : merged.description ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {isProgramme ? t("About this programme") : t("About this scholarship")}
                      </p>
                      <p className="text-muted-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {merged.description}
                      </p>
                    </div>
                  ) : (
                    !loading && (
                      <p className="text-muted-foreground text-sm">
                        No extended description is available for this listing.
                      </p>
                    )
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="relative z-10 shrink-0 flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {footerStartExtra}
          </div>
          {merged && (
            <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:max-w-[min(100%,280px)] sm:items-end">
              <Button
                size="sm"
                className="w-full shrink-0 sm:w-auto"
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
              {applyUrl && (
                <p className="text-muted-foreground truncate text-xs" title={applyUrl}>
                  {applyUrl}
                </p>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
