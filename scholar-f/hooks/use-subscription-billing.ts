"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import type { SubscriptionStatus } from "@/lib/subscription-types"
import { useToast } from "@/hooks/use-toast"

export function useSubscriptionBilling() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [chapaLoading, setChapaLoading] = useState(false)
  const [cancelProLoading, setCancelProLoading] = useState(false)

  const loadSubscription = useCallback(async () => {
    const { res, data } = await apiFetchJson<SubscriptionStatus>("/api/billing/subscription", {
      method: "GET",
      auth: true,
    })
    if (res.ok && data) {
      setSubscription(data)
    }
    setLoading(false)
  }, [])

  const confirmChapaReturn = useCallback(async () => {
    const txRef = sessionStorage.getItem("chapa_tx_ref")
    if (!txRef) return
    const { res, data, errorMessage } = await apiFetchJson<{ activated?: boolean }>(
      "/api/billing/chapa/confirm",
      {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txRef }),
      }
    )
    sessionStorage.removeItem("chapa_tx_ref")
    if (res.ok && data?.activated) {
      toast({
        title: "Pro activated",
        description: "Your Chapa payment was confirmed. Unlimited AI chat is enabled.",
      })
      await loadSubscription()
    } else if (!res.ok) {
      toast({
        title: "Payment pending",
        description:
          errorMessage ||
          "We could not confirm payment yet. If you paid, wait a moment and refresh.",
        variant: "destructive",
      })
    }
  }, [loadSubscription, toast])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  useEffect(() => {
    const billing = searchParams.get("billing")
    if (billing === "success") {
      void confirmChapaReturn()
      toast({
        title: "Payment received",
        description: "Your Pro plan should activate shortly. Refresh if AI chat still shows Free.",
      })
      void loadSubscription()
    } else if (billing === "cancel") {
      toast({
        title: "Checkout cancelled",
        description: "No charges were made.",
      })
    }
  }, [searchParams, toast, confirmChapaReturn, loadSubscription])

  async function startStripeCheckout() {
    setStripeLoading(true)
    const { res, data, errorMessage } = await apiFetchJson<{ url: string }>(
      "/api/billing/checkout/stripe",
      { method: "POST", auth: true }
    )
    setStripeLoading(false)
    if (res.ok && data?.url) {
      window.location.href = data.url
      return
    }
    toast({
      title: "Could not start checkout",
      description: errorMessage || "Stripe may not be configured on the server yet.",
      variant: "destructive",
    })
  }

  async function startChapaCheckout() {
    setChapaLoading(true)
    const { res, data, errorMessage } = await apiFetchJson<{ url: string; txRef: string }>(
      "/api/billing/checkout/chapa",
      { method: "POST", auth: true }
    )
    setChapaLoading(false)
    if (res.ok && data?.url) {
      if (data.txRef) {
        sessionStorage.setItem("chapa_tx_ref", data.txRef)
      }
      window.location.href = data.url
      return
    }
    toast({
      title: "Could not start Chapa checkout",
      description: errorMessage || "Chapa may not be configured on the server yet.",
      variant: "destructive",
    })
  }

  async function cancelPro() {
    setCancelProLoading(true)
    const { res, data, errorMessage } = await apiFetchJson<{
      downgraded?: boolean
      alreadyFree?: boolean
    }>("/api/billing/subscription/cancel", { method: "POST", auth: true })
    setCancelProLoading(false)
    if (res.ok) {
      toast({
        title: data?.alreadyFree ? "Already on Free" : "Pro cancelled",
        description: data?.alreadyFree
          ? "Your account is already on the free plan."
          : "You are back on the free plan with 3 AI chat messages per day. This does not refund past payments.",
      })
      await loadSubscription()
      return
    }
    toast({
      title: "Could not cancel Pro",
      description: errorMessage || "Please try again in a moment.",
      variant: "destructive",
    })
  }

  return {
    subscription,
    loading,
    stripeLoading,
    chapaLoading,
    cancelProLoading,
    loadSubscription,
    startStripeCheckout,
    startChapaCheckout,
    cancelPro,
  }
}
