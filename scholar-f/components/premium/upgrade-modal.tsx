"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, Zap, BookOpen, Clock, Check, X } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "ai_limit" | "premium_feature";
}

const FREE_FEATURES = [
  "10 AI recommendations per day",
  "Basic scholarship search",
  "Save up to 50 scholarships",
  "Community access",
  "Profile management",
];

const PREMIUM_FEATURES = [
  "Unlimited AI recommendations",
  "Advanced ranking algorithms",
  "Urgent scholarship alerts",
  "Application advice & guidance",
  "Enhanced recommendation explanations",
  "Priority customer support",
  "Early access to new features",
];

export function UpgradeModal({
  isOpen,
  onClose,
  trigger = "premium_feature",
}: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    // TODO: Implement payment flow
    // For now, just close the modal
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  const getTriggerMessage = () => {
    switch (trigger) {
      case "ai_limit":
        return "You've reached your daily AI recommendation limit. Upgrade to Premium for unlimited access!";
      case "premium_feature":
        return "This feature is available with Premium. Unlock advanced capabilities!";
      default:
        return "Upgrade to Premium for the full experience!";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-amber-500" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription className="text-base">
            {getTriggerMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Free Plan</CardTitle>
                <Badge variant="secondary">Current</Badge>
              </div>
              <div className="text-3xl font-bold">$0</div>
              <p className="text-sm text-muted-foreground">
                Perfect for getting started
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {FREE_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Premium Plan
                </CardTitle>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  Recommended
                </Badge>
              </div>
              <div className="text-3xl font-bold text-amber-600">$9.99</div>
              <p className="text-sm text-muted-foreground">per month</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {PREMIUM_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Why Upgrade?</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Unlimited AI</h4>
              <p className="text-sm text-muted-foreground">
                Get unlimited AI-powered recommendations without daily limits
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Expert Guidance</h4>
              <p className="text-sm text-muted-foreground">
                Receive personalized application advice and scholarship insights
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Stay Ahead</h4>
              <p className="text-sm text-muted-foreground">
                Get urgent alerts for time-sensitive opportunities
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-3 mt-8">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          >
            {isLoading ? (
              "Processing..."
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
