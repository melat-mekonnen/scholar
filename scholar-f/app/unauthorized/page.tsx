"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getPostAuthPath } from "@/lib/redirect-by-role";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [returnPath, setReturnPath] = useState("/signin");

  useEffect(() => {
    if (!loading) {
      if (user) {
        setReturnPath(getPostAuthPath(user.role));
      } else {
        setReturnPath("/signin");
      }
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this page. Please ensure you're logged into the correct account.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button 
            onClick={() => router.push(returnPath)} 
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push("/signin")}
            className="w-full sm:w-auto"
          >
            Sign in with different account
          </Button>
        </div>
      </div>
    </div>
  );
}
