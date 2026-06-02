import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
/** Express API (see scholar-backend). Used only for dev rewrites — not exposed to the client. */
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:4000"

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  /**
   * Proxy API traffic through Next so the browser uses same-origin `/api/*` (no CORS).
   * Email/password login uses fetch; Google OAuth uses navigation (CORS does not apply).
   */
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/dashboard/summary", destination: `${backendUrl}/dashboard/summary` },
    ]
  },
}

export default nextConfig
