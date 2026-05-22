"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Check,
  CreditCard,
  MessageSquare,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react"

import type { SubscriptionStatus } from "@/lib/subscription-types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Platform cards (usage, payments, etc.) — emerald theme. */
const emeraldCard =
  "relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5"

const emeraldTopBar =
  "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90"

/** Payment panels — same light tint as Stripe / Chapa tiles. */
const tintedPanel = "rounded-2xl border border-emerald-100/80 bg-emerald-50/25 shadow-sm"

/** Plan tier cards — neutral border only; tier colour on icon, title, and status badges. */
const planCard = "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"

const FREE_DAILY_LIMIT = 3
const PRO_CHAPA_ETB = 149
const PRO_DAYS = 30

const freeTier = {
  badge: "bg-sky-600 hover:bg-sky-600",
  icon: "text-sky-600",
  title: "text-sky-700",
}

const proTier = {
  badge: "bg-violet-600 hover:bg-violet-600",
  icon: "text-violet-600",
  title: "text-violet-700",
}

type SubscriptionPlansProps = {
  subscription: SubscriptionStatus | null
  loading: boolean
  stripeLoading: boolean
  chapaLoading: boolean
  cancelProLoading: boolean
  onStripeCheckout: () => void
  onChapaCheckout: () => void
  onCancelPro: () => void
}

const FREE_FEATURES = [
  "3 AI chat messages per day",
  "Scholarship-aware answers",
  "Resets daily at midnight UTC",
]

