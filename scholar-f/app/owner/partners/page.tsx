"use client";

import { useEffect } from "react";
import { Building2, Search, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { mockOwnerData } from "@/lib/mock-owner-data";

export default function OwnerPartnersPage() {
  const { universityPartners } = mockOwnerData;

  return (
    <main className="bg-background overflow-y-auto">
      <div className="flex-1">
        <PageHeader
          title="University Partners"
          description="Manage institutional partnerships, sponsored campaigns, and submission activity."
          actions={
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Partner
            </Button>
          }
        />

        <PageLayout>
          <main className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Institutions
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search partners..."
                    className="w-64 pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded-md border mt-4">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Institution Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Active Campaigns</TableHead>
                        <TableHead>Total Submissions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {universityPartners.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-primary">
                            {p.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.status === "active" ? "default" : "secondary"
                              }
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{p.campaigns}</TableCell>
                          <TableCell>{p.submissions}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline">
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
