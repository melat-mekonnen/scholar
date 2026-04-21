import { apiFetchJson } from "@/lib/api"

export type ApplicationStatus = "saved" | "preparing" | "submitted" | "accepted" | "rejected"

export type ApplicationNote = {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  note: string
  createdAt: string
}

export type ApplicationTimelineEvent = {
  type: "application_created" | "status_updated" | "note_added"
  at: string
  status?: ApplicationStatus
  note?: string
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
    deadline?: string
    applicationUrl?: string
  }
  notes?: ApplicationNote[]
  timeline?: ApplicationTimelineEvent[]
}

export async function createApplication(scholarshipId: string) {
  return apiFetchJson<{
    id: string
    scholarshipId: string
    status: ApplicationStatus
  }>("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scholarshipId, status: "saved" }),
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

export async function getApplicationById(id: string) {
  return apiFetchJson<StudentApplication>(`/api/applications/${id}`, {
    method: "GET",
  })
}

export async function addApplicationNote(id: string, note: string) {
  return apiFetchJson<{ id: string; applicationId: string; note: string; createdAt: string }>(
    `/api/applications/${id}/notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }
  )
}

