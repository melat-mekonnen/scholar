"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, ServerCrash, Activity } from "lucide-react";
import { apiFetchJson } from "@/lib/api";

interface Metrics {
  systemStatus: "Healthy" | "Warning" | "Critical";
}

export function SystemStatusBadge({ apiPathBase }: { apiPathBase: string }) {
  const [status, setStatus] = useState<"Healthy" | "Warning" | "Critical" | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchStatus = async () => {
      try {
        const { data } = await apiFetchJson<{ success: boolean; metrics: Metrics }>(`${apiPathBase}/observability/metrics`);
        if (mounted && data?.success) {
          setStatus(data.metrics.systemStatus);
        }
      } catch (error) {
        // Silently fail to not spam logs or UI
      }
    };

    fetchStatus();
    
    // Poll less frequently in the sidebar (every 30 seconds)
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [apiPathBase]);

  if (!status) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground rounded-md bg-muted/50">
        <Activity className="h-3 w-3 animate-pulse" />
        Checking status...
      </div>
    );
  }

  const StatusIcon = {
    Healthy: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    Warning: <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />,
    Critical: <ServerCrash className="h-3.5 w-3.5 text-red-500" />
  };

  const StatusBg = {
    Healthy: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900/50",
    Warning: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50",
    Critical: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900/50"
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border ${StatusBg[status]} transition-colors`}>
      {StatusIcon[status]}
      <span>System: {status}</span>
    </div>
  );
}
