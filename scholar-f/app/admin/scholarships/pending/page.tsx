"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CirclePlus, Filter, Search, Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"

type VerificationStatus = "draft" | "pending" | "verified" | "rejected" | "expired"

type PendingScholarship = {
  id: string
  title: string
  country: string
  degreeLevel?: "high_school" | "bachelor" | "master" | "phd" // <-- make optional
  deadline: string
  status: VerificationStatus
}

type PendingResponse = {
  scholarships: PendingScholarship[]
}

export default function PendingScholarshipsPage() {
  const router = useRouter()

  const [scholarships, setScholarships] = useState<PendingScholarship[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mutatingIds, setMutatingIds] = useState<Record<string, boolean>>({})
  const isMutating = (id: string) => !!mutatingIds[id]

  const requestIdRef = useRef(0)
  const trimmedSearch = useMemo(() => search.trim(), [search])

  useEffect(() => {
    async function load() {
      const currentRequestId = ++requestIdRef.current

      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (trimmedSearch) params.set("search", trimmedSearch)

        const url = `/api/admin/scholarships/pending${params.toString() ? `?${params.toString()}` : ""}`

        const { res, data, errorMessage } =
          await apiFetchJson<PendingResponse>(url, { method: "GET" })

        if (requestIdRef.current !== currentRequestId) return

        if (res.status === 401 || res.status === 403) {
          clearToken()
          router.replace("/signin")
          return
        }

        if (!res.ok || !data) {
          throw new Error(errorMessage || "Failed to load pending scholarships")
        }

        setScholarships(data.scholarships ?? [])
      } catch (err) {
        if (requestIdRef.current !== currentRequestId) return
        setError(err instanceof Error ? err.message : "Failed to load pending scholarships")
      } finally {
        if (requestIdRef.current === currentRequestId) setLoading(false)
      }
    }

    load()
  }, [router, trimmedSearch])

  async function quickApprove(id: string) {
    setError(null)
    setMutatingIds((prev) => ({ ...prev, [id]: true }))

    try {
      const { res, errorMessage } = await apiFetchJson(
        `/api/admin/scholarships/${id}/verify`,
        { method: "PUT" },
      )

      if (!res.ok) throw new Error(errorMessage || "Failed to approve scholarship")

      setScholarships((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve scholarship")
    } finally {
      setMutatingIds((prev) => ({ ...prev, [id]: false }))
    }
  }

  async function quickReject(id: string) {
    setError(null)
    setMutatingIds((prev) => ({ ...prev, [id]: true }))

    try {
      const { res, errorMessage } = await apiFetchJson(
        `/api/admin/scholarships/${id}/reject`,
        { method: "PUT" },
      )

      if (!res.ok) throw new Error(errorMessage || "Failed to reject scholarship")

      setScholarships((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject scholarship")
    } finally {
      setMutatingIds((prev) => ({ ...prev, [id]: false }))
    }
  }

  function renderStatusBadge(status: VerificationStatus) {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-600 text-white">Verified</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "expired":
        return <Badge variant="secondary">Expired</Badge>
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "pending":
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Pending Scholarships</h1>
              <p className="text-sm text-blue-50">
                Review and moderate scholarships before they go live to students.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-blue-50">
                <Sparkles className="h-3.5 w-3.5" />
                Faster review workflow
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="rounded-xl bg-white text-blue-700 hover:bg-blue-50">
                <Link href="/admin/scholarships/new">
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Create scholarship
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Scholarships awaiting review</CardTitle>
              <div className="text-sm text-muted-foreground">
                {loading ? "Loading..." : `${scholarships.length.toLocaleString()} items`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by title or country"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-72 rounded-xl border-slate-200 pl-9"
                />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <div className="h-10 w-[180px] rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-600 shadow-sm flex items-center">
                  Pending only
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Table className="overflow-hidden rounded-xl border border-slate-200">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Degree level</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {scholarships.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No pending scholarships at the moment.
                    </TableCell>
                  </TableRow>
                ) : null}

                {scholarships.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/60">
                    <TableCell className="max-w-xs">
                      <Link
                        href={`/admin/scholarships/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.title}
                      </Link>
                    </TableCell>

                    <TableCell>{s.country}</TableCell>

                    <TableCell className="capitalize">
                      {s.degreeLevel ? s.degreeLevel.replace("_", " ") : "N/A"}
                    </TableCell>

                    <TableCell>{s.deadline}</TableCell>

                    <TableCell>{renderStatusBadge(s.status)}</TableCell>

                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/scholarships/${s.id}`}>Review</Link>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => quickApprove(s.id)}
                        disabled={isMutating(s.id)}
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => quickReject(s.id)}
                        disabled={isMutating(s.id)}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}