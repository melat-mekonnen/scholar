import { CalendarDays } from "lucide-react"

import {
  applicationStatusLabel,
  formatScholarshipDeadlineLabel,
  getScholarshipDateLines,
  hasScholarshipDateInfo,
  type ScholarshipPublic,
} from "@/lib/scholarship"
import { useStudentI18n } from "@/lib/student-i18n"
import { cn } from "@/lib/utils"

type Props = {
  scholarship: Pick<
    ScholarshipPublic,
    "deadline" | "startDate" | "endDate" | "isRolling" | "applicationStatus"
  >
  className?: string
  compact?: boolean
}

export function ScholarshipDates({ scholarship, className, compact = false }: Props) {
  const { t } = useStudentI18n()
  const lines = getScholarshipDateLines(scholarship)
  const statusLabel = applicationStatusLabel(scholarship.applicationStatus)

  if (!lines.length && !statusLabel && !hasScholarshipDateInfo(scholarship)) {
    return (
      <p className={cn("text-xs text-slate-500", className)}>
        {t("Dates not specified")}
      </p>
    )
  }

  if (!lines.length && statusLabel) {
    return (
      <div className={cn("flex items-center gap-1.5 text-sm", className)}>
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span
          className={cn(
            "font-medium",
            scholarship.applicationStatus === "open" && "text-emerald-700",
            scholarship.applicationStatus === "closed" && "text-rose-700",
            scholarship.applicationStatus === "rolling" && "text-emerald-700",
          )}
        >
          {t(statusLabel)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        compact ? "flex flex-wrap gap-x-3 gap-y-1 text-xs" : "flex flex-wrap gap-x-4 gap-y-1 text-sm",
        className,
      )}
    >
      {lines.map((line) => (
        <div key={`${line.label}-${line.value}`} className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-slate-500">{t(line.label)}:</span>
          <span
            className={cn(
              "font-medium text-slate-800",
              line.variant === "rolling" && "text-emerald-700",
            )}
          >
            {line.value}
          </span>
        </div>
      ))}
      {statusLabel &&
        !lines.some((line) => line.variant === "rolling") &&
        scholarship.applicationStatus !== "unknown" && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{t("Status")}:</span>
            <span
              className={cn(
                "font-medium",
                scholarship.applicationStatus === "open" && "text-emerald-700",
                scholarship.applicationStatus === "closed" && "text-rose-700",
              )}
            >
              {t(statusLabel)}
            </span>
          </div>
        )}
    </div>
  )
}
