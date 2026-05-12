"use client";

import { useEffect, useState } from "react";
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
  Trash2,
} from "lucide-react";

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

import { useToast } from "@/hooks/use-toast";
import { mockOwnerData } from "@/lib/mock-owner-data";
import { apiFetchJson } from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

type PendingScholarship = {
  id: string;
  title: string;
  country?: string;
  status: "pending" | "verified" | "rejected" | "draft" | "expired";
  deadline?: string;
};

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingScholarship[]>([]);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  const [totals, setTotals] = useState({
    scholarships: 0,
    pendingApprovals: 0,
    verifiedSources: 0,
    suspiciousSources: 0,
    discoverySuccessRate: 94
  });

  useEffect(() => {
    async function loadData() {
      if (!isOwner) return;
      setLoading(true);

      try {
        const dashboardRes = await apiFetchJson<{
          totals: typeof totals;
        }>("/api/owner/dashboard", { method: "GET" });
        if (dashboardRes.res.ok && dashboardRes.data?.totals) {
          setTotals(dashboardRes.data.totals);
        }
      } catch (err) {
        console.error("Failed to load dashboard totals", err);
      }

      try {
        const pendingRes = await apiFetchJson<{
          scholarships: PendingScholarship[];
        }>("/api/admin/scholarships/pending", { method: "GET" });
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
      const { res, errorMessage } = await apiFetchJson(
        `/api/admin/scholarships/${id}/verify`,
        { method: "PUT" },
      );
      if (!res.ok) {
        throw new Error(errorMessage || "Failed to approve scholarship");
      }
      setPending((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: "Scholarship approved",
        description: "The scholarship was approved successfully.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve scholarship";
      toast({
        title: "Approval failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyIds((p) => ({ ...p, [id]: false }));
    }
  }

  async function reject(id: string) {
    setBusyIds((p) => ({ ...p, [id]: true }));
    try {
      const { res, errorMessage } = await apiFetchJson(
        `/api/admin/scholarships/${id}/reject`,
        { method: "PUT" },
      );
      if (!res.ok) {
        throw new Error(errorMessage || "Failed to reject scholarship");
      }
      setPending((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: "Scholarship rejected",
        description: "The scholarship was rejected successfully.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject scholarship";
      toast({
        title: "Rejection failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyIds((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <main className="bg-background overflow-y-auto">
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
                              {s.country || "N/A"} ·{" "}
                              {s.deadline || "No deadline"}
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
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-muted-foreground"
                        >
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
                <div
                  key={log.id}
                  className="flex flex-col gap-1 p-3 rounded-lg border bg-gray-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{log.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{log.user}</span>
                    <span className="truncate max-w-[150px]">
                      {log.details}
                    </span>
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
    </main>
  );
}
