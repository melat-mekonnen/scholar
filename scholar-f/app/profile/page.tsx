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
import { StudentPortalSidebar } from "@/components/student-portal/student-portal-sidebar"
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
    <div className={cn("flex min-h-screen", studentPortalPageBg)}>
        <StudentPortalSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className={studentPortalHeaderClass}>
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

        <main className="min-h-0 flex-1 space-y-6 p-6">
          <StudentPortalHeroSection
            as="h1"
            title="Student applicant profile"
            description="GPA, degree, field of study, and interests used for smarter scholarship matching."
          >
            {(role === "manager" || role === "owner") && intentStudent ? (
              <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                You are editing your <strong>applicant</strong> details. Your posting profile is separate.
              </p>
            ) : null}
          </StudentPortalHeroSection>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StudentProfileForm onSave={handleSaveProfile} />
            </div>

            <aside className="space-y-6">
              <Card className={studentPortalCardClass}>
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

              <Card className={studentPortalCardClass}>
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
