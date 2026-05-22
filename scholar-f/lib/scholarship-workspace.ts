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
      /** Same shell as manager — platform-wide emerald / teal portal */
      shellClassName: "border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5",
      navActiveClass:
        "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 ring-1 ring-emerald-200/80 font-medium",
      navInactiveClass:
        "text-slate-700 transition-colors hover:bg-emerald-50/80 hover:text-emerald-900",
      badgeClass: "border border-emerald-200 bg-emerald-50 text-emerald-800",
      basePath: "/owner/scholarships",
      profilePath: "/owner/posting-profile",
      documentsPath: "/owner/documents",
      newScholarshipPath: "/owner/scholarships/new",
      manageScholarshipsPath: "/owner/scholarships/manage",
      ownerHomePath: "/owner",
      standaloneSurfaceClass: "min-h-screen bg-slate-100",
    }
  }

  return {
    workspace: w,
    shellTitle: "Manager Panel",
    shellSubtitle: "",
    dashboardHeading: "University Representative Dashboard",
    dashboardTagline: "Track scholarship performance and application activity.",
    profileLinkLabel: "Your profile",
    opsBackLabel: "Back to manager dashboard",
    documentPageTitle: "Document resources",
    documentPageHeading: "Manager document resources",
    newScholarshipTitle: "Create scholarship",
      /** Manager shell — aligned with student / admin portal emerald theme */
      shellClassName: "border-emerald-100/90 bg-white shadow-sm shadow-emerald-900/5",
      navActiveClass:
        "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 ring-1 ring-emerald-200/80 font-medium",
      navInactiveClass:
        "text-slate-700 transition-colors hover:bg-emerald-50/80 hover:text-emerald-900",
      badgeClass: "border border-emerald-200 bg-emerald-50 text-emerald-800",
    basePath: "/manager",
    profilePath: "/manager/profile",
    documentsPath: "/manager/documents",
    newScholarshipPath: "/manager/scholarships/new",
    manageScholarshipsPath: "/manager/scholarships",
    ownerHomePath: "/owner",
    standaloneSurfaceClass: "min-h-screen bg-slate-100",
  }
}
