// Pure, dependency-free id helpers shared by Edge middleware, route handlers, and the Stream
// server module. Keep this module free of heavy imports (no Stream SDK, no next/headers) so it
// stays safe to bundle into the Edge runtime that middleware runs in.

export const TENANT_COOKIE = "sb"

/** Sanitize a username into a valid Stream user id (lowercase, [a-z0-9_-]). */
export function toUserId(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 64) || "guest"
  )
}

/**
 * Namespace a display name into a tenant-scoped Stream user id: `<tenant>__<sanitized-name>`.
 * Capped at 64 chars for Stream's user-id limit (tenant ids are kept short so names aren't
 * truncated in practice).
 */
export function tenantUser(tenant: string, rawName: string): string {
  return `${tenant}__${toUserId(rawName)}`.slice(0, 64)
}
