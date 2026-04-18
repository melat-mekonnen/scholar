"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import type { ScholarshipWorkspace } from "@/lib/scholarship-workspace"

/**
 * Ensures the current user belongs on this scholarship-ops surface (manager vs owner).
 * Redirects cross-role users to the correct branded route or /dashboard.
 */
export function useScholarshipWorkspaceGate(workspace: ScholarshipWorkspace): "checking" | "ready" {
  const router = useRouter()
  const [phase, setPhase] = useState<"checking" | "ready">("checking")

  useEffect(() => {
    let cancelled = false

    async function run() {
      const me = await apiFetchJson<{ role?: string }>("/api/auth/me", { method: "GET" })
      if (cancelled) return

      if (me.res.status === 401 || me.res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }

      const role = me.data?.role

      if (workspace === "manager") {
        if (role === "owner") {
          router.replace("/owner/scholarships")
          return
        }
        if (role !== "manager") {
          router.replace("/dashboard")
          return
        }
      } else {
        if (role === "manager") {
          router.replace("/manager")
          return
        }
        if (role !== "owner") {
          router.replace("/dashboard")
          return
        }
      }

      setPhase("ready")
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router, workspace])

  return phase
}
