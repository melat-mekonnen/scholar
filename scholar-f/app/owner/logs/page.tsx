"use client";

import { useEffect, useState } from "react";
import { ScrollText, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { mockOwnerData } from "@/lib/mock-owner-data";

export default function OwnerLogsPage() {
  const [search, setSearch] = useState("");

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

  const { systemLogs } = mockOwnerData;

  const filtered = systemLogs.filter(
    (log) =>
      search === "" ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="bg-background overflow-y-auto">
      <div className="flex-1">
        <PageHeader
          title="System Logs"
          description="Audit trail for admin actions, AI verifications, and approvals."
        />

        <PageLayout>
          <main className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded-md border mt-4">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User / System</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.user}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.details}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No logs found matching your search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </main>
        </PageLayout>
      </div>
    </main>
  );
}
