"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Bell, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Network, 
  Globe, 
  Activity,
  Check,
  X,
  Eye,
  Trash2
} from "lucide-react";

import { OwnerSidebar } from "@/components/layout/owner-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/hooks/use-auth";
import { clearToken } from "@/lib/auth";
import { mockOwnerData } from "@/lib/mock-owner-data";
import { apiFetchJson } from "@/lib/api";
import Link from "next/link";

type PendingScholarship = {
  id: string;
  title: string;
  country?: string;
  status: "pending" | "verified" | "rejected" | "draft" | "expired";
  deadline?: string;
};

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingScholarship[]>([]);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        clearToken();
        router.replace("/signin");
        return;
      }
      if (!isOwner) {
        router.replace("/unauthorized");
        return;
      }
    }
  }, [authLoading, isAuthenticated, isOwner, router]);

  useEffect(() => {
    async function loadData() {
      if (!isOwner) return;
      setLoading(true);

      // Load pending scholarships (simulate API call for now, mixing with real API where possible)
      try {
        const pendingRes = await apiFetchJson<{ scholarships: PendingScholarship[] }>(
          "/api/admin/scholarships/pending",
          { method: "GET" },
        );
        if (pendingRes.res.ok && pendingRes.data?.scholarships) {
          setPending(pendingRes.data.scholarships);
        }
      } catch (err) {
        console.error("Failed to load pending scholarships", err);
      }
      
      setLoading(false);
    }
    loadData();
  }, [isOwner]);

  async function approve(id: string) {
    setBusyIds((p) => ({ ...p, [id]: true }));
    try {
      const { res } = await apiFetchJson(`/api/admin/scholarships/${id}/verify`, { method: "PUT" });
      if (res.ok) {
        setPending((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setBusyIds((p) => ({ ...p, [id]: false }));
    }
  }

  async function reject(id: string) {
    setBusyIds((p) => ({ ...p, [id]: true }));
    try {
      const { res } = await apiFetchJson(`/api/admin/scholarships/${id}/reject`, { method: "PUT" });
      if (res.ok) {
        setPending((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setBusyIds((p) => ({ ...p, [id]: false }));
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
    );
  }

  const { totals } = mockOwnerData;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <OwnerSidebar />

        <div className="flex-1">
          <PageHeader
            title="Owner Dashboard"
            description="Platform oversight, AI monitoring, monetization, and advanced analytics."
            actions={
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <Avatar>
                  <AvatarFallback>OW</AvatarFallback>
                </Avatar>
              </div>
            }
          />

          <PageLayout>
            <main className="space-y-6">
              
              {/* Overview cards */}
              <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DashboardCard
                  title="Total Scholarships"
                  value={totals.scholarships.toLocaleString()}
                  description="Indexed in the platform"
                  icon={<Globe className="h-4 w-4 text-blue-600" />}
                />
                
                <DashboardCard
                  title="Pending Approvals"
                  value={totals.pendingApprovals}
                  description="Require manual verification"
                  icon={<AlertCircle className="h-4 w-4 text-orange-600" />}
                />

                <DashboardCard
                  title="Verified Sources"
                  value={totals.verifiedSources}
                  description={`${totals.suspiciousSources} sources flagged`}
                  icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                />

                <DashboardCard
                  title="Discovery Success"
                  value={`${totals.discoverySuccessRate}%`}
                  description="Crawler success rate"
                  icon={<Network className="h-4 w-4 text-purple-600" />}
                />
              </section>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Needs Approval */}
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle>Needs Approval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pending.length ? (
                            pending.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium text-primary">
                                  {s.title}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {s.country || "N/A"} · {s.deadline || "No deadline"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={s.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <Button size="icon-sm" variant="outline" asChild>
                                      <Link href={`/admin/scholarships/${s.id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => approve(s.id)}
                                      disabled={!!busyIds[s.id]}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      variant="destructive"
                                      onClick={() => reject(s.id)}
                                      disabled={!!busyIds[s.id]}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                No scholarships waiting for approval.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Activity */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent System Logs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockOwnerData.systemLogs.map((log) => (
                      <div key={log.id} className="flex flex-col gap-1 p-3 rounded-lg border bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{log.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center justify-between">
                          <span>{log.user}</span>
                          <span className="truncate max-w-[150px]">{log.details}</span>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/owner/logs">View All Logs</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </main>
          </PageLayout>
        </div>
      </div>
    </div>
  );
}
