/** Default home route after sign-in / OAuth callback (four-role model). */
export function getPostAuthPath(role: string | undefined): string {
  switch (role) {
    case "admin":
      return "/admin"
    case "owner":
      return "/owner"
    case "manager":
      return "/manager"
    case "student":
      return "/dashboard"
    default:
      // Fallback for missing or invalid role
      return "/dashboard"
  }
}
