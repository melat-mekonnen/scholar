"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetchJson } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminCandidatesPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

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

  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidates() {
      setLoading(true);
      const { res, data } = await apiFetchJson<{ candidates: any[] }>(
        "/api/admin/candidates",
        {
          method: "GET",
        },
      );

      if (res.status === 401 || res.status === 403) {
        console.log("Admin access denied");
        // Since we check roles upfront, this shouldn't happen, but handle gracefully
        router.replace("/unauthorized");
        return;
      }

      if (res.ok && data) {
        setCandidates(data.candidates || []);
      }
      setLoading(false);
    }

    loadCandidates();
  }, [router]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Candidate Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review scholarship discovery candidates.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading candidates...</p>
            ) : (
              <p>Found {candidates.length} candidates</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
