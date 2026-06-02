"use client"

import Link from "next/link"
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react"
import { EthioScholarLogo } from "@/components/ethioscholar-logo"
import { cn } from "@/lib/utils"
import { textMuted, textPrimary, themeTransition } from "@/lib/theme"

export function StudentPortalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mt-8 w-full border-t border-slate-200 bg-white dark:border-border dark:bg-card",
        themeTransition,
        className,
      )}
    >
      <div className="w-full px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <EthioScholarLogo className="h-10" />
            <p className={`mt-3 max-w-md text-sm leading-relaxed ${textMuted}`}>
              A modern platform to discover scholarships and track applications with confidence.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2">
            <div>
              <p className={`text-sm font-semibold ${textPrimary}`}>Quick links</p>
              <ul className={`mt-3 space-y-2 text-sm ${textMuted}`}>
                <li><Link className="hover:text-slate-900 dark:hover:text-foreground" href="/dashboard">Dashboard</Link></li>
                <li><Link className="hover:text-slate-900 dark:hover:text-foreground" href="/scholarships">Scholarships</Link></li>
                <li><Link className="hover:text-slate-900 dark:hover:text-foreground" href="/applications">Applications</Link></li>
                <li><Link className="hover:text-slate-900 dark:hover:text-foreground" href="/saved">Saved</Link></li>
                <li><Link className="hover:text-slate-900 dark:hover:text-foreground" href="/profile">Profile</Link></li>
              </ul>
            </div>

            <div className={`mt-1 flex flex-wrap items-center gap-3 ${textMuted}`}>
              <a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-border dark:bg-background dark:hover:bg-accent dark:hover:text-foreground" href="#" target="_blank" rel="noreferrer" aria-label="X (Twitter)">
                <Twitter className="h-5 w-5" />
              </a>
              <a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-border dark:bg-background dark:hover:bg-accent dark:hover:text-foreground" href="#" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-border dark:bg-background dark:hover:bg-accent dark:hover:text-foreground" href="#" target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-border dark:bg-background dark:hover:bg-accent dark:hover:text-foreground" href="#" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className={`mt-6 border-t border-slate-200 pt-5 text-sm dark:border-border ${textMuted}`}>
          © 2026 EthioScholar. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
