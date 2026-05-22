"use client"

import { ExternalLink, Link2 } from "lucide-react"

import {
  extractUrls,
  getLinkShareNote,
  getPrimaryUrl,
  hostnameFromUrl,
} from "@/lib/community-links"
import { cn } from "@/lib/utils"

const URL_SPLIT = /(https?:\/\/[^\s<>"']+)/gi

type CommunityMessageBodyProps = {
  body: string
  isOwn?: boolean
  editedAt?: string | null
}

function LinkifyLine({ text, isOwn }: { text: string; isOwn?: boolean }) {
  const parts = text.split(URL_SPLIT)
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={`${i}-${part.slice(0, 24)}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "break-all font-medium underline underline-offset-2",
                isOwn ? "text-emerald-50 hover:text-white" : "text-emerald-700 hover:text-emerald-900",
              )}
            >
              {part}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function CommunityLinkCard({ url, note, isOwn }: { url: string; note: string | null; isOwn?: boolean }) {
  const host = hostnameFromUrl(url)
  return (
    <div className="space-y-2">
      {note ? (
        <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", isOwn ? "text-white" : "text-slate-900")}>
          <LinkifyLine text={note} isOwn={isOwn} />
        </p>
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
          isOwn
            ? "border-white/25 bg-white/10 hover:bg-white/15"
            : "border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-50",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            isOwn ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700",
          )}
        >
          <Link2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", isOwn ? "text-white" : "text-slate-900")}>
            {host}
          </p>
          <p className={cn("line-clamp-2 break-all text-xs", isOwn ? "text-emerald-100/90" : "text-slate-600")}>
            {url}
          </p>
        </div>
        <ExternalLink
          className={cn("mt-1 h-4 w-4 shrink-0", isOwn ? "text-emerald-100" : "text-emerald-600")}
        />
      </a>
    </div>
  )
}

function EditedLabel({ isOwn }: { isOwn?: boolean }) {
  return (
    <span className={cn("text-[10px] italic", isOwn ? "text-emerald-100/80" : "text-slate-400")}>
      edited
    </span>
  )
}

export function CommunityMessageBody({ body, isOwn, editedAt }: CommunityMessageBodyProps) {
  const primaryUrl = getPrimaryUrl(body)
  const urls = extractUrls(body)

  if (primaryUrl && urls.length >= 1) {
    const note = getLinkShareNote(body, primaryUrl)
    const showCard = urls.length === 1 && (!note || note.length < 500)

    if (showCard) {
      return (
        <div className="space-y-1">
          <CommunityLinkCard url={primaryUrl} note={note} isOwn={isOwn} />
          {editedAt ? <EditedLabel isOwn={isOwn} /> : null}
        </div>
      )
    }
  }

  const lines = body.split("\n")
  return (
    <div className="space-y-1">
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", isOwn ? "text-white" : "text-slate-900")}>
        {lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            <LinkifyLine text={line} isOwn={isOwn} />
          </span>
        ))}
      </p>
      {editedAt ? <EditedLabel isOwn={isOwn} /> : null}
    </div>
  )
}
