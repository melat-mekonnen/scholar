"use client";

import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function StudentSidebar() {
  return (
    <SidebarProvider>
      <PlatformSidebar role="student" />
      <SidebarInset>
        <SidebarTrigger />
      </SidebarInset>
    </SidebarProvider>
  );
}
