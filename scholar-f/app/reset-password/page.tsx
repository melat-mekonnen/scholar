"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { apiFetchJson } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function ResetPasswordForm() {
  const params = useSearchParams()
  const initialToken = useMemo(() => params.get("token") ?? "", [params])
  const [token, setToken] = useState(initialToken)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                minLength={8}
                required
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground sm:w-11"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
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
