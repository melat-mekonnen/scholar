"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Activity, ShieldAlert, Sparkles, AlertTriangle } from "lucide-react"

import { OwnerSidebar } from "@/components/layout/owner-sidebar"
import { PageHeader } from "@/components/layout/page-header"
import { PageLayout } from "@/components/layout/page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { useAuth } from "@/hooks/use-auth"
import { clearToken } from "@/lib/auth"

export default function OwnerVerificationPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  
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
          title="AI Verification"
          description="Monitor AI decisions, confidence scores, and flagged items."
        />

        <PageLayout>
          <main className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    Flagged Suspicious Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-md bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Fast Cash Grant 2026</span>
                      <span className="text-sm font-mono text-red-600">Confidence: 12%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI Explanation: Upfront application fee detected. Missing contact information. Domain registered 2 days ago.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive">Confirm Block</Button>
                      <Button size="sm" variant="outline">Override to Approve</Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Global Education Fund</span>
                      <span className="text-sm font-mono text-yellow-600">Confidence: 55%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI Explanation: Source domain is trusted, but description resembles common spam patterns. Manual review required.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                      <Button size="sm" variant="outline">Reject</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-500" />
                    Recently Auto-Verified
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-primary">Tech Innovators Award</span>
                      <span className="text-sm font-mono text-green-600">Confidence: 98%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI Explanation: Matches official university domain. Clear eligibility criteria. No fees detected.
                    </p>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-primary">Regional Arts Grant</span>
                      <span className="text-sm font-mono text-green-600">Confidence: 94%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI Explanation: Government source verified. Consistent historical data.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </PageLayout>
      </div>
    </div>
  )
}
