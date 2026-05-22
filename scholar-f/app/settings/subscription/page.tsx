"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Sparkles } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { useSubscriptionBilling } from "@/hooks/use-subscription-billing"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { SubscriptionPlans } from "@/components/subscription/subscription-plans"
import { Badge } from "@/components/ui/badge"

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function SubscriptionPageContent() {
  const router = useRouter()
  const { t } = useStudentI18n()
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
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-emerald-950">{t("Billing")}</h1>
              {me?.role ? (
                <Badge className="capitalize bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100">
                  {me.role}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-600">Plans and payment for AI Chat</p>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-6xl flex-1 space-y-8 p-6">
          <div className="pointer-events-none absolute -left-20 top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-40 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">AI Chat plans</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                    Choose Free for daily limits or Pro for unlimited scholarship chat. Pay securely
                    with Stripe or Chapa.
                  </p>
                </div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 sm:mt-1">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </div>

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
        </main>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
          Loading subscription…
        </div>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  )
}
