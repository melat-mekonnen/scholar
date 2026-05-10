"use client";

import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageMeterProps {
  aiRequestsToday: number;
  aiRequestsResetAt: string;
  planType: "free" | "premium";
  className?: string;
}

const FREE_AI_LIMIT = 10;

export function UsageMeter({
  aiRequestsToday,
  aiRequestsResetAt,
  planType,
  className,
}: UsageMeterProps) {
  const { progress, remaining, isNearLimit, resetTime } = useMemo(() => {
    if (planType === "premium") {
      return {
        progress: 0,
        remaining: "Unlimited",
        isNearLimit: false,
        resetTime: null,
      };
    }

    const progress = (aiRequestsToday / FREE_AI_LIMIT) * 100;
    const remaining = Math.max(0, FREE_AI_LIMIT - aiRequestsToday);
    const isNearLimit = progress >= 80;

    // Calculate reset time
    const resetDate = new Date(aiRequestsResetAt);
    const now = new Date();
    const timeUntilReset = resetDate.getTime() - now.getTime();

    let resetTime = null;
    if (timeUntilReset > 0) {
      const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor(
        (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60),
      );
      resetTime = `${hours}h ${minutes}m`;
    }

    return { progress, remaining, isNearLimit, resetTime };
  }, [aiRequestsToday, aiRequestsResetAt, planType]);

  if (planType === "premium") {
    return (
      <Card
        className={cn(
          "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
          className,
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Unlimited AI Requests
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Premium plan active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        isNearLimit &&
          "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isNearLimit && (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              <span className="text-sm font-medium">AI Requests Today</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {aiRequestsToday} / {FREE_AI_LIMIT}
            </span>
          </div>

          <Progress
            value={progress}
            className={cn("h-2", isNearLimit && "[&>div]:bg-amber-500")}
          />

          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                "font-medium",
                isNearLimit
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground",
              )}
            >
              {remaining} remaining
            </span>
            {resetTime && (
              <span className="text-muted-foreground">
                Resets in {resetTime}
              </span>
            )}
          </div>

          {isNearLimit && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              ⚠️ You're approaching your daily limit. Consider upgrading to
              Premium for unlimited access.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
