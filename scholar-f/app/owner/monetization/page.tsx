"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BadgeDollarSign, TrendingUp, BarChart3, CreditCard } from "lucide-react"

import { OwnerSidebar } from "@/components/layout/owner-sidebar"
import { PageHeader } from "@/components/layout/page-header"
import { PageLayout } from "@/components/layout/page-layout"
import { DashboardCard } from "@/components/ui/dashboard-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useAuth } from "@/hooks/use-auth"
import { clearToken } from "@/lib/auth"
import { mockOwnerData } from "@/lib/mock-owner-data"

export default function OwnerMonetizationPage() {
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

  const { revenue, totals } = mockOwnerData

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerSidebar />

      <div className="flex-1">
        <PageHeader
          title="Monetization & Revenue"
          description="Track sponsored scholarships, boost levels, and estimated revenue."
        />

        <PageLayout>
          <main className="space-y-6">
            <section className="grid gap-4 md:grid-cols-4">
              <DashboardCard
                title="Est. Monthly Revenue"
                value={`$${revenue.estimatedMonthly.toLocaleString()}`}
                description="Projected for current month"
                icon={<BadgeDollarSign className="h-4 w-4 text-green-600" />}
              />
              <DashboardCard
                title="Sponsored Listings"
                value={totals.sponsoredListings}
                description="Active paid boosts"
                icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
              />
              <DashboardCard
                title="Ad Impressions"
                value={(revenue.impressions / 1000000).toFixed(1) + "M"}
                description="Total sponsored views"
                icon={<BarChart3 className="h-4 w-4 text-purple-600" />}
              />
              <DashboardCard
                title="Ad Clicks"
                value={(revenue.clicks / 1000).toFixed(1) + "k"}
                description="Click-throughs on boosts"
                icon={<CreditCard className="h-4 w-4 text-orange-600" />}
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Active Sponsored Scholarships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Sponsor</TableHead>
                        <TableHead>Boost Level</TableHead>
                        <TableHead>Impressions</TableHead>
                        <TableHead>Revenue (Est.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-primary">Future Leaders Grant</TableCell>
                        <TableCell>Leadership Org</TableCell>
                        <TableCell><span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Premium</span></TableCell>
                        <TableCell>125k</TableCell>
                        <TableCell>$450.00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-primary">Global STEM Initiative</TableCell>
                        <TableCell>Tech Foundation</TableCell>
                        <TableCell><span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Standard</span></TableCell>
                        <TableCell>85k</TableCell>
                        <TableCell>$200.00</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </main>
        </PageLayout>
      </div>
    </div>
  )
}
