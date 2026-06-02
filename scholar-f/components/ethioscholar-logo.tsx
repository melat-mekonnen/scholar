import { cn } from "@/lib/utils"

type EthioScholarLogoProps = {
  className?: string
  /** Always render as white (e.g. on dark or colored backgrounds). */
  inverted?: boolean
}

export function EthioScholarLogo({ className, inverted = false }: EthioScholarLogoProps) {
  return (
    <img
      src="/ethioscholar-logo.svg"
      alt="EthioScholar"
      className={cn(
        "w-auto",
        inverted ? "brightness-0 invert" : "dark:brightness-0 dark:invert",
        className,
      )}
    />
  )
}
