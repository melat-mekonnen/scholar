"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Crown,
  Sparkles,
  Zap,
  BookOpen,
  Clock,
  Users,
  Check,
  Star,
  ArrowRight,
} from "lucide-react";
import { StudentSidebar } from "@/components/layout/student-sidebar";

const FREE_FEATURES = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "10 AI Recommendations Daily",
    description: "Get personalized scholarship matches powered by AI",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Basic Search & Filtering",
    description: "Search through our scholarship database with basic filters",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Community Access",
    description: "Connect with other students and share experiences",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Save Up to 50 Scholarships",
    description: "Bookmark scholarships for easy access later",
  },
];

const PREMIUM_FEATURES = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Unlimited AI Recommendations",
    description: "Get unlimited personalized matches without daily limits",
  },
  {
    icon: <Crown className="h-5 w-5" />,
    title: "Advanced Ranking Algorithms",
    description: "Premium AI models for better scholarship matching",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Urgent Scholarship Alerts",
    description: "Get notified about time-sensitive opportunities",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Application Advice & Guidance",
    description: "Personalized tips for stronger applications",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Enhanced Explanations",
    description: "Detailed reasoning for each recommendation",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Priority Support",
    description: "Get help faster with premium customer support",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    setIsLoading(plan);
    // TODO: Implement payment flow
    // For now, redirect to dashboard
    setTimeout(() => {
      setIsLoading(null);
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentSidebar />
      <div className="ml-64 min-h-screen">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Unlock your scholarship potential with AI-powered recommendations
              and expert guidance tailored for Ethiopian students.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl mb-2">Free Plan</CardTitle>
                <div className="text-4xl font-bold mb-2">$0</div>
                <p className="text-muted-foreground">
                  Perfect for getting started
                </p>
                <Badge variant="secondary" className="mt-4">
                  Current Plan
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {FREE_FEATURES.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mt-0.5">
                        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-green-600 dark:text-green-400">
                            {feature.icon}
                          </div>
                          <span className="font-medium">{feature.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/dashboard")}
                >
                  Continue with Free
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative border-amber-200 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/10">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-2 text-sm">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </Badge>
              </div>

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl mb-2 flex items-center justify-center gap-2">
                  <Crown className="h-6 w-6 text-amber-500" />
                  Premium Plan
                </CardTitle>
                <div className="text-4xl font-bold text-amber-600 mb-2">
                  $9.99
                </div>
                <p className="text-muted-foreground">per month</p>
                <Badge className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  Recommended
                </Badge>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {PREMIUM_FEATURES.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 mt-0.5">
                        <Check className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-amber-600 dark:text-amber-400">
                            {feature.icon}
                          </div>
                          <span className="font-medium">{feature.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <Button
                  onClick={() => handleUpgrade("premium")}
                  disabled={isLoading === "premium"}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                >
                  {isLoading === "premium" ? (
                    "Processing..."
                  ) : (
                    <>
                      Upgrade Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Feature Comparison */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              Why Choose Premium?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Zap className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Unlimited AI Power
                </h3>
                <p className="text-muted-foreground">
                  Break through daily limits and get unlimited AI-driven
                  scholarship recommendations tailored to your profile.
                </p>
              </div>

              <div className="text-center p-6 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <BookOpen className="h-10 w-10 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Expert Application Guidance
                </h3>
                <p className="text-muted-foreground">
                  Receive personalized advice on crafting compelling
                  applications and maximizing your scholarship chances.
                </p>
              </div>

              <div className="text-center p-6 rounded-lg bg-green-50 dark:bg-green-950/20">
                <Clock className="h-10 w-10 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Never Miss Opportunities
                </h3>
                <p className="text-muted-foreground">
                  Get instant alerts for urgent scholarships and time-sensitive
                  opportunities that match your profile.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ or Additional Info */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              Questions about our plans?{" "}
              <Button variant="link" className="p-0 h-auto">
                Contact our support team
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
