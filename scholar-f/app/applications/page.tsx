"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { getMyApplications, updateApplicationStatus, type ApplicationStatus, type StudentApplication } from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function ApplicationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<StudentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { res, data, errorMessage } = await getMyApplications()
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!res.ok || !data) {
        setError(errorMessage || "Failed to load applications")
        setLoading(false)
        return
      }
      setItems(data.applications ?? [])
      setLoading(false)
    }
    void load()
  }, [router])

  async function changeStatus(id: string, status: ApplicationStatus) {
    const { res, errorMessage } = await updateApplicationStatus(id, status)
    if (!res.ok) {
      toast({
        title: "Could not update status",
        description: errorMessage || "Try again.",
        variant: "destructive",
      })
      return
    }
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    toast({ title: "Status updated", description: "Application status saved." })
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items]
  )

  function statusBadge(status: ApplicationStatus) {
    if (status === "accepted") return <Badge className="bg-green-600 text-white">Accepted</Badge>
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
    if (status === "submitted") return <Badge className="bg-blue-600 text-white">Submitted</Badge>
    return <Badge variant="secondary">Pending</Badge>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Applications</h1>
            <p className="text-sm text-muted-foreground">
              Track the scholarships you applied to and their statuses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/community">Community</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading applications...</p> : null}

        {!loading && sorted.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No applications yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Start with a scholarship, click Apply, and it will appear here for tracking.
              </p>
              <Button asChild>
                <Link href="/scholarships">Browse scholarships</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {sorted.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-base">{a.scholarship.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(a.status)}
                  {a.scholarship.country ? <Badge variant="outline">{a.scholarship.country}</Badge> : null}
                  {a.scholarship.deadline ? <Badge variant="outline">Deadline: {String(a.scholarship.deadline)}</Badge> : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Select value={a.status} onValueChange={(v) => void changeStatus(a.id, v as ApplicationStatus)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/scholarships">View scholarship</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

