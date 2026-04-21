import { NotificationsPage } from "@/components/notifications/notifications-page"

export default function OwnerNotificationsPage() {
  return (
    <NotificationsPage expectedRole="owner" title="Owner notifications" backHref="/owner" />
  )
}
