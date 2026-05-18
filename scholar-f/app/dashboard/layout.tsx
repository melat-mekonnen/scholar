"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

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
      <SidebarProvider>
        <div className="w-64 border-r bg-sidebar hidden md:flex flex-col p-4 gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2 mt-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-[80%]" />
            <Skeleton className="h-8 w-[90%]" />
          </div>
        </div>
        <SidebarInset>
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading student access…</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <PlatformSidebar role="student" />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background z-10 sticky top-0">
          <SidebarTrigger className="-ml-1" />
          <div className="w-full flex justify-end">
            {/* Future header actions can go here */}
          </div>
        </header>
        <main className="flex-1 bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
