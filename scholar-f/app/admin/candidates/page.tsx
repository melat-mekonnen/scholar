"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetchJson } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCandidates() {
      setLoading(true);
      setError(null);

      try {
        const { res, data, errorMessage } = await apiFetchJson<{
          candidates: any[];
        }>("/api/admin/candidates", {
          method: "GET",
        });

        if (res.status === 401 || res.status === 403) {
          console.log("Admin access denied");
          router.replace("/unauthorized");
          return;
        }

        if (!res.ok || !data) {
          throw new Error(errorMessage || "Failed to load candidates");
        }

        setCandidates(data.candidates || []);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load candidates",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCandidates();
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

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

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
