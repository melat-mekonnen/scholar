"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  Search,
  FileText,
  Users,
  Bookmark,
  Sparkles,
  MessageSquare,
  UserCircle2,
  Settings,
  FolderOpen,
  CheckCircle2,
} from "lucide-react"

import { StudentProfileForm, type StudentProfile } from "../../components/student-profile-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiFetchJson } from "@/lib/api"
import { getPostAuthPath } from "@/lib/redirect-by-role"
import { ProfileAvatarLink } from "@/components/student-portal/profile-avatar-link"
import { StudentPortalInlineAside } from "@/components/student-portal/student-portal-inline-aside"
import { StudentLanguageToggle } from "@/components/student-language-toggle"
import { useStudentI18n } from "@/lib/student-i18n"
import { Skeleton } from "@/components/ui/skeleton"

type MeResponse = {
  role?: string
}

function backLabelForRole(role: string | undefined) {
  switch (role) {
    case "manager":
      return "Back to Manager"
    case "admin":
      return "Back to Admin"
    case "owner":
      return "Back to Owner"
    default:
      return "Back to Dashboard"
  }
}

function ProfilePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useStudentI18n()
  const intentStudent = searchParams.get("intent") === "student"

  const [role, setRole] = useState<string | undefined>(undefined)
  const [roleChecked, setRoleChecked] = useState(false)

  useEffect(() => {
    async function loadRole() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
      if (res.ok && data?.role) {
        setRole(data.role)
        if (!intentStudent && data.role === "manager") {
          router.replace("/manager/profile")
          return
        }
        if (!intentStudent && data.role === "owner") {
          router.replace("/owner/posting-profile")
          return
        }
      }
      setRoleChecked(true)
    }
    void loadRole()
  }, [router, intentStudent])

  const homeHref = role ? getPostAuthPath(role) : "/dashboard"

  const handleSaveProfile = (_profile: StudentProfile) => {
    // Saved state is handled inside StudentProfileForm (toast + banner).
  }

  if (!roleChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="w-full max-w-md space-y-3 rounded-2xl border border-emerald-100/80 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 p-6 shadow-sm">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }


  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-background dark:text-foreground transition-colors duration-200">
      <StudentPortalInlineAside />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6 dark:border-border dark:bg-card dark:text-foreground dark:shadow-none transition-colors duration-200">
          {(role === "manager" || role === "owner") && intentStudent ? (
            <Button asChild variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
              <Link href={homeHref}>{backLabelForRole(role)}</Link>
            </Button>
          ) : (
            <div>
              <h1 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">{t("Profile")}</h1>
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

          <div className="rounded-2xl border border-emerald-100/80 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 px-6 py-7 shadow-sm shadow-emerald-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-700 ring-1 ring-emerald-100">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">Student applicant profile</h2>
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
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200">
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

              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-90" />
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">Frequently Asked</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">Can I update my profile later?</p>
                    <p className="mt-1 text-xs text-slate-500">Yes, you can update your profile anytime.</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">How does completeness score work?</p>
                    <p className="mt-1 text-xs text-slate-500">
                      GPA, degree, field, preferred country, and interests each add to your score.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-emerald-100/80 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 p-6 shadow-sm">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  )
}
