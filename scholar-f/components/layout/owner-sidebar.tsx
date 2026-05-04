"use client";

import {
  LayoutDashboard,
  Eye,
  Settings,
  LogOut,
  Globe,
  Activity,
  Network,
  Building2,
  BadgeDollarSign,
  BarChart3,
  ScrollText,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useRouter } from "next/navigation";
import { clearToken, logoutFromServer } from "@/lib/auth";

interface OwnerSidebarProps {
  className?: string;
}

export function OwnerSidebar({ className }: OwnerSidebarProps) {
  const router = useRouter();

  const handleSignOut = () => {
    void logoutFromServer();
    clearToken();
    router.push("/signin");
  };

  const sections = [
    {
      items: [
        {
          href: "/owner",
          label: "Overview",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: "/owner/scholarships",
          label: "Scholarship Control",
          icon: <Eye className="h-4 w-4" />,
        },
        {
          href: "/owner/sources",
          label: "Sources",
          icon: <Globe className="h-4 w-4" />,
        },
        {
          href: "/owner/verification",
          label: "AI Verification",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          href: "/owner/discovery",
          label: "Discovery Pipeline",
          icon: <Network className="h-4 w-4" />,
        },
        {
          href: "/owner/partners",
          label: "University Partners",
          icon: <Building2 className="h-4 w-4" />,
        },
        {
          href: "/owner/monetization",
          label: "Monetization",
          icon: <BadgeDollarSign className="h-4 w-4" />,
        },
        {
          href: "/owner/analytics",
          label: "Analytics",
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          href: "/owner/logs",
          label: "System Logs",
          icon: <ScrollText className="h-4 w-4" />,
        },
      ],
    },
  ];

  const footer = (
    <div className="space-y-2">
      <button 
        onClick={() => router.push("/owner/settings")}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );

  return (
    <Sidebar
      brand={{
        name: "Platform Owner",
        logo: <Building2 className="h-5 w-5 text-primary" />,
      }}
      sections={sections}
      footer={footer}
      className={className}
    />
  );
}
