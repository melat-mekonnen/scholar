"use client"

import { checkPassword, type PasswordStrength } from "@/lib/password-policy"
import { cn } from "@/lib/utils"

type PasswordStrengthHintProps = {
  password: string
  className?: string
}

const strengthLabel: Record<PasswordStrength, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
}

const strengthBarClass: Record<PasswordStrength, string> = {
  weak: "w-1/3 bg-red-500",
  fair: "w-2/3 bg-amber-500",
  strong: "w-full bg-emerald-600",
}

const strengthTextClass: Record<PasswordStrength, string> = {
  weak: "text-red-600",
  fair: "text-amber-600",
  strong: "text-emerald-600",
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5", met ? "text-emerald-600" : "text-muted-foreground")}>
      <span aria-hidden="true">{met ? "✓" : "○"}</span>
      <span>{label}</span>
    </li>
  )
}

export function PasswordStrengthHint({ password, className }: PasswordStrengthHintProps) {
  if (!password) return null

  const check = checkPassword(password)

  return (
    <div className={cn("mt-2 space-y-2", className)} aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-200", strengthBarClass[check.strength])}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Strength:{" "}
        <span className={cn("font-medium", strengthTextClass[check.strength])}>
          {strengthLabel[check.strength]}
        </span>
      </p>
      <ul className="space-y-0.5 text-xs">
        <RequirementRow met={check.minLength} label="At least 8 characters" />
        <RequirementRow met={check.hasNumber} label="Contains a number" />
        <RequirementRow met={check.hasSymbol} label="Contains a symbol" />
      </ul>
    </div>
  )
}
