"use client"

import type { ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import type { DescriptionSection } from "@/lib/scholarship"

const URL_IN_TEXT = /(https?:\/\/[^\s<>"']+)/gi

function trimTrailingUrlPunctuation(url: string): string {
  return url.replace(/[.,;:!?)]+$/g, "")
}

function linkifyText(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(URL_IN_TEXT)
  return parts.map((part, index) => {
    if (!part) return null
    if (!/^https?:\/\//i.test(part)) {
      return <span key={`${keyPrefix}-t-${index}`}>{part}</span>
    }
    const href = trimTrailingUrlPunctuation(part)
    return (
      <a
        key={`${keyPrefix}-u-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-900"
      >
        {href}
      </a>
    )
  })
}

type Props = {
  sections: DescriptionSection[]
}

export function ScholarshipDescriptionContent({ sections }: Props) {
  if (!sections.length) return null

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{section.heading}</h3>
          <div className="space-y-2 text-sm leading-relaxed text-slate-700">
            {section.body.split(/\n{2,}/).map((paragraph, pi) => (
              <p key={`${section.heading}-p-${pi}`} className="whitespace-pre-wrap break-words">
                {linkifyText(paragraph.trim(), `${section.heading}-${pi}`)}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

type OfficialLinkProps = {
  href: string
  host?: string
  label: string
}

export function ScholarshipOfficialLink({ href, host, label }: OfficialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-900"
    >
      <span className="truncate">{host ?? href}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      <span className="sr-only">{label}</span>
    </a>
  )
}
