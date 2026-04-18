"use client"

import { PostingProfileEditor } from "@/components/posting-profile-editor"

export default function ManagerProfilePage() {
  return (
    <PostingProfileEditor
      dashboardHref="/manager"
      backAriaLabel="Back to manager dashboard"
      pageTitle="Manager profile"
      pageDescription="How you appear when posting scholarships — optional fields, update anytime."
      saveButtonLabel="Save posting profile"
      savedToastDescription="Your posting profile was updated."
      allowedRoles={["manager"]}
      bounceOwnersTo="/owner/posting-profile"
    />
  )
}
