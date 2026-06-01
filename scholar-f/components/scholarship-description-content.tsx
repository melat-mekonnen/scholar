"use client"

import type { ReactNode } from "react"

import type { DescriptionSection } from "@/lib/scholarship"
import { getApplicationUrlHost } from "@/lib/scholarship"

const URL_IN_TEXT = /(https?:\/\/[^\s<>"']+)/gi

function trimTrailingUrlPunctuation(url: string): string {
  return url.replace(/[.,;:!?)]+$/g, "")
}

function linkifyText(text: string, keyPrefix: string, omitUrl?: string): ReactNode[] {
  const parts = text.split(URL_IN_TEXT)
  const nodes: ReactNode[] = []
  parts.forEach((part, index) => {
    if (!part) return
    if (!/^https?:\/\//i.test(part)) {
      if (part.trim()) nodes.push(<span key={`${keyPrefix}-t-${index}`}>{part}</span>)
      return
    }
    const href = trimTrailingUrlPunctuation(part)
    if (omitUrl && href.replace(/\/+$/, "") === omitUrl.replace(/\/+$/, "")) return
    const label = getApplicationUrlHost(href) ?? "Official link"
    nodes.push(
      <a
        key={`${keyPrefix}-u-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-900"
      >
        {label}
      </a>,
    )
  })
  return nodes
}

type Props = {
  sections: DescriptionSection[]
  /** Hide inline links that duplicate the footer Apply URL. */
  omitApplyUrl?: string
}

export function ScholarshipDescriptionContent({ sections, omitApplyUrl }: Props) {
  if (!sections.length) return null

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const paragraphs = section.body
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
        if (!paragraphs.length) return null
        const showHeading =
          sections.length > 1 || section.heading.toLowerCase() !== "overview"

        return (
          <section key={section.heading} className="space-y-2">
            {showHeading && (
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">{section.heading}</h3>
            )}
            <div className="space-y-3 text-sm leading-relaxed text-slate-700">
              {paragraphs.map((paragraph, pi) => (
                <p key={`${section.heading}-p-${pi}`} className="break-words">
                  {linkifyText(paragraph, `${section.heading}-${pi}`, omitApplyUrl)}
                </p>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
