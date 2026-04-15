const STORAGE_KEY = "scholar_notification_prefs"

export type NotificationPreferences = {
  emailUpdates: boolean
  deadlineReminders: boolean
  matchAlerts: boolean
}

const defaults: NotificationPreferences = {
  emailUpdates: true,
  deadlineReminders: true,
  matchAlerts: true,
}

function safeParse(raw: string | null): NotificationPreferences {
  if (!raw) return defaults
  try {
    const v = JSON.parse(raw) as Partial<NotificationPreferences>
    return {
      emailUpdates: typeof v.emailUpdates === "boolean" ? v.emailUpdates : defaults.emailUpdates,
      deadlineReminders:
        typeof v.deadlineReminders === "boolean" ? v.deadlineReminders : defaults.deadlineReminders,
      matchAlerts: typeof v.matchAlerts === "boolean" ? v.matchAlerts : defaults.matchAlerts,
    }
  } catch {
    return defaults
  }
}

export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return defaults
  return safeParse(window.localStorage.getItem(STORAGE_KEY))
}

export function saveNotificationPreferences(prefs: NotificationPreferences) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}
