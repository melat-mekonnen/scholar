"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getMyApplications, updateApplicationStatus, type ApplicationStatus, type StudentApplication } from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import {
  StudentPortalFrame,
  StudentPortalTopHeader,
} from "@/components/student-portal/student-portal-frame"
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
  const stats = useMemo(() => {
    const total = items.length
    const submitted = items.filter((a) => a.status === "submitted").length
    const accepted = items.filter((a) => a.status === "accepted").length
    const pending = items.filter((a) => a.status === "pending").length
    return { total, submitted, accepted, pending }
  }, [items])

  function statusBadge(status: ApplicationStatus) {
    if (status === "accepted") return <Badge className="bg-green-600 text-white">Accepted</Badge>
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
    if (status === "submitted") return <Badge className="bg-blue-600 text-white">Submitted</Badge>
    return <Badge variant="secondary">Pending</Badge>
  }

  return (
    <StudentPortalFrame header={<StudentPortalTopHeader title="My Applications" />}>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">My Applications</h2>
        <p className="mt-1 text-sm text-blue-50">
          Track the scholarships you applied to and their statuses.
        </p>
      </div>

      <div className="space-y-5">
        {!loading && sorted.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-80" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Total Applications</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 opacity-80" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Submitted</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.submitted}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-80" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Accepted</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.accepted}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-500 to-slate-700 opacity-80" />
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Pending</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.pending}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">Loading applications...</p> : null}

        {!loading && sorted.length === 0 ? (
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">No applications yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">
                Start with a scholarship, click Apply, and it will appear here for tracking.
              </p>
              <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href="/scholarships">Browse scholarships</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section className="rounded-2xl border border-blue-100/70 bg-white/70 p-3 shadow-sm">
          <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Application Tracker</h2>
              <p className="text-xs text-slate-500">Sorted by latest update</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-white text-slate-700">Total: {stats.total}</Badge>
              <Badge variant="outline" className="bg-white text-blue-700">Submitted: {stats.submitted}</Badge>
              <Badge variant="outline" className="bg-white text-emerald-700">Accepted: {stats.accepted}</Badge>
              <Badge variant="outline" className="bg-white text-slate-700">Pending: {stats.pending}</Badge>
            </div>
          </div>

          {sorted.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-slate-300 bg-white">
              <CardContent className="space-y-3 py-8 text-center">
                <p className="text-base font-semibold text-slate-900">No tracked applications yet</p>
                <p className="text-sm text-slate-500">
                  Once you apply to a scholarship, it will appear here with status tracking.
                </p>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sorted.map((a) => (
                <Card
                  key={a.id}
                  className="group relative overflow-hidden rounded-2xl border-blue-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-900 transition-colors group-hover:text-blue-700">
                      {a.scholarship.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(a.status)}
                      {a.scholarship.country ? <Badge variant="outline">{a.scholarship.country}</Badge> : null}
                      {a.scholarship.startDate ? <Badge variant="outline">Start: {String(a.scholarship.startDate)}</Badge> : null}
                      {a.scholarship.endDate || a.scholarship.deadline ? (
                        <Badge variant="outline">End: {String(a.scholarship.endDate || a.scholarship.deadline)}</Badge>
                      ) : null}
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                        Updated: {new Date(a.updatedAt).toLocaleDateString()}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Select value={a.status} onValueChange={(v) => void changeStatus(a.id, v as ApplicationStatus)}>
                        <SelectTrigger className="w-[190px] rounded-lg border-slate-300 bg-white">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button asChild variant="outline" size="sm" className="rounded-md border-slate-300 bg-white hover:bg-slate-50">
                        <Link href="/scholarships">View scholarship</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentPortalFrame>
  )
}
