"use client";

import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  planType: "free" | "premium";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PremiumBadge({
  planType,
  className,
  size = "sm",
}: PremiumBadgeProps) {
  if (planType === "free") {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
          size === "sm" && "text-xs px-2 py-0.5",
          size === "md" && "text-sm px-3 py-1",
          size === "lg" && "text-base px-4 py-1.5",
          className,
        )}
      >
        Free
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm",
        "hover:from-amber-600 hover:to-orange-600 transition-all duration-200",
        size === "sm" && "text-xs px-2 py-0.5",
        size === "md" && "text-sm px-3 py-1",
        size === "lg" && "text-base px-4 py-1.5",
        className,
      )}
    >
      <Crown
        className={cn(
          "mr-1",
          size === "sm" && "h-3 w-3",
          size === "md" && "h-3.5 w-3.5",
          size === "lg" && "h-4 w-4",
        )}
      />
      Premium
    </Badge>
  );
}
