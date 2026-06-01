"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useSubscriptionBilling } from "@/hooks/use-subscription-billing"
import { StudentPortalLayout } from "@/components/student-portal/student-portal-layout"
import { SubscriptionPlans } from "@/components/subscription/subscription-plans"

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function SubscriptionPageContent() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const billing = useSubscriptionBilling()

  useEffect(() => {
    async function load() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
      if (res.status === 401) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (res.ok && data) {
        setMe(data)
      }
    }
    void load()
  }, [router])

  return (
    <StudentPortalLayout
      title="Subscription"
      subtitle="Plans and payment for AI Chat"
      heroTitle="AI Chat plans"
      heroDescription="Choose Free for daily limits or Pro for unlimited scholarship chat. Pay securely with Stripe or Chapa."
      role={me?.role}
      maxWidthClass="max-w-6xl"
    >
      <SubscriptionPlans
        subscription={billing.subscription}
        loading={billing.loading}
        stripeLoading={billing.stripeLoading}
        chapaLoading={billing.chapaLoading}
        cancelProLoading={billing.cancelProLoading}
        onStripeCheckout={() => void billing.startStripeCheckout()}
        onChapaCheckout={() => void billing.startChapaCheckout()}
        onCancelPro={() => void billing.cancelPro()}
      />
    </StudentPortalLayout>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-background dark:text-muted-foreground">
          Loading subscription…
        </div>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  )
}
