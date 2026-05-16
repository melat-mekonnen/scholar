"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CirclePlus, Filter, Search } from "lucide-react"

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
  degreeLevel?: "high_school" | "bachelor" | "master" | "phd"
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

        const { res, data, errorMessage } = await apiFetchJson<PendingResponse>(url, { method: "GET" })

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
      const { res, errorMessage } = await apiFetchJson(`/api/admin/scholarships/${id}/verify`, { method: "PUT" })

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
      const { res, errorMessage } = await apiFetchJson(`/api/admin/scholarships/${id}/reject`, { method: "PUT" })

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
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Verified</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "expired":
        return <Badge variant="secondary">Expired</Badge>
      case "draft":
        return (
          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
            Draft
          </Badge>
        )
      case "pending":
      default:
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Pending</Badge>
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Pending scholarships</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Review and moderate scholarships before they go live to students.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 sm:self-start"
          >
            <Link href="/admin/scholarships/new">
              <CirclePlus className="mr-2 h-4 w-4" />
              Create scholarship
            </Link>
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <section className="rounded-2xl border border-emerald-100/80 bg-white/90 p-3 shadow-sm shadow-emerald-900/5">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="space-y-4 px-3 pb-2 pt-1 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold text-slate-900">Scholarships awaiting review</CardTitle>
              <p className="text-sm text-slate-500">
                {loading ? "Loading…" : `${scholarships.length.toLocaleString()} items`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70" />
                <Input
                  placeholder="Search by title or country"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-md border-emerald-100/90 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
                />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70" />
                <div className="flex h-10 min-w-[160px] items-center rounded-md border border-emerald-100/90 bg-white pl-9 pr-3 text-sm text-slate-600 shadow-sm">
                  Pending only
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
            <div className="overflow-x-auto rounded-xl border border-emerald-100/90 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-emerald-50/60">
                  <TableRow>
                    <TableHead className="text-slate-700">Title</TableHead>
                    <TableHead className="text-slate-700">Country</TableHead>
                    <TableHead className="text-slate-700">Degree level</TableHead>
                    <TableHead className="text-slate-700">Deadline</TableHead>
                    <TableHead className="text-slate-700">Status</TableHead>
                    <TableHead className="text-right text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {scholarships.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                        No pending scholarships at the moment.
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {scholarships.map((s) => (
                    <TableRow key={s.id} className="transition-colors hover:bg-emerald-50/50">
                      <TableCell className="max-w-xs">
                        <Link
                          href={`/admin/scholarships/${s.id}`}
                          className="font-medium text-slate-900 underline-offset-2 hover:text-emerald-700 hover:underline"
                        >
                          {s.title}
                        </Link>
                      </TableCell>

                      <TableCell className="text-slate-600">{s.country}</TableCell>

                      <TableCell className="capitalize text-slate-600">
                        {s.degreeLevel ? s.degreeLevel.replace("_", " ") : "N/A"}
                      </TableCell>

                      <TableCell className="text-slate-600">{s.deadline}</TableCell>

                      <TableCell>{renderStatusBadge(s.status)}</TableCell>

                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <Button size="sm" variant="outline" asChild className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                            <Link href={`/admin/scholarships/${s.id}`}>Review</Link>
                          </Button>

                          <Button
                            size="sm"
                            className="rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                            onClick={() => quickApprove(s.id)}
                            disabled={isMutating(s.id)}
                          >
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-md"
                            onClick={() => quickReject(s.id)}
                            disabled={isMutating(s.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
