import { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Applicants | University Portal",
  description: "Review and manage scholarship applications.",
};

export default function ApplicantsPage() {
  return (
    <div className="flex flex-col flex-1 pb-10">
      <PageHeader 
        title="Applicants" 
        description="Review incoming applications for your active scholarships." 
      />
      <main className="p-6 space-y-6 max-w-7xl">
        <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          Applicant management interface is under construction.
        </div>
      </main>
    </div>
  );
}
