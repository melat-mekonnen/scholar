"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { setToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Avoid `useSearchParams()` Suspense requirement by reading the URL directly.
    const token = new URLSearchParams(window.location.search).get("token")
    if (token) {
      setToken(token)
      try {
        const payloadPart = token.split(".")[1] || ""
        const payloadJson = atob(
          payloadPart.replace(/-/g, "+").replace(/_/g, "/"),
        )
        const payload = JSON.parse(payloadJson) as { role?: string }
        const role = payload.role
        if (role === "manager") {
          router.replace("/manager")
        } else if (role === "admin") {
          router.replace("/admin")
        } else {
          router.replace("/dashboard")
        }
      } catch {
        // Fallback if decoding fails for any reason.
        router.replace("/dashboard")
      }
      return
    }
    router.replace("/signin")
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Signing you in...</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Please wait.
        </CardContent>
      </Card>
    </main>
  )
}

