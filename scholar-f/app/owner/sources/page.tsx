"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Check, Ban, RefreshCw, ShieldAlert, Sparkles, Globe } from "lucide-react"

import { OwnerSidebar } from "@/components/layout/owner-sidebar"
import { PageHeader } from "@/components/layout/page-header"
import { PageLayout } from "@/components/layout/page-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable } from "@/components/ui/data-table"

import { useAuth } from "@/hooks/use-auth"
import { clearToken } from "@/lib/auth"
import { mockOwnerData } from "@/lib/mock-owner-data"

export default function OwnerSourcesPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  
  const [sources, setSources] = useState(mockOwnerData.aiConfidenceScores)
  const [search, setSearch] = useState("")
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

  const filtered = sources.filter(s => search === "" || s.source.toLowerCase().includes(search.toLowerCase()))

  const columns = [
    {
      key: "source",
      header: "Source URL",
      render: (val: string) => <span className="font-medium text-primary">{val}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (val: any) => <StatusBadge status={val} />,
    },
    {
      key: "score",
      header: "AI Confidence",
      render: (val: number) => (
        <div className="flex items-center gap-2">
          {val > 80 ? (
            <Sparkles className="w-4 h-4 text-green-500" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-red-500" />
          )}
          <span className="font-mono text-sm">{val}%</span>
        </div>
      ),
    },
    {
      key: "lastCrawl",
      header: "Last Crawl",
      render: () => <span className="text-muted-foreground text-sm">{new Date().toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (_: any, s: typeof sources[0]) => (
        <div className="flex justify-end items-center gap-1">
          {s.status !== 'verified' && (
            <Button 
              size="icon-sm" 
              className="bg-green-600 hover:bg-green-700 text-white" 
              title="Approve"
              onClick={() => setSources(prev => prev.map(item => item.source === s.source ? {...item, status: "verified"} : item))}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button 
            size="icon-sm" 
            variant="outline" 
            title="Re-run Verification"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {s.status !== 'blocked' && (
            <Button 
              size="icon-sm" 
              variant="destructive" 
              title="Block Source"
              onClick={() => setSources(prev => prev.map(item => item.source === s.source ? {...item, status: "blocked"} : item))}
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerSidebar />

      <div className="flex-1">
        <PageHeader
          title="Source Management"
          description="Manage discovery and scraping sources. Monitor verification status and AI confidence."
        />

        <PageLayout>
          <main className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Registered Sources
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search URL..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-64 pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <DataTable 
                  columns={columns} 
                  data={filtered} 
                  loading={isDataLoading}
                  emptyMessage="No sources found."
                />
              </CardContent>
            </Card>
          </main>
        </PageLayout>
      </div>
    </div>
  )
}
