import { apiFetchJson } from "@/lib/api"
import type { NotificationPreferences } from "@/lib/user-preferences"

export type ServerNotificationPreferences = NotificationPreferences & {
  applyFollowups: boolean
  updatedAt?: string | null
}

export async function fetchNotificationPreferences() {
  return apiFetchJson<ServerNotificationPreferences>("/api/notification-preferences", {
    method: "GET",
    auth: true,
  })
}

export async function saveNotificationPreferences(prefs: ServerNotificationPreferences) {
  return apiFetchJson<ServerNotificationPreferences>("/api/notification-preferences", {
    method: "PUT",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deadlineReminders: prefs.deadlineReminders,
      applyFollowups: prefs.applyFollowups,
      emailUpdates: prefs.emailUpdates,
      matchAlerts: prefs.matchAlerts,
    }),
  })
}
