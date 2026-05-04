"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Eye,
  Search,
  Trash2,
  X,
  TrendingUp,
  BarChart3,
  Globe,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

import { apiFetchJson } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { PageLayout } from "@/components/layout/page-layout";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/use-auth";

type AdminDashboardResponse = {
  totals: {
    users: { total: number; byRole: Record<string, number> };
    scholarships: { total: number; verified: number; pending: number };
    applications: { total: number; byStatus: Record<string, number> };
  };
};

type AnalyticsResponse = {
  totals: {
    scholarships: number;
    candidates: number;
    approved: number;
    rejected: number;
    pending: number;
    recommendations: number;
  };
  approvalRate: number;
  topCountries: Array<{ country: string; count: number }>;
  topFields: Array<{ field_of_study: string; count: number }>;
  discoveryOverTime: Array<{ date: string; count: number }>;
  recentActivity: {
    approvedScholarships: Array<{
      id: string;
      title: string;
      country: string;
      field_of_study: string;
      created_at: string;
    }>;
    discoveredCandidates: Array<{
      id: string;
      url: string;
      title: string;
      created_at: string;
    }>;
  };
};

type AdminScholarship = {
  id: string;
  title: string;
  status: "pending" | "verified" | "rejected" | "draft" | "expired";
  fundingType?: string;
  deadline?: string;
};

