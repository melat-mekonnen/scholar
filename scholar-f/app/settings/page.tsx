"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Bell,
  Moon,
  Palette,
  Shield,
  UserCircle,
} from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/user-preferences"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

function NavLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        "block text-sm font-medium hover:text-primary",
        active && "text-primary",
      )}
    >
      {children}
    </Link>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
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

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-6 md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">Scholarship Portal</h2>
          <p className="mt-1 text-xs text-muted-foreground">Student dashboard</p>
        </div>

        <nav className="space-y-3">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/scholarships">Browse Scholarships</NavLink>
          <NavLink href="/applications">My Applications</NavLink>
          <NavLink href="/community">Community</NavLink>
          <NavLink href="/saved">Saved Scholarships</NavLink>
          <NavLink href="/profile">Profile</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Settings</h1>
            {me?.role && (
              <Badge variant="secondary" className="capitalize">
                {me.role}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {(me?.fullName?.trim()
                  ? me.fullName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")
                  : me?.email?.[0]?.toUpperCase()) || "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="sm"
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

        <main className="mx-auto max-w-3xl space-y-8 p-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your account, notifications, and how EthioScholar looks for you.
            </p>
          </div>

          {/* Account */}
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircle className="text-primary h-5 w-5" />
                <CardTitle className="text-base">Account</CardTitle>
              </div>
              <CardDescription>
                Your sign-in identity. Academic details are edited in your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : me ? (
                <>
                  <div className="grid gap-1">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Name
                    </p>
                    <p className="text-sm font-medium">
                      {me.fullName?.trim() || "—"}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Email
                    </p>
                    <p className="text-sm font-medium">{me.email}</p>
                  </div>
                  <Separator />
                  <Button asChild variant="outline" size="sm">
                    <Link href="/profile">Edit academic profile</Link>
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Could not load account.</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="text-primary h-5 w-5" />
                <CardTitle className="text-base">Notifications</CardTitle>
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
                  <p className="text-muted-foreground text-xs">
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
                  <p className="text-muted-foreground text-xs">
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
                  <p className="text-muted-foreground text-xs">
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
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="text-primary h-5 w-5" />
                <CardTitle className="text-base">Appearance</CardTitle>
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
                    <SelectTrigger id="theme-select" className="w-full">
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
                <p className="text-muted-foreground text-sm">Loading theme…</p>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="text-primary h-5 w-5" />
                <CardTitle className="text-base">Security</CardTitle>
              </div>
              <CardDescription>Session and sign-in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
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
      </div>
    </div>
  )
}
