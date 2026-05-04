"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Network, Activity, FileWarning, SearchX } from "lucide-react"

import { OwnerSidebar } from "@/components/layout/owner-sidebar"
import { PageHeader } from "@/components/layout/page-header"
import { PageLayout } from "@/components/layout/page-layout"
import { DashboardCard } from "@/components/ui/dashboard-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"

import { useAuth } from "@/hooks/use-auth"
import { clearToken } from "@/lib/auth"
import { mockOwnerData } from "@/lib/mock-owner-data"

export default function OwnerDiscoveryPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  
  const [isDataLoading, setIsDataLoading] = useState(false)

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

  const { pipelineActivity } = mockOwnerData

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (val: string) => <span className="font-medium">{new Date(val).toLocaleDateString()}</span>,
    },
    {
      key: "discovered",
      header: "Newly Discovered",
      render: (val: number) => <span className="text-blue-600 font-semibold">+{val}</span>,
    },
    {
      key: "duplicates",
      header: "Duplicates Removed",
      render: (val: number) => <span className="text-orange-600">{val}</span>,
    },
    {
      key: "failed",
      header: "Failed Crawls",
      render: (val: number) => (
        <span className={val > 0 ? "text-red-600 font-bold" : "text-green-600"}>
          {val}
        </span>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerSidebar />

      <div className="flex-1">
        <PageHeader
          title="Discovery Pipeline"
          description="Monitor automated scholarship discovery, deduplication, and crawl statuses."
        />

        <PageLayout>
          <main className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <DashboardCard
                title="Total Discovered (30d)"
                value="3,250"
                description="Raw candidates found"
                icon={<Activity className="h-4 w-4 text-blue-600" />}
              />
              <DashboardCard
                title="Duplicates Removed"
                value="1,405"
                description="Prevented from indexing"
                icon={<SearchX className="h-4 w-4 text-orange-600" />}
              />
              <DashboardCard
                title="Failed Crawls"
                value="12"
                description="Sources requiring attention"
                icon={<FileWarning className="h-4 w-4 text-red-600" />}
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Crawl Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <DataTable 
                  columns={columns} 
                  data={pipelineActivity} 
                  loading={isDataLoading}
                  emptyMessage="No activity logs found."
                />
              </CardContent>
            </Card>
          </main>
        </PageLayout>
      </div>
    </div>
  )
}
