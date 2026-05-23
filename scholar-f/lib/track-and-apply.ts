import { clearToken } from "@/lib/auth"
import {
  confirmTrackedApplication,
  getMyApplications,
  startTrackedApplication,
} from "@/lib/applications"
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

/** Start pending tracker, open official site, then confirm submitted on return (saved flow from main). */
export async function applyWithReturnConfirmation({
  scholarship,
  toast,
  onUnauthorized,
  onTracked,
}: TrackAndApplyOptions) {
  const tracked = await startTrackedApplication(scholarship.id)
  if (tracked.res.status === 401 || tracked.res.status === 403) {
    onUnauthorized()
    return
  }
  if (!tracked.res.ok) {
    toast({
      title: "Could not start tracking",
      description:
        tracked.errorMessage || "Failed to save this application in your tracker.",
      variant: "destructive",
    })
    return
  }

  let applicationId = tracked.data?.id
  const status = tracked.data?.status
  const alreadySubmitted =
    tracked.data?.alreadySubmitted === true ||
    (status != null && status !== "pending")

  if (!applicationId) {
    const mine = await getMyApplications()
    if (mine.res.ok && mine.data?.applications) {
      const found = mine.data.applications.find((a) => a.scholarshipId === scholarship.id)
      applicationId = found?.id
    }
  }

  const ok = await openScholarshipApplication(scholarship)
  if (!ok) {
    toast({
      title: "Application link unavailable",
      description: "This scholarship does not have an official application URL yet.",
      variant: "destructive",
    })
    return
  }

  if (tracked.res.status === 201 || tracked.res.status === 200) {
    onTracked?.(scholarship.id)
  }

  toast({
    title: "Application opened",
    description: "After you finish and come back, we will ask if you applied.",
  })

  window.setTimeout(() => {
    const onFocus = async () => {
      window.removeEventListener("focus", onFocus)
      const applied = window.confirm("Did you submit your application on the official site?")
      if (!applied) {
        toast({
          title: "No problem",
          description: "Your application stays pending in the tracker until you confirm.",
        })
        return
      }

      if (alreadySubmitted) {
        toast({
          title: "Already in My Applications",
          description: "This scholarship is already saved in your application tracker.",
        })
        return
      }

      if (!applicationId) {
        toast({
          title: "Could not confirm",
          description: "Application record was not found. Try Apply again.",
          variant: "destructive",
        })
        return
      }

      const confirmed = await confirmTrackedApplication(applicationId)
      if (confirmed.res.status === 401 || confirmed.res.status === 403) {
        onUnauthorized()
        return
      }
      if (!confirmed.res.ok) {
        toast({
          title: "Could not update status",
          description: confirmed.errorMessage || "Try again from My Applications.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Added to My Applications",
        description: "Saved as submitted in your application tracker.",
      })
    }
    window.addEventListener("focus", onFocus, { once: true })
  }, 500)
}

export function unauthorizedHandler(router: { replace: (path: string) => void }) {
  clearToken()
  router.replace("/signin")
}