type PendingResponse = {
  scholarships: AdminScholarship[];
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // All hooks must be called before any conditional returns
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(
    null,
  );
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [scholarships, setScholarships] = useState<AdminScholarship[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Optional: disable buttons while approving/rejecting
  const [mutatingIds, setMutatingIds] = useState<Record<string, boolean>>({});

  // Check if user has admin role
  const isAdmin = user?.role === "admin";

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        clearToken();
        router.replace("/signin");
        return;
      }
      if (!isAdmin) {
        // Redirect students to their dashboard
        router.replace("/unauthorized");
        return;
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Don't render anything while checking authentication
  if (authLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const [dashboardRes, analyticsRes, pendingRes] = await Promise.all([
        apiFetchJson<AdminDashboardResponse>("/api/admin/dashboard", {
          method: "GET",
        }),
        apiFetchJson<AnalyticsResponse>("/api/admin/analytics", {
          method: "GET",
        }),
        apiFetchJson<PendingResponse>("/api/admin/scholarships?status=all", {
          method: "GET",
        }),
      ]);

      if (
        dashboardRes.res.status === 401 ||
        dashboardRes.res.status === 403 ||
        analyticsRes.res.status === 401 ||
        analyticsRes.res.status === 403 ||
        pendingRes.res.status === 401 ||
        pendingRes.res.status === 403
      ) {
        console.log("Admin access denied");
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }

      if (!dashboardRes.res.ok || !dashboardRes.data) {
        setError(dashboardRes.errorMessage || "Failed to load admin dashboard");
        setLoading(false);
        return;
      }

      // Analytics is optional - don't fail if it doesn't load
      setDashboard(dashboardRes.data);
      if (analyticsRes.res.ok && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      } else {
        console.warn("Failed to load analytics:", analyticsRes.errorMessage);
        setAnalytics(null);
      }

      if (pendingRes.res.ok && pendingRes.data) {
        setScholarships(pendingRes.data.scholarships ?? []);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  const visibleScholarships = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scholarships.filter((s) => {
      const matchesQuery = !q || s.title.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, scholarships, statusFilter]);

  async function approveScholarship(id: string) {
    setMutatingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const { res } = await apiFetchJson(
        `/api/admin/scholarships/${id}/verify`,
        {
          method: "PUT",
        },
      );
      if (res.ok) {
        setScholarships((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "verified" } : s)),
        );
      }
    } finally {
      setMutatingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function rejectScholarship(id: string) {
    setMutatingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const { res } = await apiFetchJson(
        `/api/admin/scholarships/${id}/reject`,
        {
          method: "PUT",
        },
      );
      if (res.ok) {
        setScholarships((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s)),
        );
      }
    } finally {
      setMutatingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  const totals = dashboard?.totals;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <div className="flex-1">
          <PageHeader
            title="Admin Dashboard"
            description="Manage scholarships, users, and platform operations for EthioScholar."
            actions={
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <Avatar>
                  <AvatarFallback>ES</AvatarFallback>
                </Avatar>
              </div>
            }
          />

          <PageLayout>
            <main>
              {error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {/* Overview cards */}
              <section className="grid gap-4 md:grid-cols-4">
                <DashboardCard
                  title="Active Scholarships"
                  value={totals?.scholarships.verified ?? 0}
                  description="Currently open for applications"
                  loading={loading}
                />

                <DashboardCard
                  title="Pending Approvals"
                  value={totals?.scholarships.pending ?? 0}
                  description="Scholarships awaiting review"
                  loading={loading}
                />

                <DashboardCard
                  title="Total Applications"
                  value={totals?.applications.total ?? 0}
                  description="Across all listed scholarships"
                  loading={loading}
                />

                <DashboardCard
                  title="Total Users"
                  value={totals?.users.total ?? 0}
                  description="Registered student accounts"
                  loading={loading}
                />
              </section>

              {/* Analytics Section */}
              <section className="space-y-6">
                {/* Analytics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <DashboardCard
                    title="Approval Rate"
                    value={`${analytics?.approvalRate ?? 0}%`}
                    description={`${analytics?.totals?.approved ?? 0} of ${analytics?.totals?.candidates ?? 0} candidates approved`}
                    icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                    loading={loading}
                  />

                  <DashboardCard
                    title="Total Candidates"
                    value={analytics?.totals?.candidates ?? 0}
                    description={`${analytics?.totals?.pending ?? 0} pending, ${analytics?.totals?.rejected ?? 0} rejected`}
                    icon={<BarChart3 className="h-4 w-4 text-blue-600" />}
                    loading={loading}
                  />

                  <DashboardCard
                    title="Recommendations"
                    value={analytics?.totals?.recommendations ?? 0}
                    description="AI-powered recommendations generated"
                    icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
                    loading={loading}
                  />

                  <DashboardCard
                    title="Top Country"
                    value={analytics?.topCountries?.[0]?.country ?? "N/A"}
                    description={`${analytics?.topCountries?.[0]?.count ?? 0} scholarships`}
                    icon={<Globe className="h-4 w-4 text-orange-600" />}
                    loading={loading}
                  />
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Discovery Over Time Chart */}
                  <Card className="rounded-lg">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Discovery Trends (Last 30 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-64 w-full" />
                      ) : analytics?.discoveryOverTime.length ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={analytics.discoveryOverTime}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                              }
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                              }
                              formatter={(value) => [
                                value,
                                "Candidates Discovered",
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No discovery data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Countries Chart */}
                  <Card className="rounded-lg">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Top Countries
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-64 w-full" />
                      ) : analytics?.topCountries.length ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={analytics.topCountries.slice(0, 8)}
                            layout="horizontal"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis
                              dataKey="country"
                              type="category"
                              tick={{ fontSize: 12 }}
                              width={80}
                            />
                            <Tooltip
                              formatter={(value) => [value, "Scholarships"]}
                            />
                            <Bar dataKey="count" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No country data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Discovery Over Time Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Discovery Trends (Last 30 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-64 w-full" />
                      ) : analytics?.discoveryOverTime.length ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={analytics.discoveryOverTime}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                              }
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                              }
                              formatter={(value) => [
                                value,
                                "Candidates Discovered",
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No discovery data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Countries Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Top Countries
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-64 w-full" />
                      ) : analytics?.topCountries.length ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={analytics.topCountries.slice(0, 8)}
                            layout="horizontal"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis
                              dataKey="country"
                              type="category"
                              tick={{ fontSize: 12 }}
                              width={80}
                            />
                            <Tooltip
                              formatter={(value) => [value, "Scholarships"]}
                            />
                            <Bar dataKey="count" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No country data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Feed */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Approved Scholarships */}
                        {analytics?.recentActivity?.approvedScholarships?.map(
                          (scholarship) => (
                            <div
                              key={`approved-${scholarship.id}`}
                              className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800"
                            >
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                  Scholarship Approved
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300 truncate">
                                  {scholarship.title}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  {scholarship.country} •{" "}
                                  {scholarship.field_of_study} •{" "}
                                  {new Date(
                                    scholarship.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ),
                        )}

                        {/* Discovered Candidates */}
                        {analytics?.recentActivity?.discoveredCandidates?.map(
                          (candidate) => (
                            <div
                              key={`discovered-${candidate.id}`}
                              className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                            >
                              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  Candidate Discovered
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300 truncate">
                                  {candidate.title || candidate.url}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  {
                                    candidate.url
                                      .replace(/^https?:\/\//, "")
                                      .split("/")[0]
                                  }{" "}
                                  •{" "}
                                  {new Date(
                                    candidate.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ),
                        )}

                        {!analytics?.recentActivity.approvedScholarships
                          .length &&
                          !analytics?.recentActivity.discoveredCandidates
                            .length && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>No recent activity</p>
                            </div>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Scholarships needing approval */}
              <section className="rounded-lg border bg-white">
                <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-lg font-semibold">
                    Needs Approval / Unverified
                  </h2>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" className="rounded-md">
                      <Link href="/admin/scholarships/pending">
                        Scholarship Listings
                      </Link>
                    </Button>
                    <Button asChild className="rounded-md">
                      <Link href="/admin/scholarships/new">
                        Create Scholarship
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-md">
                      <Link href="/admin/audit-logs">View Audit Logs</Link>
                    </Button>
                  </div>
                </div>

                <div className="p-5">
                  {/* toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="relative min-w-[260px] flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8 rounded-md"
                        placeholder="Search scholarships..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="w-[180px] rounded-md">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* table */}
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Scholarship Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Funding</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {loading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={5}>
                                <Skeleton className="h-6 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : visibleScholarships.length ? (
                          visibleScholarships.map((s) => (
                            <TableRow
                              key={s.id}
                              className="hover:bg-gray-50/60"
                            >
                              <TableCell className="font-medium text-indigo-700">
                                {s.title}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={s.status} />
                              </TableCell>
                              <TableCell>{s.fundingType ?? "N/A"}</TableCell>
                              <TableCell>{s.deadline ?? "N/A"}</TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex items-center gap-2">
                                  <Button
                                    size="icon-sm"
                                    variant="outline"
                                    asChild
                                  >
                                    <Link href={`/admin/scholarships/${s.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>

                                  <Button
                                    size="icon-sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => approveScholarship(s.id)}
                                    disabled={!!mutatingIds[s.id]}
                                    aria-label="Approve scholarship"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    size="icon-sm"
                                    variant="destructive"
                                    onClick={() => rejectScholarship(s.id)}
                                    disabled={!!mutatingIds[s.id]}
                                    aria-label="Reject scholarship"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    size="icon-sm"
                                    variant="outline"
                                    disabled
                                    aria-label="Delete scholarship"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-10 text-center text-gray-500"
                            >
                              No scholarships found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </section>
            </main>
          </PageLayout>
        </div>
      </div>
    </div>
  );
}
