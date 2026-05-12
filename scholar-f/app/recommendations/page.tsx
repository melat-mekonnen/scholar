"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Clock,
  MapPin,
  GraduationCap,
  DollarSign,
} from "lucide-react";

import { apiFetchJson } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/layout/student-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { UsageMeter } from "@/components/premium/usage-meter";
import { UpgradeModal } from "@/components/premium/upgrade-modal";
import { LockedFeature } from "@/components/premium/locked-feature";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ScholarshipRecommendation = {
  id: string;
  title: string;
  organizationName: string;
  country: string;
  degreeLevel: string;
  fieldOfStudy: string;
  fundingType: string;
  deadline?: string;
  amount?: string;
  applicationUrl?: string;
  semanticScore: number;
  finalScore: number;
  rankingReasons: string[];
  competitiveness: "low" | "moderate" | "high";
  difficulty: "easy" | "moderate" | "competitive" | "elite";
  recommendationConfidence: number;
  explanations: string[];
  eligibility: {
    status: "eligible" | "partially_eligible" | "not_eligible";
    score: number;
    matchedRules: string[];
    failedRules: string[];
    explanation: string;
  } | null;
};

type RecommendationsResponse = {
  results: ScholarshipRecommendation[];
  total: number;
  hasProfile: boolean;
  profileCompleteness: {
    gpa?: boolean;
    fieldOfStudy?: boolean;
    degreeLevel?: boolean;
    englishTests?: boolean;
  };
  profileStrength?: {
    label: string;
    score: number;
    reasons: string[];
  };
};

