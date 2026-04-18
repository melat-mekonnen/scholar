/**
 * Shared routing + copy for scholarship operations (same APIs for manager & owner).
 */
export type ScholarshipWorkspace = "manager" | "owner"

export function getScholarshipWorkspaceConfig(w: ScholarshipWorkspace) {
  if (w === "owner") {
    return {
      workspace: w,
      shellTitle: "Owner · Scholarships",
      shellSubtitle: "Posting and listings under your owner account",
      dashboardHeading: "Scholarship operations",
      dashboardTagline: "Track performance and manage what you publish.",
      profileLinkLabel: "Posting profile",
      opsBackLabel: "Back to scholarship operations",
      documentPageTitle: "Document resources",
      documentPageHeading: "Document resources",
      newScholarshipTitle: "Create scholarship",
      /** Subtle shell styling — distinct from manager without a full redesign */
      shellClassName:
        "border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background",
      navActiveClass: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
      navInactiveClass: "text-gray-700 hover:bg-amber-50/80 dark:hover:bg-amber-950/20",
      badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
      basePath: "/owner/scholarships",
      profilePath: "/owner/posting-profile",
      documentsPath: "/owner/documents",
      newScholarshipPath: "/owner/scholarships/new",
      ownerHomePath: "/owner",
      /** Standalone ops pages (new scholarship, documents) — subtle owner tint */
      standaloneSurfaceClass:
        "min-h-screen bg-gradient-to-b from-amber-50/40 to-background dark:from-amber-950/15 dark:to-background",
    }
  }

  return {
    workspace: w,
    shellTitle: "Manager Panel",
    shellSubtitle: "Scholarship operations",
    dashboardHeading: "Manager dashboard",
    dashboardTagline: "Track scholarship performance and application activity.",
    profileLinkLabel: "Your profile",
    opsBackLabel: "Back to manager dashboard",
    documentPageTitle: "Document resources",
    documentPageHeading: "Manager document resources",
    newScholarshipTitle: "Create scholarship",
    shellClassName: "border-border bg-white dark:bg-card",
    navActiveClass: "bg-primary/10 text-primary",
    navInactiveClass: "text-gray-700 hover:bg-gray-100 dark:hover:bg-muted/50",
    badgeClass: "bg-primary/10 text-primary",
    basePath: "/manager",
    profilePath: "/manager/profile",
    documentsPath: "/manager/documents",
    newScholarshipPath: "/manager/scholarships/new",
    ownerHomePath: "/owner",
    standaloneSurfaceClass: "min-h-screen bg-background",
  }
}
