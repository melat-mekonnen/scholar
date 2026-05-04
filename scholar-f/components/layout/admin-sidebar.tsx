"use client";

import {
  LayoutDashboard,
  Eye,
  Users,
  ListChecks,
  FileText,
  Settings,
  LogOut,
  Search,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const router = useRouter();

  const handleSignOut = () => {
    clearToken();
    router.push("/signin");
  };

  const sections = [
    {
      items: [
        {
          href: "/admin",
          label: "Dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: "/admin/scholarships/pending",
          label: "Manage Scholarships",
          icon: <Eye className="h-4 w-4" />,
        },
        {
          href: "/admin/users",
          label: "Manage Users",
          icon: <Users className="h-4 w-4" />,
        },
        {
          href: "/admin/candidates",
          label: "Review Candidates",
          icon: <Search className="h-4 w-4" />,
        },
        {
          href: "/admin/audit-logs",
          label: "Audit Logs",
          icon: <ListChecks className="h-4 w-4" />,
        },
        {
          href: "/admin/documents",
          label: "Manage Documents",
          icon: <FileText className="h-4 w-4" />,
        },
      ],
    },
  ];

  const footer = (
    <div className="space-y-2">
      <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
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
        name: "EthioScholar",
        logo: <LayoutDashboard className="h-5 w-5" />,
      }}
      sections={sections}
      footer={footer}
      className={className}
    />
  );
}
