"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { clearToken, logoutFromServer } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StudentPortalSidebarLogoutProps = {
  label?: string
  className?: string
  /** Dark green sidebar: white pill button + light divider */
  variant?: "light" | "darkSidebar"
  /** Solid emerald CTA — same as homepage “Apply Now” */
  tone?: "outline" | "primary"
}

export function StudentPortalSidebarLogout({
  label = "Log out",
  className,
  variant = "light",
  tone = "outline",
}: StudentPortalSidebarLogoutProps) {
  const router = useRouter()

  const isPrimary = tone === "primary"

  return (
    <div
      className={cn(
        "mt-4 border-t pt-4",
        variant === "darkSidebar" ? "border-white/15" : "border-emerald-100/80",
        className,
      )}
    >
      <Button
        type="button"
        variant={isPrimary ? "ghost" : variant === "darkSidebar" ? "ghost" : "outline"}
        className={cn(
          isPrimary &&
            "h-8 w-full justify-start gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 hover:text-white",
          !isPrimary &&
            variant === "darkSidebar" &&
            "flex h-11 w-full items-center justify-center gap-2 rounded-full border-0 bg-white px-4 text-sm font-semibold text-emerald-600 shadow-md hover:bg-white hover:text-emerald-700",
          !isPrimary &&
            variant !== "darkSidebar" &&
            "w-full justify-start gap-2 border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
        )}
        onClick={() => {
          void logoutFromServer()
          clearToken()
          router.push("/signin")
        }}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {label}
      </Button>
    </div>
  )
}
