"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Bell,
  FolderOpen,
  LayoutDashboard,
  Moon,
  Palette,
  Search,
  Shield,
  Bookmark,
  FileText,
  UserCircle,
  UserCircle2,
  Users,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalFooter } from "@/components/student-portal/student-footer"
import { StudentPortalHeroSection } from "@/components/student-portal/student-portal-hero"
import {
  studentPortalCardClass,
  studentPortalHeaderClass,
  studentPortalPageBg,
} from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"
type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const { t } = useStudentI18n()
  const [mounted, setMounted] = useState(false)

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
    setMounted(true)
  }, [])

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
    <div className={cn("flex min-h-screen", studentPortalPageBg)}>
      <StudentPortalSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className={studentPortalHeaderClass}>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
            {me?.role && (
              <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-700">
                {me.role}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ProfileAvatarLink />
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white hover:bg-slate-50"
              onClick={() => {
                void logoutFromServer()
                clearToken()
                router.push("/signin")
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-8 p-6">
          <StudentPortalHeroSection
            title="Settings"
            description="Manage your account, notifications, and how EthioScholar looks for you."
          />

          {/* AI Chat subscription */}
          <Card className={studentPortalCardClass}>
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
                      {subscription.provider ? ` Ã‚Â· ${subscription.provider}` : ""}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button asChild>
                      <Link href="/settings/subscription">
                        {chatQuota.unlimited ? "Manage subscription" : "View plans & upgrade"}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/ai-chat">Open AI Chat</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Loading subscription statusÃ¢â‚¬Â¦</p>
              )}
            </CardContent>
          </Card>

          {/* Account */}
          <Card className={studentPortalCardClass}>
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
                <p className="text-slate-500 text-sm">LoadingÃ¢â‚¬Â¦</p>
              ) : me ? (
                <>
                  <div className="grid gap-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                      Name
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {me.fullName?.trim() || "Ã¢â‚¬â€"}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                      Email
                    </p>
                    <p className="text-sm font-medium text-slate-900">{me.email}</p>
                  </div>
                  <Separator />
                  <Button asChild variant="outline" size="sm" className="border-slate-300 bg-white hover:bg-slate-50">
                    <Link href="/profile">Edit academic profile</Link>
                  </Button>
                </>
              ) : (
                <p className="text-slate-500 text-sm">Could not load account.</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className={studentPortalCardClass}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base text-slate-900">Notifications</CardTitle>
              </div>
              <CardDescription>
                Email and reminder preferences for your account. Changes sync to the server when you
                are signed in as a student.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="email-updates">Product updates</Label>
                  <p className="text-slate-500 text-xs">
                    News and tips about EthioScholar
                  </p>
                </div>
                <Switch
                  id="email-updates"
                  checked={prefs.emailUpdates}
                  onCheckedChange={(v) => updatePrefs({ emailUpdates: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="deadlines">Deadline reminders</Label>
                  <p className="text-slate-500 text-xs">
                    Alerts before scholarship deadlines you care about
                  </p>
                </div>
                <Switch
                  id="deadlines"
                  checked={prefs.deadlineReminders}
                  onCheckedChange={(v) => updatePrefs({ deadlineReminders: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="matches">New matches</Label>
                  <p className="text-slate-500 text-xs">
                    When new scholarships match your profile
                  </p>
                </div>
                <Switch
                  id="matches"
                  checked={prefs.matchAlerts}
                  onCheckedChange={(v) => updatePrefs({ matchAlerts: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="apply-followups">Application follow-up emails</Label>
                  <p className="text-slate-500 text-xs">
                    Email to confirm you applied after starting from a saved scholarship
                  </p>
                </div>
                <Switch
                  id="apply-followups"
                  checked={prefs.applyFollowups}
                  onCheckedChange={(v) => updatePrefs({ applyFollowups: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className={studentPortalCardClass}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base text-slate-900">Appearance</CardTitle>
              </div>
              <CardDescription>Light, dark, or follow your system.</CardDescription>
            </CardHeader>
            <CardContent>
              {mounted ? (
                <div className="flex flex-col gap-2 sm:max-w-xs">
                  <Label htmlFor="theme-select" className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Theme
                  </Label>
                  <Select value={theme ?? "system"} onValueChange={setTheme}>
                    <SelectTrigger id="theme-select" className="w-full rounded-lg border-slate-300 bg-white">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Loading themeÃ¢â‚¬Â¦</p>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card className={studentPortalCardClass}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base text-slate-900">Security</CardTitle>
              </div>
              <CardDescription>Session and sign-in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-500 text-sm">
                You are signed in with a secure token stored in this browser. Sign out on shared
                devices when you are done.
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
        <StudentPortalFooter />
      </div>
    </div>
  )
}
