import { clearToken, getToken } from "@/lib/auth"
import { getMyApplications, startTrackedApplication } from "@/lib/applications"
import {
  openScholarshipApplication,
  type ScholarshipPublic,
} from "@/lib/scholarship"

export type TrackAndApplyToast = (args: {
  title: string
  description?: string
  variant?: "default" | "destructive"
}) => void

type TrackAndApplyOptions = {
  scholarship: ScholarshipPublic
  toast: TrackAndApplyToast
  onUnauthorized: () => void
  onTracked?: (scholarshipId: string) => void
}

/**
 * Opens the official application site without creating a tracker row.
 * When the student returns to this tab, asks whether to add the scholarship to My Applications.
 */
export async function applyWithReturnConfirmation({
  scholarship,
  toast,
  onUnauthorized,
  onTracked,
}: TrackAndApplyOptions) {
  if (!getToken()) {
    onUnauthorized()
    return
  }

  const opened = await openScholarshipApplication(scholarship)
  if (opened === "no_url") {
    toast({
      title: "Application link unavailable",
      description: "This scholarship does not have an official application URL yet.",
      variant: "destructive",
    })
    return
  }
  if (opened === "blocked") {
    toast({
      title: "Could not open application",
      description: "Allow pop-ups for this site and try again.",
      variant: "destructive",
    })
    return
  }

  toast({
    title: "Application opened",
    description:
      "When you return to EthioScholar, you can choose to add this scholarship to your application tracker.",
  })

  window.setTimeout(() => {
    const onFocus = async () => {
      window.removeEventListener("focus", onFocus)

      const mine = await getMyApplications()
      if (mine.res.status === 401 || mine.res.status === 403) {
        onUnauthorized()
        return
      }

      const alreadyTracked =
        mine.res.ok &&
        (mine.data?.applications ?? []).some((a) => a.scholarshipId === scholarship.id)

      if (alreadyTracked) {
        toast({
          title: "Already in application tracker",
          description: "This scholarship is already in My Applications.",
        })
        onTracked?.(scholarship.id)
        return
      }

      const label = scholarship.title?.trim() || "this scholarship"
      const add = window.confirm(
        `Do you want to add "${label}" to your application tracker?`,
      )
      if (!add) {
        toast({
          title: "Not added",
          description: "You can add it later from My Applications when you are ready.",
        })
        return
      }

      const created = await startTrackedApplication(scholarship.id)
      if (created.res.status === 401 || created.res.status === 403) {
        onUnauthorized()
        return
      }
      if (!created.res.ok) {
        toast({
          title: "Could not add to tracker",
          description:
            created.errorMessage || "Try again from My Applications.",
          variant: "destructive",
        })
        return
      }

      onTracked?.(scholarship.id)
      toast({
        title: "Added to application tracker",
        description:
          created.data?.existing === true
            ? "This scholarship is already in My Applications."
            : "Find it under My Applications to update status as you progress.",
      })
    }
    window.addEventListener("focus", onFocus, { once: true })
  }, 500)
}

export function unauthorizedHandler(router: { replace: (path: string) => void }) {
  clearToken()
  router.replace("/signin")
}
