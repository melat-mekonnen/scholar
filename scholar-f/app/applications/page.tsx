"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  addApplicationNote,
  getMyApplications,
  updateApplicationStatus,
  type ApplicationStatus,
  type StudentApplication,
} from "@/lib/applications"
import { clearToken } from "@/lib/auth"
import { useStudentI18n } from "@/lib/student-i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiFetchJson } from "@/lib/api"

export default function ApplicationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useStudentI18n()
  const [items, setItems] = useState<StudentApplication[]>([])
  const [noteById, setNoteById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<{ fullName?: string; email: string; role?: string } | null>(null)

  function NavLink({ href, label }: { href: string; label: string }) {
    const active = typeof window !== "undefined" && window.location.pathname === href
    return (
      <Link
        href={href}
        className={cn("block text-sm font-medium hover:text-primary", active && "text-primary")}
      >
        {label}
      </Link>
    )
  }

  function userInitials() {
    if (!me) return "U"
    if (me.fullName?.trim()) {
      const parts = me.fullName.split(" ").filter(Boolean)
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase()
    }
    return (me.email?.[0] || "U").toUpperCase()
  }

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

  useEffect(() => {
    async function loadMe() {
      const { res, data } = await apiFetchJson<{ fullName?: string; email: string; role?: string }>(
        "/api/auth/me",
        { method: "GET" },
      )
      if (res.ok && data) setMe(data)
    }
    void loadMe()
  }, [])

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
    if (status === "preparing") return <Badge className="bg-amber-600 text-white">Preparing</Badge>
    return <Badge variant="secondary">Saved</Badge>
  }

  async function addNote(id: string) {
    const note = (noteById[id] || "").trim()
    if (!note) return
    const { res, errorMessage } = await addApplicationNote(id, note)
    if (!res.ok) {
      toast({
        title: "Could not add note",
        description: errorMessage || "Try again.",
        variant: "destructive",
      })
      return
    }
    setItems((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              notes: [...(a.notes || []), { id: `${Date.now()}`, userId: "", note, createdAt: new Date().toISOString() }],
            }
          : a
      )
    )
    setNoteById((prev) => ({ ...prev, [id]: "" }))
    toast({ title: "Note added", description: "Application note saved." })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card p-6 md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">{t("Scholarship Portal")}</h2>
        </div>
        <nav className="space-y-3">
          <NavLink href="/dashboard" label={t("Dashboard")} />
          <NavLink href="/scholarships" label={t("Browse Scholarships")} />
          <NavLink href="/applications" label={t("My Applications")} />
          <NavLink href="/community" label={t("Community")} />
          <NavLink href="/saved" label={t("Saved Scholarships")} />
          <NavLink href="/profile" label={t("Profile")} />
          <NavLink href="/settings" label={t("Settings")} />
          <NavLink href="/documents" label={t("Documents")} />
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{t("My Applications")}</h1>
            {me?.role && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                {me.role}
              </span>
            )}
          </div>
          <Avatar>
            <AvatarFallback>{userInitials()}</AvatarFallback>
          </Avatar>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("My Applications")}</h1>
            <p className="text-sm text-muted-foreground">
              Track the scholarships you applied to and their statuses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/scholarships">{t("Browse Scholarships")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/saved">{t("Saved")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/documents">{t("Documents")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/community">{t("Community")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">{t("Back to Dashboard")}</Link>
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
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/scholarships">View scholarship</Link>
                  </Button>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  {a.notes?.length ? (
                    <div className="space-y-1">
                      {a.notes.slice(-3).map((n) => (
                        <p key={n.id} className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString()}: {n.note}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No notes yet.</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={noteById[a.id] || ""}
                      onChange={(e) => setNoteById((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                    <Button size="sm" variant="outline" onClick={() => void addNote(a.id)}>
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </main>
      </div>
    </div>
  )
}

