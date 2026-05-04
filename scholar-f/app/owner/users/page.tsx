"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Search } from "lucide-react"

import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"
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

import { OwnerSidebar } from "@/components/layout/owner-sidebar"
import { PageHeader } from "@/components/layout/page-header"
import { PageLayout } from "@/components/layout/page-layout"
import { useAuth } from "@/hooks/use-auth"

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

export default function OwnerUsersPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  
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
  const isOwner = user?.role === "owner"

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        clearToken()
        router.replace("/signin")
        return
      }
      if (!isOwner) {
        router.replace("/unauthorized")
        return
      }
    }
  }, [authLoading, isAuthenticated, isOwner, router])

  useEffect(() => {
    if (!isOwner) return
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
  }, [isOwner, page, pageSize, search, roleFilter, router])

  function startEdit(u: User) {
    setEditingUser(u)
    setEditName(u.fullName)
    setEditEmail(u.email)
    setEditRole(u.role)
  }

  async function saveUser() {
    if (!editingUser) return
    setError(null)
    const payload = { fullName: editName.trim(), email: editEmail.trim() }
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
            ? { ...u, ...(data ?? {}), role: editRole }
            : u,
        ),
      )
      setEditingUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  async function toggleStudentManager(u: User) {
    const next: AssignableRole = u.role === "student" ? "manager" : "student"
    if (next === u.role) return
    setError(null)
    try {
      const { res, errorMessage } = await apiFetchJson<User>(
        `/api/users/${u.id}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: next }),
        },
      )
      if (!res.ok) throw new Error(errorMessage || "Failed to change role")
      setUsers((prev) =>
        prev.map((user) => (user.id === u.id ? { ...user, role: next } : user)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role")
    }
  }

  if (authLoading || !isAuthenticated || !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerSidebar />

      <div className="flex-1">
        <PageHeader
          title="Students & Managers"
          description="Manage user roles. Promote students to managers or edit their profiles."
        />

        <PageLayout>
          <main className="space-y-6">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Directory
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email"
                      value={search}
                      onChange={(e) => {
                        setPage(1)
                        setSearch(e.target.value)
                      }}
                      className="w-64 pl-8"
                    />
                  </div>
                  <Select
                    value={roleFilter || "all"}
                    onValueChange={(v) => {
                      setPage(1)
                      setRoleFilter(v === "all" ? "" : (v as AssignableRole))
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="manager">Managers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded-md border mt-4">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                            No users found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id} className="hover:bg-gray-50/50">
                            <TableCell className="font-medium">{u.fullName}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{u.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.isActive ? "default" : "secondary"}>
                                {u.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(u)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleStudentManager(u)}
                              >
                                {u.role === "student" ? "Make manager" : "Make student"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit user</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
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
                    <Select
                      value={editRole}
                      onValueChange={(value) => setEditRole(value as AssignableRole)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingUser(null)}>
                      Cancel
                    </Button>
                    <Button onClick={() => void saveUser()}>
                      Save changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </PageLayout>
      </div>
    </div>
  )
}
