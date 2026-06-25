import { NextResponse, type NextRequest } from "next/server"

// Import from the dependency-free ids module, NOT lib/tenant — middleware runs in the Edge
// runtime, and lib/tenant pulls in next/headers + (transitively) the Node-only Stream SDK.
import { TENANT_COOKIE } from "@/lib/ids"

// Mint a sandbox id on first visit. 16 hex chars of randomness keeps the derived Stream user id
// (`<tenant>__<name>`) comfortably under Stream's 64-char limit while staying collision-safe.
function freshTenant(): string {
  return "sb_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16)
}

export function middleware(request: NextRequest) {
  const existing = request.cookies.get(TENANT_COOKIE)?.value
  const tenant = existing || freshTenant()

  // Make the (possibly new) tenant visible to route handlers in THIS request...
  request.cookies.set(TENANT_COOKIE, tenant)
  const response = NextResponse.next({ request: { headers: request.headers } })

  if (!existing) {
    // ...and persist it to the browser for subsequent requests. httpOnly so client JS can't
    // read or spoof another visitor's sandbox.
    response.cookies.set(TENANT_COOKIE, tenant, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // a week; sandboxes are ephemeral anyway
    })
  }
  return response
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
