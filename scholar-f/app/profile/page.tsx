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
import { StudentPortalFooter } from "@/components/student-portal/student-footer"

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
  const sidebarLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scholarships", label: "Browse Scholarships", icon: Search },
    { href: "/applications", label: "My Applications", icon: FileText },
    { href: "/community", label: "Community", icon: Users },
    { href: "/saved", label: "Saved Scholarships", icon: Bookmark },
    { href: "/profile", label: "Profile", icon: UserCircle2, active: true },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/documents", label: "Document Resources", icon: FolderOpen },
  ]

  const handleSaveProfile = (_profile: StudentProfile) => {
    // Saved state is handled inside StudentProfileForm (toast + banner).
  }

  if (!roleChecked) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-72 border-r border-blue-100/70 bg-white p-6 md:block">
        <div className="mb-8 flex items-center gap-3">
          <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-10 w-auto" />
        </div>
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Student Portal</h2>

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
          <Button asChild variant="outline" className="border-slate-300 bg-white hover:bg-slate-50">
            <Link href={homeHref}>{backLabelForRole(role)}</Link>
          </Button>
          <div className="flex items-center gap-2">
            {(role === "manager" || role === "owner") && intentStudent ? (
              <Button asChild variant="outline" className="border-slate-300 bg-white hover:bg-slate-50">
                <Link href={role === "owner" ? "/owner/posting-profile" : "/manager/profile"}>Posting profile</Link>
              </Button>
            ) : null}
            <ProfileAvatarLink />
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 p-6">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">Student applicant profile</h1>
            <p className="mt-2 text-sm text-blue-50">
              GPA, degree, field of study, and interests used for smarter scholarship matching.
            </p>
            {(role === "manager" || role === "owner") && intentStudent ? (
              <p className="mt-3 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-blue-50">
                You are editing your <strong>applicant</strong> details. Your posting profile is separate.
              </p>
            ) : null}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StudentProfileForm onSave={handleSaveProfile} />
            </div>

            <aside className="space-y-6">
              <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Tips for Success</CardTitle>
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

              <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Frequently Asked</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">Can I update my profile later?</p>
                    <p className="mt-1 text-xs text-slate-500">Yes, you can update your profile anytime.</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">How does completeness score work?</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Each section (GPA, Degree, Field, Interests) contributes 25%.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
        <StudentPortalFooter />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-8">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  )
}
