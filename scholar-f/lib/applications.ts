import { apiFetchJson } from "@/lib/api"

export type ApplicationStatus = "pending" | "submitted" | "accepted" | "rejected"

/** POST /api/applications response (new or existing row). */
export type ApplicationCreateResponse = {
  id: string
  scholarshipId: string
  status: ApplicationStatus
  existing?: boolean
  alreadySubmitted?: boolean
}

export type StudentApplication = {
  id: string
  scholarshipId: string
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
  scholarship: {
    title: string
    country?: string
    startDate?: string
    endDate?: string
    deadline?: string
    applicationUrl?: string
  }
}

export async function createApplication(
  scholarshipId: string,
  status: ApplicationStatus = "pending",
) {
  return apiFetchJson<ApplicationCreateResponse>("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scholarshipId, status }),
  })
}

/** Start tracking an application (pending) before opening the official site. */
export async function startTrackedApplication(scholarshipId: string) {
  return apiFetchJson<ApplicationCreateResponse>("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scholarshipId, status: "pending" }),
  })
}

/** Mark a pending application as submitted after the student confirms they applied. */
export async function confirmTrackedApplication(applicationId: string) {
  return updateApplicationStatus(applicationId, "submitted")
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

