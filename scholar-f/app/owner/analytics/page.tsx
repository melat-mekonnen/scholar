"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, LineChart, PieChart } from "lucide-react"

import { OwnerSidebar } from "@/components/layout/owner-sidebar"
import { PageHeader } from "@/components/layout/page-header"
import { PageLayout } from "@/components/layout/page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useAuth } from "@/hooks/use-auth"
import { clearToken } from "@/lib/auth"

export default function OwnerAnalyticsPage() {
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
          title="Platform Analytics"
          description="Detailed metrics on user engagement, application trends, and recommendations."
        />

        <PageLayout>
          <main className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Application Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center bg-gray-50/50 rounded-md border m-4 mt-0">
                  <p className="text-sm text-muted-foreground">Chart placeholder</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Engagement by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center bg-gray-50/50 rounded-md border m-4 mt-0">
                  <p className="text-sm text-muted-foreground">Chart placeholder</p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Recommendation Interaction Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center bg-gray-50/50 rounded-md border m-4 mt-0">
                  <p className="text-sm text-muted-foreground">Chart placeholder</p>
                </CardContent>
              </Card>
            </div>
          </main>
        </PageLayout>
      </div>
    </div>
  )
}
