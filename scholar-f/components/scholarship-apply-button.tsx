"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/auth"
import { getApplicationUrl, type ScholarshipPublic } from "@/lib/scholarship"
import { applyWithReturnConfirmation, unauthorizedHandler } from "@/lib/track-and-apply"
import { cn } from "@/lib/utils"

type Props = {
  scholarship: ScholarshipPublic
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  /** Called when the scholarship is added to the application tracker. */
  onTracked?: (scholarshipId: string) => void
  unavailableLabel?: string
}

/**
 * Opens the official application URL, then asks on return whether to add to My Applications.
 */
export function ScholarshipApplyButton({
  scholarship,
  className,
  size = "sm",
  onTracked,
  unavailableLabel = "Apply (link unavailable)",
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const applyUrl = getApplicationUrl(scholarship)

  async function handleApply() {
    if (!getToken()) {
      router.push("/signin")
      return
    }
    await applyWithReturnConfirmation({
      scholarship,
      toast,
      onUnauthorized: () => unauthorizedHandler(router),
      onTracked,
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
    <Button
      type="button"
      size={size}
      className={cn(className)}
      onClick={() => {
        void handleApply()
      }}
    >
      Apply
    </Button>
  )
}
