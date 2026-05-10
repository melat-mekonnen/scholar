"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/layout/student-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const isStudent = user?.role === "student";

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/signin");
        return;
      }

      if (!isStudent) {
        router.replace("/unauthorized");
      }
    }
  }, [authLoading, isAuthenticated, isStudent, router]);

  if (authLoading || !isAuthenticated || !isStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading student access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentSidebar />
      <div className="ml-64 min-h-screen">{children}</div>
    </div>
  );
}
