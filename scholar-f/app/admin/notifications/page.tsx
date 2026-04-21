import { NotificationsPage } from "@/components/notifications/notifications-page"

export default function AdminNotificationsPage() {
  return (
    <NotificationsPage expectedRole="admin" title="Admin notifications" backHref="/admin" />
  )
}
