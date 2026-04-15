"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pending Scholarships</h1>
            <p className="text-sm text-muted-foreground">
              Review and moderate scholarships before they go live to students.
            </p>
          </div>

          <Input
            placeholder="Search by title or country"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scholarships awaiting review</CardTitle>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
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
                  <TableRow key={s.id}>
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