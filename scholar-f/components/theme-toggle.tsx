"use client"

import { useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ThemeToggleProps = {
  className?: string
  variant?: "icon" | "compact"
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const active = mounted ? (theme === "system" ? "system" : theme ?? "system") : "system"
  const Icon = !mounted ? Monitor : resolvedTheme === "dark" ? Moon : Sun

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 border-emerald-200/80 dark:border-border",
              className,
            )}
            aria-label="Toggle theme"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {active === "system" ? "System" : active === "dark" ? "Dark" : "Light"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <ThemeMenuItems active={active} onSelect={setTheme} />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "shrink-0 border-emerald-200/80 bg-white hover:bg-emerald-50 dark:border-border dark:bg-card dark:hover:bg-accent",
            className,
          )}
          aria-label="Toggle theme"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <ThemeMenuItems active={active} onSelect={setTheme} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ThemeMenuItems({
  active,
  onSelect,
}: {
  active: string
  onSelect: (value: string) => void
}) {
  const items = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const

  return (
    <>
      {items.map(({ value, label, icon: ItemIcon }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => onSelect(value)}
          className={cn(
            "gap-2 cursor-pointer",
            active === value && "bg-accent font-medium",
          )}
        >
          <ItemIcon className="h-4 w-4" />
          {label}
        </DropdownMenuItem>
      ))}
    </>
  )
}
