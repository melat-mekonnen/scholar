"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/user-preferences"
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

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { t } = useStudentI18n()
  const [mounted, setMounted] = useState(false)

  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadNotificationPreferences)

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
      }
      setLoading(false)
    }
    void load()
  }, [router])

  useEffect(() => {
    setPrefs(loadNotificationPreferences())
  }, [])

  function updatePrefs(partial: Partial<NotificationPreferences>) {
    setPrefs((prev) => {
      const next = { ...prev, ...partial }
      saveNotificationPreferences(next)
      return next
    })
  }

  const sidebarLinks = [
    { href: "/dashboard", label: t("Dashboard"), icon: LayoutDashboard },
    { href: "/scholarships", label: t("Browse Scholarships"), icon: Search },
    { href: "/applications", label: t("My Applications"), icon: FileText },
    { href: "/community", label: t("Community"), icon: Users },
    { href: "/saved", label: t("Saved Scholarships"), icon: Bookmark },
    { href: "/profile", label: t("Profile"), icon: UserCircle2 },
    { href: "/settings", label: t("Settings"), icon: SettingsIcon, active: true },
    { href: "/documents", label: t("Documents"), icon: FolderOpen },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-72 border-r border-blue-100/70 bg-white p-6 md:block">
        <div className="mb-8 flex items-center gap-3">
          <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
        </div>
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
          {t("Student Portal")}
        </h2>

        <nav className="space-y-1.5">
          {sidebarLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.active
                    ? "group flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 px-3 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100"
                    : "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                }
              >
                <span
                  className={
                    item.active
                      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100"
                      : "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:ring-1 group-hover:ring-slate-200"
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-blue-100/70 bg-white/95 p-4 backdrop-blur">
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
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
            <p className="mt-1 text-sm text-blue-50">
              Manage your account, notifications, and how EthioScholar looks for you.
            </p>
          </div>

          {/* Account */}
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
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
                <p className="text-slate-500 text-sm">Loading…</p>
              ) : me ? (
                <>
                  <div className="grid gap-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                      Name
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {me.fullName?.trim() || "—"}
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
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base text-slate-900">Notifications</CardTitle>
              </div>
              <CardDescription>
                Choose what we remind you about. Stored on this device until your account syncs with
                the server.
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
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
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
                <p className="text-slate-500 text-sm">Loading theme…</p>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
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
