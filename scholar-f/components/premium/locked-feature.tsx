"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockedFeatureProps {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  onUpgrade?: () => void;
  blur?: boolean;
  showUpgradeButton?: boolean;
}

export function LockedFeature({
  title,
  description,
  children,
  className,
  onUpgrade,
  blur = true,
  showUpgradeButton = true,
}: LockedFeatureProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Premium Badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
          <Crown className="h-3 w-3 mr-1" />
          Premium
        </Badge>
      </div>

      {/* Blur Overlay */}
      {blur && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-5 flex items-center justify-center">
          <div className="text-center space-y-4 p-6">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {description}
              </p>
              {showUpgradeButton && onUpgrade && (
                <Button
                  onClick={onUpgrade}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn(blur && "opacity-30 pointer-events-none")}>
        {children}
      </div>
    </Card>
  );
}

interface LockedFeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
  onUpgrade?: () => void;
}

export function LockedFeatureCard({
  title,
  description,
  icon,
  className,
  onUpgrade,
}: LockedFeatureCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-dashed border-2 border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10",
        className,
      )}
    >
      <CardContent className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            {icon || (
              <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            )}
          </div>
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Unlock
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
