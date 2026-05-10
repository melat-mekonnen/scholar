"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiFetchJson } from "@/lib/api";
import {
  getApplicationUrl,
  normalizeScholarship,
  openScholarshipApplication,
  type ScholarshipPublic,
} from "@/lib/scholarship";
import { createApplication } from "@/lib/applications";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { UsageMeter } from "@/components/premium/usage-meter";
import { PremiumBadge } from "@/components/premium/premium-badge";

type DashboardStats = {
  activeApplications: number;
  savedScholarships: number;
  recommendedMatches: number;
  upcomingDeadlines: number;
  completenessScore: number;
};

type ScholarshipSummaryItem = {
  id: string;
  title: string;
  country: string;
  deadline?: string;
  applicationUrl?: string;
  explanation?: string;
};

type DashboardSummary = {
  stats: DashboardStats;
  bestMatches: ScholarshipSummaryItem[];
  urgentDeadlines: ScholarshipSummaryItem[];
  trendingOpportunities: ScholarshipSummaryItem[];
  recentActivity: string[];
};

import { StudentOnboardingModal } from "@/components/student-onboarding-modal";

function toScholarshipCard(row: ScholarshipSummaryItem): ScholarshipPublic {
  return normalizeScholarship({
    id: row.id,
    title: row.title,
    country: row.country,
    deadline: row.deadline,
    applicationUrl: row.applicationUrl,
    degree_level: "bachelor", // default mock value
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const planType = user?.planType ?? "free";
  const usedAi = user?.aiRequestsToday ?? 0;
  const freeAiLimit = 10;
  const isFreePlan = planType === "free";

  // All hooks must be called before any conditional returns
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleFeedback = async (
    scholarshipId: string,
    type: "viewed" | "clicked" | "saved" | "dismissed" | "applied",
  ) => {
    try {
      await apiFetchJson("/api/recommendations/feedback", {
        method: "POST",
        body: JSON.stringify({ scholarshipId, interactionType: type }),
      });
    } catch (e) {
      console.error("Failed to log feedback", e);
    }
  };

  // Check if user has student role

  // Redirect if not authenticated

  // Load dashboard data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { res, data } = await apiFetchJson<DashboardSummary>(
          "/dashboard/summary",
          {
            method: "GET",
            auth: true,
          },
        );
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          console.log("Authentication failed");
          return;
        }
        if (res.ok && data) {
          setSummary(data);
          if (data.stats.completenessScore < 80) {
            setShowOnboarding(true);
          }
        } else {
          console.log("API call failed:", res.status, data);
          setError(`Failed to load dashboard: ${res.status}`);
          setSummary(null);
        }
      } catch (error) {
        console.log("API call error:", error);
        setError(`Failed to load dashboard: ${error}`);
        setSummary(null);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render anything while checking authentication
  const stats = summary?.stats;
  const statCards = stats
    ? [
        {
          title: "Active Applications",
          value: String(stats.activeApplications),
        },
        { title: "Saved Scholarships", value: String(stats.savedScholarships) },
        {
          title: "Recommended Matches",
          value: String(stats.recommendedMatches),
        },
        { title: "Upcoming Deadlines", value: String(stats.upcomingDeadlines) },
      ]
    : [];

  const bestMatches = summary?.bestMatches ?? [];
  const urgentDeadlines = summary?.urgentDeadlines ?? [];
  const trendingOpportunities = summary?.trendingOpportunities ?? [];
  const activities = summary?.recentActivity ?? [];
  const isProfileIncomplete = stats && stats.completenessScore < 80;

  const renderScholarshipList = (
    title: string,
    list: ScholarshipSummaryItem[],
    emptyMessage: string,
  ) => {
    return (
      <div className="mb-8 relative">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>

        {loading && (
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-3">
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && list.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {emptyMessage}
            </CardContent>
          </Card>
        )}

        {!loading && list.length > 0 && (
          <div
            className={`grid md:grid-cols-3 gap-4 ${isProfileIncomplete ? "blur-sm select-none" : ""}`}
          >
            {list.map((s) => (
              <Card key={s.id} className="relative group">
                <CardHeader>
                  <CardTitle>{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Country: {s.country}
                  </p>
                  {s.deadline && (
                    <p className="text-sm text-muted-foreground">
                      Deadline: {s.deadline}
                    </p>
                  )}
                  {s.explanation && (
                    <div className="bg-primary/10 text-primary text-xs p-2 rounded mt-2 font-medium">
                      ✨ {s.explanation}
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 flex-wrap">
                    <Button
                      size="sm"
                      asChild
                      onClick={() => handleFeedback(s.id, "clicked")}
                    >
                      <Link
                        href={`/scholarships?q=${encodeURIComponent(s.title)}`}
                      >
                        View
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleFeedback(s.id, "saved");
                        toast({ title: "Saved!" });
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        handleFeedback(s.id, "dismissed");
                        toast({ title: "Dismissed" });
                      }}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full mt-2"
                      disabled={!s.applicationUrl}
                      onClick={async () => {
                        handleFeedback(s.id, "applied");
                        const created = await createApplication(s.id);
                        if (
                          created.res.status === 401 ||
                          created.res.status === 403
                        ) {
                          return;
                        }
                        const ok = await openScholarshipApplication(
                          toScholarshipCard(s),
                        );
                        if (!ok) {
                          toast({
                            title: "Application link unavailable",
                            variant: "destructive",
                          });
                        } else {
                          toast({ title: "Application started" });
                        }
                      }}
                    >
                      {s.applicationUrl ? "Apply" : "Apply (link unavailable)"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isProfileIncomplete && !loading && list.length > 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 rounded-lg">
            <h3 className="text-lg font-bold mb-2">
              Unlock Personalized Matches
            </h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Complete your profile to unlock our AI-powered recommendation
              engine and view customized opportunities.
            </p>
            <Button onClick={() => setShowOnboarding(true)}>
              Complete Profile
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <main className="overflow-y-auto">
        <header className="flex flex-col gap-4 border-b p-4 bg-card md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.fullName || "Student"}
            </p>
            {user && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <PremiumBadge planType={user.planType} size="sm" />
                {isFreePlan && (
                  <span className="text-sm text-muted-foreground">
                    {usedAi}/{freeAiLimit} AI requests used today
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <UsageMeter
                aiRequestsToday={user.aiRequestsToday}
                aiRequestsResetAt={user.aiRequestsResetAt}
                planType={user.planType}
                className="min-w-[220px]"
              />
            )}
            <Avatar>
              <AvatarFallback>
                {user?.fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="p-6 space-y-8">
          {isFreePlan && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    Upgrade for unlimited AI recommendations
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your free plan includes {freeAiLimit} AI recommendation
                    requests per day. Premium unlocks unlimited access, advanced
                    analysis, and urgent alerts.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => router.push("/pricing")}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                  >
                    View plans
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/recommendations")}
                  >
                    Keep browsing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div>
            <h2 className="text-2xl font-bold">Welcome back 👋</h2>
            <p className="text-muted-foreground">
              Discover scholarships that match your profile.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {user && (
              <Card className="col-span-full md:col-span-2">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    AI usage overview
                  </p>
                  <UsageMeter
                    aiRequestsToday={user.aiRequestsToday}
                    aiRequestsResetAt={user.aiRequestsResetAt}
                    planType={user.planType}
                  />
                </CardContent>
              </Card>
            )}
            {error ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="mt-2"
                      variant="outline"
                    >
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div>
            {renderScholarshipList(
              "✨ Best Matches For You",
              bestMatches,
              "No matches found yet. Try completing more of your profile.",
            )}
            {renderScholarshipList(
              "🔥 Trending Opportunities",
              trendingOpportunities,
              "No trending scholarships right now.",
            )}
            {renderScholarshipList(
              "⏰ Urgent Deadlines",
              urgentDeadlines,
              "No upcoming deadlines.",
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>

            <Card>
              <CardContent className="pt-6 space-y-3">
                {loading && (
                  <>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </>
                )}
                {!loading && activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No recent activity yet.
                  </p>
                )}
                {!loading &&
                  activities.map((activity, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      • {activity}
                    </p>
                  ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </main>

      <StudentOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
          window.location.reload(); // reload to fetch new recommendations
        }}
      />
    </>
  );
}
