"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search as SearchIcon, SlidersHorizontal, Users as UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

import { apiFetchJson } from "@/lib/api"

type Role = "student" | "manager" | "owner" | "admin"

type User = {
  id: string
  fullName: string
  email: string
  role: Role
  isActive: boolean
}

type UsersResponse = {
  users: User[]
  total: number
  page: number
  pageSize: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<Role>("student")

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users])
  const inactiveCount = useMemo(() => users.filter((u) => !u.isActive).length, [users])
  const roleCounts = useMemo(
    () => ({
      student: users.filter((u) => u.role === "student").length,
      manager: users.filter((u) => u.role === "manager").length,
      owner: users.filter((u) => u.role === "owner").length,
      admin: users.filter((u) => u.role === "admin").length,
    }),
    [users],
  )

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: search.trim(),
        })
        const { res, data, errorMessage } = await apiFetchJson<UsersResponse>(
          `/api/admin/users?${params.toString()}`,
          { method: "GET" },
        )
        if (!res.ok || !data) {
          throw new Error(errorMessage || "Failed to load users")
        }
        setUsers(data.users ?? [])
        setTotal(data.total ?? data.users.length)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users")
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [page, pageSize, search])

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
      if (!res.ok) {
        throw new Error(errorMessage || "Failed to update user")
      }
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

  async function toggleActive(user: User) {
    setError(null)
    try {
      const { res, errorMessage } = await apiFetchJson<User>(
        `/api/users/${user.id}/activate`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !user.isActive }),
        },
      )
      if (!res.ok) throw new Error(errorMessage || "Failed to change status")
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !user.isActive } : u,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change status")
    }
  }

  async function changeRole(user: User, direction: "promote" | "demote") {
    setError(null)
    const order: Role[] = ["student", "manager", "owner", "admin"]
    const index = order.indexOf(user.role)
    let newRole = user.role
    if (direction === "promote" && index < order.length - 1) {
      newRole = order[index + 1]
    }
    if (direction === "demote" && index > 0) {
      newRole = order[index - 1]
    }
    if (newRole === user.role) return
    try {
      const { res, errorMessage } = await apiFetchJson<User>(
        `/api/users/${user.id}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      )
      if (!res.ok) throw new Error(errorMessage || "Failed to change role")
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role")
    }
  }

  async function deleteUser(user: User) {
    if (!confirm(`Delete user ${user.email}?`)) return
    setError(null)
    try {
      const { res, errorMessage } = await apiFetchJson<null>(
        `/api/users/${user.id}`,
        { method: "DELETE" },
      )
      if (!res.ok) throw new Error(errorMessage || "Failed to delete user")
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="rounded-2xl border border-slate-200/90 bg-white dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400/30">
                <UsersIcon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">User Management</h1>
                <p className="text-sm text-slate-500">
                  Manage platform users, roles, and activation status.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 font-medium text-emerald-900">
                Total: {total.toLocaleString()}
              </span>
              <span className="rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 font-medium text-emerald-900">
                Page size: {pageSize}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild className="rounded-xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
              <Link href="/admin/audit-logs">Audit logs</Link>
            </Button>
            <Button variant="outline" asChild className="rounded-xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
              <Link href="/admin">Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/70" />
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              className="h-10 w-full rounded-xl border-emerald-100/90 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
            />
          </div>
          <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-100/90 bg-emerald-50/40 px-3 text-sm text-slate-700">
            <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
            Use Edit to change role/status
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">Active users (page)</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600 opacity-90" />
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">Inactive users (page)</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{inactiveCount}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-90" />
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">Managers + Owners</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {roleCounts.manager + roleCounts.owner}
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-90" />
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-slate-500">Admins (page)</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{roleCounts.admin}</p>
          </CardContent>
        </Card>
      </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <Card className="rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="overflow-hidden rounded-xl border border-emerald-100/90 shadow-sm">
              <TableHeader className="bg-emerald-50/60">
                <TableRow>
                  <TableHead className="text-slate-700">Name</TableHead>
                  <TableHead className="text-slate-700">Email</TableHead>
                  <TableHead className="text-slate-700">Role</TableHead>
                  <TableHead className="text-slate-700">Status</TableHead>
                  <TableHead className="text-right text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {users.map((user) => (
                  <TableRow key={user.id} className="transition-colors hover:bg-emerald-50/50">
                    <TableCell className="font-medium text-slate-900">{user.fullName}</TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize border-emerald-200 text-emerald-800">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                          onClick={() => startEdit(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                          onClick={() => toggleActive(user)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                          onClick={() => changeRole(user, "promote")}
                        >
                          Promote
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                          onClick={() => changeRole(user, "demote")}
                        >
                          Demote
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteUser(user)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Showing page {page} of {totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
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
                          className={
                            p === page
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                              : "text-slate-600 hover:bg-emerald-50/80"
                          }
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
                      className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
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
          <Card className="mt-6 rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5">
            <CardHeader>
              <CardTitle className="text-base">Edit User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 rounded-xl border-emerald-100/90 bg-white shadow-sm focus-visible:ring-emerald-500"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-11 rounded-xl border-emerald-100/90 bg-white shadow-sm focus-visible:ring-emerald-500"
                />
                <Select value={editRole} onValueChange={(value) => setEditRole(value as Role)}>
                  <SelectTrigger className="h-11 rounded-xl border-emerald-100/90 bg-white shadow-sm focus:ring-emerald-500">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button className="rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" onClick={saveUser}>
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}

