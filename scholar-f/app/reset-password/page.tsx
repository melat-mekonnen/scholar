"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { apiFetchJson } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function ResetPasswordForm() {
  const params = useSearchParams()
  const initialToken = useMemo(() => params.get("token") ?? "", [params])
  const [token, setToken] = useState(initialToken)
  const [newPassword, setNewPassword] = useState("")
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
        "/api/auth/password-reset",
        {
          method: "POST",
          auth: false,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        },
      )
      if (!res.ok) {
        setError(errorMessage || "Password reset failed")
        return
      }
      setMessage(data?.message || "Password reset successful. You can now sign in.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Use the token from your reset request to set a new password.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {message ? <p className="mb-3 text-sm text-green-700">{message}</p> : null}
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Reset token"
              required
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              minLength={8}
              required
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Back to <Link href="/signin" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-4 bg-background">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
