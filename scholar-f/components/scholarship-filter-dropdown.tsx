"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{label}</p>
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === FILTER_ANY ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger className="h-10 w-full rounded-lg border-emerald-200 bg-white text-left shadow-sm focus:ring-emerald-500">
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
