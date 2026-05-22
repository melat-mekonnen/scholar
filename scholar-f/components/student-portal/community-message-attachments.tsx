"use client"

import { useEffect, useState } from "react"
import { FileText, FileType, ImageIcon } from "lucide-react"

import type { CommunityAttachment } from "@/lib/community"
import { getCommunityAttachmentUrl } from "@/lib/community-attachments"
import { cn } from "@/lib/utils"

function kindIcon(kind: CommunityAttachment["kind"]) {
  if (kind === "image") return ImageIcon
  if (kind === "cv") return FileType
  return FileText
}

function kindLabel(kind: CommunityAttachment["kind"]) {
  if (kind === "image") return "Photo"
  if (kind === "cv") return "CV / document"
  return "PDF"
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function CommunityImageAttachment({ attachment }: { attachment: CommunityAttachment }) {
  const [src, setSrc] = useState<string | null>(null)
  const downloadHref = getCommunityAttachmentUrl(attachment.id, { download: true })

  useEffect(() => {
    setSrc(getCommunityAttachmentUrl(attachment.id))
  }, [attachment.id])

  if (!src) return null

  return (
    <a
      href={downloadHref}
      download={attachment.originalName}
      className="block overflow-hidden rounded-xl ring-1 ring-black/10 transition-opacity hover:opacity-95"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={attachment.originalName}
        className="max-h-64 max-w-full object-contain bg-slate-100"
      />
    </a>
  )
}

type CommunityMessageAttachmentsProps = {
  attachments: CommunityAttachment[]
  isOwn?: boolean
}

export function CommunityMessageAttachments({ attachments, isOwn }: CommunityMessageAttachmentsProps) {
  if (!attachments.length) return null

  return (
    <div className={cn("mt-2 space-y-2", attachments.length > 0 && !isOwn && "mt-2")}>
      {attachments.map((a) => {
        const Icon = kindIcon(a.kind)
        if (a.kind === "image") {
          return <CommunityImageAttachment key={a.id} attachment={a} />
        }
        return (
          <a
            key={a.id}
            href={getCommunityAttachmentUrl(a.id, { download: true })}
            download={a.originalName}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
              isOwn
                ? "border-white/25 bg-white/10 hover:bg-white/15"
                : "border-slate-200/90 bg-slate-50 hover:bg-emerald-50/50",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                isOwn ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium", isOwn ? "text-white" : "text-slate-900")}>
                {a.originalName}
              </p>
              <p className={cn("text-xs", isOwn ? "text-emerald-100/90" : "text-slate-500")}>
                {kindLabel(a.kind)} · {formatSize(a.fileSize)}
              </p>
            </div>
          </a>
        )
      })}
    </div>
  )
}
