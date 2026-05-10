"use client";

import {
  LayoutDashboard,
  Search,
  FileText,
  Users,
  Bookmark,
  User,
  Settings,
  LogOut,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { PremiumBadge } from "@/components/premium/premium-badge";

interface StudentSidebarProps {
  className?: string;
}

export function StudentSidebar({ className }: StudentSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = () => {
    clearToken();
    router.push("/signin");
  };

  const sections = [
    {
      items: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: "/recommendations",
          label: "AI Recommendations",
          icon: <Sparkles className="h-4 w-4" />,
        },
        {
          href: "/scholarships",
          label: "Browse Scholarships",
          icon: <Search className="h-4 w-4" />,
        },
        {
          href: "/applications",
          label: "My Applications",
          icon: <FileText className="h-4 w-4" />,
        },
        {
          href: "/community",
          label: "Community",
          icon: <Users className="h-4 w-4" />,
        },
        {
          href: "/saved",
          label: "Saved Scholarships",
          icon: <Bookmark className="h-4 w-4" />,
        },
      ],
    },
    {
      items: [
        {
          href: "/profile",
          label: "Profile",
          icon: <User className="h-4 w-4" />,
        },
        {
          href: "/settings",
          label: "Settings",
          icon: <Settings className="h-4 w-4" />,
        },
        {
          href: "/pricing",
          label: "Pricing & Plans",
          icon: <CreditCard className="h-4 w-4" />,
        },
        {
          href: "/documents",
          label: "Document Resources",
          icon: <FileText className="h-4 w-4" />,
        },
      ],
    },
  ];

  const footer = (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );

  return (
    <Sidebar
      brand={{
        name: "Scholarship Portal",
        logo: <LayoutDashboard className="h-5 w-5" />,
        badge: user ? (
          <PremiumBadge planType={user.planType} size="sm" />
        ) : null,
      }}
      sections={sections}
      footer={footer}
      className={className}
    />
  );
}
