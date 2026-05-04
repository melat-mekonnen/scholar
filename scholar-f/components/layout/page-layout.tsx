"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  maxWidth?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "full";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
}

export function PageLayout({
  children,
  className,
  maxWidth = "7xl",
  padding = "lg",
}: PageLayoutProps) {
  const paddingClasses = {
    none: "",
    sm: "px-4 py-6",
    md: "px-6 py-8",
    lg: "px-8 py-12",
    xl: "px-12 py-16",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full",
        `max-w-${maxWidth}`,
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