function getEligibilityBadgeColor(status: string) {
  switch (status) {
    case "eligible":
      return "bg-green-100 text-green-800 border-green-200";
    case "partially_eligible":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "not_eligible":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getDeadlineUrgency(deadline?: string) {
  if (!deadline) return null;

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntil <= 14)
    return { label: "Urgent", color: "bg-red-100 text-red-800" };
  if (daysUntil <= 45)
    return { label: "Soon", color: "bg-orange-100 text-orange-800" };
  return { label: "Later", color: "bg-blue-100 text-blue-800" };
}

function ScholarshipCard({
  scholarship,
  planType,
}: {
  scholarship: ScholarshipRecommendation;
  planType: "free" | "premium";
}) {
  const { toast } = useToast();
  const urgency = getDeadlineUrgency(scholarship.deadline);

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{scholarship.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {scholarship.organizationName}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {scholarship.country}
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {scholarship.fundingType}
              </div>
              {scholarship.deadline && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(scholarship.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-800 border-slate-200"
              >
                Competitiveness: {scholarship.competitiveness}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-800 border-slate-200"
              >
                Difficulty: {scholarship.difficulty}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {urgency && (
              <Badge className={urgency.color}>{urgency.label}</Badge>
            )}
            {scholarship.eligibility && (
              <Badge
                className={getEligibilityBadgeColor(
                  scholarship.eligibility.status,
                )}
              >
                {scholarship.eligibility.status.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Match Visualization */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Semantic Match</span>
            <span>{Math.round(scholarship.semanticScore * 100)}%</span>
          </div>
          <Progress value={scholarship.semanticScore * 100} className="h-2" />

          <div className="flex justify-between text-sm">
            <span>Final Score</span>
            <span>{Math.round(scholarship.finalScore * 100)}%</span>
          </div>
          <Progress value={scholarship.finalScore * 100} className="h-2" />

          {scholarship.eligibility && (
            <>
              <div className="flex justify-between text-sm">
                <span>Eligibility</span>
                <span>{scholarship.eligibility.score}%</span>
              </div>
              <Progress value={scholarship.eligibility.score} className="h-2" />
            </>
          )}
        </div>

        {/* Ranking Explanation */}
        {scholarship.rankingReasons.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">
              Why this scholarship matched:
            </h4>
            <ul className="text-sm space-y-1">
              {scholarship.rankingReasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Eligibility Explanation */}
        {scholarship.eligibility && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Eligibility Details:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              {scholarship.eligibility.explanation}
            </p>
            {scholarship.eligibility.matchedRules.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-green-700">✓ Met:</span>
                <ul className="ml-4 mt-1 space-y-1">
                  {scholarship.eligibility.matchedRules.map((rule, index) => (
                    <li key={index} className="text-green-600">
                      • {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scholarship.eligibility.failedRules.length > 0 && (
              <div className="text-sm mt-2">
                <span className="font-medium text-red-700">✗ Issues:</span>
                <ul className="ml-4 mt-1 space-y-1">
                  {scholarship.eligibility.failedRules.map((rule, index) => (
                    <li key={index} className="text-red-600">
                      • {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Recommendation confidence</span>
            <span>{scholarship.recommendationConfidence}%</span>
          </div>
          <Progress
            value={scholarship.recommendationConfidence}
            className="h-2"
          />
        </div>

        {scholarship.explanations.length > 0 && (
          <div className="grid gap-2">
            {scholarship.explanations.slice(0, 3).map((explanation, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700"
              >
                {explanation}
              </div>
            ))}
          </div>
        )}

        {planType === "free" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Upgrade to Premium to unlock deeper AI insights, application advice,
            and competitiveness scoring for each scholarship.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1">
            View Details
          </Button>
          <Button size="sm" variant="outline">
            Save
          </Button>
          <Button size="sm" variant="secondary">
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<
    ScholarshipRecommendation[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasProfile, setHasProfile] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState({
    gpa: false,
    fieldOfStudy: false,
    degreeLevel: false,
    englishTests: false,
  });
  const [profileStrength, setProfileStrength] = useState<{
    label: string;
    score: number;
    reasons: string[];
  } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<
    "ai_limit" | "premium_feature"
  >("premium_feature");

  const planType = user?.planType ?? "free";
  const freeAiLimit = 10;
  const isNearLimit =
    planType === "free" && (user?.aiRequestsToday ?? 0) >= freeAiLimit * 0.8;
  const hasReachedLimit =
    planType === "free" && (user?.aiRequestsToday ?? 0) >= freeAiLimit;
  const profileIncomplete =
    !hasProfile ||
    Object.values(profileCompleteness).some((value) => value === false);

  const openUpgradeModal = (trigger: "ai_limit" | "premium_feature") => {
    setUpgradeTrigger(trigger);
    setShowUpgradeModal(true);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    loadRecommendations();
  }, [user, authLoading]);

  const loadRecommendations = async (query = "") => {
    try {
      setLoading(true);
      const { res, data } = await apiFetchJson<RecommendationsResponse>(
        `/api/recommendations${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        { method: "GET", auth: true },
      );

      if (res.ok && data) {
        setRecommendations(data.results);
        setHasProfile(data.hasProfile);
        setProfileCompleteness(data.profileCompleteness);
        setProfileStrength(data.profileStrength || null);
      } else {
        console.error("Failed to load recommendations:", data);
        toast({
          title: "Failed to load recommendations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Error loading recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (hasReachedLimit) {
      openUpgradeModal("ai_limit");
      return;
    }
    loadRecommendations(searchQuery);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen">
        <StudentSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <Skeleton className="h-[400px] w-full max-w-3xl rounded-xl" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen">
        <StudentSidebar />
        <main className="flex-1 p-6">
          <div className="text-center">
            <p>Please sign in to view recommendations.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex flex-col gap-4 border-b p-4 bg-card md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              AI-Powered Recommendations
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Personalized scholarship matches powered by AI. All opportunities
              are sourced from the backend scholarship database and ranked using
              your profile and semantic relevance.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <PremiumBadge planType={planType} size="sm" />
              {planType === "free" ? (
                <span className="text-sm text-muted-foreground">
                  {user?.aiRequestsToday ?? 0}/{freeAiLimit} AI requests used
                  today
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Premium insights unlocked
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] items-end">
              <UsageMeter
                aiRequestsToday={user?.aiRequestsToday ?? 0}
                aiRequestsResetAt={
                  user?.aiRequestsResetAt ?? new Date().toISOString()
                }
                planType={planType}
                className="w-full"
              />
              {planType === "free" && isNearLimit && (
                <Button
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                  onClick={() => openUpgradeModal("ai_limit")}
                >
                  Upgrade for unlimited AI
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {profileStrength && (
            <Card className="border-slate-200 bg-slate-50/70">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {profileStrength.label.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Profile strength {profileStrength.score}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profileStrength.reasons[0] ||
                      "Personalized matching powered by your student profile."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push("/profile")}
                >
                  Improve profile
                </Button>
              </CardContent>
            </Card>
          )}
          {planType === "free" && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Free plan limits applied</p>
                  <p className="text-sm text-muted-foreground">
                    Your current plan includes {freeAiLimit} AI requests per
                    day. Upgrade for unlimited recommendations and richer
                    analysis.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                    onClick={() => router.push("/pricing")}
                  >
                    View plans
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    Learn more
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {hasReachedLimit && (
            <Card className="border-red-200 bg-red-50">
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-red-900">
                      Daily AI limit reached
                    </p>
                    <p className="text-sm text-red-700">
                      Upgrade your plan to continue generating recommendations
                      today.
                    </p>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    Upgrade now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Search Input */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Try: 'fully funded masters in japan' or 'women in STEM scholarships'"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Completeness Warning */}
          {profileIncomplete && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="text-yellow-600 mt-1">⚠️</div>
                  <div>
                    <h3 className="font-medium text-yellow-800 mb-2">
                      Recommendation quality may improve with a complete profile
                    </h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Add missing profile details to improve matching accuracy
                      and see more relevant scholarship suggestions.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {!profileCompleteness.gpa && (
                        <Badge variant="outline">GPA</Badge>
                      )}
                      {!profileCompleteness.fieldOfStudy && (
                        <Badge variant="outline">Field of Study</Badge>
                      )}
                      {!profileCompleteness.degreeLevel && (
                        <Badge variant="outline">Degree Level</Badge>
                      )}
                      {!profileCompleteness.englishTests && (
                        <Badge variant="outline">English Tests</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/profile")}
                    >
                      {hasProfile ? "Update Profile" : "Complete Profile"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {planType === "free" && !loading && (
            <div className="grid md:grid-cols-3 gap-4">
              <LockedFeature
                title="Advanced fit analysis"
                description="See the deeper fit score and a preview of premium reasoning."
                onUpgrade={() => openUpgradeModal("premium_feature")}
              >
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded-md bg-muted" />
                  <div className="h-3 w-1/2 rounded-md bg-muted" />
                  <div className="h-3 w-5/6 rounded-md bg-muted" />
                </div>
              </LockedFeature>

              <LockedFeature
                title="Scholarship competitiveness"
                description="Compare your profile against other applicants."
                onUpgrade={() => openUpgradeModal("premium_feature")}
              >
                <div className="space-y-2 p-4">
                  <div className="h-4 w-1/2 rounded-md bg-muted" />
                  <div className="h-3 w-2/3 rounded-md bg-muted" />
                  <div className="h-3 w-1/3 rounded-md bg-muted" />
                </div>
              </LockedFeature>

              <LockedFeature
                title="AI application advice"
                description="Receive tailored tips to strengthen your application."
                onUpgrade={() => openUpgradeModal("premium_feature")}
              >
                <div className="space-y-2 p-4">
                  <div className="h-4 w-full rounded-md bg-muted" />
                  <div className="h-3 w-4/5 rounded-md bg-muted" />
                  <div className="h-3 w-2/3 rounded-md bg-muted" />
                </div>
              </LockedFeature>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {!loading && recommendations.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {recommendations.map((scholarship) => (
                <ScholarshipCard
                  key={scholarship.id}
                  scholarship={scholarship}
                  planType={planType}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && recommendations.length === 0 && (
            <Empty>
              <EmptyMedia>
                <Sparkles className="h-12 w-12 text-muted-foreground" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No recommendations found</EmptyTitle>
                <EmptyDescription>
                  {searchQuery
                    ? "Try broadening your search terms or check your profile completeness."
                    : "Complete your profile to get personalized AI-powered recommendations."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Button onClick={() => router.push("/profile")}>
                    Complete Profile
                  </Button>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
        </div>
      </main>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger={upgradeTrigger}
      />
    </div>
  );
}
