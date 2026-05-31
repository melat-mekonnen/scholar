"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Building2,
  Calendar,
  ExternalLink,
  GraduationCap,
  Globe2,
  Loader2,
  MapPin,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  mergeScholarshipDetail,
  normalizeScholarship,
  getApplicationUrl,
  getApplicationUrlHost,
  formatScholarshipDeadlineLabel,
  hasScholarshipDateInfo,
  prepareDescriptionSections,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ScholarshipDescriptionContent,
  ScholarshipOfficialLink,
} from "@/components/scholarship-description-content"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: ScholarshipPublic | null
  footerStartExtra?: ReactNode
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="mt-0.5 text-emerald-700">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
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
  const applyHost = applyUrl ? getApplicationUrlHost(applyUrl) : undefined
  const deadlineLabel = merged ? formatScholarshipDeadlineLabel(merged) : null
  const isProgramme = merged ? isStudyProgramme(merged) : false

  const sections = useMemo(
    () => (merged?.description ? prepareDescriptionSections(merged.description, applyUrl) : []),
    [merged?.description, applyUrl],
  )

  const hasDescription = sections.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,800px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-3 border-b border-emerald-100/80 bg-gradient-to-b from-emerald-50/50 to-white px-6 py-5 text-left">
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
          </div>
          <div>
            <DialogTitle className="text-left text-xl leading-snug text-slate-900">
              {merged?.title ?? "Scholarship"}
            </DialogTitle>
            {merged?.organizationName && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Building2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                {merged.organizationName}
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[min(58vh,520px)]">
            <div className="space-y-5 px-6 py-5 pr-4">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden />
                  Loading full details…
                </div>
              )}

              {merged && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MetaItem
                      icon={<MapPin className="h-4 w-4" />}
                      label={t("Country")}
                      value={merged.country || "—"}
                    />
                    <MetaItem
                      icon={<GraduationCap className="h-4 w-4" />}
                      label={t("Degree level")}
                      value={degreeLevelLabel(merged.degreeLevel)}
                    />
                    {merged.fieldOfStudy && (
                      <MetaItem
                        icon={<Globe2 className="h-4 w-4" />}
                        label={t("Field of study")}
                        value={merged.fieldOfStudy}
                      />
                    )}
                    {(deadlineLabel || merged.startDate) && (
                      <MetaItem
                        icon={<Calendar className="h-4 w-4" />}
                        label={t("Deadline")}
                        value={
                          merged.startDate && deadlineLabel
                            ? `${merged.startDate} → ${deadlineLabel}`
                            : deadlineLabel ?? merged.startDate ?? "—"
                        }
                      />
                    )}
                  </div>

                  {!hasScholarshipDateInfo(merged) && !loading && (
                    <p className="text-xs text-slate-500">Dates not specified on this listing.</p>
                  )}

                  {deadlineLabel && (
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={
                          merged.isRolling && !merged.deadline && !merged.endDate
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200"
                        }
                      >
                        {merged.isRolling && (merged.deadline || merged.endDate)
                          ? `Deadline: ${deadlineLabel}`
                          : merged.isRolling
                            ? deadlineLabel
                            : `Closes: ${deadlineLabel}`}
                      </Badge>
                    </div>
                  )}

                  <Separator className="bg-emerald-100/80" />

                  {!loading && hasDescription && <ScholarshipDescriptionContent sections={sections} />}
                  {!loading && !hasDescription && (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No extended description is available. Use the official application link below for
                      eligibility, deadlines, and how to apply.
                    </p>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="relative z-10 shrink-0 flex-col gap-4 border-t border-emerald-100/80 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {footerStartExtra}
          </div>

          {merged && (
            <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:min-w-[220px] sm:items-end">
              <Button
                size="default"
                className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
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
                <ScholarshipOfficialLink
                  href={applyUrl}
                  host={applyHost}
                  label={t("Apply on official site")}
                />
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
