import { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Analytics | University Portal",
  description: "View scholarship and application analytics.",
};

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col flex-1 pb-10">
      <PageHeader 
        title="Analytics" 
        description="Monitor performance metrics for your scholarships." 
      />
      <main className="p-6 space-y-6 max-w-7xl">
        <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          Analytics dashboard is under construction.
        </div>
      </main>
    </div>
  );
}
