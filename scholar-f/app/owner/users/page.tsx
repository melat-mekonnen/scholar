"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Search, ShieldCheck, Users, X } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type AssignableRole = "student" | "manager"

type User = {
  id: string
  fullName: string
  email: string
  role: AssignableRole
  isActive: boolean
}

type UsersResponse = {
  users: User[]
  total: number
  page: number
  pageSize: number
}

type MeResponse = {
  id?: string
  role?: string
}

const cardShell = "rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5"
const fieldClass = "h-10 rounded-xl border-emerald-100/80 bg-white focus-visible:ring-emerald-500/30"

export default function OwnerUsersPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"" | AssignableRole>("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<AssignableRole>("student")

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const managersOnPage = users.filter((user) => user.role === "manager").length
  const studentsOnPage = users.filter((user) => user.role === "student").length
  const activeOnPage = users.filter((user) => user.isActive).length

  useEffect(() => {
    async function gate() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", {
        method: "GET",
      })
      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }
      const role = data?.role
      if (role !== "owner") {
        router.replace("/dashboard")
        return
      }
      setAuthorized(true)
    }
    void gate()
  }, [router])

  useEffect(() => {
    if (!authorized) return
    async function fetchUsers() {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: search.trim(),
        })
        if (roleFilter) {
          params.set("role", roleFilter)
        }
        const { res, data, errorMessage } = await apiFetchJson<UsersResponse>(
          `/api/users?${params.toString()}`,
          { method: "GET" },
        )
        if (res.status === 401 || res.status === 403) {
          clearToken()
          router.replace("/signin")
          return
        }
        if (!res.ok || !data) {
          throw new Error(errorMessage || "Failed to load users")
        }
        setUsers((data.users ?? []) as User[])
        setTotal(data.total ?? data.users?.length ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users")
      } finally {
        setLoading(false)
      }
    }
    void fetchUsers()
  }, [authorized, page, pageSize, search, roleFilter, router])

  function startEdit(user: User) {
    setEditingUser(user)
    setEditName(user.fullName)
    setEditEmail(user.email)
    setEditRole(user.role)
  }

  async function saveUser() {
    if (!editingUser) return
    setError(null)
    const payload = {
      fullName: editName.trim(),
      email: editEmail.trim(),
    }
    try {
      if (editRole !== editingUser.role) {
        const { res: roleRes, errorMessage: roleErr } = await apiFetchJson<User>(
          `/api/users/${editingUser.id}/role`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: editRole }),
          },
        )
        if (!roleRes.ok) throw new Error(roleErr || "Failed to update role")
      }
      const { res, data, errorMessage } = await apiFetchJson<User>(
        `/api/users/${editingUser.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) throw new Error(errorMessage || "Failed to update user")
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                ...(data ?? {}),
                role: editRole,
              }
            : u,
        ),
      )
      setEditingUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  async function toggleStudentManager(user: User) {
    const next: AssignableRole = user.role === "student" ? "manager" : "student"
    if (next === user.role) return
    setError(null)
    try {
      const { res, errorMessage } = await apiFetchJson<User>(
        `/api/users/${user.id}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: next }),
        },
      )
      if (!res.ok) throw new Error(errorMessage || "Failed to change role")
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: next } : u)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role")
    }
  }

  if (!authorized) {
    return (
      <div className="relative mx-auto max-w-6xl space-y-4 px-4 py-6 sm:py-8">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

      <header className={cn(cardShell, "border-l-4 border-l-emerald-500 px-6 py-6")}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm ring-1 ring-emerald-400/30">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Students & managers</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Promote students to scholarship managers or return them to student. Admin and owner accounts are
              excluded from this list.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total users</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{total}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students (this page)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{studentsOnPage}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Managers (this page)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{managersOnPage}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active users (this page)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{activeOnPage}</p>
            </div>
          </>
        )}
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <Card className={cardShell}>
        <CardHeader className="space-y-4 border-b border-emerald-100/70 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg text-slate-900">Users</CardTitle>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <Users className="h-3.5 w-3.5" />
              Page {page} of {totalPages}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => {
                  setPage(1)
                  setSearch(e.target.value)
                }}
                className={cn(fieldClass, "w-64 pl-9 pr-9")}
              />
              {search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => {
                    setPage(1)
                    setSearch("")
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Select
              value={roleFilter || "all"}
              onValueChange={(v) => {
                setPage(1)
                setRoleFilter(v === "all" ? "" : (v as AssignableRole))
              }}
            >
              <SelectTrigger className={cn(fieldClass, "w-44")}>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (students & managers)</SelectItem>
                <SelectItem value="student">Students only</SelectItem>
                <SelectItem value="manager">Managers only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : (
            <Table className="overflow-hidden rounded-xl border border-emerald-100/80">
              <TableHeader>
                <TableRow className="border-emerald-100/80 bg-emerald-50/40 hover:bg-emerald-50/40">
                  <TableHead className="text-slate-700">Name</TableHead>
                  <TableHead className="text-slate-700">Email</TableHead>
                  <TableHead className="text-slate-700">Role</TableHead>
                  <TableHead className="text-slate-700">Status</TableHead>
                  <TableHead className="text-right text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-emerald-100/60 hover:bg-emerald-50/25">
                      <TableCell className="font-medium text-slate-900">{user.fullName}</TableCell>
                      <TableCell className="text-slate-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            user.role === "manager"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-slate-50 text-slate-700",
                          )}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.isActive
                              ? "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-600"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
                          onClick={() => startEdit(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
                          onClick={() => void toggleStudentManager(user)}
                        >
                          {user.role === "student" ? "Make manager" : "Make student"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Showing page {page} of {totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className="rounded-lg border-emerald-100 hover:bg-emerald-50"
                    onClick={(e) => {
                      e.preventDefault()
                      setPage((p) => Math.max(1, p - 1))
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const p = index + 1
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        className={cn(
                          "rounded-lg",
                          p === page && "border-emerald-200 bg-emerald-50 text-emerald-900",
                        )}
                        onClick={(e) => {
                          e.preventDefault()
                          setPage(p)
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className="rounded-lg border-emerald-100 hover:bg-emerald-50"
                    onClick={(e) => {
                      e.preventDefault()
                      setPage((p) => Math.min(totalPages, p + 1))
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {editingUser ? (
        <Card className={cardShell}>
          <CardHeader className="border-b border-emerald-100/70 pb-4">
            <CardTitle className="text-lg text-slate-900">Edit user</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={fieldClass}
              />
              <Input
                placeholder="Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className={fieldClass}
              />
              <Select
                value={editRole}
                onValueChange={(value) => setEditRole(value as AssignableRole)}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                onClick={() => void saveUser()}
              >
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
