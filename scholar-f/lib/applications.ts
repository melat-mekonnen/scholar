import { apiFetchJson } from "@/lib/api"

export type ApplicationStatus = "pending" | "submitted" | "accepted" | "rejected"

export type StudentApplication = {
  id: string
  scholarshipId: string
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
  scholarship: {
    title: string
    country?: string
    deadline?: string
    applicationUrl?: string
  }
}

export async function createApplication(scholarshipId: string) {
  return apiFetchJson<{
    id: string
    scholarshipId: string
    status: ApplicationStatus
  }>("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scholarshipId, status: "submitted" }),
  })
}

export async function getMyApplications() {
  return apiFetchJson<{ applications: StudentApplication[] }>("/api/applications", {
    method: "GET",
  })
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  return apiFetchJson<{ id: string; status: ApplicationStatus }>(`/api/applications/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
}

