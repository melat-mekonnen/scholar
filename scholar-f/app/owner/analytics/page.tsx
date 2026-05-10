"use client";

import { useEffect } from "react";
import { BarChart3, LineChart, PieChart } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OwnerAnalyticsPage() {
  return (
    <main className="bg-background overflow-y-auto">
      <div className="flex-1">
        <PageHeader
          title="Platform Analytics"
          description="Detailed metrics on user engagement, application trends, and recommendations."
        />

        <PageLayout>
          <main className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Application Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center bg-gray-50/50 rounded-md border m-4 mt-0">
                  <p className="text-sm text-muted-foreground">
                    Chart placeholder
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Engagement by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center bg-gray-50/50 rounded-md border m-4 mt-0">
                  <p className="text-sm text-muted-foreground">
                    Chart placeholder
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Recommendation Interaction Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center bg-gray-50/50 rounded-md border m-4 mt-0">
                  <p className="text-sm text-muted-foreground">
                    Chart placeholder
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
        </PageLayout>
      </div>
    </main>
  );
}
