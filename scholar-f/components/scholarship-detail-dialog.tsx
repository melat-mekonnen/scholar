"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import {
  mergeScholarshipDetail,
  normalizeScholarship,
  getApplicationUrl,
  type ScholarshipPublic,
} from "@/lib/scholarship"
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
        `/api/scholarships/${currentSummary.id}`,
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
  }, [open, summary])

  const merged = detail ?? summary
  const applyUrl = merged ? getApplicationUrl(merged) : undefined
  const degreeLevelLabel =
    merged && typeof merged.degreeLevel === "string"
      ? merged.degreeLevel.replace("_", " ")
      : "—"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] max-w-lg flex-col gap-0 p-0 sm:max-w-lg">
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

        <ScrollArea className="max-h-[min(60vh,420px)] px-6">
          <div className="space-y-4 py-4 pr-3">
            {loading && (
              <p className="text-muted-foreground text-sm">Loading full details…</p>
            )}

            {merged && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Verified</Badge>
                  {merged.fundingType && <Badge variant="outline">{merged.fundingType}</Badge>}
                  {merged.amount && <Badge variant="outline">{merged.amount}</Badge>}
                  {merged.deadline && (
                    <Badge variant="outline">Deadline: {merged.deadline}</Badge>
                  )}
                </div>

                {merged.description ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">About this scholarship</p>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
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

                {applyUrl && (
                  <p className="text-sm">
                    <span className="font-medium">Apply on: </span>
                    <a
                      href={applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary break-all underline-offset-4 hover:underline"
                    >
                      {applyUrl}
                    </a>
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {footerStartExtra}
          </div>
          {merged && (
            <Button size="sm" asChild={Boolean(applyUrl)} disabled={!applyUrl}>
              {applyUrl ? (
                <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Apply on official site
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
