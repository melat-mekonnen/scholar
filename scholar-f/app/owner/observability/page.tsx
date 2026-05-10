import { Metadata } from "next";
import { ObservabilityDashboard } from "@/components/observability-dashboard";

export const metadata: Metadata = {
  title: "System Observability | Owner Dashboard",
  description: "Monitor platform health, metrics, and request traces.",
};

export default function OwnerObservabilityPage() {
  return <ObservabilityDashboard apiPathBase="/api/owner" />;
}
