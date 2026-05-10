"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearToken, logoutFromServer } from "@/lib/auth";
import { SystemStatusBadge } from "@/components/system-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarFooterProfileProps {
  user: { full_name?: string; email?: string; role?: string } | null;
  apiPathBase?: string; // If provided, shows SystemStatusBadge
  isCollapsed?: boolean;
}

function getInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "U";
}

function getDeterministicColor(str?: string) {
  if (!str) return "bg-primary";
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-green-500",
    "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-blue-500",
    "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500",
    "bg-pink-500", "bg-rose-500"
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function SidebarFooterProfile({ user, apiPathBase, isCollapsed }: SidebarFooterProfileProps) {
  const router = useRouter();

  const handleSignOut = () => {
    void logoutFromServer();
    clearToken();
    router.push("/signin");
  };

  const name = user?.full_name || "Unknown User";
  const email = user?.email || "";
  const role = user?.role || "unknown";
  const initials = getInitials(user?.full_name, user?.email);
  const colorClass = getDeterministicColor(email || name);

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card/50 p-2 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2 p-1">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarFallback className={`text-white rounded-lg text-xs font-semibold ${colorClass}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {!isCollapsed && (
          <div className="flex flex-1 flex-col truncate">
            <span className="truncate text-sm font-medium leading-none">{name}</span>
            <span className="truncate text-xs text-muted-foreground mt-1 capitalize">{role}</span>
          </div>
        )}
      </div>
      
      {!isCollapsed && (
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all mt-1"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      )}

      {isCollapsed && (
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="flex w-full items-center justify-center rounded-lg py-2 text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all mt-1"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}

      {apiPathBase && !isCollapsed && (
        <div className="mt-1 px-1">
          <SystemStatusBadge apiPathBase={apiPathBase} />
        </div>
      )}
    </div>
  );
}
