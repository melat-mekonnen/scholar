"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Twitter, Linkedin, Facebook, Instagram } from "lucide-react"
import { apiFetchJson, API_BASE_URL } from "@/lib/api"
import { getPostAuthPath } from "@/lib/redirect-by-role"
import { setToken } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError, FieldSeparator } from "@/components/ui/field"

type AuthMode = "signin" | "signup"

type AuthPageProps = {
  initialMode: AuthMode
}

type LoginResponse = {
  token: string
  user: { id: string; fullName: string; email: string; role: string }
}

type SignupResponse = {
  token: string
  user: { id: string; fullName: string; email: string; role: string }
}

export default function AuthPage({ initialMode }: AuthPageProps) {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  })
  const [signUpData, setSignUpData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [signInErrors, setSignInErrors] = useState<Record<string, string>>({})
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const validateSignIn = () => {
    const newErrors: Record<string, string> = {}

    if (!signInData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signInData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!signInData.password) {
      newErrors.password = "Password is required"
    }

    setSignInErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateSignUp = () => {
    const newErrors: Record<string, string> = {}

    if (!signUpData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!signUpData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!signUpData.password) {
      newErrors.password = "Password is required"
    } else if (signUpData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (!signUpData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (signUpData.password !== signUpData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setSignUpErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateSignIn()) return

    setIsLoading(true)
    setFormError(null)

    try {
      const { res, data, errorMessage } = await apiFetchJson<LoginResponse>("/api/auth/login", {
        method: "POST",
        auth: false,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signInData.email,
          password: signInData.password,
        }),
      })

      if (!res.ok || !data?.token) {
        setSignInErrors((prev) => ({ ...prev, password: "Invalid credentials" }))
        setFormError(errorMessage || "Sign in failed")
        return
      }

      setToken(data.token)
      router.push(getPostAuthPath(data.user?.role))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateSignUp()) return

    setIsLoading(true)
    setFormError(null)

    try {
      const { res, data, errorMessage } = await apiFetchJson<SignupResponse>("/api/auth/register", {
        method: "POST",
        auth: false,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: signUpData.fullName,
          email: signUpData.email,
          password: signUpData.password,
        }),
      })

      if (!res.ok || !data?.token) {
        setSignUpErrors((prev) => ({ ...prev, email: "" }))
        setFormError(errorMessage || "Sign up failed")
        return
      }

      setToken(data.token)
      router.push(getPostAuthPath(data.user?.role))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    window.location.href = `${API_BASE_URL}/api/auth/oauth/google`
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setFormError(null)
  }

  const isSignIn = mode === "signin"

  const renderSignInForm = () => (
    <section className="p-6 md:p-7">
      <CardHeader className="p-0 text-center">
        <CardTitle className="text-2xl font-bold text-emerald-600">Sign in to EthioScholar</CardTitle>
        <CardDescription className="mt-3 text-sm leading-relaxed">
          Use your account credentials to continue.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 pt-6">
        {formError ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <form onSubmit={handleSignInSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="signin-email">Email</FieldLabel>
              <Input
                id="signin-email"
                type="email"
                placeholder="Enter your email"
                value={signInData.email}
                onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                aria-invalid={!!signInErrors.email}
              />
              {signInErrors.email && <FieldError>{signInErrors.email}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="signin-password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showSignInPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  aria-invalid={!!signInErrors.password}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground sm:w-11"
                  aria-label={showSignInPassword ? "Hide password" : "Show password"}
                >
                  {showSignInPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
              {signInErrors.password && <FieldError>{signInErrors.password}</FieldError>}
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-xs text-emerald-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </Field>

            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-emerald-500 hover:bg-emerald-600"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            <FieldSeparator>OR</FieldSeparator>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </FieldGroup>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"Don't have an account? "}
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="font-medium text-emerald-600 hover:underline"
          >
            Sign Up
          </button>
        </p>
      </CardContent>
    </section>
  )

  const renderSignUpForm = () => (
    <section className="p-6 md:p-7">
      <CardHeader className="p-0 text-center">
        <CardTitle className="text-2xl font-bold text-emerald-600">Create Account</CardTitle>
        <CardDescription className="mt-3 text-sm leading-relaxed">
          Create your profile and start your scholarship journey.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 pt-6">
        {formError ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <form onSubmit={handleSignUpSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="signup-fullname">Full Name</FieldLabel>
              <Input
                id="signup-fullname"
                type="text"
                placeholder="Enter your full name"
                value={signUpData.fullName}
                onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                aria-invalid={!!signUpErrors.fullName}
              />
              {signUpErrors.fullName && <FieldError>{signUpErrors.fullName}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input
                id="signup-email"
                type="email"
                placeholder="Enter your email"
                value={signUpData.email}
                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                aria-invalid={!!signUpErrors.email}
              />
              {signUpErrors.email && <FieldError>{signUpErrors.email}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  aria-invalid={!!signUpErrors.password}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground sm:w-11"
                  aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                >
                  {showSignUpPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
              {signUpErrors.password && <FieldError>{signUpErrors.password}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-confirm-password">Confirm Password</FieldLabel>
              <div className="relative">
                <Input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                  aria-invalid={!!signUpErrors.confirmPassword}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground sm:w-11"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
              {signUpErrors.confirmPassword && <FieldError>{signUpErrors.confirmPassword}</FieldError>}
            </Field>

            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-emerald-500 hover:bg-emerald-600"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            <FieldSeparator>OR</FieldSeparator>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </FieldGroup>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="font-medium text-emerald-600 hover:underline"
          >
            Sign In
          </button>
        </p>
      </CardContent>
    </section>
  )

  const renderSidePanel = ({
    title,
    text,
    buttonText,
    onClick,
  }: {
    title: string
    text: string
    buttonText: string
    onClick: () => void
  }) => (
    <aside className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white md:min-h-full md:p-7">
      <div className="pointer-events-none absolute right-10 top-10 h-10 w-10 rotate-45 rounded-md bg-white/10" />
      <div className="pointer-events-none absolute bottom-20 left-12 h-14 w-14 rotate-12 rounded-md bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/10" />

      <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-9 w-auto brightness-0 invert" />
      <div className="mt-16">
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        <p className="mt-4 max-w-xs text-white/90">{text}</p>
        <Button
          type="button"
          variant="outline"
          onClick={onClick}
          className="mt-8 h-11 w-44 rounded-full border-2 border-white bg-transparent text-xs font-semibold tracking-[0.18em] text-white hover:bg-white hover:text-emerald-600"
        >
          {buttonText}
        </Button>
      </div>
    </aside>
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4 pb-0 dark:bg-background transition-colors duration-200">
      <Card className="w-full max-w-3xl overflow-hidden border-0 bg-white shadow-2xl dark:bg-card dark:text-card-foreground dark:border-border transition-colors duration-200">
        <div
          className={`hidden w-[200%] transition-transform duration-700 ease-in-out md:flex ${
            isSignIn ? "translate-x-0" : "-translate-x-1/2"
          }`}
        >
          <div className="grid w-1/2 md:grid-cols-[1.45fr_0.95fr]">
            {renderSignInForm()}
            {renderSidePanel({
              title: "Hello, Friend!",
              text: "Enter your personal details and start your journey with us.",
              buttonText: "SIGN UP",
              onClick: () => switchMode("signup"),
            })}
          </div>
          <div className="grid w-1/2 md:grid-cols-[0.95fr_1.45fr]">
            {renderSidePanel({
              title: "Welcome Back!",
              text: "To keep connected with us, please sign in with your personal information.",
              buttonText: "SIGN IN",
              onClick: () => switchMode("signin"),
            })}
            {renderSignUpForm()}
          </div>
        </div>

        <div className="md:hidden">
          {isSignIn ? (
            <>
              {renderSignInForm()}
              <div className="p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => switchMode("signup")}
                  className="h-11 w-full rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  Switch to Sign Up
                </Button>
              </div>
            </>
          ) : (
            <>
              {renderSignUpForm()}
              <div className="p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => switchMode("signin")}
                  className="h-11 w-full rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  Switch to Sign In
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <footer className="mt-10 w-full border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3">
                <img
                  src="/ethioscholar-logo.svg"
                  alt="EthioScholar"
                  className="h-10 w-auto"
                />
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                A modern platform to discover scholarships and track applications with confidence.
              </p>
            </div>

            <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2 lg:justify-self-center lg:-translate-x-6">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick links</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>
                    <Link className="hover:text-slate-900" href="/#top">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-slate-900" href="/#about">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-slate-900" href="/signin">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-slate-900" href="/signup">
                      Sign up
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-slate-900" href="/community">
                      Community
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-slate-600">
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="X (Twitter)"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 md:flex-row">
            <p>© 2026 EthioScholar. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                Built for global opportunities
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
