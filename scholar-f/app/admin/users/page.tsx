"use client"

import { useEffect, useState } from "react"
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

type Role = "student" | "admin"

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
          `/api/users?${params.toString()}`,
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
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...(data ?? {}) } : u)),
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
    const order: Role[] = ["student", "admin"]
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage platform users, roles, and activation status.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              className="w-64"
            />
          </div>
        </header>

        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
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
                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(user)}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => changeRole(user, "promote")}
                      >
                        Promote
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => changeRole(user, "demote")}
                      >
                        Demote
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteUser(user)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
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
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Edit User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <Select value={editRole} onValueChange={(value) => setEditRole(value as Role)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button onClick={saveUser}>
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

