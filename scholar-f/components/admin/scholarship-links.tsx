import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"

type ScholarshipLinksProps = {
  applicationUrl?: string | null
  sourceUrl?: string | null
  compact?: boolean
}

export function ScholarshipLinks({
  applicationUrl,
  sourceUrl,
  compact = false,
}: ScholarshipLinksProps) {
  const apply = applicationUrl?.trim()
  const source = sourceUrl?.trim()
  const same = apply && source && apply === source

  if (!apply && !source) {
    return (
      <span className="text-xs text-muted-foreground">No links on record</span>
    )
  }

  const linkClass =
    "inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline break-all"

  return (
    <div className="flex flex-col gap-2">
      {apply ? (
        <div className={compact ? "flex items-center gap-1" : "space-y-1"}>
          {!compact ? (
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Apply / official page
            </p>
          ) : null}
          <Button
            asChild
            size={compact ? "sm" : "default"}
            variant={compact ? "outline" : "default"}
            className={compact ? "h-8" : "w-full justify-start"}
          >
            <a href={apply} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
              {compact ? "Apply" : "Open application page"}
            </a>
          </Button>
          {!compact ? (
            <a href={apply} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {apply}
            </a>
          ) : null}
        </div>
      ) : null}

      {source && !same ? (
        <div className={compact ? "flex items-center gap-1" : "space-y-1"}>
          {!compact ? (
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Source page (ingested from)
            </p>
          ) : null}
          <Button
            asChild
            size={compact ? "sm" : "default"}
            variant="outline"
            className={compact ? "h-8" : "w-full justify-start"}
          >
            <a href={source} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
              {compact ? "Source" : "Open source page"}
            </a>
          </Button>
          {!compact ? (
            <a href={source} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {source}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
