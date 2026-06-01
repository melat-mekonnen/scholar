"use client"

import { Calendar } from "lucide-react"

import { getScholarshipTimeline } from "@/lib/scholarship-dates"
import type { ScholarshipPublic } from "@/lib/scholarship"

type Props = {
  scholarship: Pick<ScholarshipPublic, "startDate" | "endDate" | "deadline" | "isRolling">
}

export function ScholarshipKeyDates({ scholarship }: Props) {
  const items = getScholarshipTimeline(scholarship)
  if (!items.length) return null

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
        <Calendar className="h-4 w-4" aria-hidden />
        Key dates
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span className="text-sm text-slate-600">{item.label}</span>
              <span className="text-sm font-semibold text-slate-900">{item.value}</span>
            </div>
            {item.hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.hint}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
