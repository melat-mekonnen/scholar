"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusBadgeVariant } from "@/lib/design-system";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({
  status,
  className,
  size = "md",
}: StatusBadgeProps) {
  const variant = getStatusBadgeVariant(status);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <Badge variant={variant} className={cn(sizeClasses[size], className)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
