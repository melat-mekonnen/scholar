import {
  LayoutDashboard,
  Eye,
  Users,
  ListChecks,
  FileText,
  Search,
  Activity,
  Globe,
  Network,
  Building2,
  BadgeDollarSign,
  BarChart3,
  ScrollText,
  User,
  MessageSquare,
  FileBadge,
  AlertTriangle
} from "lucide-react";
import React from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

export type RoleConfig = {
  brandName: string;
  brandIcon: React.ElementType;
  brandIconColor?: string;
  navSections: {
    items: NavItem[];
  }[];
};

export const roleNavigationConfig: Record<string, RoleConfig> = {
  admin: {
    brandName: "EthioScholar",
    brandIcon: LayoutDashboard,
    navSections: [
      {
        items: [
          { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
          { href: "/admin/scholarships/pending", label: "Manage Scholarships", icon: Eye },
          { href: "/admin/users", label: "Manage Users", icon: Users },
          { href: "/admin/candidates", label: "Review Candidates", icon: Search },
          { href: "/admin/audit-logs", label: "Audit Logs", icon: ListChecks },
          { href: "/admin/documents", label: "Manage Documents", icon: FileText },
          { href: "/admin/observability", label: "System Health", icon: Activity },
        ]
      }
    ]
  },
  owner: {
    brandName: "Platform Owner",
    brandIcon: Building2,
    brandIconColor: "text-primary",
    navSections: [
      {
        items: [
          { href: "/owner", label: "Overview", icon: LayoutDashboard },
          { href: "/owner/scholarships", label: "Scholarship Control", icon: Eye },
          { href: "/owner/sources", label: "Sources", icon: Globe },
          { href: "/owner/verification", label: "AI Verification", icon: Activity },
          { href: "/owner/discovery", label: "Discovery Pipeline", icon: Network },
          { href: "/owner/partners", label: "University Partners", icon: Building2 },
          { href: "/owner/monetization", label: "Monetization", icon: BadgeDollarSign },
          { href: "/owner/analytics", label: "Analytics", icon: BarChart3 },
          { href: "/owner/logs", label: "System Logs", icon: ScrollText },
          { href: "/owner/observability", label: "Observability", icon: Activity },
        ]
      }
    ]
  },
  manager: {
    brandName: "University Portal",
    brandIcon: Building2,
    navSections: [
      {
        items: [
          { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
          { href: "/manager/scholarships", label: "Scholarships", icon: FileBadge },
          { href: "/manager/applicants", label: "Applicants", icon: Users },
          { href: "/manager/documents", label: "Documents", icon: FileText },
          { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
          { href: "/manager/messages", label: "Messages", icon: MessageSquare },
          { href: "/manager/profile", label: "Profile", icon: User },
        ]
      }
    ]
  },
  student: {
    brandName: "Scholarship Portal",
    brandIcon: LayoutDashboard,
    navSections: [
      {
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/recommendations", label: "AI Recommendations", icon: FileBadge },
          { href: "/scholarships", label: "Browse Scholarships", icon: Search },
          { href: "/applications", label: "My Applications", icon: FileText },
          { href: "/community", label: "Community", icon: Users },
          { href: "/saved", label: "Saved Scholarships", icon: ListChecks },
        ]
      },
      {
        items: [
          { href: "/profile", label: "Profile", icon: User },
          { href: "/settings", label: "Settings", icon: Activity },
          { href: "/pricing", label: "Pricing & Plans", icon: BadgeDollarSign },
          { href: "/documents", label: "Document Resources", icon: FileText },
        ]
      }
    ]
  },
  unknown: {
    brandName: "Unknown Role",
    brandIcon: AlertTriangle,
    brandIconColor: "text-destructive",
    navSections: [
      {
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ]
      }
    ]
  }
};
