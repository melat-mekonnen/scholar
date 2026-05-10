"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Check,
  Ban,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Globe,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";

import { mockOwnerData } from "@/lib/mock-owner-data";

export default function OwnerSourcesPage() {
  const [sources, setSources] = useState(mockOwnerData.aiConfidenceScores);
  const [search, setSearch] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(false);

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

  const filtered = sources.filter(
    (s) =>
      search === "" || s.source.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    {
      key: "source",
      header: "Source URL",
      render: (val: string) => (
        <span className="font-medium text-primary">{val}</span>
      ),
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
      render: () => (
        <span className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (_: any, s: (typeof sources)[0]) => (
        <div className="flex justify-end items-center gap-1">
          {s.status !== "verified" && (
            <Button
              size="icon-sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              title="Approve"
              onClick={() =>
                setSources((prev) =>
                  prev.map((item) =>
                    item.source === s.source
                      ? { ...item, status: "verified" }
                      : item,
                  ),
                )
              }
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon-sm" variant="outline" title="Re-run Verification">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {s.status !== "blocked" && (
            <Button
              size="icon-sm"
              variant="destructive"
              title="Block Source"
              onClick={() =>
                setSources((prev) =>
                  prev.map((item) =>
                    item.source === s.source
                      ? { ...item, status: "blocked" }
                      : item,
                  ),
                )
              }
            >
              <Ban className="w-4 h-4" />
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
    </main>
  );
}
