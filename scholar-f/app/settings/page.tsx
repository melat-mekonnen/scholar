"use client"

import Link from "next/link"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Bell,
  FolderOpen,
  LayoutDashboard,
  Palette,
  Search,
  Shield,
  Bookmark,
  Sparkles,
  MessageSquare,
  FileText,
  UserCircle,
  UserCircle2,
  Users,
  Settings as SettingsIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import {
  loadNotificationPreferences,
  saveNotificationPreferences as saveLocalNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/user-preferences"
import {
  fetchNotificationPreferences,
  saveNotificationPreferences as saveServerNotificationPreferences,
} from "@/lib/notification-preferences-api"
import type { SubscriptionStatus } from "@/lib/subscription-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { ThemeSettings } from "@/components/theme-settings"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  headerShell,
  pageShell,
  settingsCardClass,
  textMuted,
  textPrimary,
} from "@/lib/theme"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { Skeleton } from "@/components/ui/skeleton"

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useStudentI18n()

  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadNotificationPreferences)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)

  async function loadSubscription() {
    const { res, data } = await apiFetchJson<SubscriptionStatus>("/api/billing/subscription", {
      method: "GET",
      auth: true,
    })
    if (res.ok && data) {
      setSubscription(data)
    }
  }

  const chatQuota = subscription?.chat ?? null

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
        if (data.role === "student" || !data.role) {
          const prefsRes = await fetchNotificationPreferences()
          if (prefsRes.res.ok && prefsRes.data) {
            const serverPrefs: NotificationPreferences = {
              emailUpdates: prefsRes.data.emailUpdates,
              deadlineReminders: prefsRes.data.deadlineReminders,
              matchAlerts: prefsRes.data.matchAlerts,
              applyFollowups: prefsRes.data.applyFollowups,
            }
            setPrefs(serverPrefs)
            saveLocalNotificationPreferences(serverPrefs)
          } else {
            setPrefs(loadNotificationPreferences())
          }
        } else {
          setPrefs(loadNotificationPreferences())
        }
      }
      setLoading(false)
    }
    void load()
    void loadSubscription()
  }, [router])

  useEffect(() => {
    setPrefs(loadNotificationPreferences())
  }, [])

  useEffect(() => {
    const billing = searchParams.get("billing")
    if (billing === "success" || billing === "cancel") {
      router.replace(`/settings/subscription?billing=${billing}`)
    }
  }, [searchParams, router])

  function updatePrefs(partial: Partial<NotificationPreferences>) {
    setPrefs((prev) => {
      const next = { ...prev, ...partial }
      saveLocalNotificationPreferences(next)
      if (me?.role === "student" || !me?.role) {
        void saveServerNotificationPreferences(next)
      }
      return next
    })
  }

  return (
    <div className={cn("flex min-h-screen w-full max-w-[100vw] overflow-x-hidden", pageShell)}>
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <header className={cn("flex items-center justify-between px-4 md:px-6", headerShell)}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={cn("text-lg font-semibold text-emerald-950 dark:text-foreground")}>{t("Settings")}</h1>
              {me?.role ? (
                <Badge className="capitalize bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100">
                  {me.role}
                </Badge>
              ) : null}
            </div>
            <p className={cn("text-xs", textMuted)}>Account, notifications, appearance, and security.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative mx-auto w-full min-w-0 max-w-5xl space-y-6 overflow-x-hidden p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className={cn(settingsCardClass, "px-6 py-7")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-border">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className={cn("text-2xl font-semibold tracking-tight", textPrimary)}>Your preferences</h2>
                  <p className={cn("mt-2 text-sm leading-relaxed", textMuted)}>
                    Manage your account, notifications, and how EthioScholar looks for you.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/profile">{t("Profile")}</Link>
              </Button>
            </div>
          </div>

          {/* AI Chat subscription */}
          <Card className={settingsCardClass}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-emerald-500 opacity-90" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <CardTitle className="text-base text-slate-900">AI Chat subscription</CardTitle>
              </div>
              <CardDescription>
                Free: 3 messages per day. Pro: unlimited AI chat. Manage plans, payments, and billing on the
                subscription page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {chatQuota ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        chatQuota.unlimited
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }
                    >
                      {chatQuota.unlimited ? "Pro" : "Free"}
                    </Badge>
                    {!chatQuota.unlimited ? (
                      <span className="text-sm text-slate-600">
                        {chatQuota.remaining ?? 0} of {chatQuota.limit ?? 3} messages left today
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600">Unlimited AI chat</span>
                    )}
                  </div>
                  {subscription?.expiresAt ? (
                    <p className="text-xs text-slate-500">
                      Pro until {new Date(subscription.expiresAt).toLocaleDateString()}
                      {subscription.provider ? ` · ${subscription.provider}` : ""}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                      <Link href="/settings/subscription">
                        {chatQuota.unlimited ? "Manage subscription" : "View plans & upgrade"}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                      <Link href="/ai-chat">Open AI Chat</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Loading subscription status…</p>
              )}
            </CardContent>
          </Card>

          {/* Account */}
          <Card className={settingsCardClass}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base text-slate-900">Account</CardTitle>
              </div>
              <CardDescription>
                Your sign-in identity. Academic details are edited in your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-56" />
                </div>
              ) : me ? (
                <>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-900">{me.fullName?.trim() || "—"}</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-900">{me.email}</p>
                  </div>
                  <Separator className="bg-emerald-100/80" />
                  <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                    <Link href="/profile">Edit academic profile</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-slate-500">Could not load account.</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className={settingsCardClass}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-90" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base text-slate-900">Notifications</CardTitle>
              </div>
              <CardDescription>
                Email and reminder preferences for your account. Changes sync to the server when you
                are signed in as a student.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100/80 bg-emerald-50/30 px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="email-updates">Product updates</Label>
                  <p className="text-xs text-slate-500">News and tips about EthioScholar</p>
                </div>
                <Switch
                  id="email-updates"
                  checked={prefs.emailUpdates}
                  onCheckedChange={(v) => updatePrefs({ emailUpdates: v })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100/80 bg-emerald-50/30 px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="deadlines">Deadline reminders</Label>
                  <p className="text-xs text-slate-500">Alerts before scholarship deadlines you care about</p>
                </div>
                <Switch
                  id="deadlines"
                  checked={prefs.deadlineReminders}
                  onCheckedChange={(v) => updatePrefs({ deadlineReminders: v })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100/80 bg-emerald-50/30 px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="matches">New matches</Label>
                  <p className="text-xs text-slate-500">When new scholarships match your profile</p>
                </div>
                <Switch
                  id="matches"
                  checked={prefs.matchAlerts}
                  onCheckedChange={(v) => updatePrefs({ matchAlerts: v })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100/80 bg-emerald-50/30 px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="apply-followups">Application follow-up emails</Label>
                  <p className="text-xs text-slate-500">
                    Email to confirm you applied after starting from a saved scholarship
                  </p>
                </div>
                <Switch
                  id="apply-followups"
                  checked={prefs.applyFollowups}
                  onCheckedChange={(v) => updatePrefs({ applyFollowups: v })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className={settingsCardClass}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base text-slate-900">Appearance</CardTitle>
              </div>
              <CardDescription>Light, dark, or follow your system.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSettings />
            </CardContent>
          </Card>

          {/* Security */}
          <Card className={settingsCardClass}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-90" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base text-slate-900">Security</CardTitle>
              </div>
              <CardDescription>Session and sign-in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                You are signed in with a secure token stored in this browser. Sign out on shared devices when you are done.
              </p>
              <Button
                variant="destructive"
                onClick={() => {
                  void logoutFromServer()
                  clearToken()
                  router.push("/signin")
                }}
              >
                Sign out everywhere on this device
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground p-6 text-sm">Loading settings…</div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  )
}
