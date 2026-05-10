import { Metadata } from "next";
import { ObservabilityDashboard } from "@/components/observability-dashboard";

export const metadata: Metadata = {
  title: "System Observability | Admin Dashboard",
  description: "Monitor platform health, metrics, and request traces.",
};

export default function AdminObservabilityPage() {
  return <ObservabilityDashboard apiPathBase="/api/admin" />;
}
