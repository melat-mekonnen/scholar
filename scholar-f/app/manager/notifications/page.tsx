import { NotificationsPage } from "@/components/notifications/notifications-page"

export default function ManagerNotificationsPage() {
  return (
    <NotificationsPage expectedRole="manager" title="Manager notifications" backHref="/manager" />
  )
}
