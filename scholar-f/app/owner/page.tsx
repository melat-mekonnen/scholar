"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, IdCard, LayoutDashboard, LogOut, Users } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type OwnerDashboard = {
  role: string
  message?: string
  links?: { managerDashboard?: string; managerScholarships?: string }
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OwnerDashboard | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { res, data: json, errorMessage } = await apiFetchJson<OwnerDashboard>(
        "/api/owner/dashboard",
        { method: "GET" },
      )
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !json) {
        setError(errorMessage || "Could not load owner dashboard")
        setLoading(false)
        return
      }
      setData(json)
      setLoading(false)
    }
    void load()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Owner dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Posting profile and user roles live here; open <strong>Scholarship operations</strong> for
                listings, deadlines, and documents under your owner account.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/owner/users">
                <Users className="mr-2 h-4 w-4" />
                Students & managers
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/owner/posting-profile">
                <IdCard className="mr-2 h-4 w-4" />
                Posting profile
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/owner/scholarships">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Scholarship operations
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void logoutFromServer()
                clearToken()
                router.push("/signin")
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>{data.message}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="mb-2">
                API: <code className="rounded bg-muted px-1">GET /api/owner/dashboard</code>
              </p>
              <p>
                Use <strong>Students & managers</strong> to promote students to manager (or revert).
                Later milestones: audit logs and cross-manager analytics.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
