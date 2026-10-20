import { NextResponse, type NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const p = request.nextUrl.pathname
  // Never expose upstream's name-based identity, checkout, catalog or mutation routes.
  if (p.startsWith("/api/") && !p.startsWith("/api/jl/")) {
    return NextResponse.json({error:"Parcours désactivé. JURISLIVE fonctionne exclusivement en démonstration."},{status:410})
  }
  const response = NextResponse.next()
  response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive")
  response.headers.set("X-Content-Type-Options","nosniff")
  response.headers.set("Referrer-Policy","strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy","camera=(self), microphone=(self), geolocation=(), payment=()")
  if (p.startsWith("/api/")) response.headers.set("Cache-Control","no-store")
  return response
}
export const config = {matcher:["/((?!_next/static|_next/image|favicon.ico|images/).*)"]}
