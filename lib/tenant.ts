// Per-visitor sandbox isolation.
//
// Every visitor gets an anonymous tenant id (a cookie set by middleware). That tenant is the unit
// of isolation: shows are stored with it and only listed back to the same tenant, and user
// identities are namespaced under it so two visitors who both type "DJ" can neither collide nor
// impersonate one another. This keeps the public demo safe — nobody ever sees another visitor's
// shows, chat, or auctions.

import { cookies } from "next/headers"
import { toUserId } from "./stream-server"

export const TENANT_COOKIE = "sb"

// Visitors with cookies disabled (or requests that somehow bypass middleware) share this one
// sandbox. Degraded but functional; the common path always has a per-visitor cookie.
const FALLBACK_TENANT = "sb_shared"

/** The current visitor's sandbox id, from the cookie set by middleware. */
export async function getTenant(): Promise<string> {
  const store = await cookies()
  return store.get(TENANT_COOKIE)?.value || FALLBACK_TENANT
}

/**
 * Namespace a display name into a tenant-scoped Stream user id: `<tenant>__<sanitized-name>`.
 * Capped at 64 chars for Stream's user-id limit (tenant ids are kept short so names aren't
 * truncated in practice).
 */
export function tenantUser(tenant: string, rawName: string): string {
  return `${tenant}__${toUserId(rawName)}`.slice(0, 64)
}
