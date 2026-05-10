"use client";

import { useEffect } from "react";
import { Activity, ShieldAlert, Sparkles, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OwnerVerificationPage() {
  return (
    <main className="bg-background overflow-y-auto">
      <div className="flex-1">
        <PageHeader
          title="AI Verification"
          description="Monitor AI decisions, confidence scores, and flagged items."
        />

        <PageLayout>
          <main className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    Flagged Suspicious Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-md bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        Fast Cash Grant 2026
                      </span>
                      <span className="text-sm font-mono text-red-600">
                        Confidence: 12%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI Explanation: Upfront application fee detected. Missing
                      contact information. Domain registered 2 days ago.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive">
                        Confirm Block
                      </Button>
                      <Button size="sm" variant="outline">
                        Override to Approve
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        Global Education Fund
                      </span>
                      <span className="text-sm font-mono text-yellow-600">
                        Confidence: 55%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI Explanation: Source domain is trusted, but description
                      resembles common spam patterns. Manual review required.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button size="sm" variant="outline">
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-500" />
                    Recently Auto-Verified
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-primary">
                        Tech Innovators Award
                      </span>
                      <span className="text-sm font-mono text-green-600">
                        Confidence: 98%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI Explanation: Matches official university domain. Clear
                      eligibility criteria. No fees detected.
                    </p>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-primary">
                        Regional Arts Grant
                      </span>
                      <span className="text-sm font-mono text-green-600">
                        Confidence: 94%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI Explanation: Government source verified. Consistent
                      historical data.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </PageLayout>
      </div>
    </main>
  );
}
