// Per-visitor sandbox isolation.
//
// Every visitor gets an anonymous tenant id (a cookie set by the proxy). That tenant is the unit
// of isolation: shows are stored with it and only listed back to the same tenant, and user
// identities are namespaced under it so two visitors who both type "DJ" can neither collide nor
// impersonate one another. This keeps the public demo safe — nobody ever sees another visitor's
// shows, chat, or auctions.
//
// The pure helpers (TENANT_COOKIE, tenantUser) live in ./ids so the Edge proxy can use them
// without dragging in the Node-only Stream SDK. getTenant() is server-only (it reads cookies).

import { cookies } from "next/headers"
import { TENANT_COOKIE } from "./ids"

export { TENANT_COOKIE, tenantUser } from "./ids"

// Visitors with cookies disabled (or requests that somehow bypass the proxy) share this one
// sandbox. Degraded but functional; the common path always has a per-visitor cookie.
const FALLBACK_TENANT = "sb_shared"

/** The current visitor's sandbox id, from the cookie set by the proxy. */
export async function getTenant(): Promise<string> {
  const store = await cookies()
  return store.get(TENANT_COOKIE)?.value || FALLBACK_TENANT
}
