"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, User, Building, Users } from "lucide-react"

import { OwnerSidebar } from "@/components/layout/owner-sidebar"
import { PageHeader } from "@/components/layout/page-header"
import { PageLayout } from "@/components/layout/page-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

import { useAuth } from "@/hooks/use-auth"
import { clearToken } from "@/lib/auth"
import Link from "next/link"

export default function OwnerSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  
  const isOwner = user?.role === "owner"

  const [saving, setSaving] = useState(false)
  
  // Dummy state for posting profile
  const [jobTitle, setJobTitle] = useState("Platform Owner")
  const [organizationName, setOrganizationName] = useState("EthioScholar")
  const [bio, setBio] = useState("")
  const [email, setEmail] = useState("owner@ethioscholar.com")

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

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast({ title: "Settings Saved", description: "Your profile has been updated." })
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerSidebar />

      <div className="flex-1">
        <PageHeader
          title="Settings & Profile"
          description="Manage your owner account and platform-wide configurations."
        />

        <PageLayout>
          <main className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Posting Profile
                </CardTitle>
                <CardDescription>
                  How you appear when posting or responding to scholarships under the owner workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization</Label>
                    <Input id="orgName" value={organizationName} onChange={e => setOrganizationName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Public Contact Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Short Bio</Label>
                  <Textarea id="bio" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Optional bio visible to applicants." />
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Roles & Management
                </CardTitle>
                <CardDescription>
                  Promote students to managers or edit their permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href="/owner/users">Manage Students & Managers</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Preferences
                </CardTitle>
                <CardDescription>
                  Configure global platform settings, notifications, and features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Advanced system settings will be migrated here in a future update.
                </p>
                <Button variant="secondary" disabled>Advanced Settings</Button>
              </CardContent>
            </Card>

          </main>
        </PageLayout>
      </div>
    </div>
  )
}
