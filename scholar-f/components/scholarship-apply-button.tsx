"use client"

import { ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { clearToken } from "@/lib/auth"
import { createApplication } from "@/lib/applications"
import { getApplicationUrl, type ScholarshipPublic } from "@/lib/scholarship"
import { cn } from "@/lib/utils"

type Props = {
  scholarship: ScholarshipPublic
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  /** Called when the application is saved to the tracker (201 or 409). */
  onTracked?: (scholarshipId: string) => void
  unavailableLabel?: string
  label?: string
  showExternalIcon?: boolean
}

/**
 * Opens the official application URL via a real anchor (same as the detail dialog).
 * Tracks the application in the background without blocking navigation.
 */
export function ScholarshipApplyButton({
  scholarship,
  className,
  size = "sm",
  onTracked,
  unavailableLabel = "Apply (link unavailable)",
  label = "Apply",
  showExternalIcon = false,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const applyUrl = getApplicationUrl(scholarship)

  async function trackApplication() {
    const created = await createApplication(scholarship.id)
    if (created.res.status === 401 || created.res.status === 403) {
      clearToken()
      router.replace("/signin")
      return
    }
    if (!created.res.ok && created.res.status !== 409) {
      toast({
        title: "Could not track application",
        description: created.errorMessage || "Failed to save this application in your tracker.",
        variant: "destructive",
      })
      return
    }
    onTracked?.(scholarship.id)
    toast({
      title: "Application started",
      description:
        created.res.status === 409
          ? "Already in your application tracker."
          : "Saved to your application tracker.",
    })
  }

  if (!applyUrl) {
    return (
      <Button size={size} className={className} disabled>
        {unavailableLabel}
      </Button>
    )
  }

  return (
    <Button size={size} className={cn(className)} asChild>
      <a
        href={applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void trackApplication()
        }}
      >
        {showExternalIcon && <ExternalLink className="mr-2 h-4 w-4 shrink-0" />}
        {label}
      </a>
    </Button>
  )
}
