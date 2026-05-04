"use client";

import { useEffect } from "react";
import { setToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallbackPage() {
  useEffect(() => {
    // Avoid `useSearchParams()` Suspense requirement by reading the URL directly.
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setToken(token);
      try {
        const payloadPart = token.split(".")[1] || "";
        const payloadJson = atob(
          payloadPart.replace(/-/g, "+").replace(/_/g, "/"),
        );
        const payload = JSON.parse(payloadJson) as { role?: string };
        console.log("[OAuth callback] token received", { role: payload.role });
      } catch (err) {
        console.log("[OAuth callback] token parse failed", err);
      }
      return;
    }
    console.log("[OAuth callback] no token found, staying on callback page");
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Signing you in...</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Please wait.
        </CardContent>
      </Card>
    </main>
  );
}
