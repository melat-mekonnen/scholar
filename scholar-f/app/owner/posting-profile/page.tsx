"use client"

import { PostingProfileEditor } from "@/components/posting-profile-editor"

export default function OwnerPostingProfilePage() {
  return (
    <PostingProfileEditor
      dashboardHref="/owner"
      backAriaLabel="Back to owner dashboard"
      pageTitle="Posting profile"
      pageDescription="How you appear when posting scholarships — under your owner workspace (same data as manager coordinators)."
      saveButtonLabel="Save posting profile"
      savedToastDescription="Your posting profile was updated."
      allowedRoles={["owner"]}
      bounceManagersTo="/manager/profile"
    />
  )
}
