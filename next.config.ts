import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The libSQL client has an optional native addon; keep it out of the bundler and load it at
  // runtime so the server build doesn't choke on it.
  serverExternalPackages: ["@libsql/client"],
}

export default nextConfig
