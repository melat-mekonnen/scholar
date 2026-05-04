"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  StudentProfileForm,
  type StudentProfile,
} from "../../components/student-profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetchJson } from "@/lib/api";
import { getPostAuthPath } from "@/lib/redirect-by-role";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/layout/student-sidebar";

type MeResponse = {
  role?: string;
};

function backLabelForRole(role: string | undefined) {
  switch (role) {
    case "manager":
      return "Back to Manager";
    case "admin":
      return "Back to Admin";
    case "owner":
      return "Back to Owner";
    default:
      return "Back to Dashboard";
  }
}

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const intentStudent = searchParams.get("intent") === "student";

  // All hooks must be called before any conditional returns
  const [role, setRole] = useState<string | undefined>(user?.role);
  const [roleChecked, setRoleChecked] = useState(true);

  // Check if user has student role (or is authenticated but not admin)
  const isStudent = user && (user.role === "student" || user.role !== "admin");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/signin");
        return;
      }
      // If user is admin, redirect to admin dashboard
      if (user?.role === "admin") {
        router.replace("/admin");
        return;
      }
      // Handle role-based redirects for managers and owners
      if (!intentStudent && user?.role === "manager") {
        router.replace("/manager/profile");
        return;
      }
      if (!intentStudent && user?.role === "owner") {
        router.replace("/owner/posting-profile");
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, router, intentStudent]);

  const homeHref = getPostAuthPath(role);

  // Don't render anything while checking authentication
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <StudentSidebar />
      <div className="flex-1 bg-background">
        <header className="sticky top-0 z-50 border-b bg-card">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href={homeHref}
              className="flex items-center gap-2 hover:opacity-80"
            >
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="text-sm font-medium">
                {backLabelForRole(role)}
              </span>
            </Link>
            {(role === "manager" || role === "owner") && intentStudent ? (
              <Link
                href={
                  role === "owner"
                    ? "/owner/posting-profile"
                    : "/manager/profile"
                }
                className="text-sm font-medium text-primary hover:underline"
              >
                Posting profile
              </Link>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Student applicant profile
            </h1>
            <p className="mt-2 text-muted-foreground">
              GPA, degree, field of study, and interests — used for scholarship
              matching when you apply as a student.
            </p>
            {(role === "manager" || role === "owner") && intentStudent ? (
              <p className="mt-3 text-sm text-muted-foreground border rounded-md bg-muted/50 px-3 py-2">
                You opened this page to edit your <strong>applicant</strong>{" "}
                details. Your{" "}
                <Link
                  href={
                    role === "owner"
                      ? "/owner/posting-profile"
                      : "/manager/profile"
                  }
                  className="text-primary underline font-medium"
                >
                  posting profile
                </Link>{" "}
                is separate.
              </p>
            ) : null}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StudentProfileForm onSave={() => {}} />
            </div>

            <aside className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tips for Success</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Be accurate</p>
                      <p className="text-muted-foreground text-xs">
                        Provide your real information for best matches
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Fill in over time</p>
                      <p className="text-muted-foreground text-xs">
                        Reach higher completeness when you are ready — nothing
                        is required to save.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Update regularly</p>
                      <p className="text-muted-foreground text-xs">
                        Keep your profile current as you progress
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Diverse interests</p>
                      <p className="text-muted-foreground text-xs">
                        Select multiple interests for more opportunities
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Frequently Asked</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">
                      Can I update my profile later?
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Yes, you can update your profile anytime
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">
                      How does completeness score work?
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Each section (GPA, Degree, Field, Interests) adds 25%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
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
  );
}
