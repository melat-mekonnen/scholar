# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app/settings/page.tsx"
t = p.read_text(encoding="utf-8")

start = t.find('<motion.div className="flex-1">')
start = t.find('<div className="flex-1">')
end = t.find("        </main>\n      </motion.div>\n    </motion.div>")
end = t.find("        </main>\n      </div>\n    </div>")

if start < 0 or end < 0:
    raise SystemExit(f"markers not found start={start} end={end}")

new_block = r'''      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-emerald-950">{t("Settings")}</h1>
              {me?.role ? (
                <Badge className="capitalize bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100">
                  {me.role}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-600">Account, notifications, appearance, and security.</p>
          </div>
          <div className="flex items-center gap-2">
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="rounded-2xl border border-emerald-100/80 bg-white px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Your preferences</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Manage your account, notifications, and how EthioScholar looks for you.
                  </p>
                </div>
              </motion.div>
              <Button asChild variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/profile">{t("Profile")}</Link>
              </Button>
            </div>
          </div>

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
                Choose what we remind you about. Stored on this device until your account syncs with the server.
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
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className={settingsCardClass}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
            <CardHeader>
              <motion.div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base text-slate-900">Appearance</CardTitle>
              </div>
              <CardDescription>Light, dark, or follow your system.</CardDescription>
            </CardHeader>
            <CardContent>
              {mounted ? (
                <div className="flex flex-col gap-2 sm:max-w-xs">
                  <Label htmlFor="theme-select" className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-emerald-700" />
                    Theme
                  </Label>
                  <Select value={theme ?? "system"} onValueChange={setTheme}>
                    <SelectTrigger
                      id="theme-select"
                      className="w-full rounded-lg border-emerald-200/80 bg-white focus:ring-emerald-200/60"
                    >
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
                <p className="text-sm text-slate-500">Loading theme…</p>
              )}
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
'''

new_block = new_block.replace("</motion.div>", "</div>").replace("<motion.div", "<div").replace("motion.div", "motion.div")
new_block = new_block.replace("motion.div", "motion.div")
# fix appearance card header broken tag
new_block = new_block.replace(
    """            <CardHeader>
              <motion.div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base text-slate-900">Appearance</CardTitle>
              </div>""",
    """            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base text-slate-900">Appearance</CardTitle>
              </div>""",
)
new_block = new_block.replace(
    """                </div>
              </motion.div>
              <Button asChild""",
    """                </div>
              </div>
              <Button asChild""",
)

t = t[:start] + new_block + t[end:]
p.write_text(t, encoding="utf-8", newline="\n")
print("done")
