"use client"

import Link from "next/link"
import { useState } from "react"
import { apiFetchJson } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsLoading(true)
    try {
      const { res, data, errorMessage } = await apiFetchJson<{ message: string }>(
        "/api/auth/password-reset-request",
        {
          method: "POST",
          auth: false,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      )
      if (!res.ok) {
        setError(errorMessage || "Failed to request reset")
        return
      }
      setMessage(
        data?.message ||
          "If an account exists, a reset token has been generated. Check backend logs in dev mode.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Request a password reset token for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {message ? <p className="mb-3 text-sm text-green-700">{message}</p> : null}
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your account email"
              required
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Requesting..." : "Request reset"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have a token? <Link href="/reset-password" className="text-primary hover:underline">Reset password</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
