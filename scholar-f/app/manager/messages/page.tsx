import { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Messages | University Portal",
  description: "Communicate with applicants and students.",
};

export default function MessagesPage() {
  return (
    <div className="flex flex-col flex-1 pb-10">
      <PageHeader 
        title="Messages" 
        description="Direct communication with your applicants." 
      />
      <main className="p-6 space-y-6 max-w-7xl">
        <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          Messaging system is under construction.
        </div>
      </main>
    </div>
  );
}
