"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, IdCard, LogOut, Search, ShieldCheck, Users } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken, logoutFromServer } from "@/lib/auth"
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
      <main className="min-h-screen bg-background">
        <p className="p-8 text-sm text-muted-foreground">Checking access…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="pointer-events-none absolute -left-16 top-16 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-52 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Building2 className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-semibold tracking-tight">Students & managers</h1>
              </div>
              <p className="max-w-2xl text-sm text-blue-50">
                Promote students to scholarship managers or return them to student.
                Admin and owner accounts are excluded from this list.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/owner/posting-profile">
                  <IdCard className="mr-2 h-4 w-4" />
                  Posting profile
                </Link>
              </Button>
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
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
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Total users</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{total}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Students (this page)</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-blue-600">{studentsOnPage}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Managers (this page)</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-emerald-600">{managersOnPage}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">Active users (this page)</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{activeOnPage}</p>
            </CardContent>
          </Card>
        </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Users</CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
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
                  className="h-10 w-64 rounded-xl border-slate-200 pl-9"
                />
              </div>
              <Select
                value={roleFilter || "all"}
                onValueChange={(v) => {
                  setPage(1)
                  setRoleFilter(v === "all" ? "" : (v as AssignableRole))
                }}
              >
                <SelectTrigger className="h-10 w-44 rounded-xl border-slate-200">
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
          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            <Table className="overflow-hidden rounded-xl border border-slate-200">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/70">
                    <TableCell className="font-medium text-slate-900">{user.fullName}</TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "default" : "secondary"}
                        className={user.isActive ? "bg-emerald-600 text-white hover:bg-emerald-600" : ""}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 bg-white hover:bg-slate-50"
                        onClick={() => startEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 bg-white hover:bg-slate-50"
                        onClick={() => toggleStudentManager(user)}
                      >
                        {user.role === "student" ? "Make manager" : "Make student"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Showing page {page} of {totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
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

        {editingUser && (
          <Card className="rounded-2xl border-blue-100/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Edit user</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-11 rounded-xl border-slate-200"
                />
                <Select
                  value={editRole}
                  onValueChange={(value) => setEditRole(value as AssignableRole)}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-slate-300 bg-white hover:bg-slate-50" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void saveUser()}>
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
