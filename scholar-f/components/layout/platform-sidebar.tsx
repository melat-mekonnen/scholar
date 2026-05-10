"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { roleNavigationConfig, RoleConfig } from "@/lib/role-navigation";
import { SidebarFooterProfile } from "@/components/layout/sidebar-footer-profile";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export function PlatformSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { state, isMobile } = useSidebar();
  
  // Enforce fallback if role config is missing
  const config: RoleConfig = roleNavigationConfig[role] || roleNavigationConfig["unknown"];
  const BrandIcon = config.brandIcon;
  const brandIconColor = config.brandIconColor || "text-foreground";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 flex items-center justify-start h-16 border-b">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 ${brandIconColor} shrink-0`}>
            <BrandIcon className="h-5 w-5" />
          </div>
          {state === "expanded" && (
            <span className="font-semibold text-lg truncate">{config.brandName}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {config.navSections.map((section, idx) => (
          <SidebarGroup key={idx}>
            <SidebarMenu className="gap-2">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-10 transition-all duration-200",
                        isActive && "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary",
                        !isActive && "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full">
                        <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isActive && "text-primary")} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarFooterProfile 
          user={user} 
          apiPathBase={role === "admin" || role === "owner" ? `/api/${role}` : undefined} 
          isCollapsed={state === "collapsed" && !isMobile}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
