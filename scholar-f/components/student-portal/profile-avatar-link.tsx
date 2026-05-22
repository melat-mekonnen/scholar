"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiFetchJson } from "@/lib/api"

type MeResponse = {
  fullName?: string
  email?: string
  role?: string
}

function initialsFromName(fullName?: string | null, email?: string | null) {
  const name = (fullName ?? "").trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? ""
    const second = parts[1]?.[0] ?? ""
    const out = `${first}${second}`.toUpperCase()
    return out || "U"
  }
  const e = (email ?? "").trim()
  return e[0]?.toUpperCase() ?? "U"
}

export function ProfileAvatarLink({ className }: { className?: string }) {
  const [me, setMe] = useState<MeResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET", auth: true })
      if (cancelled) return
      if (res.ok && data) setMe(data)
    }
    void loadMe()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Link
      href="/profile"
      aria-label="Go to profile"
      className={
        className ??
        "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      }
    >
      <Avatar className="transition-transform hover:scale-[1.02]">
        <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 ring-1 ring-emerald-200/80">
          {initialsFromName(me?.fullName, me?.email)}
        </AvatarFallback>
      </Avatar>
    </Link>
  )
}

