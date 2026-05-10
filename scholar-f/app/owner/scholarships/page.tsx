"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Search,
  Check,
  X,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";

// Mock data for Owner Scholarship Control
const mockScholarships = [
  {
    id: "1",
    title: "Global STEM Initiative",
    provider: "Tech Foundation",
    status: "pending",
    aiScore: 95,
    flagged: false,
    featured: false,
  },
  {
    id: "2",
    title: "Future Leaders Grant",
    provider: "Leadership Org",
    status: "verified",
    aiScore: 98,
    flagged: false,
    featured: true,
  },
  {
    id: "3",
    title: "Suspicious Offer 2026",
    provider: "Unknown",
    status: "pending",
    aiScore: 24,
    flagged: true,
    featured: false,
  },
  {
    id: "4",
    title: "Regional Arts Fund",
    provider: "Arts Council",
    status: "rejected",
    aiScore: 85,
    flagged: false,
    featured: false,
  },
  {
    id: "5",
    title: "Medical Excellence Scholarship",
    provider: "Health Corp",
    status: "verified",
    aiScore: 92,
    flagged: false,
    featured: false,
  },
];

export default function OwnerScholarshipsPage() {
  const [scholarships, setScholarships] = useState(mockScholarships);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDataLoading, setIsDataLoading] = useState(false); // Added loading state for polish

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
  }, [authLoading, isAuthenticated, isOwner]);

  const filtered = scholarships.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (val: any, s: (typeof mockScholarships)[0]) => (
        <div className="font-medium text-primary flex items-center gap-2">
          {s.title}
          {s.featured && (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-[10px]"
            >
              <TrendingUp className="w-3 h-3 mr-1" /> Featured
            </Badge>
          )}
          {s.flagged && <ShieldAlert className="w-4 h-4 text-destructive" />}
        </div>
      ),
    },
    { key: "provider", header: "Provider" },
    {
      key: "status",
      header: "Status",
      render: (val: any) => <StatusBadge status={val} />,
    },
    {
      key: "aiScore",
      header: "AI Score",
      render: (val: any) => (
        <div className="flex items-center gap-2">
          <Sparkles
            className={`w-4 h-4 ${val > 80 ? "text-green-500" : val > 50 ? "text-yellow-500" : "text-red-500"}`}
          />
          <span className="font-mono text-sm">{val}%</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (_: any, s: (typeof mockScholarships)[0]) => (
        <div className="flex justify-end items-center gap-1">
          <Button size="icon-sm" variant="outline" title="View details">
            <Eye className="w-4 h-4" />
          </Button>
          {s.status !== "verified" && (
            <Button
              size="icon-sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              title="Approve"
              onClick={() =>
                setScholarships((prev) =>
                  prev.map((item) =>
                    item.id === s.id ? { ...item, status: "verified" } : item,
                  ),
                )
              }
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          {s.status !== "rejected" && (
            <Button
              size="icon-sm"
              variant="destructive"
              title="Reject"
              onClick={() =>
                setScholarships((prev) =>
                  prev.map((item) =>
                    item.id === s.id ? { ...item, status: "rejected" } : item,
                  ),
                )
              }
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <main className="bg-background overflow-y-auto">
      <div className="flex-1">
        <PageHeader
          title="Scholarship Control"
          description="Govern all platform listings. Approve, reject, feature, and review AI verification scores."
        />

        <PageLayout>
          <main className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <CardTitle className="text-base">Listing Management</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search title..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-64 pl-8"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <DataTable
                  columns={columns}
                  data={filtered}
                  loading={isDataLoading}
                  emptyMessage="No scholarships found matching filters."
                />
              </CardContent>
            </Card>
          </main>
        </PageLayout>
      </div>
    </main>
  );
}
