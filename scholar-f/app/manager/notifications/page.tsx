import { NotificationsPage } from "@/components/notifications/notifications-page"
import { ScholarshipWorkspaceShell } from "@/components/scholarship-workspace/scholarship-workspace-shell"

export default function ManagerNotificationsPage() {
  return (
    <ScholarshipWorkspaceShell workspace="manager">
      <NotificationsPage
        expectedRole="manager"
        title="Manager notifications"
        backHref="/manager"
        showBackLink={false}
        embeddedInWorkspaceShell
      />
    </ScholarshipWorkspaceShell>
  )
}
