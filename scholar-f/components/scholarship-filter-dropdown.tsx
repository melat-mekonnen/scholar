"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { filterSectionLabel, inputSurface } from "@/lib/theme"
import { cn } from "@/lib/utils"

export const FILTER_ANY = "all"

type Option = {
  value: string
  label: string
}

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: Option[]
  disabled?: boolean
}

export function ScholarshipFilterDropdown({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: Props) {
  const selectValue = value || FILTER_ANY

  return (
    <div className="space-y-1.5">
      <p className={filterSectionLabel}>{label}</p>
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === FILTER_ANY ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-10 w-full rounded-lg text-left shadow-sm focus:ring-emerald-500",
            inputSurface,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[min(280px,50vh)]">
          <SelectItem value={FILTER_ANY}>{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