const PRO_FEATURES = [
  "Unlimited AI chat messages",
  "Same smart scholarship matching",
  "Priority access to new AI features",
  `${PRO_DAYS}-day access per payment`,
]

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-3 w-3" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function SubscriptionPlans({
  subscription,
  loading,
  stripeLoading,
  chapaLoading,
  cancelProLoading,
  onStripeCheckout,
  onChapaCheckout,
  onCancelPro,
}: SubscriptionPlansProps) {
  const chat = subscription?.chat
  const isPro = Boolean(subscription?.proActive || chat?.unlimited)
  const used = chat?.used ?? 0
  const limit = chat?.limit ?? FREE_DAILY_LIMIT
  const remaining = chat?.remaining ?? Math.max(0, limit - used)
  const usagePercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

  if (loading) {
    return (
      <Card className={emeraldCard}>
        <div className={emeraldTopBar} />
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Loading your plan…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
      >
        <Link href="/settings" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
      </Button>

      <Card className={emeraldCard}>
        <div className={emeraldTopBar} />
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900">Your usage today</CardTitle>
          <CardDescription>
            AI Chat quota for scholarship questions and recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Pro active</Badge>
              <span className="text-sm text-slate-600">Unlimited messages</span>
              {subscription?.expiresAt ? (
                <span className="text-sm text-slate-500">
                  · until{" "}
                  {new Date(subscription.expiresAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              ) : null}
              {subscription?.provider ? (
                <span className="text-sm capitalize text-slate-500">
                  · paid via {subscription.provider}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {remaining} of {limit} messages remaining
                </span>
                <span className="text-slate-500">{used} used</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">Resets daily at midnight UTC</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 overflow-visible lg:grid-cols-2">
        <Card className={cn(planCard, "overflow-visible transition-shadow hover:shadow-md")}>
          <CardHeader className="pb-2">
            {!isPro ? (
              <Badge className={cn("mb-3 w-fit", freeTier.badge)}>Current plan</Badge>
            ) : null}
            <CardTitle className={cn("flex items-center gap-2 text-xl font-semibold", freeTier.title)}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                <MessageSquare className={cn("h-5 w-5", freeTier.icon)} />
              </span>
              Free
            </CardTitle>
            <CardDescription>Get started with daily AI guidance</CardDescription>
            <p className="pt-2 text-3xl font-bold tracking-tight text-slate-900">
              ETB 0
              <span className="text-base font-normal text-slate-500"> / forever</span>
            </p>
          </CardHeader>
          <CardContent>
            <FeatureList items={FREE_FEATURES} />
            {!isPro ? (
              <p className="mt-6 text-sm font-medium text-slate-600">You are on this plan</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={cn(planCard, "overflow-visible transition-shadow hover:shadow-md")}>
          <CardHeader className="pb-2">
            <Badge className={cn("mb-3 w-fit", proTier.badge)}>
              {isPro ? "Current plan" : "Recommended"}
            </Badge>
            <CardTitle className={cn("flex items-center gap-2 text-xl font-semibold", proTier.title)}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                <Sparkles className={cn("h-5 w-5", proTier.icon)} />
              </span>
              Pro
            </CardTitle>
            <CardDescription>Unlimited AI chat for serious applicants</CardDescription>
            <p className="pt-2 text-3xl font-bold tracking-tight text-slate-900">
              ETB {PRO_CHAPA_ETB}
              <span className="text-base font-normal text-slate-500"> / {PRO_DAYS} days</span>
            </p>
            <p className="text-xs text-slate-500">Also available via Stripe (USD card)</p>
          </CardHeader>
          <CardContent>
            <FeatureList items={PRO_FEATURES} />
          </CardContent>
        </Card>
      </div>

      {!isPro ? (
        <Card className={tintedPanel}>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Choose payment method</CardTitle>
            <CardDescription>
              Secure checkout. You will be redirected to complete payment, then returned here.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-emerald-100/80 bg-emerald-50/25 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                <CreditCard className="h-5 w-5 text-[#635BFF]" />
              </div>
              <h3 className="font-semibold text-slate-900">Stripe</h3>
              <p className="mt-1 flex-1 text-sm text-slate-600">
                Visa, Mastercard, and international cards. Monthly subscription billing.
              </p>
              <Button
                className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={stripeLoading || chapaLoading}
                onClick={onStripeCheckout}
              >
                {stripeLoading ? "Redirecting…" : "Pay with Stripe"}
              </Button>
            </div>

            <div className="flex flex-col rounded-xl border border-emerald-100/80 bg-emerald-50/25 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Chapa</h3>
              <p className="mt-1 flex-1 text-sm text-slate-600">
                Pay in ETB. Telebirr, mobile money, and local banks when enabled on Chapa.
              </p>
              <Button
                variant="outline"
                className="mt-5 w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                disabled={chapaLoading || stripeLoading}
                onClick={onChapaCheckout}
              >
                {chapaLoading ? "Redirecting…" : `Pay ETB ${PRO_CHAPA_ETB} with Chapa`}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className={tintedPanel}>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Manage Pro</CardTitle>
            <CardDescription>
              You have full access to AI Chat. Need to switch back to the free plan?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/ai-chat" className="gap-2">
                <Zap className="h-4 w-4" />
                Open AI Chat
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={cancelProLoading}
                >
                  Cancel Pro
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-slate-200 bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-slate-900">Cancel Pro subscription?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600">
                    You will return to the free plan with {FREE_DAILY_LIMIT} AI chat messages per day.
                    Unlimited chat ends immediately. Past payments are not refunded.
                    {subscription?.provider === "stripe"
                      ? " Your Stripe subscription will also be cancelled."
                      : null}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-300 bg-white hover:bg-slate-50">
                    Keep Pro
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={cancelProLoading}
                    onClick={(e) => {
                      e.preventDefault()
                      onCancelPro()
                    }}
                  >
                    {cancelProLoading ? "Cancelling…" : "Yes, cancel Pro"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border border-emerald-100/70 bg-emerald-50/25 shadow-sm">
        <CardContent className="flex gap-4 py-5">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm text-slate-600">
            <p className="font-medium text-emerald-900">Secure payments</p>
            <p className="mt-1">
              Card details are handled by Stripe or Chapa. EthioScholar does not store your card
              number. Pro applies to AI Chat only; scholarships and other features stay unchanged.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
