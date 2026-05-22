# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app/profile/page.tsx"
t = p.read_text(encoding="utf-8")

start = t.find('<div className="flex-1">')
end = t.find("        </main>\n      </div>\n    </div>\n  )\n}", start)
if start < 0 or end < 0:
    raise SystemExit("markers not found")

new_block = r'''      <motion.div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          {(role === "manager" || role === "owner") && intentStudent ? (
            <Button asChild variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
              <Link href={homeHref}>{backLabelForRole(role)}</Link>
            </Button>
          ) : (
            <div>
              <h1 className="text-lg font-semibold text-emerald-950">{t("Profile")}</h1>
              <p className="text-xs text-slate-600">Your applicant details power AI matches and recommendations.</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            {(role === "manager" || role === "owner") && intentStudent ? (
              <Button asChild variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href={role === "owner" ? "/owner/posting-profile" : "/manager/profile"}>Posting profile</Link>
              </Button>
            ) : null}
            <StudentLanguageToggle />
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-6xl flex-1 space-y-6 p-6">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="rounded-2xl border border-emerald-100/80 bg-white px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <motion.div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Student applicant profile</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    GPA, degree, field of study, country, and interests used for smarter scholarship matching.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                  <Link href="/ai-matches">{t("AI Matches")}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                  <Link href="/scholarships">{t("Browse Scholarships")}</Link>
                </Button>
              </div>
            </div>
            {(role === "manager" || role === "owner") && intentStudent ? (
              <p className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                You are editing your <strong>applicant</strong> details. Your posting profile is separate.
              </p>
            ) : null}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StudentProfileForm onSave={handleSaveProfile} />
            </div>

            <aside className="space-y-6">
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Tips for Success</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-slate-900">Be accurate</p>
                      <p className="text-xs text-slate-500">Provide real information for better scholarship matches.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-slate-900">Fill in over time</p>
                      <p className="text-xs text-slate-500">Nothing is required to save; improve completeness gradually.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-slate-900">Update regularly</p>
                      <p className="text-xs text-slate-500">Keep profile details current as your studies progress.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-slate-900">Add diverse interests</p>
                      <p className="text-xs text-slate-500">More interests can unlock more opportunities.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-90" />
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Frequently Asked</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">Can I update my profile later?</p>
                    <p className="mt-1 text-xs text-slate-500">Yes, you can update your profile anytime.</p>
                  </div>
                  <motion.div>
                    <p className="font-medium text-slate-900">How does completeness score work?</p>
                    <p className="mt-1 text-xs text-slate-500">
                      GPA, degree, field, preferred country, and interests each add to your score.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
'''

new_block = new_block.replace("motion.div", "motion.div")
new_block = new_block.replace("<motion.div", "<motion.div")
new_block = new_block.replace("motion.div", "div")
# fix botched replacements - do carefully
new_block = new_block.replace('      <motion.div className="flex min-h-screen flex-1 flex-col">', '      <div className="flex min-h-screen flex-1 flex-col">')
new_block = new_block.replace(
    '                <motion.div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">',
    '                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">',
)
new_block = new_block.replace("                  <motion.div>", "                  <div>")
new_block = new_block.replace("                  </motion.div>", "                  </div>")

t = t[:start] + new_block + t[end:]

# Remove unused showPortalHeader if present
t = t.replace("\n  const showPortalHeader = role === \"student\" || !role\n", "\n")

# Suspense fallback
t = t.replace(
    """      fallback={
        <div className="min-h-screen bg-background p-8">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }""",
    """      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
          <motion.div className="w-full max-w-md space-y-3 rounded-2xl border border-emerald-100/80 bg-white p-6 shadow-sm">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </motion.div>
        </motion.div>
      }""",
)
t = t.replace(
    '<motion.div className="w-full max-w-md space-y-3 rounded-2xl border border-emerald-100/80 bg-white p-6 shadow-sm">',
    '<div className="w-full max-w-md space-y-3 rounded-2xl border border-emerald-100/80 bg-white p-6 shadow-sm">',
)
t = t.replace("</motion.div>\n        </motion.div>", "</div>\n        </div>")

p.write_text(t, encoding="utf-8", newline="\n")
print("done")
